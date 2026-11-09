"""Authentication services (API_SPECIFICATION §3).

Contract highlights implemented here:
- register creates User + Organization + HQ Branch + owner Membership +
  builtin roles + 6-digit verification code (15 min TTL);
- login: 5/min/IP (DRF scope) + 10/15min/email (cache) + 10-fail lockout
  for 15 min, every attempt appended to LoginHistory;
- refresh: cookie-only, rotation with family reuse detection
  (`401 refresh_revoked`), 12h idle / 30d absolute expiry, CSRF custom
  header `X-Requested-With` checked by the view;
- org claims are written ONLY after a server-side membership check.

Every function assumes it runs inside the request transaction opened by
TenantContextMiddleware (SET LOCAL needs it).
"""

from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import UTC, timedelta
from datetime import datetime as dt_datetime
from uuid import UUID, uuid4

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.models import (
    EmailVerification,
    LoginHistory,
    PasswordResetToken,
    RefreshToken,
)
from apps.core import audit, context, db
from apps.core.exceptions import ApiError
from apps.core.models import Organization
from apps.organizations import services as org_services
from apps.organizations.models import Branch, Membership
from apps.permissions import services as perm_services
from apps.permissions.models import Role

User = get_user_model()

logger = logging.getLogger(__name__)

# Lifetimes (SECURITY_PLAN §4)
REFRESH_IDLE = timedelta(hours=12)
REFRESH_ABSOLUTE = timedelta(days=30)
VERIFY_TTL = timedelta(minutes=15)
RESET_TTL = timedelta(minutes=60)
COOLDOWN_SECONDS = 60
MAX_FAILED_LOGINS = 10
LOCK_MINUTES = 15
EMAIL_LOGIN_LIMIT = 10
EMAIL_LOGIN_WINDOW = timedelta(minutes=15)

VALID_TIERS = ("starter", "growth", "enterprise")
FLEET_BAND_MAP = {
    "10 – 50 Vehicles": "10-50",
    "50 – 200 Vehicles": "50-200",
    "200 – 1,000 Vehicles": "200-1000",
    "1,000+ Vehicles": "1000+",
    "10-50": "10-50",
    "50-200": "50-200",
    "200-1000": "200-1000",
    "1000+": "1000+",
}


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def _unique_slug(name: str) -> str:
    """URL-safe org slug, unique across the platform."""
    from django.utils.text import slugify

    base = slugify(name)[:48] or "org"
    slug = base
    n = 2
    while Organization.objects.filter(slug=slug).exists():
        slug = f"{base}-{n}"
        n += 1
    return slug


def _cache_add(key: str, value, ttl_seconds: int) -> bool:
    """True when the key was free (caller may proceed)."""
    return cache.add(key, value, ttl_seconds)


def _bump(key: str, window_seconds: int) -> int:
    try:
        return cache.incr(key)
    except ValueError:
        cache.add(key, 1, window_seconds)
        return 1


# ---------------------------------------------------------------------------
# Payloads (shared by login / session / switch-organization)
# ---------------------------------------------------------------------------


def issue_access(user, org_id: UUID | None, role: str | None) -> tuple[str, int]:
    """Mint a 15-min access token with server-set org/role claims."""
    token = AccessToken.for_user(user)
    if org_id is not None:
        token["org"] = str(org_id)
    if role:
        token["role"] = role
    expires_in = int(
        (timezone.datetime.fromtimestamp(token["exp"], tz=UTC) - timezone.now()).total_seconds()
    )
    return str(token), max(expires_in, 0)


def user_payload(user, role: str | None) -> dict:
    return {
        "id": str(user.id),
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "role": role,
        "platform_role": user.platform_role,
        "email_verified_at": user.email_verified_at,
    }


def organization_payload(org) -> dict:
    return {
        "id": str(org.id),
        "name": org.name,
        "slug": org.slug,
        "base_currency": org.base_currency,
    }


