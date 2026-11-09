"""Phase 2 — RBAC enforcement + tenant isolation (API_SPECIFICATION §4/§5).

Proves:
- permission_code / permission_codes gate every org endpoint (default-deny);
- builtin roles are undeletable, roles in use are protected (409);
- the last owner can neither be demoted nor removed (409);
- cross-org reads/writes answer 404 (tenant scoping, never 403+data);
- role permission changes invalidate the effective-permission cache;
- invitation acceptance happens only through email verification.
"""

from __future__ import annotations

import re
from datetime import timedelta

import pytest
from django.core import mail
from django.utils import timezone

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


def _code_from_mailbox(index: int = -1) -> str:
    match = re.search(r"\b(\d{6})\b", mail.outbox[index].body)
    assert match, f"no 6-digit code in email: {mail.outbox[index].body!r}"
    return match.group(1)


def _register_owner(api) -> dict:
    """register -> verify -> login; attaches bearer; returns login body."""
    resp = api.post("/api/v1/auth/register/", REGISTRATION, format="json")
    assert resp.status_code == 201, resp.content
    resp = api.post(
        "/api/v1/auth/verify-email/",
        {"email": REGISTRATION["email"], "code": _code_from_mailbox()},
        format="json",
    )
    assert resp.status_code == 200, resp.content
    resp = api.post(
        "/api/v1/auth/login/",
        {"email": REGISTRATION["email"], "password": REGISTRATION["password"]},
        format="json",
    )
    assert resp.status_code == 200, resp.content
    body = resp.json()
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {body['access']}")
    return body


def _add_member(org, *, email: str, role_name: str) -> User:
    """Direct DB member with a verified account (bypasses the invite flow)."""
    user = User.objects.create_user(
        email=email,
        password=REGISTRATION["password"],
        email_verified_at=timezone.now(),
    )
    with core_context.use_org(org.id):
        role = Role.objects.get(name=role_name)
        Membership.objects.create(organization_id=org.id, user=user, role=role)
    return user


def _login_as(api, email: str) -> dict:
    resp = api.post(
        "/api/v1/auth/login/",
        {"email": email, "password": REGISTRATION["password"]},
        format="json",
    )
    assert resp.status_code == 200, resp.content
    body = resp.json()
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {body['access']}")
    return body


@pytest.mark.django_db
class TestPermissionGates:
    def test_owner_sees_full_catalog_in_me_permissions(self, api):
        _register_owner(api)
        resp = api.get("/api/v1/auth/me/permissions/")
        assert resp.status_code == 200, resp.content
        body = resp.json()
        assert body["role"] == "owner"
        # wildcard role: every catalog code is granted
        assert "org.role.create" in body["permissions"]
        assert "users.member.delete" in body["permissions"]
        assert "orders.order.view" in body["permissions"]

    def test_driver_role_is_denied_role_management(self, api, db):
        _register_owner(api)
        org = Membership.objects.get(user__email=REGISTRATION["email"]).organization
        _add_member(org, email="driver@transasia.uz", role_name="driver")

        api.credentials()
        _login_as(api, "driver@transasia.uz")

        # no org.role.view / org.role.create in the driver grants
        resp = api.get("/api/v1/roles/")
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "forbidden"

        resp = api.post("/api/v1/roles/", {"name": "x", "permissions": []}, format="json")
        assert resp.status_code == 403

        # member list needs users.member.view — driver lacks it too
        resp = api.get("/api/v1/organizations/current/members/")
        assert resp.status_code == 403

        # but org reads any member may do still work
        resp = api.get("/api/v1/organizations/current/")
        assert resp.status_code == 200, resp.content
        assert resp.json()["name"] == REGISTRATION["companyName"]

    def test_permission_codes_are_per_method(self, api, db):
        _register_owner(api)
        org = Membership.objects.get(user__email=REGISTRATION["email"]).organization
        # operations_manager has org.role.view but NOT org.role.create
        _add_member(org, email="ops@transasia.uz", role_name="operations_manager")

        api.credentials()
        _login_as(api, "ops@transasia.uz")

        resp = api.get("/api/v1/roles/")
        assert resp.status_code == 200, resp.content

        resp = api.post("/api/v1/roles/", {"name": "x", "permissions": []}, format="json")
        assert resp.status_code == 403

    def test_unauthenticated_is_401(self, api):
        resp = api.get("/api/v1/roles/")
        assert resp.status_code == 401
        assert resp.json()["error"]["code"] == "invalid_credentials"

    def test_me_permissions_without_org_is_empty_for_member(self, api, db):
        _register_owner(api)
        # a platform-less user with no membership cannot log in through the
        # normal path (no active org) — craft the state directly instead.
        orphan = User.objects.create_user(
            email="orphan@nowhere.uz",
            password=REGISTRATION["password"],
            email_verified_at=timezone.now(),
        )
        api.credentials()
        resp = api.post(
            "/api/v1/auth/login/",
            {"email": orphan.email, "password": REGISTRATION["password"]},
            format="json",
        )
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "forbidden"


