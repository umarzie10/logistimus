"""drf-spectacular plumbing (API_SPECIFICATION.md stays the normative contract).

- `JWTAuthenticationExtension` — documents `Authorization: Bearer <access>`
  so generated operations carry the security scheme (spec §3.1).
- Raw-schema helpers (`obj` / `arr` / `page`) describe the JSON payloads the
  services build, without inventing parallel serializer classes used only
  for docs.

The shared error envelope `{"error": {code, message, details, request_id}}`
is documented once in API_SPECIFICATION §25 rather than repeated per op.
"""

from __future__ import annotations

from drf_spectacular.extensions import OpenApiAuthenticationExtension
from drf_spectacular.utils import extend_schema, inline_serializer  # re-export for view modules
from rest_framework import serializers

__all__ = [
    "BOOL",
    "DATETIME",
    "INT",
    "NUM",
    "STR",
    "JWTAuthenticationExtension",
    "arr",
    "extend_schema",
    "inline_serializer",
    "obj",
    "page",
    "s",
    "serializers",
]


class JWTAuthenticationExtension(OpenApiAuthenticationExtension):
    """One `bearer` security scheme for every JWT-protected operation."""

    target_class = "apps.core.authentication.JWTAuthentication"
    name = "jwtAuth"

    def get_security_definition(self, auto_schema) -> dict:  # noqa: ANN001
        return {
            "type": "http",
            "scheme": "bearer",
            "description": "15-minute JWT access token (kept in memory by the SPA).",
        }


# ---------------------------------------------------------------------------
# Raw schema builders (drf-spectacular accepts raw dicts for the request and
# for each response status code). `obj`/`arr` copy values so shared
# constants are never mutated by schema generation.
# ---------------------------------------------------------------------------

STR = {"type": "string"}
INT = {"type": "integer"}
BOOL = {"type": "boolean"}
NUM = {"type": "number"}
DATETIME = {"type": "string", "format": "date-time"}


def s(**props) -> dict:
    """String field with optional `description`/`format`/`nullable`."""
    return {"type": "string", **props}


def obj(*, required: list[str] | None = None, **props) -> dict:
    """Object schema; prop values are raw schema dicts."""
    schema: dict = {
        "type": "object",
        "properties": {k: dict(v) for k, v in props.items()},
    }
    if required:
        schema["required"] = list(required)
    return schema


def arr(item: dict) -> dict:
    return {"type": "array", "items": dict(item)}


def page(item: dict) -> dict:
    """StandardPagination envelope (API_SPECIFICATION §1.3)."""
    return obj(
        count=INT,
        page=INT,
        page_size=INT,
        pages=INT,
        results=arr(item),
    )
