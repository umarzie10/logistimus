"""Platform Super Admin Endpoint Authorization & Contract Tests.

Verifies:
1. Strict authorization: Normal organization owners/admins/members cannot call /platform/* (403).
2. Super Admin access: Platform admins access real platform metrics,
   tenant management, audit logs, and system health.
"""

from __future__ import annotations

import pytest
from django.utils import timezone

from apps.accounts.services import issue_access
from apps.core.models import Organization, User
from apps.organizations.models import Membership
from apps.permissions.models import Role


@pytest.fixture()
def platform_env():
    """Sets up an organization owner (regular user) and a Platform Super Admin."""
    org = Organization.objects.create(name="Tenant Trucking", slug="tenant-trucking")
    owner = User.objects.create_user(
        email="owner@tenanttrucking.com",
        password="Password123!",
        email_verified_at=timezone.now(),
    )
    role_owner = Role.objects.create(organization=org, name="owner", is_builtin=True)
    Membership.objects.create(organization=org, user=owner, role=role_owner)
    owner_token, _ = issue_access(owner, org.id, "owner")

    superadmin = User.objects.create_user(
        email="superadmin@logistimus.com",
        password="SuperAdminSecurePass123!",
        platform_role=User.PlatformRole.PLATFORM_ADMIN,
        email_verified_at=timezone.now(),
    )
    # Platform admin token carries platform_role
    admin_token, _ = issue_access(superadmin, None, None)

    return {
        "org": org,
        "owner": owner,
        "owner_token": owner_token,
        "superadmin": superadmin,
        "admin_token": admin_token,
    }


@pytest.mark.django_db
class TestPlatformAdminAuthorization:
    """Proves ordinary tenant users cannot access platform management."""

    def test_unauthenticated_is_401(self, api):
        resp = api.get("/api/v1/platform/overview/")
        assert resp.status_code == 401
        assert resp.json()["error"]["code"] == "invalid_credentials"

    def test_organization_owner_is_forbidden_403(self, api, platform_env):
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {platform_env['owner_token']}")

        endpoints = [
            "/api/v1/platform/overview/",
            "/api/v1/platform/organizations/",
            f"/api/v1/platform/organizations/{platform_env['org'].id}/",
            "/api/v1/platform/audit-logs/",
            "/api/v1/platform/system-health/",
        ]
        for ep in endpoints:
            resp = api.get(ep)
            assert resp.status_code == 403, f"Endpoint {ep} should be 403 for org owner"
            assert resp.json()["error"]["code"] == "forbidden"


@pytest.mark.django_db
class TestPlatformAdminOperations:
    """Verifies Super Admin endpoints function with real data."""

    def test_super_admin_overview_metrics(self, api, platform_env):
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {platform_env['admin_token']}")
        resp = api.get("/api/v1/platform/overview/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["organizations"]["total"] >= 1
        assert data["users"]["total"] >= 2
        assert data["system"]["database_ok"] is True

    def test_super_admin_organizations_list_and_patch(self, api, platform_env):
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {platform_env['admin_token']}")
        org = platform_env["org"]

        # List organizations
        resp = api.get("/api/v1/platform/organizations/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] >= 1
        slugs = [o["slug"] for o in data["results"]]
        assert "tenant-trucking" in slugs

        # Patch organization verification status
        patch_resp = api.patch(
            f"/api/v1/platform/organizations/{org.id}/",
            {"verification_status": "verified", "is_active": True},
            format="json",
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["verification_status"] == "verified"

        org.refresh_from_db()
        assert org.verification_status == Organization.VerificationStatus.VERIFIED

    def test_super_admin_audit_logs_and_system_health(self, api, platform_env):
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {platform_env['admin_token']}")

        # Audit logs
        resp_logs = api.get("/api/v1/platform/audit-logs/")
        assert resp_logs.status_code == 200
        assert "results" in resp_logs.json()

        # System health
        resp_health = api.get("/api/v1/platform/system-health/")
        assert resp_health.status_code == 200
        data = resp_health.json()
        assert data["database"]["connected"] is True
        assert data["cache"]["connected"] is True
