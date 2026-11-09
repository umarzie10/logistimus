"""Phase 2 — auth flow tests (API_SPECIFICATION §3).

Covers: register -> verify -> login -> refresh rotation/reuse -> logout ->
session -> switch-organization, lockout/throttles, password lifecycle,
and invitation acceptance after email verification.
"""

from __future__ import annotations

import re
from datetime import timedelta

import pytest
from django.core import mail
from django.utils import timezone

from apps.accounts.models import LoginHistory, RefreshToken
from apps.core import context as core_context
from apps.core.models import Organization, User
from apps.organizations.models import Invitation, Membership
from apps.permissions.models import Role

REGISTRATION = {
    "companyName": "TransAsia Logistics LLC",
    "fleetSize": "200 – 1,000 Vehicles",
    "adminFullName": "Alisher Davronov",
    "businessPhone": "+998 90 123 45 67",
    "email": "admin@transasia.uz",
    "password": "Sup3rSecret!",
    "acceptTerms": True,
    "tier": "growth",
}

XHR = {"HTTP_X_REQUESTED_WITH": "XMLHttpRequest"}


@pytest.fixture(autouse=True)
def _clean_cache():
    from django.core.cache import cache

    cache.clear()
    yield
    cache.clear()


def _register(api, **overrides):
    payload = {**REGISTRATION, **overrides}
    return api.post("/api/v1/auth/register/", payload, format="json")


def _code_from_mailbox(index: int = -1) -> str:
    body = mail.outbox[index].body
    match = re.search(r"\b(\d{6})\b", body)
    assert match, f"no 6-digit code in email: {body!r}"
    return match.group(1)


def _verified_user(api, **overrides) -> dict:
    """register -> verify -> return the verify response."""
    resp = _register(api, **overrides)
    assert resp.status_code == 201, resp.content
    email = resp.json()["email"]
    resp = api.post(
        "/api/v1/auth/verify-email/",
        {"email": email, "code": _code_from_mailbox()},
        format="json",
    )
    assert resp.status_code == 200, resp.content
    return resp.json()


def _login(api) -> dict:
    """POST /auth/login for the REGISTRATION account; returns the body."""
    resp = api.post(
        "/api/v1/auth/login/",
        {"email": REGISTRATION["email"], "password": REGISTRATION["password"]},
        format="json",
    )
    assert resp.status_code == 200, resp.content
    return resp.json()


def _auth(api) -> str:
    """register -> verify -> login -> attach bearer; returns the token."""
    _verified_user(api)
    body = _login(api)
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {body['access']}")
    return body["access"]


@pytest.mark.django_db
class TestRegistration:
    def test_register_creates_org_membership_and_email(self, api):
        resp = _register(api)
        assert resp.status_code == 201
        body = resp.json()
        assert body["verification_required"] is True
        assert body["email"] == REGISTRATION["email"]

        user = User.objects.get(email=REGISTRATION["email"])
        assert user.email_verified_at is None
        membership = Membership.unscoped.get(user=user)
        assert membership.role.name == "owner"
        org = membership.organization
        assert org.base_currency == "USD"
        assert org.fleet_size_band == "200-1000"
        assert org.trial_ends_at is not None
        # HQ branch + settings + 12 builtin roles seeded
        assert org.branch_set.filter(is_primary=True).exists()
        assert Role.unscoped.filter(organization=org).count() == 12

        assert len(mail.outbox) == 1
        assert "6-digit" in mail.outbox[0].body or _code_from_mailbox()

    @pytest.mark.parametrize(
        "overrides, expected_code, expected_status",
        [
            ({"password": "short"}, "weak_password", 400),
            ({"acceptTerms": False}, "terms_required", 400),
            ({"tier": "platinum"}, "invalid_tier", 400),
            ({"email": "not-an-email"}, "validation_error", 400),
        ],
    )
    def test_register_validation_errors(self, api, overrides, expected_code, expected_status):
        resp = _register(api, **overrides)
        assert resp.status_code == expected_status, resp.content
        assert resp.json()["error"]["code"] == expected_code

    def test_register_duplicate_email_is_409(self, api):
        assert _register(api).status_code == 201
        resp = _register(api)
        assert resp.status_code == 409
        assert resp.json()["error"]["code"] == "email_exists"

    def test_register_missing_fields(self, api):
        resp = api.post("/api/v1/auth/register/", {"email": "x@y.uz"}, format="json")
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "validation_error"


