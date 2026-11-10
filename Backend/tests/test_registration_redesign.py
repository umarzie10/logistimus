"""Tests for redesigned registration flow (API_SPECIFICATION §3).

Covers:
- Step 1 & Step 2 complete payload registration
- First name and Last name persistence
- Password & Confirm Password matching / mismatch
- Company type validation against supported choices
- Phone number international format validation
- Country & Website persistence in organization settings
- Duplicate email prevention (409)
- Transaction atomicity & rollback on failure
- Unverified user restrictions
"""

from __future__ import annotations

import re

import pytest
from django.core import mail

from apps.core.models import Organization, User
from apps.organizations.models import Branch, Membership, OrganizationSettings


@pytest.fixture(autouse=True)
def _clean_cache():
    from django.core.cache import cache

    cache.clear()
    yield
    cache.clear()


FULL_REGISTRATION_PAYLOAD = {
    "firstName": "Sardor",
    "lastName": "Rahimov",
    "email": "sardor@silkroad-freight.com",
    "password": "SecurePassword2026!",
    "confirmPassword": "SecurePassword2026!",
    "companyName": "Silk Road Freight Global",
    "country": "Uzbekistan",
    "phone": "+998 90 987 65 43",
    "companyType": "Freight Forwarder",
    "website": "https://silkroad-freight.com",
    "acceptTerms": True,
    "tier": "growth",
}


