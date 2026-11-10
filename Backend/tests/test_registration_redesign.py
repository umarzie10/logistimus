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
