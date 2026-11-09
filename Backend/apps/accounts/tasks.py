"""Celery tasks for authentication emails (never inline in a request)."""

from __future__ import annotations

import logging

from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(ignore_result=True)
def send_verification_email(*, to_email: str, code: str) -> None:
    """6-digit verification code. Dev: console backend; prod: SMTP/SES."""
    from django.core.mail import send_mail  # noqa: PLC0415

    body = (
        f"Your Logistimus verification code is: {code}\n\n"
        f"It expires in 15 minutes. If you didn't create an account, "
        f"ignore this email."
    )
    send_mail(
        subject="Verify your Logistimus account",
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[to_email],
        fail_silently=False,
    )
    logger.info("verification email queued for %s", to_email)


@shared_task(ignore_result=True)
def send_password_reset_email(*, to_email: str, token: str) -> None:
    """Single-use reset link (60-minute TTL, hashed at rest)."""
    from django.core.mail import send_mail  # noqa: PLC0415

    link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
    body = (
        "Someone requested a password reset for your Logistimus account.\n\n"
        f"Set a new password within 60 minutes:\n{link}\n\n"
        "If this wasn't you, no action is needed — the link expires soon "
        "and your password stays unchanged."
    )
    send_mail(
        subject="Reset your Logistimus password",
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[to_email],
        fail_silently=False,
    )
    logger.info("password reset email queued for %s", to_email)
