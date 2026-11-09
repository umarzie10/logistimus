"""Authentication endpoints (API_SPECIFICATION §3).

Public views set `permission_classes = [AllowAny]` explicitly (which also
satisfies the W001 coverage check); everything else stays behind
IsAuthenticated. Mutating auth endpoints additionally require the CSRF
custom header `X-Requested-With: XMLHttpRequest` (SECURITY_PLAN §1).
"""

from __future__ import annotations

import time

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts import cookies, services
from apps.core.exceptions import ApiError
from apps.core.openapi import (
    BOOL,
    DATETIME,
    INT,
    STR,
    arr,
    extend_schema,
    inline_serializer,
    obj,
    page,
    s,
    serializers,
)
from apps.core.pagination import StandardPagination
from apps.core.throttles import (
    LoginRateThrottle,
    PasswordResetRateThrottle,
)


def _require_xhr(request) -> None:
    """CSRF defense for cookie-authenticated state changes."""
    if request.headers.get("X-Requested-With") != "XMLHttpRequest":
        raise ApiError(
            "forbidden",
            "Missing X-Requested-With: XMLHttpRequest header.",
        )


_USER_SCHEMA = obj(
    id=STR,
    first_name=STR,
    last_name=STR,
    email=STR,
    role=s(nullable=True),
    platform_role=s(nullable=True),
    email_verified_at=s(nullable=True, format="date-time"),
)

_ORG_SCHEMA = obj(
    id=STR,
    name=STR,
    slug=STR,
    base_currency=STR,
)

_MEMBERSHIP_ITEM = obj(
    organization_id=STR,
    organization_name=STR,
    role=STR,
    is_current=BOOL,
)

_AUTH_BODY = obj(
    access=STR,
    expires_in=INT,
    user=_USER_SCHEMA,
    organization=_ORG_SCHEMA,
    memberships=arr(_MEMBERSHIP_ITEM),
)


@extend_schema(
    summary="Register account and organization",
    description=(
        "Creates a new user, organization, and owner membership. Triggers verification email."
    ),
    request=inline_serializer(
        "RegisterRequest",
        fields={
            "companyName": serializers.CharField(),
            "email": serializers.EmailField(),
            "password": serializers.CharField(),
            "full_name": serializers.CharField(required=False, allow_blank=True),
            "phone": serializers.CharField(required=False, allow_blank=True),
            "acceptTerms": serializers.BooleanField(required=False, default=True),
        },
    ),
    responses={
        201: obj(
            verification_required=BOOL,
            email=STR,
            cooldown_seconds=INT,
        )
    },
    tags=["Auth"],
)
class RegisterView(APIView):
    """POST /auth/register — creates user + org + owner membership."""

    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        required = ("companyName", "email", "password")
        missing = [f for f in required if not data.get(f)]
        if missing:
            raise ApiError(
                "validation_error",
                "Required fields are missing.",
                details={"fields": missing},
            )
        body = services.register(dict(data), request=request)
        return Response(body, status=status.HTTP_201_CREATED)


@extend_schema(
    summary="Verify email address",
    description=(
        "Submits the 6-digit verification code. Activates user and confirms pending invites."
    ),
    request=inline_serializer(
        "VerifyEmailRequest",
        fields={
            "email": serializers.EmailField(),
            "code": serializers.CharField(),
        },
    ),
    responses={
        200: obj(
            verified=BOOL,
            joined_organizations=arr(STR),
        )
    },
    tags=["Auth"],
)
class VerifyEmailView(APIView):
    """POST /auth/verify-email — {email, code}."""

    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email") or ""
        code = str(request.data.get("code") or "").strip()
        if not email or not code:
            raise ApiError("validation_error", "email and code are required.")
        body = services.verify_email(email=email, code=code)
        return Response(body)


