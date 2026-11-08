"""Core identity + tenancy models (DATABASE_SCHEMA §3, §13).

`core.User` is the AUTH_USER_MODEL — email is the login identifier and
platform role is strictly separate from org roles.
"""
from __future__ import annotations

import uuid
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone

from apps.core import context as core_context
from apps.core.managers import PlatformModel


class UserManager(BaseUserManager):
    """Email-first user manager (USERNAME_FIELD = email, no username)."""

    use_in_migrations = True

    def _create_user(self, email: str, password: str | None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str | None = None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email: str, password: str | None = None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("platform_role", User.PlatformRole.PLATFORM_ADMIN)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Platform identity. Org membership lives in OrganizationMembership."""

    class PlatformRole(models.TextChoices):
        PLATFORM_ADMIN = "platform_admin", "Platform admin"
        SUPPORT = "support", "Support"
        # None -> ordinary tenant user

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=32, blank=True)

    # Platform axis (never grants org permissions)
    platform_role = models.CharField(
        max_length=32, choices=PlatformRole.choices, null=True, blank=True
    )

    email_verified_at = models.DateTimeField(null=True, blank=True)
    failed_login_attempts = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)

    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        db_table = "users"
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return self.email

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip() or self.email

    @property
    def is_platform_admin(self) -> bool:
        return self.platform_role == self.PlatformRole.PLATFORM_ADMIN

    @property
    def is_locked(self) -> bool:
        return bool(self.locked_until and self.locked_until > timezone.now())

    def lock(self, minutes: int = 15) -> None:
        self.locked_until = timezone.now() + timedelta(minutes=minutes)
        self.save(update_fields=["locked_until"])

    def mark_login_success(self, ip: str | None = None) -> None:
        self.failed_login_attempts = 0
        self.locked_until = None
        self.last_login_at = timezone.now()
        self.last_login_ip = ip
        self.save(
            update_fields=[
                "failed_login_attempts",
                "locked_until",
                "last_login_at",
                "last_login_ip",
            ]
        )


class Organization(models.Model):
    """A tenant: one company workspace. Tenancy root — no organization FK.

    Querysets are deliberately NOT auto-scoped: consumers must pick the org
    from the validated membership (org list endpoints) or platform context.
    """

    class VerificationStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"

    FLEET_BANDS = (
        ("10-50", "10 – 50 Vehicles"),
        ("50-200", "50 – 200 Vehicles"),
        ("200-1000", "200 – 1,000 Vehicles"),
        ("1000+", "1,000+ Vehicles"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=64, unique=True)
    legal_name = models.CharField(max_length=200, blank=True)
    tax_id = models.CharField(max_length=64, blank=True)
    headquarters_address = models.CharField(max_length=300, blank=True)
    base_currency = models.CharField(max_length=3, default="USD")
    fleet_size_band = models.CharField(max_length=16, choices=FLEET_BANDS, blank=True)
    verification_status = models.CharField(
        max_length=16, choices=VerificationStatus.choices, default=VerificationStatus.PENDING
    )
    is_active = models.BooleanField(default=True)
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "organizations"
        ordering = ("name",)

    def __str__(self) -> str:
        return self.name

    @property
    def is_trial_expired(self) -> bool:
        return bool(self.trial_ends_at and self.trial_ends_at < timezone.now())


class AuditLogManager(models.Manager):
    """Read scoping for audit rows (SECURITY_PLAN §9).

    - platform admin context  → all rows (platform tooling);
    - tenant org context      → only that org's rows (platform rows hidden);
    - no context (background) → fail closed (empty); use `.unscoped` for
      internal/system jobs and migrations.
    Writes (`create`) are unaffected — `record()` passes organization_id.
    """

    def get_queryset(self):
        qs = super().get_queryset()
        if core_context.is_platform_admin():
            return qs
        org_id = core_context.get_org_id()
        if org_id is not None:
            return qs.filter(organization_id=org_id)
        return qs.none()


class AuditLog(PlatformModel):
    """Append-only audit trail (SECURITY_PLAN §9).

    `organization_id NULL` marks platform-scope rows.
    """

    class Scope(models.TextChoices):
        TENANT = "tenant", "Tenant"
        PLATFORM = "platform", "Platform"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="audit_logs",
        db_index=True,
    )
    scope = models.CharField(max_length=16, choices=Scope.choices, default=Scope.TENANT)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    actor_email = models.EmailField(blank=True)
    action = models.CharField(max_length=64, db_index=True)
    object_type = models.CharField(max_length=64, blank=True)
    object_id = models.CharField(max_length=64, blank=True)
    before = models.JSONField(null=True, blank=True)
    after = models.JSONField(null=True, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)
    request_id = models.CharField(max_length=64, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    objects = AuditLogManager()
    unscoped = models.Manager()

    class Meta:
        db_table = "audit_logs"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["organization", "created_at"], name="audit_org_created"),
            models.Index(fields=["scope", "action", "created_at"], name="audit_scope_action"),
            models.Index(fields=["actor", "created_at"], name="audit_actor_created"),
        ]

    def __str__(self) -> str:
        return f"{self.action} {self.object_type}/{self.object_id}"
