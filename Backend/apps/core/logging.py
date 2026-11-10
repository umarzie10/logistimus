"""Structured JSON logging with request_id correlation (SECURITY_PLAN §17)."""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime

from apps.core import context


class JsonFormatter(logging.Formatter):
    """One JSON object per line: machine-parseable, no secrets."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict = {
            "ts": datetime.now(UTC).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        request_id = context.get_request_id()
        if request_id:
            payload["request_id"] = request_id
        org_id = context.get_org_id()
        if org_id:
            payload["organization_id"] = str(org_id)

        # Attach extras emitted via `logger.info("...", extra={...})`
        _SENSITIVE_EXACT_KEYS = frozenset(
            {
                "password",
                "secret",
                "token",
                "code",
                "authorization",
                "cookie",
                "key_hash",
                "code_hash",
                "confirm_password",
                "confirmpassword",
            }
        )
        for key, value in getattr(record, "__dict__", {}).items():
            if key.startswith("_") or key in _STANDARD_ATTRS:
                continue
            key_lower = key.lower()
            if (
                key_lower in _SENSITIVE_EXACT_KEYS
                or key_lower.endswith(("_password", "_secret", "_token", "_hash", "_key"))
            ):
                payload[key] = "[REDACTED]"
            elif isinstance(value, (str, int, float, bool, type(None))):
                payload[key] = value
            else:
                payload[key] = str(value)

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False, default=str)


_STANDARD_ATTRS = frozenset(
    {
        "name",
        "msg",
        "args",
        "levelname",
        "levelno",
        "pathname",
        "filename",
        "module",
        "exc_info",
        "exc_text",
        "stack_info",
        "lineno",
        "funcName",
        "created",
        "msecs",
        "relativeCreated",
        "thread",
        "threadName",
        "processName",
        "process",
        "taskName",
    }
)

logger = logging.getLogger("apps.core")
