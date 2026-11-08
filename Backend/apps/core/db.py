"""PostgreSQL helpers: request-local tenant context + RLS plumbing.

The request middleware opens a transaction; authentication then issues

    SELECT set_config('app.organization_id', '<uuid>', true)   -- SET LOCAL

inside that transaction. RLS policies compare
`organization_id = current_setting('app.organization_id', true)::uuid`,
so an unset value yields NULL and denies every row (fail-closed).

On non-PostgreSQL backends (SQLite in unit tests) the no-op guard applies:
tenant isolation there is enforced by TenantManager alone, and the RLS test
suite only runs against PostgreSQL (see docs/backend/DATABASE_SCHEMA.md §15).
"""
from __future__ import annotations

from uuid import UUID

from django.db import connection


def _vendor_is_postgres() -> bool:
    return connection.vendor == "postgresql"


def set_organization_context(org_id: UUID | str | None, *, platform_admin: bool = False) -> None:
    """SET LOCAL the tenant id for the remainder of the request transaction.

    Must be called inside an open transaction (`TenantContextMiddleware`),
    otherwise PostgreSQL ignores SET LOCAL — we refuse to run then, because a
    leaked session-level value would break pooling safety.
    """
    if not _vendor_is_postgres():
        return
    if not connection.in_atomic_block:  # pragma: no cover - defensive
        raise RuntimeError("set_organization_context() requires an open transaction")

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT set_config(%s, %s, true)",
            ["app.platform_admin", "on" if platform_admin else "off"],
        )
        if org_id is None:
            cursor.execute("SELECT set_config(%s, %s, true)", ["app.organization_id", ""])
        else:
            cursor.execute(
                "SELECT set_config(%s, %s, true)", ["app.organization_id", str(org_id)]
            )


def clear_organization_context() -> None:
    set_organization_context(None)


def enable_rls(table: str, policy_name: str, *, force: bool = True) -> str:
    """SQL for a migration: enable RLS + tenant isolation policy.

    NULLIF guards the empty string written by `clear_organization_context()`:
    casting '' to uuid would abort the transaction instead of failing closed.
    Unset/empty context → NULL → predicate NULL → no rows (fail closed).
    """
    force_clause = "FORCE " if force else ""
    return f"""
    ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
    ALTER TABLE {table} {force_clause}ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS {policy_name} ON {table};
    CREATE POLICY {policy_name} ON {table}
        USING (
            organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid
            OR current_setting('app.platform_admin', true) = 'on'
        )
        WITH CHECK (
            organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid
        );
    """


def rls_enabled_tables() -> list[str]:
    if not _vendor_is_postgres():
        return []
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT c.relname
              FROM pg_class c
              JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE c.relkind = 'r'
               AND c.relrowsecurity
               AND n.nspname = 'public'
             ORDER BY c.relname
            """
        )
        return [row[0] for row in cursor.fetchall()]
