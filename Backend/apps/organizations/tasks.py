"""Celery tasks for the organizations app (email is async, never inline)."""

from __future__ import annotations

import logging

from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(ignore_result=True)
def send_invitation_email(
    *,
    to_email: str,
    org_name: str,
    role: str,
    invited_by: str = "",
) -> None:
    """Deliver an invitation. The invited person signs up with this address;
    pending invitations are accepted only AFTER email verification
    (apps.accounts.services) so proving mailbox ownership is required.
    """
    from django.core.mail import send_mail  # noqa: PLC0415

    link = f"{settings.FRONTEND_URL.rstrip('/')}/sign-up"
    body = (
        f"{invited_by or 'A teammate'} invited you to join "
        f"{org_name} on Logistimus as {role}.\n\n"
        f"Create your account with this email address, verify it, and you'll "
        f"be added to the workspace automatically:\n{link}\n\n"
        f"The invitation expires in 14 days."
    )
    send_mail(
        subject=f"You're invited to {org_name} on Logistimus",
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[to_email],
        fail_silently=False,
    )
    logger.info("invitation email queued for %s (%s)", to_email, org_name)
