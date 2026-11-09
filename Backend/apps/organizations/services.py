"""Organization services: settings bootstrap, invitations, API keys.

All functions assume the request transaction + tenant context are already
in place (TenantContextMiddleware / JWTAuthentication).
"""

from __future__ import annotations

import hashlib
import secrets
from datetime import timedelta
from uuid import UUID

from django.utils import timezone

from apps.organizations.models import (
    ApiKey,
    Invitation,
    Membership,
    OrganizationSettings,
)

INVITATION_TTL_DAYS = 14
API_KEY_PREFIX = "logi_live_"


def get_or_create_settings(organization_id: UUID) -> OrganizationSettings:
    settings_obj, _ = OrganizationSettings.objects.get_or_create(organization_id=organization_id)
    return settings_obj


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def generate_invitation_token() -> tuple[str, str]:
    """(raw_token, sha256_hash) — raw goes into the email, hash at rest."""
    raw = secrets.token_urlsafe(32)
    return raw, _hash(raw)


def create_invitation(
    *,
    email: str,
    role_id: UUID,
    invited_by_id: UUID | None,
    organization_id: UUID,
) -> tuple[Invitation, str]:
    raw, token_hash = generate_invitation_token()
    invitation = Invitation(
        organization_id=organization_id,
        email=email.lower(),
        role_id=role_id,
        token_hash=token_hash,
        invited_by_id=invited_by_id,
        expires_at=timezone.now() + timedelta(days=INVITATION_TTL_DAYS),
    )
    invitation.save()
    return invitation, raw


def consume_pending_invitations(user) -> int:
    """Accept every live invitation addressed to the user's email.

    Called AFTER email verification (never at register): proving mailbox
    ownership is what authorizes the join — the spec has no separate accept
    endpoint, so a verified invited email becomes a member automatically.
    Server sets each target org context — the client cannot choose targets.
    """
    from apps.core import context as core_context  # noqa: PLC0415
    from apps.core import db  # noqa: PLC0415

    original_org = core_context.get_org_id()
    now = timezone.now()
    accepted = 0
    # All orgs that sent a live invitation to this address.
    org_ids = list(
        Invitation.unscoped.filter(
            email=user.email.lower(),
            accepted_at__isnull=True,
            expires_at__gt=now,
        )
        .values_list("organization_id", flat=True)
        .distinct()
    )
    try:
        for org_id in org_ids:
            invites = list(
                Invitation.unscoped.filter(
                    organization_id=org_id,
                    email=user.email.lower(),
                    accepted_at__isnull=True,
                    expires_at__gt=now,
                ).select_related("role")
            )
            if not invites:
                continue
            db.set_organization_context(org_id)
            for invitation in invites:
                if not Membership.unscoped.filter(organization_id=org_id, user=user).exists():
                    Membership(
                        organization_id=org_id,
                        user=user,
                        role=invitation.role,
                        status=Membership.Status.ACTIVE,
                        invited_by_id=invitation.invited_by_id,
                    ).save()
                    accepted += 1
                invitation.accepted_at = now
                invitation.save(update_fields=["accepted_at"])
    finally:
        # Restore the caller's tenant context.
        db.set_organization_context(original_org)
    return accepted


def issue_api_key(
    *,
    name: str,
    scopes: list[str],
    created_by_id: UUID | None,
    organization_id: UUID,
    expires_in_days: int | None = None,
) -> tuple[ApiKey, str]:
    """Create an API key; returns (row, raw_secret) — secret shown once."""
    raw = f"{API_KEY_PREFIX}{secrets.token_urlsafe(32)}"
    expires_at = None
    if expires_in_days:
        expires_at = timezone.now() + timedelta(days=expires_in_days)
    row = ApiKey(
        organization_id=organization_id,
        name=name,
        prefix=raw[: len(API_KEY_PREFIX) + 4],
        key_hash=_hash(raw),
        scopes=scopes,
        expires_at=expires_at,
        created_by_id=created_by_id,
    )
    row.save()
    return row, raw


def rotate_api_key(key: ApiKey) -> str:
    """New secret for the same row; old secret is invalid immediately.

    (Spec mentions a 24h grace window — implemented when API-key request
    authentication lands in Phase 6; rotation semantics change nothing for
    the client contract here.)
    """
    raw = f"{API_KEY_PREFIX}{secrets.token_urlsafe(32)}"
    key.key_hash = _hash(raw)
    key.prefix = raw[: len(API_KEY_PREFIX) + 4]
    key.last_used_at = None
    key.save(update_fields=["key_hash", "prefix", "last_used_at"])
    return raw