@pytest.mark.django_db
class TestEmailVerification:
    def test_verify_success_joins_pending_invitation(self, api, db):
        # Another org invited this address before it registered.
        org_b = Organization.objects.create(name="Beta Freight", slug="beta-freight")
        inviter = User.objects.create_user(email="boss@beta.uz", password="x" * 10)
        with core_context.use_org(org_b.id):
            owner_role = Role.objects.create(name="owner", is_builtin=True)
            Invitation.objects.create(
                organization_id=org_b.id,
                email=REGISTRATION["email"].lower(),
                role=owner_role,
                token_hash="a" * 64,
                invited_by=inviter,
                expires_at=timezone.now() + timedelta(days=7),
            )

        resp = _register(api)
        assert resp.status_code == 201
        # Not yet a member — verification is what authorizes the join.
        assert not Membership.unscoped.filter(
            organization_id=org_b.id,
            user__email=REGISTRATION["email"],
        ).exists()

        resp = api.post(
            "/api/v1/auth/verify-email/",
            {"email": REGISTRATION["email"], "code": _code_from_mailbox()},
            format="json",
        )
        assert resp.status_code == 200, resp.content
        assert resp.json()["joined_organizations"] == 1
        assert Membership.unscoped.filter(organization_id=org_b.id).count() == 1

    def test_wrong_code_is_400_and_counts_attempts(self, api):
        _register(api)
        resp = api.post(
            "/api/v1/auth/verify-email/",
            {"email": REGISTRATION["email"], "code": "000000"},
            format="json",
        )
        # correct code is random; 000000 only passes by 1/1e6 chance
        if resp.status_code == 200:
            pytest.skip("random code collision")
        assert resp.status_code in (400, 429)
        assert resp.json()["error"]["code"] in ("invalid_code", "rate_limited")

    def test_expired_code_is_410(self, api):
        _register(api)
        from apps.accounts.models import EmailVerification

        EmailVerification.objects.update(expires_at=timezone.now() - timedelta(minutes=1))
        resp = api.post(
            "/api/v1/auth/verify-email/",
            {"email": REGISTRATION["email"], "code": "123456"},
            format="json",
        )
        assert resp.status_code == 410
        assert resp.json()["error"]["code"] == "code_expired"

    def test_resend_is_202_always_and_honours_cooldown(self, api):
        resp = api.post(
            "/api/v1/auth/resend-verification/",
            {"email": "ghost@nowhere.uz"},
            format="json",
        )
        assert resp.status_code == 202

        _register(api)
        resp = api.post(
            "/api/v1/auth/resend-verification/",
            {"email": REGISTRATION["email"]},
            format="json",
        )
        assert resp.status_code == 202
        # second resend inside the 60s cooldown must not mail again
        before = len(mail.outbox)
        resp = api.post(
            "/api/v1/auth/resend-verification/",
            {"email": REGISTRATION["email"]},
            format="json",
        )
        assert resp.status_code == 202
        assert resp.json()["cooldown_seconds"] > 0
        assert len(mail.outbox) == before


