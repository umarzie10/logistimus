"""RBAC services: seeding, effective permissions, cache discipline.

Cache: `logistimus:perms:{org}:{version}:{role}` (300s). Version key per
org is bumped on every role/grant mutation, so stale sets are never served
after a change even when the underlying keys would still be alive.
"""

from __future__ import annotations

from uuid import UUID

from django.core.cache import cache

from apps.permissions import catalog

PERM_CACHE_TIMEOUT = 300
_VERSION_KEY = "logistimus:perms:ver:{org}"


def _version(org_id: UUID | str) -> int:
    key = _VERSION_KEY.format(org=org_id)
    try:
        value = int(cache.get_or_set(key, 1, PERM_CACHE_TIMEOUT * 12))
    except (TypeError, ValueError):  # pragma: no cover - corrupted cache
        value = 1
    return value


def invalidate_role_cache(org_id: UUID | str) -> None:
    """Bump the org's permission-cache version (call on any role change)."""
    key = _VERSION_KEY.format(org=org_id)
    try:
        cache.incr(key)
    except ValueError:
        cache.set(key, int(cache.get(key) or 1) + 1, PERM_CACHE_TIMEOUT * 12)


def effective_permissions(org_id: UUID | str, role_name: str) -> set[str]:
    """Permission codes granted to `role_name` inside `org_id`.

    Default-deny: unknown org/role -> empty set. Wildcard roles (owner,
    super_admin) resolve straight from the catalog so new codes reach them
    without reseeding.
    """
    if not org_id or not role_name:
        return set()

    if role_name in catalog.WILDCARD_ROLES:
        # Cached as the catalog list; catalog is migration-fixed data.
        cache_key = f"logistimus:perms:{org_id}:catalog"
        codes = cache.get(cache_key)
        if codes is None:
            codes = catalog.all_codes()
            cache.set(cache_key, codes, PERM_CACHE_TIMEOUT)
        return set(codes)

    from apps.permissions.models import RolePermission  # noqa: PLC0415

    cache_key = f"logistimus:perms:{org_id}:{_version(org_id)}:{role_name}"
    codes = cache.get(cache_key)
    if codes is None:
        codes = list(
            RolePermission.unscoped.filter(
                organization_id=org_id, role__name=role_name
            ).values_list("permission__code", flat=True)
        )
        cache.set(cache_key, codes, PERM_CACHE_TIMEOUT)
    return set(codes)


def seed_catalog() -> tuple[int, int]:
    """(created, total) — used by the data migration; idempotent."""
    from apps.permissions.models import Permission  # noqa: PLC0415

    existing = set(Permission.objects.values_list("code", flat=True))
    wanted = catalog.all_codes()
    to_create = [c for c in wanted if c not in existing]
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
    return len(to_create), len(wanted)


def seed_builtin_roles(organization) -> int:
    """Create the 12 builtin roles + grants for a new organization.

    Called inside the registration transaction with the org context already
    set. bulk_create bypasses TenantModel.save(), so organization_id is set
    explicitly here — from the server-side object, never from a payload.
    """
    from apps.permissions.models import (  # noqa: PLC0415
        Permission,
        Role,
        RolePermission,
    )

    org_id = organization.id
    roles = [
        Role(
            organization_id=org_id,
            name=name,
            label=spec["label"],
            description=spec["description"],
            is_builtin=True,
        )
        for name, spec in catalog.BUILTIN_ROLES.items()
    ]
    Role.objects.bulk_create(roles, batch_size=20)

    permission_by_code = {code: pk for code, pk in Permission.objects.values_list("code", "id")}
    grants: list[RolePermission] = []
    for role in roles:
        for code in catalog.expand(catalog.BUILTIN_ROLES[role.name]["grants"]):
            perm_id = permission_by_code.get(code)
            if perm_id is None:  # pragma: no cover - catalog seed drift
                continue
            grants.append(
                RolePermission(
                    organization_id=org_id,
                    role=role,
                    permission_id=perm_id,
                )
            )
    RolePermission.objects.bulk_create(grants, batch_size=500)
    invalidate_role_cache(org_id)
    return len(roles)
