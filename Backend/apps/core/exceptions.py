"""Unified API error envelope.

Every non-2xx response from /api/v1/ has the shape (API_SPECIFICATION §1.4):

    {"error": {"code": "...", "message": "...", "details": {...}, "request_id": "..."}}

`code` is machine-readable and stable; `message` is human-readable English.
No stack traces, SQL, or settings ever reach the client (SECURITY_PLAN §10).
"""

from __future__ import annotations

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from django.utils.encoding import force_str
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from apps.core.context import get_request_id

# Stable error code registry — keep in sync with docs/backend/API_SPECIFICATION.md §25
ERROR_CODES = frozenset(
    {
        "validation_error",
        "invalid_credentials",
        "email_not_verified",
        "email_exists",
        "weak_password",
        "terms_required",
        "account_locked",
        "too_many_attempts",
        "rate_limited",
        "invalid_code",
        "code_expired",
        "token_expired",
        "token_invalid",
        "refresh_revoked",
        "not_a_member",
        "forbidden",
        "platform_admin_required",
        "not_found",
        "invalid_transition",
        "not_archivable",
        "ref_exists",
        "driver_unavailable",
        "vehicle_unavailable",
        "insufficient_stock",
        "sku_not_found",
        "negative_total",
        "file_too_large",
        "invalid_file_type",
        "plan_limit_reached",
        "plan_expired",
        "payment_required",
        "provider_unavailable",
        "ai_unavailable",
        "no_telemetry",
        "no_active_trip",
        "shipment_not_found",
        "last_owner",
        "builtin_role",
        "role_in_use",
        "already_member",
        "invalid_tier",
        "password_mismatch",
        "invalid_phone",
        "invalid_company_type",
        "idempotency_conflict",
        "internal_error",
        "method_not_allowed",
        "not_acceptable",
        "parse_error",
        "unsupported_media_type",
    }
)

# Code -> HTTP status (docs/backend/API_SPECIFICATION.md §25). Only codes
# that differ from the default 400 are listed; everything else answers 400.
STATUS_BY_CODE: dict[str, int] = {
    # 401
    "invalid_credentials": status.HTTP_401_UNAUTHORIZED,
    "refresh_revoked": status.HTTP_401_UNAUTHORIZED,
    # 403
    "email_not_verified": status.HTTP_403_FORBIDDEN,
    "forbidden": status.HTTP_403_FORBIDDEN,
    "platform_admin_required": status.HTTP_403_FORBIDDEN,
    "not_a_member": status.HTTP_403_FORBIDDEN,
    # 404
    "not_found": status.HTTP_404_NOT_FOUND,
    # 409
    "email_exists": status.HTTP_409_CONFLICT,
    "last_owner": status.HTTP_409_CONFLICT,
    "builtin_role": status.HTTP_409_CONFLICT,
    "role_in_use": status.HTTP_409_CONFLICT,
    "already_member": status.HTTP_409_CONFLICT,
    "invalid_transition": status.HTTP_409_CONFLICT,
    "not_archivable": status.HTTP_409_CONFLICT,
    "ref_exists": status.HTTP_409_CONFLICT,
    "idempotency_conflict": status.HTTP_409_CONFLICT,
    # 410
    "code_expired": status.HTTP_410_GONE,
    "token_expired": status.HTTP_410_GONE,
    # 423
    "account_locked": status.HTTP_423_LOCKED,
    # 429
    "too_many_attempts": status.HTTP_429_TOO_MANY_REQUESTS,
    "rate_limited": status.HTTP_429_TOO_MANY_REQUESTS,
}


class ApiError(exceptions.APIException):
    """Base error carrying a stable machine code + optional details dict.

    Status code: derived from the code via STATUS_BY_CODE (spec §25) so
    `email_exists` really answers 409 and `refresh_revoked` really answers
    401, instead of everything falling back to 400.
    """

    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "validation_error"
    default_detail = "Request could not be processed."

    def __init__(
        self,
        code: str | None = None,
        detail: str | None = None,
        details: dict | None = None,
    ):
        code = code or self.default_code
        if code not in ERROR_CODES:  # guard against unstable codes in responses
            raise ValueError(f"Unregistered error code: {code!r}")
        self.code = code
        self.details = details
        # Subclasses keep their own status (e.g. ServiceUnavailableApiError
        # -> 503) unless the registry says otherwise for this exact code.
        if code in STATUS_BY_CODE:
            self.status_code = STATUS_BY_CODE[code]
        super().__init__(detail or self.default_detail)


