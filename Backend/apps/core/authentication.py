"""JWT authentication binding user + tenant context.

Contract (docs/backend/API_SPECIFICATION.md §1.2, SECURITY_PLAN §1/§3):
- access token is a 15-minute JWT with claims `sub` (user id), `org`
  (organization UUID), `role`, `jti`;
- `org` is set ONLY by the server (login / switch-organization after a
  membership check) — the client cannot influence it;
- on success we populate the request context AND `SET LOCAL
  app.organization_id` inside the request transaction so PostgreSQL RLS
  applies for the rest of the request.
"""
from __future__ import annotations

from uuid import UUID

from django.contrib.auth import get_user_model
from rest_framework import authentication, exceptions
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

from apps.core import context, db

User = get_user_model()


class JWTAuthentication(authentication.BaseAuthentication):
    authenticator = None  # set below

    keyword = "Bearer"

    def authenticate(self, request):
        header = authentication.get_authorization_header(request).split()
        if not header:
            return None
        if header[0].lower() != b"bearer":
            return None
        if len(header) != 2:
            raise exceptions.AuthenticationFailed("invalid_credentials")

        token_str = header[1].decode("ascii", errors="ignore")
        try:
            token = AccessToken(token_str)
            user_id = UUID(str(token.payload["sub"]))
        except (InvalidToken, TokenError, KeyError, ValueError) as exc:
            raise exceptions.AuthenticationFailed("invalid_credentials") from exc

        try:
            user = User.objects.get(pk=user_id, is_active=True)
        except User.DoesNotExist as exc:
            raise exceptions.AuthenticationFailed("invalid_credentials") from exc

        org_claim = token.payload.get("org")
        org_id: UUID | None = None
        if org_claim:
            try:
                org_id = UUID(str(org_claim))
            except ValueError as exc:
                raise exceptions.AuthenticationFailed("invalid_credentials") from exc

        platform_admin = user.is_platform_admin

        # Bind request context BEFORE the view runs; RLS needs it inside
        # the middleware-opened transaction.
        context.set_user_id(user.id)
        context.set_org_id(org_id)
        context.set_platform_admin(platform_admin)
        db.set_organization_context(org_id, platform_admin=platform_admin)

        request.auth_token = token
        request.organization_id = org_id
        return (user, token)

    def authenticate_header(self, request) -> str:
        return "Bearer"
