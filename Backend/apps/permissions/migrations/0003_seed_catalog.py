"""Seed the permission catalog (idempotent, from apps/permissions/catalog.py).

The catalog module is the single source of truth for RBAC codes; the
Permission table mirrors it so role-grant serializers can validate against
real rows. Uses the historical model (apps.get_model) as migrations must.
"""
from __future__ import annotations

from django.db import migrations


def seed(apps, schema_editor):  # noqa: ANN001 - Django migration signature
    from apps.permissions import catalog  # noqa: PLC0415

    Permission = apps.get_model("permissions", "Permission")
    existing = set(Permission.objects.values_list("code", flat=True))
    to_create = [c for c in catalog.all_codes() if c not in existing]
    Permission.objects.bulk_create(
        [
            Permission(
                code=code,
                module=code.split(".")[0],
                object=code.split(".")[1],
                action=code.split(".")[2],
            )
            for code in to_create
        ],
        batch_size=200,
    )


def unseed(apps, schema_editor):  # noqa: ANN001
    Permission = apps.get_model("permissions", "Permission")
    Permission.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("permissions", "0002_enable_rls"),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
