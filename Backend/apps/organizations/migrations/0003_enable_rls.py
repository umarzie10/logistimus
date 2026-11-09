"""Enable PostgreSQL RLS on every organizations tenant table.

No-op on SQLite (EnableRLS checks the vendor); on PostgreSQL this applies
`apps.core.db.enable_rls()` DDL. `memberships` gets `user_column="user_id"`
so a user can READ their own memberships before an org context exists
(login, /auth/session, switch-organization) — writes stay tenant-locked.
See DATABASE_SCHEMA §15.
"""
from __future__ import annotations

from django.db import migrations

from apps.core.operations import EnableRLS

POLICIES = [
    ("organizations_branch", "tenant_isolation_branch", None),
    ("organizations_department", "tenant_isolation_department", None),
    ("organizations_membership", "tenant_isolation_membership", "user_id"),
    ("organizations_invitation", "tenant_isolation_invitation", None),
    ("organizations_apikey", "tenant_isolation_apikey", None),
    (
        "organizations_organizationsettings",
        "tenant_isolation_organizationsettings",
        None,
    ),
]


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0002_initial"),
    ]

    operations = [
        EnableRLS(table, policy, user_column=user_column)
        for table, policy, user_column in POLICIES
    ]