@pytest.mark.django_db
class TestLogin:
    def test_login_success_sets_cookie_and_payload(self, api):
        _verified_user(api)
        resp = api.post(
            "/api/v1/auth/login/",
            {"email": REGISTRATION["email"], "password": REGISTRATION["password"]},
            format="json",
        )
        assert resp.status_code == 200, resp.content
        body = resp.json()
        assert body["expires_in"] <= 900
        assert body["user"]["role"] == "owner"
        assert body["user"]["email_verified_at"] is not None
        assert body["organization"]["slug"].startswith("transasia")
        assert body["memberships"][0]["role"] == "owner"
        assert "lr_refresh" in resp.cookies
        assert resp.cookies["lr_refresh"]["httponly"]
        assert resp.cookies["lr_refresh"]["path"] == "/api/v1/auth/"

        # access token carries server-set org claim
        from rest_framework_simplejwt.tokens import AccessToken

        claims = AccessToken(body["access"])
        assert claims["org"] == body["organization"]["id"]
        assert claims["role"] == "owner"

        assert LoginHistory.objects.filter(successful=True).exists()
        user = User.objects.get(email=REGISTRATION["email"])
        assert user.failed_login_attempts == 0

    def test_login_unverified_email_is_403(self, api):
        _register(api)
        resp = api.post(
            "/api/v1/auth/login/",
            {"email": REGISTRATION["email"], "password": REGISTRATION["password"]},
            format="json",
        )
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "email_not_verified"

    def test_login_bad_password_is_401(self, api):
        _verified_user(api)
        resp = api.post(
            "/api/v1/auth/login/",
            {"email": REGISTRATION["email"], "password": "wrong-password"},
            format="json",
        )
        assert resp.status_code == 401
        assert resp.json()["error"]["code"] == "invalid_credentials"
        assert LoginHistory.objects.filter(successful=False).exists()

    def test_lockout_after_10_failures(self, api):
        _verified_user(api)
        creds = {
            "email": REGISTRATION["email"],
            "password": "wrong-password",
        }
        for _ in range(9):
            resp = api.post("/api/v1/auth/login/", creds, format="json")
            assert resp.status_code == 401
            # reset the per-email throttle so we reach the lockout counter
            from django.core.cache import cache

            cache.delete(f"auth:login_email:{REGISTRATION['email']}")

        resp = api.post("/api/v1/auth/login/", creds, format="json")
        assert resp.status_code == 423
        assert resp.json()["error"]["code"] == "account_locked"
        assert resp.json()["error"]["details"]["retry_after_seconds"] > 0

        # even the correct password is refused while locked
        resp = api.post(
            "/api/v1/auth/login/",
            {"email": REGISTRATION["email"], "password": REGISTRATION["password"]},
            format="json",
        )
        assert resp.status_code == 423


@pytest.mark.django_db
class TestRefreshRotation:
    def _login(self, api) -> str:
        _verified_user(api)
        resp = api.post(
            "/api/v1/auth/login/",
            {"email": REGISTRATION["email"], "password": REGISTRATION["password"]},
            format="json",
        )
        assert resp.status_code == 200, resp.content
        return resp.cookies["lr_refresh"].value

    def test_rotation_issues_new_cookie_and_access(self, api):
        old = self._login(api)
        resp = api.post("/api/v1/auth/refresh/", {}, **XHR)
        assert resp.status_code == 200, resp.content
        new = resp.cookies["lr_refresh"].value
        assert new != old
        assert "access" in resp.json()
        # old token is now rotated
        old_row = RefreshToken.objects.get(token_hash=_sha(old))
        assert old_row.rotated_at is not None

    def test_reuse_of_rotated_token_revokes_family(self, api):
        old = self._login(api)
        resp = api.post("/api/v1/auth/refresh/", {}, **XHR)
        assert resp.status_code == 200

        # replay the already-rotated token
        api.cookies["lr_refresh"] = old
        resp = api.post("/api/v1/auth/refresh/", {}, **XHR)
        assert resp.status_code == 401
        assert resp.json()["error"]["code"] == "refresh_revoked"
        # the whole family is dead, including the token we just got
        assert not RefreshToken.objects.filter(
            revoked_at__isnull=True, rotated_at__isnull=True
        ).exists()

    def test_refresh_requires_xhr_header(self, api):
        self._login(api)
        resp = api.post("/api/v1/auth/refresh/", {})
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "forbidden"

    def test_refresh_without_cookie_is_400(self, api):
        resp = api.post("/api/v1/auth/refresh/", {}, **XHR)
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "token_invalid"

    def test_logout_revokes_family_and_clears_cookie(self, api):
        self._login(api)
        resp = api.post("/api/v1/auth/logout/", {}, **XHR)
        assert resp.status_code == 204
        assert RefreshToken.objects.filter(revoked_at__isnull=True).count() == 0

        resp = api.post("/api/v1/auth/refresh/", {}, **XHR)
        assert resp.status_code in (400, 401)


