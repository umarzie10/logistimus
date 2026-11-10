"""RLS mechanism tests — run ONLY on PostgreSQL (skip on SQLite unit runs).

Proves the fail-closed tenant isolation from DATABASE_SCHEMA §15 /
SECURITY_PLAN §3.5 against a real database:

- no org context            → every row invisible (fail closed);
- org context               → only that org's rows visible;
- platform_admin context    → all rows visible;
- cross-org INSERT          → rejected by WITH CHECK.

A scratch table is used because module tables gain RLS in their own
migrations (Phase 3+); this validates the shared `enable_rls` helper that
every future migration calls.
"""

from __future__ import annotations

import uuid

import pytest
from django.db import connection, transaction

from apps.core import context as core_context
from apps.core import db as core_db

pytestmark = pytest.mark.skipif(
    connection.vendor != "postgresql",
    reason="RLS requires PostgreSQL (DATABASE_SCHEMA §15)",
)

ROLE = "rls_test_app"
TABLE = "rls_scratch_test"


@pytest.fixture()
def scratch_rls(db):
    """Scratch table with RLS + a non-superuser role to exercise policies.

    Everything runs inside pytest-django's per-test transaction (rolled back
    automatically); savepoint-guarded statements keep one failed command from
    poisoning the rest of the fixture.
    """
    org_a, org_b = uuid.uuid4(), uuid.uuid4()
    with connection.cursor() as cursor:
        # Remove leftovers from a crashed run (transactional DDL normally
        # rolls back; this only matters if a previous session died hard).
        with transaction.atomic():
            cursor.execute(
                f"""
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{ROLE}') THEN
                        EXECUTE 'REVOKE ALL ON SCHEMA public FROM ' || '{ROLE}';
                        EXECUTE 'DROP ROLE ' || '{ROLE}';
                    END IF;
                END $$;
                """
            )
        cursor.execute(f"CREATE ROLE {ROLE} NOLOGIN")
        cursor.execute(
            f"""
            CREATE TABLE {TABLE} (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                organization_id uuid NOT NULL,
                label text NOT NULL
            )
            """
        )
        cursor.execute(core_db.enable_rls(TABLE, f"{TABLE}_tenant_policy"))
        cursor.execute(f"GRANT USAGE ON SCHEMA public TO {ROLE}")
        cursor.execute(f"GRANT ALL ON TABLE {TABLE} TO {ROLE}")

        # Seed as superuser (superusers bypass RLS on insert)
        cursor.execute(
            f"INSERT INTO {TABLE} (organization_id, label) VALUES (%s, %s), (%s, %s)",
            [org_a, "row-a", org_b, "row-b"],
        )

    yield {"org_a": org_a, "org_b": org_b}

    try:
        with transaction.atomic():  # savepoint: failure rolls back, not aborts
            with connection.cursor() as cursor:
                cursor.execute(f"SET ROLE {connection.settings_dict['USER']}")
                cursor.execute(f"REVOKE ALL ON SCHEMA public FROM {ROLE}")
                cursor.execute(f"DROP TABLE IF EXISTS {TABLE}")
                cursor.execute(f"DROP ROLE IF EXISTS {ROLE}")
    except Exception:  # noqa: BLE001 - teardown must not mask test results
        pass
    finally:
        # SET ROLE is session state (survives rollback) — always restore
        with connection.cursor() as cursor:
            cursor.execute(f"SET ROLE {connection.settings_dict['USER']}")
    core_context.set_org_id(None)
    core_context.set_platform_admin(False)


def _labels_as_app(org_id: uuid.UUID | None, *, platform_admin: bool = False) -> list[str]:
    """SELECT as the limited role under a given tenant context."""
    token_org = core_context.set_org_id(org_id)
    token_admin = core_context.set_platform_admin(platform_admin)
    try:
        with connection.cursor() as cursor:
            cursor.execute(f"SET ROLE {ROLE}")
            try:
                # set_config(..., is_local=true) needs the request transaction;
                # tests run inside one (pytest-django atomic wrapper).
                core_db.set_organization_context(org_id, platform_admin=platform_admin)
                cursor.execute(f"SELECT label FROM {TABLE} ORDER BY label")
                return [row[0] for row in cursor.fetchall()]
            finally:
                cursor.execute(f"SET ROLE {connection.settings_dict['USER']}")
    finally:
        core_context.reset(token_org, core_context._current_org_id)
        core_context.reset(token_admin, core_context._current_platform_admin)