class ValidationApiError(ApiError):
    default_code = "validation_error"


class NotFoundApiError(ApiError):
    default_code = "not_found"
    status_code = status.HTTP_404_NOT_FOUND


class ForbiddenApiError(ApiError):
    default_code = "forbidden"
    status_code = status.HTTP_403_FORBIDDEN


class ConflictApiError(ApiError):
    default_code = "invalid_transition"
    status_code = status.HTTP_409_CONFLICT


class UnauthenticatedApiError(ApiError):
    default_code = "invalid_credentials"
    status_code = status.HTTP_401_UNAUTHORIZED


class RateLimitedApiError(ApiError):
    default_code = "rate_limited"
    status_code = status.HTTP_429_TOO_MANY_REQUESTS


class ServiceUnavailableApiError(ApiError):
    default_code = "provider_unavailable"
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE


def error_payload(code: str, message: str, details: dict | None = None) -> dict:
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
            "request_id": get_request_id(),
        }
    }


def _message_of(detail) -> str:
    if isinstance(detail, (dict, list)):
        return "Request could not be processed."
    return force_str(detail)


def _details_of(detail):
    if isinstance(detail, dict):
        return detail
    if isinstance(detail, list):
        return {"fields": detail}
    return {}


def api_exception_handler(exc, context) -> Response:
    """DRF exception handler producing the unified envelope."""
    if isinstance(exc, ApiError):
        return Response(
            error_payload(exc.code, _message_of(exc.detail), _merge(exc.details, exc.detail)),
            status=exc.status_code,
        )

    if isinstance(exc, Http404):
        return Response(
            error_payload("not_found", "Resource not found."),
            status=status.HTTP_404_NOT_FOUND,
        )

    if isinstance(exc, DjangoPermissionDenied):
        return Response(
            error_payload("forbidden", force_str(exc)),
            status=status.HTTP_403_FORBIDDEN,
        )

    response = drf_exception_handler(exc, context)
    if response is None:
        # Unhandled exception: log server-side, return opaque envelope
        return Response(
            error_payload("internal_error", "An unexpected error occurred."),
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if isinstance(exc, exceptions.ValidationError):
        code = "validation_error"
    elif isinstance(exc, exceptions.AuthenticationFailed):
        code = "invalid_credentials"
    elif isinstance(exc, exceptions.NotAuthenticated):
        code = "invalid_credentials"
    elif isinstance(exc, exceptions.PermissionDenied):
        code = "forbidden"
    elif isinstance(exc, exceptions.NotFound):
        code = "not_found"
    elif isinstance(exc, exceptions.MethodNotAllowed):
        code = "method_not_allowed"
    elif isinstance(exc, exceptions.NotAcceptable):
        code = "not_acceptable"
    elif isinstance(exc, exceptions.UnsupportedMediaType):
        code = "unsupported_media_type"
    elif isinstance(exc, exceptions.Throttled):
        code = "rate_limited"
    elif isinstance(exc, exceptions.ParseError):
        code = "parse_error"
    else:
        code = "validation_error"

    message = (
        _message_of(response.data.get("detail", exc.default_detail))
        if isinstance(response.data, dict)
        else str(exc)
    )
    details = _details_of(response.data) if isinstance(response.data, dict) else {}

    response.data = error_payload(code, message, details)
    if code == "rate_limited" and "Retry-After" not in response:
        retry_after = getattr(exc, "wait", None)
        if retry_after is not None:
            response["Retry-After"] = str(int(retry_after))
    return response


def _merge(details: dict | None, detail) -> dict:
    """Combine explicit ApiError.details with DRF-style field errors."""
    base = dict(details or {})
    field_errors = _details_of(detail)
    if field_errors:
        base = {**field_errors, **base}
    return base