def memberships_payload(user, current_org_id: UUID | None = None) -> list[dict]:
    rows = (
        Membership.unscoped.filter(user=user, status=Membership.Status.ACTIVE)
        .select_related("organization", "role")
        .order_by("organization__name")
    )
    return [
        {
            "organization_id": str(m.organization_id),
            "organization_name": m.organization.name,
            "role": m.role.name,
            "is_current": m.organization_id == current_org_id,
        }
        for m in rows
    ]


def _bind_context(user, org_id: UUID, role: str) -> None:
    """Server-side tenant binding used after a membership was verified."""
    context.set_user_id(user.id)
    context.set_org_id(org_id)
    context.set_role(role)
    db.set_user_context(user.id)
    db.set_organization_context(org_id)


def _pick_membership(user) -> Membership:
    """Default org on login: the first organization the user joined.

    Deterministic (oldest membership wins) so a fresh login always lands in
    the org created at registration; afterwards the refresh token pins the
    active org and switch-organization changes it explicitly.
    """
    membership = (
        Membership.unscoped.filter(user=user, status=Membership.Status.ACTIVE)
        .select_related("organization", "role")
        .order_by("joined_at")
        .first()
    )
    if membership is None or not membership.organization.is_active:
        raise ApiError("forbidden", "Your account is not attached to an active organization.")
    return membership


# ---------------------------------------------------------------------------
# Refresh token lifecycle
# ---------------------------------------------------------------------------


def issue_refresh(
    *, user, org_id: UUID | None, request=None, family_id: UUID | None = None
) -> tuple[str, RefreshToken]:
    """Create (or rotate within) a refresh-token family; returns raw secret."""
    now = timezone.now()
    family = family_id or uuid4()
    family_started = now if family_id is None else _family_started(family_id)
    raw = secrets.token_urlsafe(48)
    row = RefreshToken(
        user=user,
        organization_id=org_id,
        token_hash=_sha256(raw),
        family_id=family,
        family_started_at=family_started,
        expires_at=now + REFRESH_IDLE,
        created_ip=_client_ip(request),
        user_agent=(request.headers.get("User-Agent", "")[:512] if request else ""),
    )
    row.save()
    return raw, row


def _family_started(family_id: UUID) -> dt_datetime:
    first = (
        RefreshToken.objects.filter(family_id=family_id)
        .order_by("created_at")
        .values_list("family_started_at", flat=True)
        .first()
    )
    return first or timezone.now()


def revoke_family(family_id: UUID, reason: str) -> None:
    RefreshToken.objects.filter(family_id=family_id, revoked_at__isnull=True).update(
        revoked_at=timezone.now(), revoked_reason=reason
    )


def revoke_all_for_user(user, reason: str, *, except_family: UUID | None = None) -> int:
    qs = RefreshToken.objects.filter(user=user, revoked_at__isnull=True)
    if except_family:
        qs = qs.exclude(family_id=except_family)
    return qs.update(revoked_at=timezone.now(), revoked_reason=reason)


def _client_ip(request) -> str | None:
    if request is None:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


# ---------------------------------------------------------------------------
# Registration + email verification
# ---------------------------------------------------------------------------


