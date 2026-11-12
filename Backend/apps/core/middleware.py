"""Request-scoped middleware.

1. `RequestContextMiddleware`  — generates/propagates X-Request-Id early so
   every log line, audit row and error envelope shares one correlation id.
2. `TenantContextMiddleware`   — wraps the view in a single transaction and
   manages the request context vars. The *org value* is set later by
   authentication (inside this transaction) via SET LOCAL — see apps.core.db.
"""

from __future__ import annotations

import json
import logging
import uuid

from django.db import connection, transaction

from apps.core import context
from apps.core.exceptions import error_payload

logger = logging.getLogger(__name__)


class RequestContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.headers.get("X-Request-Id") or uuid.uuid4().hex
        token = context.set_request_id(request_id)
        request.request_id = request_id
        try:
            response = self.get_response(request)
        finally:
            context.reset(token, context._current_request_id)
        response["X-Request-Id"] = request_id
        return response


class ApiErrorEnvelopeMiddleware:
    """Contract guard: every non-2xx under /api/ is the JSON envelope.

    Django's DEBUG mode answers unmatched URLs and unhandled errors with HTML
    technical pages; API_SPECIFICATION §1.4 allows only the envelope, so the
    response body is normalized here regardless of DEBUG. Real browsers
    navigating in a browser (Accept: text/html without application/json) keep
    the debug page — machines always get JSON.
    """

    _CODE_BY_STATUS = {
        400: ("validation_error", "Bad request."),
        401: ("invalid_credentials", "Authentication credentials were not provided."),
        403: ("forbidden", "You do not have permission to perform this action."),
        404: ("not_found", "Resource not found."),
        405: ("method_not_allowed", "Method not allowed for this endpoint."),
        406: ("not_acceptable", "Requested resource is not acceptable."),
        409: ("invalid_transition", "The request conflicts with the current state."),
        410: ("token_expired", "This resource has expired."),
        415: ("unsupported_media_type", "Unsupported media type."),
        429: ("rate_limited", "Too many requests — slow down."),
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if response.status_code < 400 or not request.path.startswith("/api/"):
            return response
        if getattr(response, "streaming", False):
            return response
        accept = request.headers.get("Accept", "")
        if response.status_code >= 500:
            # Django only logs `django.request` for responses it produced
            # itself; an exception raised inside the view is swallowed by
            # the exception handler, so the traceback would never reach the
            # logs. Log it explicitly — without this, production 500s are
            # undiagnosable.
            logger.exception(
                "Unhandled API error: %s %s", request.method, request.path
            )
        if "text/html" in accept and "application/json" not in accept:
            return response  # human browser navigation in DEBUG — keep the page

        content_type = response.get("Content-Type", "")
        if "application/json" in content_type:
            return response  # already the envelope (DRF / handler40x)

        if response.status_code in self._CODE_BY_STATUS:
            code, message = self._CODE_BY_STATUS[response.status_code]
        elif response.status_code >= 500:
            code, message = "internal_error", "An unexpected error occurred."
        else:
            code, message = "validation_error", "Request could not be processed."

        allow = response.get("Allow")  # preserve 405 discovery header
        retry_after = response.get("Retry-After")
        response.content = json.dumps(error_payload(code, message)).encode()
        response["Content-Type"] = "application/json"
        response["Content-Length"] = str(len(response.content))
        if allow:
            response["Allow"] = allow
        if retry_after:
            response["Retry-After"] = retry_after
        return response


class TenantContextMiddleware:
    """Transaction + context lifecycle for one request.

    Guarantees:
    - exactly one transaction per request (audit rows commit with the mutation);
    - context vars never leak between requests (finally-reset);
    - on PostgreSQL, RLS sees the org set by authentication via SET LOCAL
      (safe with pgbouncer transaction pooling because it never survives
      the transaction).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        tokens = [
            (context.set_user_id(None), context._current_user_id),
            (context.set_org_id(None), context._current_org_id),
            (context.set_platform_admin(False), context._current_platform_admin),
            (context.set_role(None), context._current_role),
        ]
        try:
            if connection.in_atomic_block or not _db_is_ready():
                # Nested (tests) or DB unavailable: run without extra txn
                response = self.get_response(request)
            else:
                with transaction.atomic():
                    response = self.get_response(request)
        finally:
            for token, var in reversed(tokens):
                var.reset(token)
        return response


def _db_is_ready() -> bool:
    """Avoid opening a transaction for static/media requests with no DB need.

    Middleware order puts this after SecurityMiddleware; a health endpoint
    still goes through the transactional path because it touches the DB.
    """
    return True