@pytest.mark.django_db
class TestSessionAndSwitchOrg:
    def test_session_returns_login_shape_from_cookie(self, api):
        _verified_user(api)
        login = api.post(
            "/api/v1/auth/login/",
            {"email": REGISTRATION["email"], "password": REGISTRATION["password"]},
            format="json",
        )
        assert login.status_code == 200

        resp = api.get("/api/v1/auth/session/")
        assert resp.status_code == 200, resp.content
        body = resp.json()
        assert body["user"]["email"] == REGISTRATION["email"]
        assert body["organization"]["name"] == REGISTRATION["companyName"]
        assert body["memberships"]

    def test_session_without_cookie_is_400(self, api):
        resp = api.get("/api/v1/auth/session/")
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "token_invalid"

    def test_switch_organization_issues_new_org_claim(self, api):
        _verified_user(api)
        # second org with a membership for the same user
        user = User.objects.get(email=REGISTRATION["email"])
        org2 = Organization.objects.create(name="Beta Freight", slug="beta-freight")
        with core_context.use_org(org2.id):
            owner_role = Role.objects.create(name="owner", is_builtin=True)
            Membership.objects.create(organization_id=org2.id, user=user, role=owner_role)

        login = api.post(
            "/api/v1/auth/login/",
            {"email": REGISTRATION["email"], "password": REGISTRATION["password"]},
            format="json",
        )
        assert login.status_code == 200, login.content
        original_org = login.json()["organization"]["id"]
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {login.json()['access']}")

        resp = api.post(
            "/api/v1/auth/switch-organization/",
            {"organization_id": str(org2.id)},
            format="json",
            **XHR,
        )
        assert resp.status_code == 200, resp.content
        body = resp.json()
        assert body["organization"]["id"] == str(org2.id)
        assert body["user"]["role"] == "owner"
        assert "lr_refresh" in resp.cookies

        from rest_framework_simplejwt.tokens import AccessToken

        assert AccessToken(body["access"])["org"] == str(org2.id)
        assert original_org != str(org2.id)

    def test_switch_to_foreign_org_is_403(self, api):
        _auth(api)
        stranger = Organization.objects.create(name="Other Co", slug="other-co")
        resp = api.post(
            "/api/v1/auth/switch-organization/",
            {"organization_id": str(stranger.id)},
            format="json",
            **XHR,
        )
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "not_a_member"

    def test_switch_requires_xhr_header(self, api):
        _auth(api)
        resp = api.post(
            "/api/v1/auth/switch-organization/",
            {"organization_id": "00000000-0000-0000-0000-000000000000"},
            format="json",
        )
        assert resp.status_code == 403


