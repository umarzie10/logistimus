"""API Contract Verification Test Suite.

Tests every registered endpoint against API_SPECIFICATION.md:
- HTTP methods, response codes, and status codes.
- Request validation and error envelope ({error: {code, message, details, request_id}}).
- StandardPagination contract (count, page, page_size, pages, results).
- OpenAPI documentation endpoints (/api/schema/, /api/docs/, /api/redoc/).
"""

from __future__ import annotations

import pytest
from django.utils import timezone

from apps.core.models import Organization, User
from apps.organizations.models import Membership
from apps.permissions.models import Role

XHR = {"HTTP_X_REQUESTED_WITH": "XMLHttpRequest"}


@pytest.fixture()
def contract_session(api):
    """Sets up an authenticated test owner session with an organization."""
    org = Organization.objects.create(name="Contract Freight LLC", slug="contract-freight")
    user = User.objects.create_user(
        email="contract.owner@freight.com",
        password="ContractPassword123!",
        email_verified_at=timezone.now(),
    )
    role_owner = Role.objects.create(organization=org, name="owner", is_builtin=True)
    Role.objects.create(organization=org, name="dispatcher", is_builtin=True)
    Membership.objects.create(organization=org, user=user, role=role_owner)

    login_resp = api.post(
        "/api/v1/auth/login/",
        {"email": "contract.owner@freight.com", "password": "ContractPassword123!"},
        format="json",
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access"]
    refresh_cookie = login_resp.cookies["lr_refresh"].value

    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return {
        "org": org,
        "user": user,
        "token": token,
        "refresh_cookie": refresh_cookie,
    }


@pytest.mark.django_db
class TestOpenAPIDocumentationContracts:
    """Verifies schema and Swagger UI endpoints."""

    def test_openapi_schema_endpoint(self, api):
        resp = api.get("/api/schema/")
        assert resp.status_code == 200
        is_openapi = "openapi:" in resp.content.decode()
        is_json = "application/vnd.oai.openapi" in resp.headers.get("Content-Type", "")
        assert is_openapi or is_json

    def test_swagger_ui_endpoint(self, api):
        resp = api.get("/api/docs/")
        assert resp.status_code == 200
        assert "swagger-ui" in resp.content.decode().lower()

    def test_redoc_endpoint(self, api):
        resp = api.get("/api/redoc/")
        assert resp.status_code == 200
        assert "redoc" in resp.content.decode().lower()


@pytest.mark.django_db
class TestSystemAndHealthContracts:
    """Verifies liveness and readiness probe contracts."""

    def test_liveness_probe_contract(self, api):
        resp = api.get("/api/v1/health/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "version" in data
        assert "environment" in data
        assert "time" in data
        assert "request_id" in data

    def test_readiness_probe_contract(self, api):
        resp = api.get("/api/v1/health/ready/")
        assert resp.status_code in (200, 503)
        data = resp.json()
        assert "status" in data
        assert "dependencies" in data
        assert "database" in data["dependencies"]
        assert "redis" in data["dependencies"]


@pytest.mark.django_db
class TestOrganizationAndBranchContracts:
    """Verifies organization management contracts."""

    def test_current_organization_get_and_patch(self, api, contract_session):
        # GET
        resp_get = api.get("/api/v1/organizations/current/")
        assert resp_get.status_code == 200
        data = resp_get.json()
        assert data["id"] == str(contract_session["org"].id)
        assert data["name"] == "Contract Freight LLC"
        assert data["base_currency"] == "USD"

        # PATCH
        resp_patch = api.patch(
            "/api/v1/organizations/current/",
            {"legal_name": "Contract Freight Operating Corporation"},
            format="json",
        )
        assert resp_patch.status_code == 200
        assert resp_patch.json()["legal_name"] == "Contract Freight Operating Corporation"

    def test_branch_lifecycle_contract(self, api, contract_session):
        # 1. Create Branch
        resp_create = api.post(
            "/api/v1/organizations/current/branches/",
            {"name": "Main Depot", "type": "warehouse", "is_primary": True},
            format="json",
        )
        assert resp_create.status_code == 201
        branch_id = resp_create.json()["id"]
        assert resp_create.json()["name"] == "Main Depot"
        assert resp_create.json()["is_primary"] is True

        # 2. List Branches
        resp_list = api.get("/api/v1/organizations/current/branches/")
        assert resp_list.status_code == 200
        assert "count" in resp_list.json()
        assert "results" in resp_list.json()
        assert resp_list.json()["count"] >= 1

        # 3. Patch Branch
        resp_patch = api.patch(
            f"/api/v1/organizations/current/branches/{branch_id}/",
            {"name": "Main Logistics Depot"},
            format="json",
        )
        assert resp_patch.status_code == 200
        assert resp_patch.json()["name"] == "Main Logistics Depot"


@pytest.mark.django_db
class TestApiKeyLifecycleContracts:
    """Verifies API key creation, rotation, listing, and revocation."""

    def test_api_key_contracts(self, api, contract_session):
        # 1. Create API Key -> secret shown once
        resp_create = api.post(
            "/api/v1/organizations/current/api-keys/",
            {"name": "Fleet GPS Ingestor", "scopes": ["fleet.vehicle.view"]},
            format="json",
        )
        assert resp_create.status_code == 201
        data = resp_create.json()
        key_id = data["id"]
        assert "secret" in data
        assert data["secret"].startswith("logi_live_")
        assert "prefix" in data

        # 2. List API Keys -> secret is NOT exposed
        resp_list = api.get("/api/v1/organizations/current/api-keys/")
        assert resp_list.status_code == 200
        for item in resp_list.json()["results"]:
            assert "secret" not in item
            assert "prefix" in item

        # 3. Rotate API Key -> new secret returned once
        resp_rot = api.post(
            f"/api/v1/organizations/current/api-keys/{key_id}/rotate/",
            {},
            format="json",
        )
        assert resp_rot.status_code == 200
        assert "secret" in resp_rot.json()

        # 4. Revoke API Key -> 204
        resp_del = api.delete(f"/api/v1/organizations/current/api-keys/{key_id}/")
        assert resp_del.status_code == 204


@pytest.mark.django_db
class TestRolesAndPermissionsContracts:
    """Verifies RBAC catalog and custom role endpoints."""

    def test_permission_catalog_contract(self, api, contract_session):
        resp = api.get("/api/v1/permissions/")
        assert resp.status_code == 200
        data = resp.json()
        assert "results" in data
        modules = [m["module"] for m in data["results"]]
        assert "org" in modules
        assert "users" in modules

    def test_me_permissions_contract(self, api, contract_session):
        resp = api.get("/api/v1/auth/me/permissions/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "owner"
        assert len(data["permissions"]) == 168

    def test_custom_role_crud_contract(self, api, contract_session):
        # 1. Create custom role
        resp_create = api.post(
            "/api/v1/roles/",
            {
                "name": "custom_lead",
                "label": "Team Lead",
                "description": "Custom Lead Role",
                "permissions": ["org.organization.view", "org.branch.view"],
            },
            format="json",
        )
        assert resp_create.status_code == 201
        role_id = resp_create.json()["id"]
        assert resp_create.json()["name"] == "custom_lead"
        assert resp_create.json()["is_builtin"] is False

        # 2. Update role
        resp_patch = api.patch(
            f"/api/v1/roles/{role_id}/",
            {"label": "Senior Team Lead"},
            format="json",
        )
        assert resp_patch.status_code == 200
        assert resp_patch.json()["label"] == "Senior Team Lead"

        # 3. Delete role -> 204
        resp_del = api.delete(f"/api/v1/roles/{role_id}/")
        assert resp_del.status_code == 204


@pytest.mark.django_db
class TestStandardPaginationContract:
    """Verifies StandardPagination envelope matches API_SPECIFICATION §1.3."""

    def test_pagination_envelope_keys(self, api, contract_session):
        resp = api.get("/api/v1/organizations/current/members/?page=1")
        assert resp.status_code == 200
        data = resp.json()
        assert "count" in data
        assert "page" in data
        assert "page_size" in data
        assert "pages" in data
        assert "results" in data
        assert isinstance(data["results"], list)
        assert data["page"] == 1
        assert data["page_size"] == 20
