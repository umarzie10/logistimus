"""Production settings — hardened (see docs/backend/SECURITY_PLAN.md)."""

from .base import *  # noqa: F401,F403
from .base import env  # noqa: F401

DEBUG = False

# Environment label ----------------------------------------------------------
# base.py reads DJANGO_ENV; the template ships `development` for local work.
# Under prod settings that label is always wrong: it drives the S3 key prefix
# (objects would land in development/) and the /health/ report. Fall back to
# `production`; an operator who wants a distinct label (e.g. staging) sets
# DJANGO_ENV explicitly to a non-development value in the environment file.
if DJANGO_ENV == "development":  # noqa: F405
    DJANGO_ENV = "production"  # noqa: F405
    # base.py already built STORAGES["default"] with the `development/` key
    # prefix (it runs at import time, before this remap). Keep object keys
    # under the same label as the rest of the environment.
    _default_storage = STORAGES.get("default", {})  # noqa: F405
    _s3_opts = _default_storage.get("OPTIONS")  # noqa: F405
    if _s3_opts and _s3_opts.get("location") == "development/":  # noqa: F405
        _s3_opts["location"] = "production/"  # noqa: F405

# Trust proxy headers from Nginx only (it terminates TLS in front of us)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

# Transport security ---------------------------------------------------------
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Headers (Nginx adds a second layer) ----------------------------------------
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
X_FRAME_OPTIONS = "DENY"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"

# Cookies ---------------------------------------------------------------------
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

# Sessions are admin-only; API auth is stateless JWT -------------------------
SESSION_COOKIE_AGE = 60 * 60 * 8

# Admin surface (disabled by default in production; platform tool, not tenant UI).
# The root URLconf never exposes /admin/ unless explicitly added, so removing the
# app is sufficient.
if not env.bool("ENABLE_ADMIN", default=False):
    INSTALLED_APPS = [a for a in INSTALLED_APPS if a != "django.contrib.admin"]  # noqa: F405

# Static via WhiteNoise, media via S3 (required in prod) ----------------------
STORAGES["staticfiles"] = {  # noqa: F405
    "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
}
if not env("S3_ENDPOINT_URL"):
    raise RuntimeError("S3_ENDPOINT_URL (object storage) is required in production")

# Database: require PostgreSQL in production ----------------------------------
DATABASES = {"default": env.db("DATABASE_URL")}  # noqa: F405
if DATABASES["default"]["ENGINE"] != "django.db.backends.postgresql":
    raise RuntimeError("Production requires PostgreSQL (DATABASE_URL postgres://...)")

DATABASES["default"].update(
    {
        "CONN_MAX_AGE": env.int("DB_CONN_MAX_AGE", default=60),
        "CONN_HEALTH_CHECKS": True,
        "OPTIONS": {"connect_timeout": 5},
    }
)

# Logging: JSON only, INFO level ----------------------------------------------
LOGGING["root"]["level"] = "INFO"  # noqa: F405
LOGGING["handlers"]["console"]["formatter"] = "json"  # noqa: F405

# Refuse to boot with the dev secret.
# base.py's sentinel check cannot fire here: it runs while DEBUG still holds
# its env default (True) — prod.py only forces DEBUG=False after the import.
# The previous assert compared a different (shorter) string than
# DEV_KEY_SENTINEL, so it never matched either. Compare the real sentinel.
if SECRET_KEY == DEV_KEY_SENTINEL:  # noqa: F405
    raise RuntimeError("SECRET_KEY must be set to a real value in production")

# Also reject the short placeholder that appears in older docs/examples.
assert SECRET_KEY != "unsafe-dev-key-change-me", "Set SECRET_KEY"  # noqa: F405

# Reject template/placeholder secrets (.env.example ships a `change-me...`
# value that would otherwise sail past the sentinel comparison) and anything
# too weak to sign tokens.
if "change-me" in SECRET_KEY.lower() or "changeme" in SECRET_KEY.lower():  # noqa: F405
    raise RuntimeError("SECRET_KEY still holds a placeholder value — generate a real one")
if len(SECRET_KEY) < 50:  # noqa: F405
    raise RuntimeError("SECRET_KEY must be at least 50 characters in production")

# Error reporting (env-driven, optional) ---------------------------------------
SENTRY_DSN = env("SENTRY_DSN", default="")
if SENTRY_DSN:  # pragma: no cover
    import sentry_sdk  # type: ignore[import-not-found]

    sentry_sdk.init(dsn=SENTRY_DSN, traces_sample_rate=0.0, send_default_pii=False)