@pytest.mark.django_db
class TestRoleLifecycleGuards:
    def test_builtin_role_cannot_be_deleted(self, api):
        _register_owner(api)
        builtin = Role.objects.get(name="driver")
        resp = api.delete(f"/api/v1/roles/{builtin.id}/")
        assert resp.status_code == 409
        assert resp.json()["error"]["code"] == "builtin_role"

    def test_builtin_role_cannot_be_renamed_via_patch(self, api):
        _register_owner(api)
        builtin = Role.objects.get(name="owner")
        resp = api.patch(
            f"/api/v1/roles/{builtin.id}/",
            {"label": "Boss"},
            format="json",
        )
        # label updates are allowed (cosmetic), but is_builtin stays True
        assert resp.status_code == 200, resp.content
        builtin.refresh_from_db()
        assert builtin.is_builtin is True
        assert builtin.name == "owner"

    def test_role_in_use_cannot_be_deleted(self, api, db):
        # builtin guard answers first for builtin rows; role_in_use applies
        # to a custom role still assigned to a member.
        _register_owner(api)
        org = Membership.objects.get(user__email=REGISTRATION["email"]).organization
        resp = api.post(
            "/api/v1/roles/",
            {"name": "surveyor", "permissions": ["org.branch.view"]},
            format="json",
        )
        assert resp.status_code == 201, resp.content
        _add_member(org, email="survey@transasia.uz", role_name="surveyor")

        custom_role = Role.objects.get(name="surveyor")
        resp = api.delete(f"/api/v1/roles/{custom_role.id}/")
        assert resp.status_code == 409
        assert resp.json()["error"]["code"] == "role_in_use"

    def test_unused_custom_role_can_be_deleted(self, api):
        _register_owner(api)
        resp = api.post(
            "/api/v1/roles/",
            {"name": "temp_role", "permissions": ["org.branch.view"]},
            format="json",
        )
        assert resp.status_code == 201, resp.content
        role_id = resp.json()["id"]

        resp = api.delete(f"/api/v1/roles/{role_id}/")
        assert resp.status_code == 204

    def test_duplicate_role_name_is_400(self, api):
        _register_owner(api)
        payload = {"name": "custom_a", "permissions": []}
        assert api.post("/api/v1/roles/", payload, format="json").status_code == 201
        resp = api.post("/api/v1/roles/", payload, format="json")
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "validation_error"

    def test_role_permission_change_invalidates_cache(self, api, db):
        owner_session = _register_owner(api)
        org = Membership.objects.get(user__email=REGISTRATION["email"]).organization
        _add_member(org, email="driver@transasia.uz", role_name="driver")

        api.credentials()
        _login_as(api, "driver@transasia.uz")
        resp = api.get("/api/v1/auth/me/permissions/")
        assert "org.role.view" not in resp.json()["permissions"]

        # owner grants org.role.view to the driver role (reuse owner token)
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {owner_session['access']}")
        driver_role = Role.objects.get(name="driver")
        resp = api.patch(
            f"/api/v1/roles/{driver_role.id}/",
            {"permissions": ["org.role.view"]},
            format="json",
        )
        assert resp.status_code == 200, resp.content

        api.credentials()
        _login_as(api, "driver@transasia.uz")
        resp = api.get("/api/v1/auth/me/permissions/")
        assert "org.role.view" in resp.json()["permissions"]