def register(data: dict, request=None) -> dict:
    email = data["email"].lower().strip()
    password = data["password"]

    try:
        validate_email(email)
    except DjangoValidationError as exc:
        raise ApiError(
            "validation_error",
            "Enter a valid email address.",
            details={"email": list(exc.messages)},
        ) from exc
    if len(password) < 8:
        raise ApiError("weak_password", "Password must be at least 8 characters.")
    if not data.get("acceptTerms"):
        raise ApiError("terms_required", "You must accept the terms to continue.")
    tier = data.get("tier") or "starter"
    if tier not in VALID_TIERS:
        raise ApiError("invalid_tier", f"Unknown plan tier '{tier}'.")
    if User.objects.filter(email=email).exists():
        raise ApiError("email_exists", "An account with this email already exists.")

    name = data["companyName"].strip()
    fleet_band = FLEET_BAND_MAP.get(data.get("fleetSize", ""), "")
    full_name = data.get("adminFullName", "").strip()
    first_name, _, last_name = full_name.partition(" ")

    now = timezone.now()
    with transaction.atomic():
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name.strip(),
            phone=data.get("businessPhone", "").strip(),
        )
        org = Organization.objects.create(
            name=name,
            slug=_unique_slug(name),
            fleet_size_band=fleet_band,
            trial_ends_at=now + timedelta(days=14),
        )
        # Tenant rows need the org context (RLS + TenantModel.save).
        db.set_organization_context(org.id)
        Branch.objects.create(
            name=f"{name} HQ",
            type="hq",
            is_primary=True,
        )
        perm_services.seed_builtin_roles(org)
        org_services.get_or_create_settings(org.id)

        # Owner membership: role lookup scoped to this org context.
        owner = Role.objects.get(name="owner")
        Membership.objects.create(
            organization=org, user=user, role=owner, status=Membership.Status.ACTIVE
        )

        _send_verification(user, EmailVerification.Purpose.REGISTER)
        audit.record(
            action="auth.registered",
            request=request,
            object_type="organization",
            object_id=org.id,
            organization_id=org.id,
            actor=user,
            actor_email=user.email,
            after={"email": user.email, "tier": tier},
        )

    cooldown = _cooldown_remaining(email)
    return {
        "verification_required": True,
        "email": user.email,
        "cooldown_seconds": cooldown,
    }


def _cooldown_key(email: str) -> str:
    return f"auth:cooldown:{email}"


def _cooldown_remaining(email: str) -> int:
    """Seconds left on the 60s resend cooldown (0 when inactive).

    Stores an epoch deadline instead of relying on `cache.ttl` (which only
    exists on Redis backends — tests run on LocMem).
    """
    deadline = cache.get(_cooldown_key(email))
    if not deadline:
        return 0
    try:
        left = int(deadline) - int(timezone.now().timestamp())
    except (TypeError, ValueError):  # pragma: no cover - corrupted cache
        return 0
    return max(left, 0)


def _start_cooldown(email: str) -> int:
    deadline = int(timezone.now().timestamp()) + COOLDOWN_SECONDS
    cache.set(_cooldown_key(email), deadline, COOLDOWN_SECONDS)
    return COOLDOWN_SECONDS


def _send_verification(user, purpose: str) -> str:
    """Create a 6-digit code (hashed at rest), enforce the 60s cooldown."""
    email = user.email
    remaining = _cooldown_remaining(email)
    if remaining:
        # Cooldown active: keep the previous code, report remaining seconds.
        return str(remaining)

    code = f"{secrets.randbelow(1_000_000):06d}"
    EmailVerification.objects.create(
        user=user,
        code_hash=_sha256(code),
        purpose=purpose,
        expires_at=timezone.now() + VERIFY_TTL,
    )
    _start_cooldown(email)
    _bump(f"auth:verify_count:{email}", 3600)

    from apps.accounts import tasks  # noqa: PLC0415

    tasks.send_verification_email.delay(to_email=email, code=code)
    return str(COOLDOWN_SECONDS)


def verify_email(*, email: str, code: str) -> dict:
    email = email.lower().strip()
    user = User.objects.filter(email=email).first()
    now = timezone.now()

    verification = None
    if user is not None:
        verification = (
            EmailVerification.objects.filter(
                user=user,
                purpose=EmailVerification.Purpose.REGISTER,
                consumed_at__isnull=True,
            )
            .order_by("-created_at")
            .first()
        )

    if verification is None:
        raise ApiError("invalid_code", "This verification code is not valid.")

    if verification.expires_at <= now:
        raise ApiError("code_expired", "This verification code has expired.")

    if verification.attempts >= EmailVerification.MAX_ATTEMPTS:
        raise ApiError("rate_limited", "Too many attempts — request a new code.")

    verification.attempts += 1
    if _sha256(code) != verification.code_hash:
        verification.save(update_fields=["attempts"])
        if verification.attempts >= EmailVerification.MAX_ATTEMPTS:
            raise ApiError("rate_limited", "Too many attempts — request a new code.")
        raise ApiError("invalid_code", "This verification code is not valid.")

    verification.consumed_at = now
    verification.save(update_fields=["consumed_at"])
    user.email_verified_at = now
    user.save(update_fields=["email_verified_at"])

    # Proving mailbox ownership is what authorizes invitation joins.
    joined = org_services.consume_pending_invitations(user)

    audit.record(
        action="auth.email_verified",
        object_type="user",
        object_id=user.id,
        actor=user,
        actor_email=user.email,
    )
    return {"verified": True, "joined_organizations": joined}


