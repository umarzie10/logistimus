"""Enable PostgreSQL RLS on RBAC tenant tables (roles, role_permissions).

No-op on SQLite; see DATABASE_SCHEMA §15 and apps.core.operations.EnableRLS.
`role_permissions` is read during permission checks *after* the request org
context exists, so no user-column escape hatch is needed there.
"""
from __future__ import annotations

from django.db import migrations

from apps.core.operations import EnableRLS


class Migration(migrations.Migration):
    dependencies = [
        ("permissions", "0001_initial"),
    ]

    operations = [
        EnableRLS("permissions_role", "tenant_isolation_role"),
        EnableRLS(
            "permissions_rolepermission", "tenant_isolation_rolepermission"
        ),
    ]
