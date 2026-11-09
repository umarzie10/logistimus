"""Performance, N+1 Query Audit & End-to-End Workflow QA Tests.

Verifies:
1. Query count bounds (O(1) queries on list endpoints via select/prefetch_related).
2. End-to-end multi-step business workflow:
   Register -> Verify -> Login -> Org Setup -> Branches -> Invites -> Roles -> API Key -> Logout.
"""

from __future__ import annotations

import pytest
from django.core import mail
from django.test.utils import CaptureQueriesContext

from apps.accounts.models import EmailVerification
from apps.core.models import Organization, User
from apps.organizations.models import Membership
from apps.permissions.models import Role

XHR = {"HTTP_X_REQUESTED_WITH": "XMLHttpRequest"}


@pytest.mark.django_db
class TestDatabaseQueryPerformance:
    """Verifies queries do not suffer from N+1 scaling bottlenecks."""

    def test_member_list_query_count_is_bounded(self, api):
        """Verifies MemberListView does not issue N queries for N members."""
        org = Organization.objects.create(name="Scale Freight", slug="scale-freight")
        role = Role.objects.create(organization=org, name="dispatcher", is_builtin=True)

        # Create 25 members
        users = [
            User.objects.create_user(email=f"member_{i}@scale.com", password="Password123!")
            for i in range(25)
        ]
        Membership.objects.bulk_create(
            [Membership(organization=org, user=u, role=role) for u in users]
        )

        owner = User.objects.create_user(email="owner@scale.com", password="Password123!")
        role_owner = Role.objects.create(organization=org, name="owner", is_builtin=True)
        Membership.objects.create(organization=org, user=owner, role=role_owner)

        from apps.accounts.services import issue_access

        token, _ = issue_access(owner, org.id, "owner")
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        from django.db import connection

        with CaptureQueriesContext(connection) as queries:
            resp = api.get("/api/v1/organizations/current/members/?page=1")
            assert resp.status_code == 200
            assert len(resp.json()["results"]) == 20  # page size limit

        # Query count must remain under 10 (count query + page fetch + permission check)
        # In un-optimized N+1 it would be 20+ queries.
        assert len(queries) <= 8, f"Too many queries executed: {len(queries)}"

    def test_role_list_query_count_is_bounded(self, api):
        """Verifies RoleListCreateView prefetch_related grants prevents N+1 queries."""
        org = Organization.objects.create(name="Role Scale Freight", slug="role-scale")
        owner = User.objects.create_user(email="owner@rolescale.com", password="Password123!")

        from apps.permissions.services import seed_builtin_roles

        seed_builtin_roles(org)
        role_owner = Role.objects.get(organization=org, name="owner")
        Membership.objects.create(organization=org, user=owner, role=role_owner)

        from apps.accounts.services import issue_access

        token, _ = issue_access(owner, org.id, "owner")
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        from django.db import connection

        with CaptureQueriesContext(connection) as queries:
            resp = api.get("/api/v1/roles/")
            assert resp.status_code == 200
            assert len(resp.json()["results"]) >= 12

        # Bounded query count: roles query + prefetched grants query + permission check
        assert len(queries) <= 8, f"Too many queries executed for role listing: {len(queries)}"