def resend_verification(*, email: str) -> dict:
    email = email.lower().strip()
    remaining = _cooldown_remaining(email)
    if remaining:
        return {"cooldown_seconds": remaining}
    if (_bump(f"auth:verify_count:{email}", 3600)) > 10:
        raise ApiError("rate_limited", "Too many codes requested — try later.")
    user = User.objects.filter(email=email).first()
    if user is not None and user.email_verified_at is None:
        remaining = int(_send_verification(user, EmailVerification.Purpose.REGISTER))
        return {"cooldown_seconds": remaining}
    # Always 202-shaped: never reveals whether the address exists.
    return {"cooldown_seconds": _start_cooldown(email)}


# ---------------------------------------------------------------------------
# Login / lockout
# ---------------------------------------------------------------------------


def login(*, email: str, password: str, request=None) -> tuple[dict, str, RefreshToken]:
    """Returns (body, raw_refresh, refresh_row). Raises ApiError."""
    email = email.lower().strip()
    ip = _client_ip(request)

    # Per-email throttle: 10 attempts / 15 min (IP throttle is DRF's).
    email_key = f"auth:login_email:{email}"
    attempts = cache.get(email_key, 0)
    if attempts >= EMAIL_LOGIN_LIMIT:
        raise ApiError("too_many_attempts", "Too many login attempts — try again later.")

    user = User.objects.filter(email=email).first()

    if user is None or not user.check_password(password):
        _record_login_failure(user, request, ip, "invalid_credentials")
        if user is not None:
            user.failed_login_attempts += 1
            fields = ["failed_login_attempts"]
            just_locked = False
            if user.failed_login_attempts >= MAX_FAILED_LOGINS:
                user.lock(LOCK_MINUTES)
                fields.append("locked_until")
                just_locked = True
            user.save(update_fields=fields)
            if just_locked:
                _bump(email_key, int(EMAIL_LOGIN_WINDOW.total_seconds()))
                raise ApiError(
                    "account_locked",
                    "Too many failed attempts — account temporarily locked.",
                    details={"retry_after_seconds": LOCK_MINUTES * 60},
                )
        _bump(email_key, int(EMAIL_LOGIN_WINDOW.total_seconds()))
        raise ApiError("invalid_credentials", "Invalid email or password.")

    if user.is_locked:
        retry = int((user.locked_until - timezone.now()).total_seconds()) + 1
        raise ApiError(
            "account_locked",
            "Account temporarily locked after too many failed attempts.",
            details={"retry_after_seconds": retry},
        )
    if not user.is_active:
        raise ApiError("invalid_credentials", "Invalid email or password.")
    if user.email_verified_at is None:
        raise ApiError("email_not_verified", "Please verify your email before signing in.")

    membership = _pick_membership(user)
    org = membership.organization
    role = membership.role.name
    _bind_context(user, org.id, role)

    user.mark_login_success(ip)
    cache.delete(email_key)
    LoginHistory.objects.create(
        user=user,
        ip=ip,
        user_agent=(request.headers.get("User-Agent", "")[:512] if request else ""),
        successful=True,
    )
    audit.record(
        action="auth.login",
        request=request,
        object_type="user",
        object_id=user.id,
        actor=user,
        actor_email=user.email,
    )

    access, expires_in = issue_access(user, org.id, role)
    raw, row = issue_refresh(user=user, org_id=org.id, request=request)
    body = {
        "access": access,
        "expires_in": expires_in,
        "user": user_payload(user, role),
        "organization": organization_payload(org),
        "memberships": memberships_payload(user, org.id),
    }
    return body, raw, row


def _record_login_failure(user, request, ip: str | None, reason: str) -> None:
    if user is None:
        return
    LoginHistory.objects.create(
        user=user,
        ip=ip,
        user_agent=(request.headers.get("User-Agent", "")[:512] if request else ""),
        successful=False,
        failure_reason=reason,
    )