@extend_schema(
    summary="Resend verification email",
    description=(
        "Generates a new verification code if cooldown has expired (60s). Always returns 202."
    ),
    request=inline_serializer(
        "ResendVerificationRequest",
        fields={"email": serializers.EmailField()},
    ),
    responses={202: obj(cooldown_seconds=INT)},
    tags=["Auth"],
)
class ResendVerificationView(APIView):
    """POST /auth/resend-verification — always 202, cooldown-aware."""

    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email") or ""
        if not email:
            raise ApiError("validation_error", "email is required.")
        body = services.resend_verification(email=email)
        return Response(body, status=status.HTTP_202_ACCEPTED)


@extend_schema(
    summary="User sign-in",
    description=(
        "Authenticates credentials, sets HttpOnly refresh cookie, and returns access token."
    ),
    request=inline_serializer(
        "LoginRequest",
        fields={
            "email": serializers.EmailField(),
            "password": serializers.CharField(),
        },
    ),
    responses={200: _AUTH_BODY},
    tags=["Auth"],
)
class LoginView(APIView):
    """POST /auth/login — 5/min/IP (DRF scope) + 10/15min/email (service)."""

    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        email = request.data.get("email") or ""
        password = request.data.get("password") or ""
        if not email or not password:
            raise ApiError("validation_error", "email and password are required.")
        body, raw_refresh, _row = services.login(email=email, password=password, request=request)
        response = Response(body)
        cookies.set_refresh_cookie(response, raw_refresh)
        return response


@extend_schema(
    summary="Rotate refresh token",
    description="Rotates HttpOnly refresh cookie with reuse detection and issues new access token.",
    request=None,
    responses={200: obj(access=STR, expires_in=INT)},
    tags=["Auth"],
)
class RefreshView(APIView):
    """POST /auth/refresh — cookie only; rotates with reuse detection."""

    permission_classes = [AllowAny]

    def post(self, request):
        _require_xhr(request)
        raw = cookies.raw_refresh_from(request)
        if not raw:
            raise ApiError("token_invalid", "Refresh token is not valid.")
        body, raw_new, _row = services.refresh(raw=raw, request=request)
        response = Response(body)
        cookies.set_refresh_cookie(response, raw_new)
        return response


@extend_schema(
    summary="Sign out",
    description="Revokes the refresh token family and clears the HttpOnly cookie.",
    request=None,
    responses={204: None},
    tags=["Auth"],
)
class LogoutView(APIView):
    """POST /auth/logout — revokes the presented refresh family -> 204."""

    permission_classes = [AllowAny]

    def post(self, request):
        _require_xhr(request)
        raw = cookies.raw_refresh_from(request)
        services.logout(raw=raw, request=request)
        response = Response(status=status.HTTP_204_NO_CONTENT)
        cookies.clear_refresh_cookie(response)
        return response


@extend_schema(
    summary="Get current session",
    description=(
        "Returns user and organization profile from the HttpOnly refresh cookie. "
        "Reissues access token if near expiry."
    ),
    responses={
        200: obj(
            user=_USER_SCHEMA,
            organization=_ORG_SCHEMA,
            memberships=arr(_MEMBERSHIP_ITEM),
            access=s(nullable=True),
            expires_in=s(nullable=True),
        )
    },
    tags=["Auth"],
)
class SessionView(APIView):
    """GET /auth/session — login-shaped state from the refresh cookie.

    Re-issues `access` when the caller carries no bearer token or one that
    is near expiry (SPA reload keeps working with cookie-only state).
    """

    permission_classes = [AllowAny]

    NEAR_EXPIRY_SECONDS = 120

    def get(self, request):
        raw = cookies.raw_refresh_from(request)
        access, expires_in = None, None

        bearer = request.headers.get("Authorization", "")
        if bearer.startswith("Bearer "):
            from rest_framework_simplejwt.exceptions import (  # noqa: PLC0415
                InvalidToken,
                TokenError,
            )
            from rest_framework_simplejwt.tokens import AccessToken  # noqa: PLC0415

            try:
                token = AccessToken(bearer.removeprefix("Bearer ").strip())
                remaining = int(token["exp"]) - int(time.time())
                if remaining <= self.NEAR_EXPIRY_SECONDS:
                    access = str(token)
                    expires_in = max(remaining, 0)
            except (InvalidToken, TokenError):
                access = None

        body = services.session_body(raw=raw, request=request, access=access, expires_in=expires_in)
        return Response(body)


