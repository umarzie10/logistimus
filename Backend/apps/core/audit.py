"""AuditService — append-only audit rows written inside the request transaction.

SECURITY_PLAN §9 lists which actions must be audited. Callers pass explicit
`action` strings; keep them stable and lowercase (e.g. `auth.login`,
`org.member.role_changed`, `invoice.voided`).
"""

from __future__ import annotations

import logging
from typing import Any

from django.http import HttpRequest

from apps.core import context
from apps.core.models import AuditLog

logger = logging.getLogger("apps.core.audit")


def _ip_of(request: HttpRequest | None) -> str | None:
    if request is None:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def record(
    *,
    action: str,
    request: HttpRequest | None = None,
    object_type: str = "",
    object_id: str | Any = "",
    before: dict | None = None,
    after: dict | None = None,
    scope: str = AuditLog.Scope.TENANT,
    organization_id=None,
    actor=None,
    actor_email: str = "",
) -> AuditLog | None:
    """Persist one audit row. Returns None only if the DB write fails
    (auditing must never break the business operation — failures are logged
    loudly for the ops pipeline)."""
    org_id = organization_id or context.get_org_id()
    if actor is None and request is not None and getattr(request, "user", None):
        actor = request.user if request.user.is_authenticated else None

    if scope == AuditLog.Scope.PLATFORM:
        org_id = None

    try:
        return AuditLog.objects.create(
            organization_id=org_id,
            scope=scope,
            actor=actor,
            actor_email=actor_email or (actor.email if actor else ""),
            action=action,
            object_type=object_type,
            object_id=str(object_id),
            before=before,
            after=after,
            ip=_ip_of(request),
            user_agent=(request.META.get("HTTP_USER_AGENT", "")[:512] if request else ""),
            request_id=context.get_request_id() or "",
        )
    except Exception:  # noqa: BLE001 - audit must not cascade-fail requests
        logger.exception("audit_write_failed", extra={"action": action, "object_type": object_type})
        return None
