"""Regression tests for `manage.py seed_staging` (Phase 9).

Covers:
- Guard 1: refuses without `--yes-synthetic`
- Guard 2: refuses when `DJANGO_ENV == "production"`
- Guard 3: refuses when database holds non-synthetic users
- Happy path: creates two organizations, pre-verified users, branches,
  departments, roles, memberships, invitations
- Idempotency: re-running skips existing orgs and does not duplicate
- Synthetic invariants: every created email ends in `@example.invalid`
- Login check: seeded user can log in immediately (email_verified_at set)
"""

from __future__ import annotations

import io
from unittest import mock

import pytest
from django.core.management import CommandError, call_command

from apps.accounts import services as accounts_services
from apps.core.models import Organization, User
from apps.organizations.models import Branch, Department, Invitation, Membership
from apps.permissions.models import Role


@pytest.fixture()
def catalog(db):
    """Ensure permissions catalog is seeded so builtin roles have targets."""
    from apps.permissions import services as perm_services

    perm_services.seed_catalog()


@pytest.mark.django_db
class TestSeedStagingGuards:
    def test_refuses_without_yes_synthetic(self, catalog):
        with pytest.raises(CommandError, match="--yes-synthetic"):
            call_command("seed_staging")

    def test_refuses_on_production_env(self, catalog):
        with mock.patch("django.conf.settings.DJANGO_ENV", "production"):
            with pytest.raises(CommandError, match="DJANGO_ENV=production"):
                call_command("seed_staging", "--yes-synthetic")

    def test_refuses_when_real_user_exists(self, catalog):
        User.objects.create_user(email="real-person@company.com", password="password123")
        with pytest.raises(CommandError, match="contains non-synthetic users"):
            call_command("seed_staging", "--yes-synthetic")

    def test_password_too_short(self, catalog):
        with pytest.raises(CommandError, match="at least 8"):
            call_command("seed_staging", "--yes-synthetic", "--password=short")


@pytest.mark.django_db
class TestSeedStagingHappyPath:
    def test_seeds_expected_entities_and_is_idempotent(self, catalog):
        out = io.StringIO()
        call_command(
            "seed_staging",
            "--yes-synthetic",
            "--password=StagingSecret123!",
            stdout=out,
        )
        report = out.getvalue()
        assert "SEED_OK" in report
        assert "organizations: 2" in report
        assert "users: 4" in report

        # Verify organizations
        orgs = list(Organization.objects.filter(name__icontains="Staging"))
        assert len(orgs) == 2

        # Verify users: every single one is on @example.invalid + pre-verified
        users = list(User.objects.all())
        assert len(users) == 4
        for u in users:
            assert u.email.endswith(".example.invalid")
            assert u.email_verified_at is not None
            assert not u.is_staff
            assert not u.is_superuser

        # Verify tenant rows via unscoped (no request context active here)
        assert Branch.unscoped.count() == 4  # 2 per org (HQ + 1)
        assert Department.unscoped.count() == 4  # 2 per org
        assert Membership.unscoped.count() == 4  # 2 per org
        assert Invitation.unscoped.count() == 2  # 1 per org
        # 12 builtin roles per org
        assert Role.unscoped.filter(is_builtin=True).count() == 24

        # Verify owner can log in immediately
        owner = User.objects.get(email="owner@northwind-freight-staging.example.invalid")
        body, raw, row = accounts_services.login(
            email=owner.email,
            password="StagingSecret123!",
        )
        assert body["user"]["email"] == owner.email
        assert body["user"]["role"] == "owner"
        assert body["organization"]["name"] == "Northwind Freight (Staging)"

        # Idempotency: re-running does not duplicate, reports skipped
        out2 = io.StringIO()
        call_command(
            "seed_staging",
            "--yes-synthetic",
            "--password=StagingSecret123!",
            stdout=out2,
        )
        report2 = out2.getvalue()
        assert "SEED_OK" in report2
        assert "organizations: 0" in report2
        assert "skipped (already present)" in report2
        assert User.objects.count() == 4
        assert Organization.objects.filter(name__icontains="Staging").count() == 2

    def test_generated_password_works(self, catalog):
        out = io.StringIO()
        call_command("seed_staging", "--yes-synthetic", stdout=out)
        report = out.getvalue()
        assert "generated password" in report
        assert "SEED_OK" in report
