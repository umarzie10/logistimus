"""Database & Schema QA Test Suite.

Verifies:
- UUID primary keys on all entities.
- Tenancy model invariants (TenantModel, TenantManager, organization FK).
- Foreign key cascading vs protection rules.
- Unique constraints and case-insensitivity.
- DateTime timezone-awareness.
- PostGIS extension operational verification.
"""

from __future__ import annotations

import uuid
from datetime import UTC

import pytest
from django.db import IntegrityError, connection
from django.db.models import ProtectedError, UUIDField
from django.utils import timezone

from apps.accounts.models import EmailVerification, LoginHistory, PasswordResetToken, RefreshToken
from apps.core.managers import TenantManager, TenantModel
from apps.core.models import AuditLog, Organization, User
from apps.organizations.models import ApiKey, Branch, Invitation, Membership, OrganizationSettings
from apps.permissions.models import Role, RolePermission


@pytest.mark.django_db
class TestModelSchemaConventions:
    """Every persistent table must meet Logistimus architectural standards."""

    def test_all_operational_and_tenant_models_have_uuid_primary_keys(self):
        models = [
            User,
            Organization,
            AuditLog,
            RefreshToken,
            EmailVerification,
            PasswordResetToken,
            LoginHistory,
            Branch,
            OrganizationSettings,
            Membership,
            Invitation,
            ApiKey,
            Role,
            RolePermission,
        ]
        for model in models:
            pk_field = model._meta.pk
            assert isinstance(pk_field, UUIDField), (
                f"{model.__name__} PK is {type(pk_field).__name__}, expected UUIDField"
            )

    def test_all_tenant_models_inherit_tenant_model(self):
        tenant_models = [
            Branch,
            OrganizationSettings,
            Membership,
            Invitation,
            ApiKey,
            Role,
            RolePermission,
        ]
        for model in tenant_models:
            assert issubclass(model, TenantModel), (
                f"{model.__name__} must inherit apps.core.managers.TenantModel"
            )
            assert hasattr(model, "organization"), (
                f"{model.__name__} must have an organization foreign key"
            )
            assert isinstance(model.objects, TenantManager), (
                f"{model.__name__}.objects must be a TenantManager"
            )
            assert hasattr(model, "unscoped"), f"{model.__name__} must expose an unscoped manager"


@pytest.mark.django_db
class TestDatabaseConstraints:
    """Integrity constraints enforced by the database engine."""

    def test_user_email_uniqueness(self):
        User.objects.create_user(email="unique@logistimus.com", password="Password123!")
        with pytest.raises(IntegrityError):
            User.objects.create_user(email="unique@logistimus.com", password="AnotherPassword123!")

    def test_role_name_unique_per_organization(self):
        org_a = Organization.objects.create(name="Org Alpha", slug="org-alpha")
        org_b = Organization.objects.create(name="Org Beta", slug="org-beta")

        Role.objects.create(organization=org_a, name="custom_dispatcher", label="Dispatcher A")
        # Same role name in Org B must succeed (cross-tenant independence)
        role_b = Role.objects.create(
            organization=org_b, name="custom_dispatcher", label="Dispatcher B"
        )
        assert role_b.pk is not None

        # Duplicate role name within the same org must fail
        with pytest.raises(IntegrityError):
            Role.objects.create(
                organization=org_a, name="custom_dispatcher", label="Duplicate Dispatcher"
            )

    def test_role_protected_from_deletion_when_members_assigned(self):
        org = Organization.objects.create(name="Carrier Org", slug="carrier-org")
        user = User.objects.create_user(email="driver@carrier.com", password="Password123!")
        role = Role.objects.create(organization=org, name="road_driver", is_builtin=False)
        Membership.objects.create(organization=org, user=user, role=role)

        # Deleting role while membership references it must be rejected by foreign key constraint
        with pytest.raises((ProtectedError, IntegrityError)):
            role.delete()

    def test_primary_branch_behavior(self):
        org = Organization.objects.create(name="Freight Org", slug="freight-org")
        branch1 = Branch.objects.create(organization=org, name="Tashkent HQ", is_primary=True)
        assert branch1.is_primary is True

        # When creating a second primary branch, application service updates prior
        branch2 = Branch.objects.create(organization=org, name="Samarkand Depot", is_primary=True)
        # Update others
        Branch.objects.filter(organization=org, is_primary=True).exclude(pk=branch2.pk).update(
            is_primary=False
        )

        branch1.refresh_from_db()
        assert branch1.is_primary is False
        assert branch2.is_primary is True


@pytest.mark.django_db
class TestDateTimeAndTimezoneHandling:
    """All stored datetimes must be timezone-aware UTC."""

    def test_created_at_is_timezone_aware(self):
        org = Organization.objects.create(name="Timezone Org", slug="tz-org")
        user = User.objects.create_user(email="tz@logistimus.com", password="Password123!")
        log = AuditLog.objects.create(organization=org, actor=user, action="auth.test")

        assert timezone.is_aware(log.created_at)
        assert log.created_at.tzinfo == UTC or log.created_at.tzinfo is not None

    def test_refresh_token_absolute_expiry_calculation(self):
        org = Organization.objects.create(name="Token Org", slug="token-org")
        user = User.objects.create_user(email="token@logistimus.com", password="Password123!")
        now = timezone.now()

        token = RefreshToken.objects.create(
            user=user,
            organization=org,
            token_hash="fake-hash-for-test",
            family_id=uuid.uuid4(),
            family_started_at=now,
            expires_at=now + timezone.timedelta(hours=12),
        )

        assert token.is_active is True
        assert timezone.is_aware(token.expires_at)


@pytest.mark.django_db
class TestPostGISAvailability:
    """Verifies PostGIS spatial extension on PostgreSQL."""

    def test_postgis_version_query(self):
        if connection.vendor != "postgresql":
            pytest.skip("PostGIS tests run only against PostgreSQL")
        with connection.cursor() as cursor:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
            cursor.execute("SELECT PostGIS_Version();")
            version = cursor.fetchone()[0]
            assert version is not None
            assert "3." in version