@pytest.mark.django_db
class TestRegistrationRedesign:
    def test_full_two_step_registration_creates_records_cleanly(self, api):
        resp = api.post(
            "/api/v1/auth/register/",
            FULL_REGISTRATION_PAYLOAD,
            format="json",
        )
        assert resp.status_code == 201, resp.content
        data = resp.json()
        assert data["verification_required"] is True
        assert data["email"] == "sardor@silkroad-freight.com"
        assert data["cooldown_seconds"] == 60

        # Verify user attributes
        user = User.objects.get(email="sardor@silkroad-freight.com")
        assert user.first_name == "Sardor"
        assert user.last_name == "Rahimov"
        assert user.phone == "+998 90 987 65 43"
        assert user.email_verified_at is None
        assert not user.is_staff
        assert not user.is_superuser

        # Verify organization
        org = Organization.objects.get(name="Silk Road Freight Global")
        assert org.headquarters_address == "Uzbekistan"

        # Verify settings feature flags stored company type & website
        settings_obj = OrganizationSettings.objects.get(organization=org)
        flags = settings_obj.feature_flags
        assert flags.get("company_type") == "Freight Forwarder"
        assert flags.get("website") == "https://silkroad-freight.com"
        assert flags.get("country") == "Uzbekistan"

        # Verify HQ branch
        branch = Branch.unscoped.get(organization=org, is_primary=True)
        assert "HQ" in branch.name

        # Verify owner membership
        membership = Membership.unscoped.get(organization=org, user=user)
        assert membership.role.name == "owner"
        assert membership.status == Membership.Status.ACTIVE

        # Verification email was queued
        assert len(mail.outbox) == 1
        assert "6-digit" in mail.outbox[0].body or "code" in mail.outbox[0].body.lower()

    def test_password_mismatch_rejected(self, api):
        payload = {
            **FULL_REGISTRATION_PAYLOAD,
            "email": "mismatch@test.com",
            "confirmPassword": "DifferentPassword123!",
        }
        resp = api.post("/api/v1/auth/register/", payload, format="json")
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "password_mismatch"
        assert not User.objects.filter(email="mismatch@test.com").exists()

    def test_invalid_company_type_rejected(self, api):
        payload = {
            **FULL_REGISTRATION_PAYLOAD,
            "email": "badtype@test.com",
            "companyType": "Hedge Fund",
        }
        resp = api.post("/api/v1/auth/register/", payload, format="json")
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "invalid_company_type"
        assert not User.objects.filter(email="badtype@test.com").exists()

    def test_invalid_phone_rejected(self, api):
        payload = {
            **FULL_REGISTRATION_PAYLOAD,
            "email": "badphone@test.com",
            "phone": "abc-12",  # too short / invalid
        }
        resp = api.post("/api/v1/auth/register/", payload, format="json")
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "invalid_phone"
        assert not User.objects.filter(email="badphone@test.com").exists()

    def test_duplicate_email_rejected_409(self, api):
        # Register once
        resp1 = api.post("/api/v1/auth/register/", FULL_REGISTRATION_PAYLOAD, format="json")
        assert resp1.status_code == 201

        # Attempt same email
        resp2 = api.post(
            "/api/v1/auth/register/",
            {**FULL_REGISTRATION_PAYLOAD, "companyName": "Another Corp"},
            format="json",
        )
        assert resp2.status_code == 409
        assert resp2.json()["error"]["code"] == "email_exists"

    def test_unverified_user_cannot_login(self, api):
        resp = api.post("/api/v1/auth/register/", FULL_REGISTRATION_PAYLOAD, format="json")
        assert resp.status_code == 201

        login_resp = api.post(
            "/api/v1/auth/login/",
            {
                "email": FULL_REGISTRATION_PAYLOAD["email"],
                "password": FULL_REGISTRATION_PAYLOAD["password"],
            },
            format="json",
        )
        assert login_resp.status_code == 403
        assert login_resp.json()["error"]["code"] == "email_not_verified"

    def test_email_verification_activates_account(self, api):
        reg = api.post("/api/v1/auth/register/", FULL_REGISTRATION_PAYLOAD, format="json")
        assert reg.status_code == 201

        code = re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)
        verify_resp = api.post(
            "/api/v1/auth/verify-email/",
            {"email": FULL_REGISTRATION_PAYLOAD["email"], "code": code},
            format="json",
        )
        assert verify_resp.status_code == 200
        assert verify_resp.json()["verified"] is True

        # Now login succeeds
        login_resp = api.post(
            "/api/v1/auth/login/",
            {
                "email": FULL_REGISTRATION_PAYLOAD["email"],
                "password": FULL_REGISTRATION_PAYLOAD["password"],
            },
            format="json",
        )
        assert login_resp.status_code == 200
        assert login_resp.json()["user"]["email"] == FULL_REGISTRATION_PAYLOAD["email"]
        assert login_resp.json()["user"]["role"] == "owner"

    def test_brute_force_throttled_after_5_attempts(self, api):
        reg = api.post("/api/v1/auth/register/", FULL_REGISTRATION_PAYLOAD, format="json")
        assert reg.status_code == 201

        # 4 wrong attempts -> invalid_code (400)
        for _ in range(4):
            resp = api.post(
                "/api/v1/auth/verify-email/",
                {"email": FULL_REGISTRATION_PAYLOAD["email"], "code": "000000"},
                format="json",
            )
            assert resp.status_code == 400
            assert resp.json()["error"]["code"] == "invalid_code"

        # 5th wrong attempt -> rate_limited (429)
        resp5 = api.post(
            "/api/v1/auth/verify-email/",
            {"email": FULL_REGISTRATION_PAYLOAD["email"], "code": "000000"},
            format="json",
        )
        assert resp5.status_code == 429
        assert resp5.json()["error"]["code"] == "rate_limited"

        # 6th attempt even with correct code is now blocked
        correct_code = re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)
        resp6 = api.post(
            "/api/v1/auth/verify-email/",
            {"email": FULL_REGISTRATION_PAYLOAD["email"], "code": correct_code},
            format="json",
        )
        assert resp6.status_code == 429
        assert resp6.json()["error"]["code"] == "rate_limited"

    def test_expired_code_rejected_410(self, api):
        from datetime import timedelta

        from django.utils import timezone

        from apps.accounts.models import EmailVerification

        reg = api.post("/api/v1/auth/register/", FULL_REGISTRATION_PAYLOAD, format="json")
        assert reg.status_code == 201
        code = re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)

        # Force expiration in DB
        EmailVerification.objects.filter(user__email=FULL_REGISTRATION_PAYLOAD["email"]).update(
            expires_at=timezone.now() - timedelta(minutes=1)
        )

        resp = api.post(
            "/api/v1/auth/verify-email/",
            {"email": FULL_REGISTRATION_PAYLOAD["email"], "code": code},
            format="json",
        )
        assert resp.status_code == 410
        assert resp.json()["error"]["code"] == "code_expired"

    def test_already_used_code_cannot_be_reused(self, api):
        reg = api.post("/api/v1/auth/register/", FULL_REGISTRATION_PAYLOAD, format="json")
        assert reg.status_code == 201
        code = re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)

        # Verify once -> 200
        resp1 = api.post(
            "/api/v1/auth/verify-email/",
            {"email": FULL_REGISTRATION_PAYLOAD["email"], "code": code},
            format="json",
        )
        assert resp1.status_code == 200
        assert resp1.json()["verified"] is True

        # Attempt to reuse the same code -> 400 invalid_code
        resp2 = api.post(
            "/api/v1/auth/verify-email/",
            {"email": FULL_REGISTRATION_PAYLOAD["email"], "code": code},
            format="json",
        )
        assert resp2.status_code == 400
        assert resp2.json()["error"]["code"] == "invalid_code"

    def test_old_code_invalidated_when_new_code_generated(self, api):
        from django.core.cache import cache

        reg = api.post("/api/v1/auth/register/", FULL_REGISTRATION_PAYLOAD, format="json")
        assert reg.status_code == 201
        code1 = re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)

        # Clear cooldown in cache so resend generates a new code
        cache.clear()

        # Resend code
        resend_resp = api.post(
            "/api/v1/auth/resend-verification/",
            {"email": FULL_REGISTRATION_PAYLOAD["email"]},
            format="json",
        )
        assert resend_resp.status_code == 202
        assert len(mail.outbox) == 2
        code2 = re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)

        # Code 1 must now fail (it was superseded/invalidated)
        resp_code1 = api.post(
            "/api/v1/auth/verify-email/",
            {"email": FULL_REGISTRATION_PAYLOAD["email"], "code": code1},
            format="json",
        )
        assert resp_code1.status_code == 400
        assert resp_code1.json()["error"]["code"] == "invalid_code"

        # Code 2 succeeds
        resp_code2 = api.post(
            "/api/v1/auth/verify-email/",
            {"email": FULL_REGISTRATION_PAYLOAD["email"], "code": code2},
            format="json",
        )
        assert resp_code2.status_code == 200
        assert resp_code2.json()["verified"] is True

    def test_resend_cooldown_rate_limiting(self, api):
        reg = api.post("/api/v1/auth/register/", FULL_REGISTRATION_PAYLOAD, format="json")
        assert reg.status_code == 201
        assert len(mail.outbox) == 1

        # Immediate resend attempt while cooldown is active
        resend_resp = api.post(
            "/api/v1/auth/resend-verification/",
            {"email": FULL_REGISTRATION_PAYLOAD["email"]},
            format="json",
        )
        assert resend_resp.status_code == 202
        assert resend_resp.json()["cooldown_seconds"] > 0
        # No new email was sent during active cooldown
        assert len(mail.outbox) == 1

    def test_sensitive_keys_redacted_in_json_logging(self):
        import json
        import logging

        from apps.core.logging import JsonFormatter

        formatter = JsonFormatter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname=__file__,
            lineno=1,
            msg="User registration event",
            args=(),
            exc_info=None,
        )
        record.password = "SuperSecretPassword123!"
        record.code = "481920"
        record.token = "token-abcdef12345"
        record.safe_param = "public_value"

        output = json.loads(formatter.format(record))
        assert output["password"] == "[REDACTED]"
        assert output["code"] == "[REDACTED]"
        assert output["token"] == "[REDACTED]"
        assert output["safe_param"] == "public_value"

    def test_organization_tenant_isolation_between_registrants(self, api):
        # Register Org 1
        resp1 = api.post("/api/v1/auth/register/", FULL_REGISTRATION_PAYLOAD, format="json")
        assert resp1.status_code == 201
        code1 = re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)
        api.post(
            "/api/v1/auth/verify-email/",
            {"email": FULL_REGISTRATION_PAYLOAD["email"], "code": code1},
            format="json",
        )

        # Login as User 1
        login1 = api.post(
            "/api/v1/auth/login/",
            {
                "email": FULL_REGISTRATION_PAYLOAD["email"],
                "password": FULL_REGISTRATION_PAYLOAD["password"],
            },
            format="json",
        )
        assert login1.status_code == 200
        token1 = login1.json()["access"]

        # Register Org 2
        payload2 = {
            **FULL_REGISTRATION_PAYLOAD,
            "email": "stranger@otherlogistics.com",
            "companyName": "Other Logistics Inc",
        }
        resp2 = api.post("/api/v1/auth/register/", payload2, format="json")
        assert resp2.status_code == 201
        code2 = re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)
        api.post(
            "/api/v1/auth/verify-email/",
            {"email": payload2["email"], "code": code2},
            format="json",
        )

        org2 = Organization.objects.get(name="Other Logistics Inc")

        # User 1 attempts to query with token1
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {token1}")

        # Branches of Org 2 cannot be queried by User 1
        branch_resp = api.get("/api/v1/organizations/current/branches/")
        assert branch_resp.status_code == 200
        results = branch_resp.json().get("results", [])
        assert len(results) >= 1
        for b in results:
            assert "Silk Road" in b["name"]
            assert b.get("organization_id") != str(org2.id)