class TestRLSPostgres:
    def test_fail_closed_without_context(self, scratch_rls):
        assert _labels_as_app(None) == []

    def test_org_context_scopes_rows(self, scratch_rls):
        assert _labels_as_app(scratch_rls["org_a"]) == ["row-a"]
        assert _labels_as_app(scratch_rls["org_b"]) == ["row-b"]

    def test_platform_admin_sees_all(self, scratch_rls):
        labels = _labels_as_app(scratch_rls["org_a"], platform_admin=True)
        assert labels == ["row-a", "row-b"]

    def test_cross_org_insert_rejected(self, scratch_rls):
        org_a, org_b = scratch_rls["org_a"], scratch_rls["org_b"]
        token = core_context.set_org_id(org_a)
        try:
            with connection.cursor() as cursor:
                cursor.execute(f"SET ROLE {ROLE}")
                try:
                    core_db.set_organization_context(org_a)
                    # The atomic block must SEE the exception so Django rolls
                    # back to the savepoint; catching it inside would leave the
                    # subtransaction aborted.
                    with pytest.raises(Exception) as excinfo:
                        with transaction.atomic():
                            cursor.execute(
                                f"INSERT INTO {TABLE} (organization_id, label) VALUES (%s, %s)",
                                [org_b, "smuggled"],
                            )
                    assert "row-level security" in str(excinfo.value).lower()
                finally:
                    cursor.execute(f"SET ROLE {connection.settings_dict['USER']}")
        finally:
            core_context.reset(token, core_context._current_org_id)

        # Nothing leaked in
        assert _labels_as_app(org_a) == ["row-a"]
        assert _labels_as_app(org_b) == ["row-b"]

    def test_policy_present_on_scratch_table(self, scratch_rls):
        assert TABLE in core_db.rls_enabled_tables()

    def test_set_organization_context_requires_transaction(self, scratch_rls):
        # Outside an atomic block SET LOCAL would silently be a no-op;
        # the helper refuses instead (pooling safety, db.py docstring).
        if not connection.in_atomic_block:  # pragma: no cover
            with pytest.raises(RuntimeError, match="open transaction"):
                core_db.set_organization_context(scratch_rls["org_a"])


class _FakeField:
    name = "organization"


class _FakeMeta:
    def __init__(self, table):
        self.db_table = table


class _FakeModel:
    traced_by_org = True
    _meta = None

    def __init__(self, table):
        self._meta = _FakeMeta(table)
        self._meta.fields = [_FakeField()]


class TestRLSConventionCheck:
    """E001 must fire for an existing table without RLS, and stay silent for
    a database where migrations have not run yet.

    The second half is a deployment regression guard: `manage.py migrate`
    executes system checks BEFORE applying migrations, so a check that
    flags absent tables deadlocks every fresh install (the RLS policy could
    never be created). Found during Phase 3 staging readiness.
    """

    def test_migrated_database_passes(self, db):
        # Requires a migrated database: the check queries pg_class.
        from apps.core.checks import rls_convention_check

        assert rls_convention_check(None) == []

    def test_absent_table_is_not_an_error(self, monkeypatch):
        from apps.core import checks

        # Simulate a brand-new database: the model exists in Django, the
        # physical table does not.
        monkeypatch.setattr(
            checks,
            "db",
            type(
                "Db",
                (),
                {
                    "rls_enabled_tables": staticmethod(lambda: []),
                    "existing_tables": staticmethod(set),
                    "_vendor_is_postgres": staticmethod(lambda: True),
                },
            )(),
        )
        monkeypatch.setattr(
            "django.apps.apps.get_models",
            lambda: [_FakeModel("organizations_branch")],
        )
        assert checks.rls_convention_check(None) == []

    def test_existing_table_without_rls_is_an_error(self, monkeypatch):
        from apps.core import checks

        monkeypatch.setattr(
            checks,
            "db",
            type(
                "Db",
                (),
                {
                    "rls_enabled_tables": staticmethod(lambda: []),
                    "existing_tables": staticmethod(
                        lambda: {"organizations_branch"}
                    ),
                    "_vendor_is_postgres": staticmethod(lambda: True),
                },
            )(),
        )
        monkeypatch.setattr(
            "django.apps.apps.get_models",
            lambda: [_FakeModel("organizations_branch")],
        )
        errors = checks.rls_convention_check(None)
        assert len(errors) == 1
        assert errors[0].id == "logistimus.E001"
