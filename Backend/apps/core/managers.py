"""Tenant-aware model base classes.

Design (docs/backend/DATABASE_SCHEMA.md §15, SECURITY_PLAN §3):
- `TenantManager` scopes every queryset to the request's organization.
- `TenantModel.save()` injects `organization_id` from server context; payloads
  can never set it (serializers keep it read-only AND the ORM overwrites it).
- Cross-tenant access therefore yields an empty queryset -> API returns 404.
"""
from __future__ import annotations

from uuid import UUID

from django.db import models

from apps.core import context


class TenantQuerySet(models.QuerySet):
    def for_org(self, org_id: UUID | None) -> TenantQuerySet:
        """Explicit scoping — used by background tasks (TenantTask)."""
        if org_id is None:
            return self.none()
        return self.filter(organization_id=org_id)


class TenantManager(models.Manager.from_queryset(TenantQuerySet)):
    """Default manager: always tenant-scoped when a request org context exists."""

    def get_queryset(self) -> TenantQuerySet:
        qs = super().get_queryset()
        org_id = context.get_org_id()
        if org_id is not None and self.model.traced_by_org:
            return qs.filter(organization_id=org_id)
        return qs


class UnscopedManager(models.Manager):
    """Manager that bypasses tenant scoping.

    ONLY for: platform (super-admin) code paths, migrations, and internal
    integrity checks. Never exposed to serializers.
    """

    def get_queryset(self) -> models.QuerySet:
        return super().get_queryset()


class TenantModel(models.Model):
    """Base class for every tenant-owned row."""

    organization = models.ForeignKey(
        "core.Organization",
        on_delete=models.CASCADE,
        related_name="%(class)ss",
        db_index=True,
    )

    objects = TenantManager()
    unscoped = UnscopedManager()

    # Set to False by tables that are global (permissions catalog, plans, ...)
    traced_by_org = True

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        # Never trust an incoming organization_id: overwrite from context when
        # the row is new; for updates we still forbid changing it.
        org_id = context.get_org_id()
        if self._state.adding:
            if org_id is not None:
                self.organization_id = org_id
            if self.organization_id is None:
                raise ValueError(
                    f"{type(self).__name__} requires an organization context on create"
                )
        elif "organization_id" in kwargs:
            raise ValueError("organization_id is immutable")
        super().save(*args, **kwargs)


class PlatformModel(models.Model):
    """Global (non-tenant) rows: plans, permission catalog, feature flags."""

    objects = models.Manager()

    class Meta:
        abstract = True