# ---------------------------------------------------------------------------
# Refresh / logout / session / switch-organization
# ---------------------------------------------------------------------------


def refresh(*, raw: str, request=None) -> tuple[dict, str, RefreshToken]:
    """Rotate the presented refresh token. Replay -> family revoked."""
    row = (
        RefreshToken.objects.select_related("user", "organization")
        .filter(token_hash=_sha256(raw))
        .first()
    )
    if row is None:
        raise ApiError("token_invalid", "Refresh token is not valid.")

    if row.rotated_at is not None:
        # Reuse detection: a rotated token was presented again.
        revoke_family(row.family_id, "reuse")
        audit.record(
            action="auth.refresh_reuse_detected",
            object_type="refresh_token",
            object_id=row.id,
            actor=row.user,
            actor_email=row.user.email,
        )
        raise ApiError("refresh_revoked", "Session revoked — please sign in again.")

    if row.revoked_at is not None:
        raise ApiError("refresh_revoked", "Session revoked — please sign in again.")

    now = timezone.now()
    if row.expires_at <= now:
        raise ApiError("token_expired", "Session expired — please sign in again.")
    if row.family_started_at + REFRESH_ABSOLUTE <= now:
        revoke_family(row.family_id, "absolute_expiry")
        raise ApiError("token_expired", "Session expired — please sign in again.")

    user = row.user
    if not user.is_active:
        revoke_family(row.family_id, "inactive_user")
        raise ApiError("invalid_credentials", "Account is not active.")

    membership = (
        Membership.unscoped.filter(
            user=user,
            organization_id=row.organization_id,
            status=Membership.Status.ACTIVE,
        )
        .select_related("role")
        .first()
    )
    if membership is None or not membership.organization.is_active:
        revoke_family(row.family_id, "membership_lost")
        raise ApiError("not_a_member", "You are no longer a member of this organization.")

    org = membership.organization
    role = membership.role.name
    _bind_context(user, org.id, role)

    row.rotated_at = now
    row.save(update_fields=["rotated_at"])
    raw_new, new_row = issue_refresh(
        user=user, org_id=org.id, request=request, family_id=row.family_id
    )
    access, expires_in = issue_access(user, org.id, role)
    return {"access": access, "expires_in": expires_in}, raw_new, new_row


def logout(*, raw: str | None, request=None) -> None:
    if raw:
        row = RefreshToken.objects.filter(token_hash=_sha256(raw)).first()
        if row is not None:
            revoke_family(row.family_id, "logout")
            audit.record(
                action="auth.logout",
                request=request,
                object_type="refresh_token",
                object_id=row.id,
                actor=row.user,
                actor_email=row.user.email,
            )


def session_body(
    *, raw: str | None, request=None, access: str | None = None, expires_in: int | None = None
) -> dict:
    """Login-shaped state from the refresh cookie (no access re-issue
    unless the caller passed a near-expiry bearer token)."""
    if not raw:
        raise ApiError("token_invalid", "Sign in to continue.")
    row = (
        RefreshToken.objects.select_related("user", "organization")
        .filter(token_hash=_sha256(raw))
        .first()
    )
    now = timezone.now()
    if (
        row is None
        or row.revoked_at is not None
        or row.rotated_at is not None
        or row.expires_at <= now
        or not row.user.is_active
    ):
        raise ApiError("token_invalid", "Session is not valid.")

    user = row.user
    membership = (
        Membership.unscoped.filter(
            user=user,
            organization_id=row.organization_id,
            status=Membership.Status.ACTIVE,
        )
        .select_related("organization", "role")
        .first()
    )
    if membership is None or not membership.organization.is_active:
        raise ApiError("not_a_member", "You are no longer a member of this organization.")

    org = membership.organization
    role = membership.role.name
    _bind_context(user, org.id, role)

    body = {
        "user": user_payload(user, role),
        "organization": organization_payload(org),
        "memberships": memberships_payload(user, org.id),
    }
    if access is not None:
        body["access"] = access
        body["expires_in"] = expires_in
    return body