@extend_schema(
    summary="Switch active organization",
    description=(
        "Switches the user's active tenant, rotating the refresh family "
        "and returning a new access token."
    ),
    request=inline_serializer(
        "SwitchOrganizationRequest",
        fields={"organization_id": serializers.UUIDField()},
    ),
    responses={200: _AUTH_BODY},
    tags=["Auth"],
)
class SwitchOrganizationView(APIView):
    """POST /auth/switch-organization — {organization_id} -> new access."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        _require_xhr(request)
        org_id = request.data.get("organization_id") or ""
        if not org_id:
            raise ApiError("validation_error", "organization_id is required.")
        body, raw_new, _row = services.switch_organization(
            user=request.user, organization_id=org_id, request=request
        )
        response = Response(body)
        cookies.set_refresh_cookie(response, raw_new)
        return response


@extend_schema(
    summary="Request password reset",
    description=(
        "Initiates password reset email flow. Always returns 202 to prevent user enumeration."
    ),
    request=inline_serializer(
        "ForgotPasswordRequest",
        fields={"email": serializers.EmailField()},
    ),
    responses={202: obj(cooldown_seconds=INT)},
    tags=["Auth"],
)
class ForgotPasswordView(APIView):
    """POST /auth/forgot-password — always 202 (no user enumeration)."""

    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        email = request.data.get("email") or ""
        if not email:
            raise ApiError("validation_error", "email is required.")
        body = services.forgot_password(email=email)
        return Response(body, status=status.HTTP_202_ACCEPTED)


@extend_schema(
    summary="Reset password with token",
    description=(
        "Resets user password using the token sent via email and revokes all active sessions."
    ),
    request=inline_serializer(
        "ResetPasswordRequest",
        fields={
            "token": serializers.CharField(),
            "password": serializers.CharField(),
        },
    ),
    responses={200: obj(reset=BOOL, sessions_revoked=INT)},
    tags=["Auth"],
)
class ResetPasswordView(APIView):
    """POST /auth/reset-password — {token, password}; revokes sessions."""

    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        token = request.data.get("token") or ""
        password = request.data.get("password") or ""
        if not token or not password:
            raise ApiError("validation_error", "token and password are required.")
        body = services.reset_password(token=token, password=password)
        return Response(body)


@extend_schema(
    summary="Change password",
    description="Changes password for authenticated user and revokes other sessions.",
    request=inline_serializer(
        "ChangePasswordRequest",
        fields={
            "current_password": serializers.CharField(),
            "new_password": serializers.CharField(),
        },
    ),
    responses={200: obj(changed=BOOL, other_sessions_revoked=INT)},
    tags=["Auth"],
)
class ChangePasswordView(APIView):
    """POST /auth/change-password — authenticated; revokes other sessions."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        current = request.data.get("current_password") or ""
        new = request.data.get("new_password") or ""
        if not current or not new:
            raise ApiError(
                "validation_error",
                "current_password and new_password are required.",
            )
        body = services.change_password(
            user=request.user,
            current_password=current,
            new_password=new,
        )
        return Response(body)


@extend_schema(
    summary="Get login history",
    description="Returns paginated login attempts for the authenticated user.",
    responses={
        200: page(
            obj(
                id=STR,
                ip=s(nullable=True),
                user_agent=s(nullable=True),
                successful=BOOL,
                created_at=DATETIME,
            )
        )
    },
    tags=["Auth"],
)
class LoginHistoryView(APIView):
    """GET /auth/login-history/?page= — the caller's own history."""

    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def get(self, request):
        from apps.accounts.models import LoginHistory  # noqa: PLC0415

        rows = LoginHistory.objects.filter(user=request.user)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(rows, request)
        return Response(
            paginator.get_paginated_response(
                [
                    {
                        "id": str(r.id),
                        "ip": r.ip,
                        "user_agent": r.user_agent,
                        "successful": r.successful,
                        "created_at": r.created_at,
                    }
                    for r in page
                ]
            )
        )
