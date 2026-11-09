"""Development settings — local docker compose (PostGIS, Redis, MinIO)."""

from .base import *  # noqa: F401,F403
from .base import ALLOWED_HOSTS, env  # noqa: F401

DEBUG = True
ALLOWED_HOSTS = list(set(ALLOWED_HOSTS + ["localhost", "127.0.0.1", "0.0.0.0"]))

# Dev conveniences that must never leak into production ---------------------
EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")

# Django admin only when explicitly enabled
if env.bool("ENABLE_ADMIN", default=True):
    if "django.contrib.admin" not in INSTALLED_APPS:  # noqa: F405
        INSTALLED_APPS = ["django.contrib.admin", *INSTALLED_APPS]  # noqa: F405

# Relaxed CORS for the local Next.js dev server
CORS_ALLOWED_ORIGINS = list(
    set(
        CORS_ALLOWED_ORIGINS  # noqa: F405
        + ["http://localhost:3000", "http://127.0.0.1:3000"]
    )
)

# Dev may run without MinIO: fall back to local filesystem storage
if not env("S3_ENDPOINT_URL", default=""):
    STORAGES["default"] = {  # noqa: F405
        "BACKEND": "django.core.files.storage.FileSystemStorage",
        "OPTIONS": {"location": str(BASE_DIR / "media")},  # noqa: F405
    }

LOGGING["root"]["level"] = "DEBUG"  # noqa: F405
