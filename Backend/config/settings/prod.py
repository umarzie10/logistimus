"""Production settings — hardened (see docs/backend/SECURITY_PLAN.md)."""

from .base import *  # noqa: F401,F403
from .base import env  # noqa: F401

DEBUG = False

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

# Password hashing hardening (PBKDF2 iterations are Django defaults; no MD5) ---
# Refuse to boot with the dev secret
assert SECRET_KEY != "unsafe-dev-key-change-me", "Set SECRET_KEY"  # noqa: F405

# Error reporting (env-driven, optional) ---------------------------------------
SENTRY_DSN = env("SENTRY_DSN", default="")
if SENTRY_DSN:  # pragma: no cover
    import sentry_sdk  # type: ignore[import-not-found]

    sentry_sdk.init(dsn=SENTRY_DSN, traces_sample_rate=0.0, send_default_pii=False)
