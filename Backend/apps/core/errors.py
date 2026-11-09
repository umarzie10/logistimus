"""JSON handlers for non-DRF error paths (unmatched URLs, 403, 500).

DRF views produce the envelope via `api_exception_handler`; these cover
Django-level errors so the API contract (envelope on EVERY non-2xx) holds
for unknown paths too. No stack traces reach the client (SECURITY_PLAN §10).
"""

from __future__ import annotations

import logging

from django.http import JsonResponse

from apps.core.exceptions import error_payload

logger = logging.getLogger("apps.core")


def handler404(request, exception=None):  # noqa: ARG001 - Django signature
    return JsonResponse(error_payload("not_found", "Resource not found."), status=404)


def handler403(request, exception=None):  # noqa: ARG001
    return JsonResponse(
        error_payload("forbidden", "You do not have permission to perform this action."),
        status=403,
    )


def handler400(request, exception=None):  # noqa: ARG001
    return JsonResponse(error_payload("validation_error", "Bad request."), status=400)


def handler500(request):  # pragma: no cover - exercised in prod only
    logger.exception("unhandled_500", extra={"path": request.path})
    return JsonResponse(
        error_payload("internal_error", "An unexpected error occurred."), status=500
    )
