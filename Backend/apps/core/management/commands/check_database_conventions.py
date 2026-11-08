"""`manage.py check_database_conventions` — CI gate for DATABASE_SCHEMA rules.

Verifies on PostgreSQL:
- every tenant-owned table has RLS enabled with a policy (fail → exit 1);
- human refs use tenant-aware uniqueness (UNIQUE includes organization_id)
  for tables exposing a `ref` column;
- money columns are numeric(…), never float/double.

On SQLite (unit-test runs) the command reports SKIPPED for pg-only rules so
local workflows stay usable; CI runs it against the PostGIS container.
"""
from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from apps.core import db

MONEY_COLUMN_HINTS = ("amount", "price", "cost", "total", "subtotal", "fee", "revenue", "budget")


class Command(BaseCommand):
    help = "Verify tenant/RLS/money conventions defined in docs/backend/DATABASE_SCHEMA.md"

    def handle(self, *args, **options):
        failures: list[str] = []
        notices: list[str] = []

        if not db._vendor_is_postgres():
            self.stdout.write(
                self.style.WARNING("SKIPPED: not PostgreSQL — RLS/index rules require pg.")
            )
            return

        from django.apps import apps
        from django.db import connection

        # 1. RLS coverage -----------------------------------------------------
        enabled = set(db.rls_enabled_tables())
        tenant_models = [
            m
            for m in apps.get_models()
            if getattr(m, "traced_by_org", False)
            and any(f.name == "organization" for f in m._meta.fields)
        ]
        for model in tenant_models:
            table = model._meta.db_table
            if table not in enabled:
                failures.append(f"[RLS] tenant table '{table}' has no RLS policy")

        # 2. Tenant-aware ref uniqueness --------------------------------------
        with connection.cursor() as cursor:
            for model in tenant_models:
                table = model._meta.db_table
                ref_field = next((f for f in model._meta.fields if f.name == "ref"), None)
                if ref_field is None:
                    continue
                cursor.execute(
                    """
                    SELECT array_agg(a.attname::text ORDER BY k.ord)
                      FROM pg_index i
                      JOIN pg_class c ON c.oid = i.indexrelid
                      JOIN LATERAL unnest(i.indkey) WITH ORDINALITY k(attnum, ord) ON true
                      JOIN pg_attribute a
                        ON a.attrelid = i.indrelid AND a.attnum = k.attnum
                     WHERE i.indrelid = %s::regclass
                       AND i.indisunique
                       AND i.indpred IS NULL
                    """,
                    [table],
                )
                rows = cursor.fetchall()
                unique_sets = [set(r[0]) for r in rows if r[0]]
                ok = any({"organization_id", "ref"} <= cols for cols in unique_sets)
                if not ok:
                    failures.append(
                        f"[UNIQUE] '{table}.ref' must be part of a "
                        "UNIQUE (organization_id, ref) constraint"
                    )

            # 3. Money columns must be numeric --------------------------------
            for model in tenant_models:
                table = model._meta.db_table
                cursor.execute(
                    """
                    SELECT column_name, data_type
                      FROM information_schema.columns
                     WHERE table_schema='public' AND table_name=%s
                    """,
                    [table],
                )
                for col_name, data_type in cursor.fetchall():
                    if any(h in col_name for h in MONEY_COLUMN_HINTS):
                        if data_type in ("double precision", "real", "float4", "float8"):
                            failures.append(
                                f"[MONEY] '{table}.{col_name}' is {data_type}; "
                                "money must be numeric"
                            )

        # Report ---------------------------------------------------------------
        if notices:
            for n in notices:
                self.stdout.write(self.style.NOTICE(n))
        if failures:
            for f in failures:
                self.stderr.write(self.style.ERROR(f))
            raise CommandError(f"{len(failures)} convention violation(s) found")

        self.stdout.write(
            self.style.SUCCESS(
                f"OK: {len(tenant_models)} tenant tables checked "
                f"({len(enabled)} with RLS), refs and money columns conform."
            )
        )