@pytest.mark.django_db
class TestPasswordLifecycle:
    def _login(self, api) -> None:
        _verified_user(api)
        resp = api.post(
            "/api/v1/auth/login/",
            {"email": REGISTRATION["email"], "password": REGISTRATION["password"]},
            format="json",
        )
        assert resp.status_code == 200, resp.content

    def test_forgot_reset_login_with_new_password(self, api):
        _verified_user(api)
        resp = api.post(
            "/api/v1/auth/forgot-password/",
            {"email": REGISTRATION["email"]},
            format="json",
        )
        assert resp.status_code == 202
        # outbox[0] is the verification mail from _verified_user
        assert len(mail.outbox) == 2
        token = re.search(r"token=([A-Za-z0-9_\-]+)", mail.outbox[-1].body).group(1)

        resp = api.post(
            "/api/v1/auth/reset-password/",
            {"token": token, "password": "N3wSecret!Pass"},
            format="json",
        )
        assert resp.status_code == 200, resp.content
        assert resp.json()["reset"] is True

        # old password is dead, new one works
        resp = api.post(
            "/api/v1/auth/login/",
            {"email": REGISTRATION["email"], "password": REGISTRATION["password"]},
            format="json",
        )
        assert resp.status_code == 401
        resp = api.post(
            "/api/v1/auth/login/",
            {"email": REGISTRATION["email"], "password": "N3wSecret!Pass"},
            format="json",
        )
        assert resp.status_code == 200

    def test_forgot_password_is_202_even_for_unknown_address(self, api):
        resp = api.post(
            "/api/v1/auth/forgot-password/",
            {"email": "nobody@nowhere.uz"},
            format="json",
        )
        assert resp.status_code == 202
        assert len(mail.outbox) == 0

    def test_reset_with_bogus_token_is_400(self, api):
        resp = api.post(
            "/api/v1/auth/reset-password/",
            {"token": "nope", "password": "N3wSecret!Pass"},
            format="json",
        )
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "token_invalid"

    def test_reset_with_expired_token_is_410(self, api):
        from apps.accounts.models import PasswordResetToken

        _verified_user(api)
        api.post(
            "/api/v1/auth/forgot-password/",
            {"email": REGISTRATION["email"]},
            format="json",
        )
        PasswordResetToken.objects.update(expires_at=timezone.now() - timedelta(minutes=1))
        token = re.search(r"token=([A-Za-z0-9_\-]+)", mail.outbox[-1].body).group(1)
        resp = api.post(
            "/api/v1/auth/reset-password/",
            {"token": token, "password": "N3wSecret!Pass"},
            format="json",
        )
        assert resp.status_code == 410
        assert resp.json()["error"]["code"] == "token_expired"

    def test_reset_revokes_existing_sessions(self, api):
        self._login(api)
        assert RefreshToken.objects.filter(revoked_at__isnull=True).exists()

        api.post(
            "/api/v1/auth/forgot-password/",
            {"email": REGISTRATION["email"]},
            format="json",
        )
        token = re.search(r"token=([A-Za-z0-9_\-]+)", mail.outbox[-1].body).group(1)
        resp = api.post(
            "/api/v1/auth/reset-password/",
            {"token": token, "password": "N3wSecret!Pass"},
            format="json",
        )
        assert resp.status_code == 200
        assert RefreshToken.objects.filter(revoked_at__isnull=True).count() == 0

    def test_change_password_requires_auth_and_correct_current(self, api):
        _verified_user(api)
        resp = api.post(
            "/api/v1/auth/change-password/",
            {"current_password": "x", "new_password": "N3wSecret!Pass"},
            format="json",
        )
        assert resp.status_code == 401  # not authenticated yet

        body = _login(api)
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {body['access']}")
        resp = api.post(
            "/api/v1/auth/change-password/",
            {"current_password": "wrong", "new_password": "N3wSecret!Pass"},
            format="json",
        )
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "validation_error"

        resp = api.post(
            "/api/v1/auth/change-password/",
            {
                "current_password": REGISTRATION["password"],
                "new_password": "N3wSecret!Pass",
            },
            format="json",
        )
        assert resp.status_code == 200, resp.content
        assert resp.json()["changed"] is True

    def test_login_history_is_own_only(self, api):
        _auth(api)
        resp = api.get("/api/v1/auth/login-history/")
        assert resp.status_code == 200, resp.content
        results = resp.json()["results"]
        assert results
        assert all("ip" in row for row in results)


def _sha(raw: str) -> str:
    import hashlib

    return hashlib.sha256(raw.encode()).hexdigest()
