"""Celery tasks for authentication emails (never inline in a request)."""

from __future__ import annotations

import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    ignore_result=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    max_retries=3,
)
def send_verification_email(self, *, to_email: str, code: str) -> None:
    """6-digit verification code. Dev: console backend; prod: SMTP/SES."""
    plain_body = (
        f"Your Logistimus 6-digit verification code is: {code}\n\n"
        f"It expires in 15 minutes. If you didn't create an account, "
        f"ignore this email."
    )
    html_body = render_to_string("accounts/email_verification.html", {"code": code})
    send_mail(
        subject="Verify your Logistimus account",
        message=plain_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[to_email],
        html_message=html_body,
        fail_silently=False,
    )
    logger.info("verification email sent to %s", to_email)


@shared_task(
    bind=True,
    ignore_result=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    max_retries=3,
)
def send_password_reset_email(self, *, to_email: str, token: str) -> None:
    """Single-use reset link (60-minute TTL, hashed at rest)."""
    link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
    plain_body = (
        "Someone requested a password reset for your Logistimus account.\n\n"
        f"Set a new password within 60 minutes:\n{link}\n\n"
        "If this wasn't you, no action is needed — the link expires soon "
        "and your password stays unchanged."
    )
    html_body = render_to_string("accounts/password_reset.html", {"link": link})
    send_mail(
        subject="Reset your Logistimus password",
        message=plain_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[to_email],
        html_message=html_body,
        fail_silently=False,
    )
    logger.info("password reset email sent to %s", to_email)
