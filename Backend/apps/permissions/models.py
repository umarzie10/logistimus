"""RBAC models (DATABASE_SCHEMA §3).

- `Permission` — global catalog (module × action), seeded once by migration.
- `Role` — ORG-scoped: builtin roles are created per organization at
  registration so custom and builtin roles share one code path.
- `RolePermission` — grant rows, org column denormalized from the role so
  the table gets its own RLS policy (defense in depth, E001).
"""

from __future__ import annotations

from django.db import models

from apps.core.managers import PlatformModel, TenantModel


class Permission(PlatformModel):
    """One catalog entry: `<module>.<object>.<action>`."""

    code = models.CharField(max_length=100, unique=True)
    module = models.CharField(max_length=50, db_index=True)
    object = models.CharField(max_length=50)
    action = models.CharField(max_length=32)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["module", "object", "action"]
        constraints = [
            models.UniqueConstraint(
                fields=["module", "object", "action"],
                name="uniq_permission_mod_obj_act",
            )
        ]

    def __str__(self) -> str:
        return self.code


class Role(TenantModel):
    """Org-scoped role. Builtin rows are created at registration."""

    name = models.CharField(max_length=64)
    label = models.CharField(max_length=100, blank=True)
    description = models.CharField(max_length=255, blank=True)
    is_builtin = models.BooleanField(default=False)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "name"],
                name="uniq_role_per_org",
            )
        ]
        indexes = [
            models.Index(fields=["organization", "name"], name="idx_role_org_name"),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.organization_id})"


class RolePermission(TenantModel):
    """Grant of one catalog permission to one org role."""

    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="grants")
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name="roles")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["role", "permission"],
                name="uniq_role_permission",
            ),
            models.UniqueConstraint(
                fields=["organization", "role", "permission"],
                name="uniq_role_permission_per_org",
            ),
        ]
        indexes = [
            models.Index(fields=["organization", "role"], name="idx_roleperm_org_role"),
        ]

    def __str__(self) -> str:
        return f"{self.role_id}:{self.permission_id}"