@pytest.mark.django_db
class TestEndToEndCompanyOnboardingWorkflow:
    """Tests complete end-to-end lifecycle from blank state to fully configured company."""

    def test_complete_onboarding_journey(self, api):
        mail.outbox.clear()
        email = "founder@apexlogistics.uz"
        password = "ApexEnterpriseSecurePass2026!"

        # Step 1: Register Organization & User
        reg_payload = {
            "companyName": "Apex Global Logistics LLC",
            "email": email,
            "password": password,
            "adminFullName": "Javohir Khakimov",
            "phone": "+998 90 999 88 77",
            "acceptTerms": True,
        }
        reg_resp = api.post("/api/v1/auth/register/", reg_payload, format="json")
        assert reg_resp.status_code == 201
        assert reg_resp.json()["verification_required"] is True

        # Step 2: Retrieve verification code (dispatched asynchronously via Celery)
        assert EmailVerification.objects.filter(
            user__email=email, consumed_at__isnull=True
        ).exists()

        # In tests we extract code from sent mail
        assert len(mail.outbox) >= 1
        import re

        match = re.search(r"\b(\d{6})\b", mail.outbox[0].body)
        assert match is not None
        code = match.group(1)

        # Step 3: Verify email address
        verify_resp = api.post(
            "/api/v1/auth/verify-email/",
            {"email": email, "code": code},
            format="json",
        )
        assert verify_resp.status_code == 200
        assert verify_resp.json()["verified"] is True

        # Step 4: Login to receive access token and HttpOnly refresh cookie
        login_resp = api.post(
            "/api/v1/auth/login/",
            {"email": email, "password": password},
            format="json",
        )
        assert login_resp.status_code == 200
        auth_data = login_resp.json()
        token = auth_data["access"]
        assert auth_data["user"]["role"] == "owner"
        assert "lr_refresh" in login_resp.cookies

        # Authorize client
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # Step 5: Read and configure organization profile
        org_patch_resp = api.patch(
            "/api/v1/organizations/current/",
            {
                "legal_name": "Apex Global Logistics Foreign Enterprise LLC",
                "tax_id": "UZ123456789",
                "headquarters_address": "Amir Temur Avenue 107, Tashkent, Uzbekistan",
                "base_currency": "USD",
            },
            format="json",
        )
        assert org_patch_resp.status_code == 200
        assert org_patch_resp.json()["legal_name"] == "Apex Global Logistics Foreign Enterprise LLC"

        # Step 6: Create primary operational branch
        branch_resp = api.post(
            "/api/v1/organizations/current/branches/",
            {
                "name": "Tashkent International Hub",
                "code": "TAS-01",
                "type": "distribution_center",
                "is_primary": True,
                "address": "Tashkent Ring Road 45",
            },
            format="json",
        )
        assert branch_resp.status_code == 201
        assert branch_resp.json()["is_primary"] is True

        # Step 7: Update operational settings
        settings_resp = api.patch(
            "/api/v1/organizations/current/settings/",
            {
                "distance_unit": "mi",
                "date_format": "DD/MM/YYYY",
            },
            format="json",
        )
        assert settings_resp.status_code == 200
        assert settings_resp.json()["distance_unit"] == "mi"
        assert settings_resp.json()["date_format"] == "DD/MM/YYYY"

        # Step 8: Invite a new dispatcher
        invite_resp = api.post(
            "/api/v1/organizations/current/invitations/",
            {"email": "dispatcher@apexlogistics.uz", "role": "dispatcher"},
            format="json",
        )
        assert invite_resp.status_code == 201
        assert invite_resp.json()["email"] == "dispatcher@apexlogistics.uz"

        # Step 9: Create custom role
        role_resp = api.post(
            "/api/v1/roles/",
            {
                "name": "custom_controller",
                "label": "Compliance Controller",
                "description": "Compliance & Audit Specialist",
                "permissions": ["analytics.dashboard.view", "analytics.report.view"],
            },
            format="json",
        )
        assert role_resp.status_code == 201
        assert role_resp.json()["name"] == "custom_controller"

        # Step 10: Issue telematics API key
        key_resp = api.post(
            "/api/v1/organizations/current/api-keys/",
            {
                "name": "Fleet GPS Gateway",
                "scopes": ["tracking.location.view", "tracking.device.view"],
            },
            format="json",
        )
        assert key_resp.status_code == 201
        assert "secret" in key_resp.json()
        assert key_resp.json()["secret"].startswith("logi_live_")

        # Step 11: Rotate refresh token session
        api.cookies["lr_refresh"] = login_resp.cookies["lr_refresh"].value
        refresh_resp = api.post("/api/v1/auth/refresh/", {}, **XHR)
        assert refresh_resp.status_code == 200
        assert "access" in refresh_resp.json()

        # Step 12: Logout
        logout_resp = api.post("/api/v1/auth/logout/", {}, **XHR)
        assert logout_resp.status_code == 204
