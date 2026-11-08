"""Request-scoped context (ContextVars).

The tenant organization id lives here for the duration of one request/task.
It is set ONLY by the middleware/auth layer from the server-validated JWT
`org` claim — never from client-supplied body/query/header
(see docs/backend/SECURITY_PLAN.md §3).
"""
from __future__ import annotations

from contextvars import ContextVar, Token
from uuid import UUID

_current_org_id: ContextVar[UUID | None] = ContextVar("current_org_id", default=None)
_current_user_id: ContextVar[UUID | None] = ContextVar("current_user_id", default=None)
_current_request_id: ContextVar[str | None] = ContextVar("current_request_id", default=None)
_current_platform_admin: ContextVar[bool] = ContextVar("current_platform_admin", default=False)


def get_org_id() -> UUID | None:
    return _current_org_id.get()


def get_user_id() -> UUID | None:
    return _current_user_id.get()


def get_request_id() -> str | None:
    return _current_request_id.get()


def is_platform_admin() -> bool:
    return _current_platform_admin.get()


def set_org_id(value: UUID | None) -> Token:
    return _current_org_id.set(value)


def set_user_id(value: UUID | None) -> Token:
    return _current_user_id.set(value)


def set_request_id(value: str | None) -> Token:
    return _current_request_id.set(value)


def set_platform_admin(value: bool) -> Token:
    return _current_platform_admin.set(value)


def reset(token: Token, var: ContextVar) -> None:
    var.reset(token)
