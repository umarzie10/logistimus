"""Auth cookie helpers — `lr_refresh` is httpOnly, SameSite=Lax, Secure in prod.

Scoped to the auth router path so the cookie never rides along to business
endpoints (the access token in memory does that job).
"""

from __future__ import annotations

from django.conf import settings
from django.http import HttpResponse

REFRESH_COOKIE = "lr_refresh"


def set_refresh_cookie(response: HttpResponse, raw_token: str) -> None:
    response.set_cookie(
        REFRESH_COOKIE,
        raw_token,
        max_age=settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds(),
        httponly=True,
        samesite="Lax",
        secure=settings.SESSION_COOKIE_SECURE,
        path=settings.REFRESH_COOKIE_PATH,
    )


def clear_refresh_cookie(response: HttpResponse) -> None:
    # NB: HttpResponse.delete_cookie() takes no `secure` argument (the
    # deletion Set-Cookie always carries the same attributes we pass here).
    response.delete_cookie(
        REFRESH_COOKIE,
        path=settings.REFRESH_COOKIE_PATH,
        samesite="Lax",
    )


def raw_refresh_from(request) -> str | None:
    return request.COOKIES.get(REFRESH_COOKIE)