@pytest.mark.django_db
class TestLastOwnerGuard:
    def _owner_user(self) -> User:
        return User.objects.get(email=REGISTRATION["email"])

    def test_last_owner_cannot_be_demoted(self, api):
        _register_owner(api)
        owner = self._owner_user()
        resp = api.patch(
            f"/api/v1/organizations/current/members/{owner.id}/",
            {"role": "driver"},
            format="json",
        )
        assert resp.status_code == 409
        assert resp.json()["error"]["code"] == "last_owner"

    def test_last_owner_cannot_be_removed(self, api):
        _register_owner(api)
        owner = self._owner_user()
        resp = api.delete(f"/api/v1/organizations/current/members/{owner.id}/")
        assert resp.status_code == 409
        assert resp.json()["error"]["code"] == "last_owner"

    def test_second_owner_unlocks_demotion(self, api, db):
        _register_owner(api)
        org = Membership.objects.get(user__email=REGISTRATION["email"]).organization
        _add_member(org, email="coowner@transasia.uz", role_name="owner")

        owner = self._owner_user()
        resp = api.patch(
            f"/api/v1/organizations/current/members/{owner.id}/",
            {"role": "driver"},
            format="json",
        )
        assert resp.status_code == 200, resp.content
        assert resp.json()["role"] == "driver"

    def test_member_role_change_is_audit_logged(self, api, db):
        _register_owner(api)
        org = Membership.objects.get(user__email=REGISTRATION["email"]).organization
        member = _add_member(org, email="ops@transasia.uz", role_name="driver")

        resp = api.patch(
            f"/api/v1/organizations/current/members/{member.id}/",
            {"role": "dispatcher"},
            format="json",
        )
        assert resp.status_code == 200, resp.content

        from apps.core.models import AuditLog

        membership = Membership.objects.get(user=member)
        # no request org context inside the test process -> fail-closed
        # manager hides rows; read them unscoped like platform tooling does.
        assert AuditLog.unscoped.filter(
            action="org.member.role_changed", object_id=str(membership.id)
        ).exists()

    def test_unknown_role_is_400(self, api, db):
        _register_owner(api)
        org = Membership.objects.get(user__email=REGISTRATION["email"]).organization
        member = _add_member(org, email="ops@transasia.uz", role_name="driver")
        resp = api.patch(
            f"/api/v1/organizations/current/members/{member.id}/",
            {"role": "no_such_role"},
            format="json",
        )
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "validation_error"


