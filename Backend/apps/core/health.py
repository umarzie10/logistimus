"""Liveness & readiness endpoints (API_SPECIFICATION §2).

`/health/`       — process is up (no dependencies)          → 200 always
`/health/ready/` — DB + Redis reachable (real pings)        → 200/503
Both are public and unthrottled; they reveal no tenant data.
"""
from __future__ import annotations

from datetime import UTC, datetime

from django.conf import settings
from django.core.cache import cache
from django.db import connection
from django.db.utils import Error as DatabaseError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.context import get_request_id


def _db_ok() -> tuple[bool, str]:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return True, "ok"
    except DatabaseError as exc:
        return False, str(exc.__class__.__name__)


def _redis_ok() -> tuple[bool, str]:
    try:
        cache.set("_health", "1", timeout=5)
        if cache.get("_health") == "1":
            return True, "ok"
        return False, "cache_read_mismatch"
    except Exception as exc:  # noqa: BLE001 - report any cache failure
        return False, exc.__class__.__name__


class HealthView(APIView):
    """Liveness: no auth, no throttle, no DB access."""

    authentication_classes: list = []
    permission_classes: list = []
    throttle_classes: list = []

    def get(self, request):
        return Response(
            {
                "status": "ok",
                "version": settings.VERSION,
                "environment": settings.DJANGO_ENV,
                "time": datetime.now(UTC).isoformat(timespec="seconds"),
                "request_id": get_request_id(),
            }
        )


class ReadinessView(APIView):
    """Readiness: real dependency checks — fails closed if anything is down."""

    authentication_classes: list = []
    permission_classes: list = []
    throttle_classes: list = []

    def get(self, request):
        db_ok, db_detail = _db_ok()
        redis_ok, redis_detail = _redis_ok()
        ready = db_ok and redis_ok
        payload = {
            "status": "ready" if ready else "degraded",
            "version": settings.VERSION,
            "dependencies": {"database": db_detail, "redis": redis_detail},
            "request_id": get_request_id(),
        }
        return Response(
            payload,
            status=status.HTTP_200_OK if ready else status.HTTP_503_SERVICE_UNAVAILABLE,
        )
