"""Organization structure models (DATABASE_SCHEMA §3).

All rows are tenant-owned (`TenantModel`): organization_id is injected
server-side, querysets are scoped by `TenantManager`, and every table gets
its own RLS policy (migration 0002 + `logistimus.E001`).

`Membership.role` is an org-scoped `permissions.Role` row — builtin roles
are seeded per organization at registration (schema decision §3).
"""

from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.core.managers import TenantModel


class Branch(TenantModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    name = models.CharField(max_length=100)
    type = models.CharField(max_length=32, default="branch")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    is_primary = models.BooleanField(default=False)
    address = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-is_primary", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "name"],
                name="uniq_branch_per_org",
            ),
        ]
        indexes = [
            models.Index(fields=["organization", "status"], name="idx_branch_org_status"),
        ]

    def __str__(self) -> str:
        return self.name


class Department(TenantModel):
    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="departments",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=100)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "branch", "name"],
                name="uniq_department_per_org_branch",
            ),
        ]

    def __str__(self) -> str:
        return self.name


class Membership(TenantModel):
    """A user's membership in one organization — the tenancy join table."""

    class Status(models.TextChoices):
        INVITED = "invited", "Invited"
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.ForeignKey(
        "permissions.Role",
        on_delete=models.PROTECT,
        related_name="memberships",
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="memberships_invited",
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-joined_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "user"],
                name="uniq_membership_per_org",
            ),
        ]
        indexes = [
            models.Index(fields=["user"], name="idx_membership_user"),
            models.Index(
                fields=["organization", "role"],
                name="idx_membership_org_role",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.user_id} @ {self.organization_id} ({self.role_id})"


class Invitation(TenantModel):
    """Pending invitation to an organization (hashed token at rest)."""

    email = models.EmailField()
    role = models.ForeignKey(
        "permissions.Role",
        on_delete=models.PROTECT,
        related_name="invitations",
    )
    token_hash = models.CharField(max_length=64, unique=True)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invitations_sent",
    )
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["organization", "email"],
                name="idx_invitation_org_email",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.email} -> {self.organization_id}"


class ApiKey(TenantModel):
    """Server-side API key. The secret is shown once; only the hash is kept."""

    name = models.CharField(max_length=100)
    prefix = models.CharField(max_length=24)
    key_hash = models.CharField(max_length=64, unique=True)
    scopes = models.JSONField(default=list, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="api_keys_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["organization", "revoked_at"],
                name="idx_apikey_org_revoked",
            ),
        ]

    @property
    def revoked(self) -> bool:
        return self.revoked_at is not None

    def __str__(self) -> str:
        return f"{self.name} ({self.prefix}…)"


class OrganizationSettings(TenantModel):
    """Per-org UI/feature settings (one row per organization)."""

    distance_unit = models.CharField(max_length=4, default="km")
    date_format = models.CharField(max_length=32, default="YYYY-MM-DD")
    feature_flags = models.JSONField(default=dict, blank=True)
    notification_preferences = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization"],
                name="uniq_settings_per_org",
            ),
        ]

    def __str__(self) -> str:
        return f"settings@{self.organization_id}"