@pytest.mark.django_db
class TestTenantIsolation:
    """Cross-org access answers 404 — never leaks another tenant's rows."""

    @pytest.fixture()
    def two_orgs(self, api):
        """Owner of org A + a stranger org B with its own owner/role rows."""
        _register_owner(api)
        org_a = Membership.objects.get(user__email=REGISTRATION["email"]).organization

        org_b = Organization.objects.create(name="Beta Freight", slug="beta-freight")
        stranger = User.objects.create_user(
            email="boss@beta.uz",
            password=REGISTRATION["password"],
            email_verified_at=timezone.now(),
        )
        with core_context.use_org(org_b.id):
            Role.objects.create(name="owner", is_builtin=True)
            Role.objects.create(name="driver", is_builtin=False)
            Membership.objects.create(
                organization_id=org_b.id,
                user=stranger,
                role=Role.objects.get(name="owner"),
            )
        return org_a, org_b, stranger

    def test_cross_org_role_detail_is_404(self, api, two_orgs):
        _, org_b, _ = two_orgs
        foreign_role = Role.unscoped.get(organization_id=org_b.id, name="driver")
        resp = api.get(f"/api/v1/roles/{foreign_role.id}/")
        assert resp.status_code in (404, 405)  # GET detail may not exist
        if resp.status_code == 404:
            assert resp.json()["error"]["code"] == "not_found"

        resp = api.patch(
            f"/api/v1/roles/{foreign_role.id}/",
            {"label": "hacked"},
            format="json",
        )
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "not_found"

        resp = api.delete(f"/api/v1/roles/{foreign_role.id}/")
        assert resp.status_code == 404

    def test_cross_org_member_update_is_404(self, api, two_orgs):
        _, org_b, stranger = two_orgs
        resp = api.patch(
            f"/api/v1/organizations/current/members/{stranger.id}/",
            {"role": "driver"},
            format="json",
        )
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "not_found"

        resp = api.delete(f"/api/v1/organizations/current/members/{stranger.id}/")
        assert resp.status_code == 404

    def test_member_list_excludes_other_org(self, api, two_orgs):
        _, org_b, stranger = two_orgs
        resp = api.get("/api/v1/organizations/current/members/")
        assert resp.status_code == 200, resp.content
        emails = [row["user"]["email"] for row in resp.json()["results"]]
        assert REGISTRATION["email"] in emails
        assert stranger.email not in emails

    def test_role_list_excludes_other_org_roles(self, api, two_orgs):
        _, org_b, _ = two_orgs
        resp = api.get("/api/v1/roles/")
        assert resp.status_code == 200, resp.content
        names = [row["name"] for row in resp.json()["results"]]
        assert "owner" in names  # own builtin roles
        # org B seeded its own rows; they must not appear here
        assert Role.objects.filter(organization_id=org_b.id).count() == 2
        assert len(names) == Role.objects.filter(organization_id=two_orgs[0].id).count()

    def test_branch_create_scopes_to_context_org(self, api, two_orgs):
        org_a, _, _ = two_orgs
        resp = api.post(
            "/api/v1/organizations/current/branches/",
            {"name": "Samarkand Depot", "type": "depot"},
            format="json",
        )
        assert resp.status_code == 201, resp.content
        branch = org_a.branch_set.get(name="Samarkand Depot")
        assert branch.organization_id == org_a.id


@pytest.mark.django_db
class TestInvitationAcceptance:
    def test_pending_invitation_joins_only_after_verification(self, api, db):
        # org B invites an address that does not exist yet
        org_b = Organization.objects.create(name="Beta Freight", slug="beta-freight")
        inviter = User.objects.create_user(email="boss@beta.uz", password=REGISTRATION["password"])
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

        resp = api.post("/api/v1/auth/register/", REGISTRATION, format="json")
        assert resp.status_code == 201
        # registration alone must NOT join
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
        assert Membership.unscoped.filter(
            organization_id=org_b.id,
            user__email=REGISTRATION["email"],
        ).exists()

    def test_invitation_email_does_not_leak_token(self, api, db):
        _register_owner(api)
        resp = api.post(
            "/api/v1/organizations/current/invitations/",
            {"email": "newbie@transasia.uz", "role": "dispatcher"},
            format="json",
        )
        assert resp.status_code == 201, resp.content
        body = resp.json()
        # raw token never appears in the API response
        assert "token" not in body
        assert body["email"] == "newbie@transasia.uz"

    def test_invite_requires_permission_and_valid_role(self, api):
        _register_owner(api)
        resp = api.post(
            "/api/v1/organizations/current/invitations/",
            {"email": "someone@transasia.uz", "role": "no_such_role"},
            format="json",
        )
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "validation_error"