def switch_organization(
    *, user, organization_id: str, request=None
) -> tuple[dict, str, RefreshToken]:
    """Verify membership in the target org, re-issue access + cookie scope."""
    membership = (
        Membership.unscoped.filter(
            user=user,
            organization_id=organization_id,
            status=Membership.Status.ACTIVE,
        )
        .select_related("organization", "role")
        .first()
    )
    # Same response whether the org exists or the user is not a member.
    if membership is None or not membership.organization.is_active:
        raise ApiError("not_a_member", "You are not a member of that organization.")

    org = membership.organization
    role = membership.role.name
    _bind_context(user, org.id, role)

    access, expires_in = issue_access(user, org.id, role)
    raw, row = issue_refresh(user=user, org_id=org.id, request=request)
    audit.record(
        action="auth.switch_organization",
        request=request,
        object_type="organization",
        object_id=org.id,
        actor=user,
        actor_email=user.email,
    )
    body = {
        "access": access,
        "expires_in": expires_in,
        "user": user_payload(user, role),
        "organization": organization_payload(org),
        "memberships": memberships_payload(user, org.id),
    }
    return body, raw, row


# ---------------------------------------------------------------------------
# Password lifecycle
# ---------------------------------------------------------------------------


def forgot_password(*, email: str) -> dict:
    email = email.lower().strip()
    if not _cache_add(f"auth:reset_cooldown:{email}", 1, COOLDOWN_SECONDS):
        return {"cooldown_seconds": COOLDOWN_SECONDS}
    user = User.objects.filter(email=email, is_active=True).first()
    if user is not None:
        raw = secrets.token_urlsafe(32)
        PasswordResetToken.objects.create(
            user=user,
            token_hash=_sha256(raw),
            expires_at=timezone.now() + RESET_TTL,
        )
        from apps.accounts import tasks  # noqa: PLC0415

        tasks.send_password_reset_email.delay(to_email=email, token=raw)
        audit.record(
            action="auth.password_reset_requested",
            object_type="user",
            object_id=user.id,
            actor=user,
            actor_email=user.email,
        )
    # 202 always — never reveals whether the address exists.
    return {"cooldown_seconds": COOLDOWN_SECONDS}


def reset_password(*, token: str, password: str) -> dict:
    if len(password) < 8:
        raise ApiError("weak_password", "Password must be at least 8 characters.")
    row = (
        PasswordResetToken.objects.filter(token_hash=_sha256(token)).select_related("user").first()
    )
    if row is None or row.used_at is not None:
        raise ApiError("token_invalid", "This reset link is not valid.")
    if row.expires_at <= timezone.now():
        raise ApiError("token_expired", "This reset link has expired.")

    user = row.user
    user.set_password(password)
    user.failed_login_attempts = 0
    user.locked_until = None
    user.save(
        update_fields=[
            "password",
            "failed_login_attempts",
            "locked_until",
        ]
    )
    row.used_at = timezone.now()
    row.save(update_fields=["used_at"])
    revoked = revoke_all_for_user(user, "password_reset")
    audit.record(
        action="auth.password_reset",
        object_type="user",
        object_id=user.id,
        actor=user,
        actor_email=user.email,
        after={"sessions_revoked": revoked},
    )
    return {"reset": True, "sessions_revoked": revoked}


def change_password(
    *, user, current_password: str, new_password: str, keep_family: UUID | None = None
) -> dict:
    if not user.check_password(current_password):
        raise ApiError("validation_error", "Current password is incorrect.")
    if len(new_password) < 8:
        raise ApiError("weak_password", "Password must be at least 8 characters.")
    if current_password == new_password:
        raise ApiError("validation_error", "New password must differ from the current one.")
    user.set_password(new_password)
    user.save(update_fields=["password"])
    revoked = revoke_all_for_user(user, "password_change", except_family=keep_family)
    audit.record(
        action="auth.password_changed",
        object_type="user",
        object_id=user.id,
        actor=user,
        actor_email=user.email,
        after={"other_sessions_revoked": revoked},
    )
    return {"changed": True, "other_sessions_revoked": revoked}
