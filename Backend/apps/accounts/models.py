"""Authentication tables (DATABASE_SCHEMA §3 "Auth tables").

Deliberately plain models — NOT TenantModel: these rows are read by the
server *before* any tenant context exists (login, refresh) and are always
looked up by a hashed secret or by user id, never by client-supplied org.
RLS does not apply (E001 skips models without `traced_by_org`); isolation
comes from hash-lookups + user scoping in services.py.
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class RefreshToken(models.Model):
    """Rotating refresh token with family-based reuse detection.

    Rotation: each refresh marks the presented row `rotated_at` and issues a
    new row in the same `family_id`. Presenting an already-rotated token is
    a replay -> the whole family is revoked (`401 refresh_revoked`).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="refresh_tokens",
    )
    organization = models.ForeignKey(
        "core.Organization",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="refresh_tokens",
    )
    token_hash = models.CharField(max_length=64, unique=True)
    family_id = models.UUIDField(db_index=True)
    family_started_at = models.DateTimeField()  # 30-day absolute cap
    expires_at = models.DateTimeField()  # 12h idle cap
    rotated_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_reason = models.CharField(max_length=32, blank=True)
    created_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "created_at"], name="idx_refreshtoken_user"),
            models.Index(fields=["family_id", "created_at"], name="idx_refreshtoken_family"),
        ]

    @property
    def is_active(self) -> bool:
        return (
            self.rotated_at is None and self.revoked_at is None and self.expires_at > timezone.now()
        )

    def __str__(self) -> str:
        return f"refresh:{self.family_id}"


class EmailVerification(models.Model):
    """6-digit email verification code (register / change-email)."""

    class Purpose(models.TextChoices):
        REGISTER = "register", "Register"
        CHANGE_EMAIL = "change_email", "Change email"

    MAX_ATTEMPTS = 5
    TTL_MINUTES = 15

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_verifications",
    )
    code_hash = models.CharField(max_length=64)
    purpose = models.CharField(max_length=16, choices=Purpose.choices, default=Purpose.REGISTER)
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["user", "purpose", "consumed_at"],
                name="idx_emailver_user_purpose",
            ),
        ]

    @property
    def is_valid(self) -> bool:
        return self.consumed_at is None and self.expires_at > timezone.now()


class PasswordResetToken(models.Model):
    """Single-use password reset token (60-minute TTL, hashed at rest)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="password_reset_tokens",
    )
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"reset:{self.user_id}"


class LoginHistory(models.Model):
    """Per-user login forensics (GET /auth/login-history/)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="login_history",
        null=True,  # failed attempt for an address that has no account
    )
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)
    successful = models.BooleanField(default=False)
    failure_reason = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"], name="idx_loginhistory_user"),
        ]

    def __str__(self) -> str:
        return f"login:{self.user_id}:{self.successful}"
