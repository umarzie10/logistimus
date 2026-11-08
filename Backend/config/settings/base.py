"""
Base settings for Logistimus backend.

Layering: base <- dev / prod / test (selected via DJANGO_SETTINGS_MODULE).
Every secret comes from the environment; nothing sensitive lives in this repo.
"""
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # .../Backend

env = environ.Env(
    DJANGO_ENV=(str, "development"),
    DEBUG=(bool, True),
    SECRET_KEY=(str, "unsafe-dev-key-change-me"),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    CORS_ALLOWED_ORIGINS=(list, ["http://localhost:3000"]),
    DATABASE_URL=(str, f"sqlite:///{BASE_DIR / 'db.sqlite3'}"),
    REDIS_URL=(str, "redis://localhost:6379/0"),
    CELERY_BROKER_URL=(str, "redis://localhost:6379/1"),
    CELERY_RESULT_BACKEND=(str, "redis://localhost:6379/2"),
    S3_ENDPOINT_URL=(str, ""),
    S3_ACCESS_KEY_ID=(str, ""),
    S3_SECRET_ACCESS_KEY=(str, ""),
    S3_BUCKET_NAME=(str, "logistimus"),
    S3_REGION_NAME=(str, "us-east-1"),
    S3_USE_SSL=(bool, True),
    EMAIL_BACKEND=(str, "django.core.mail.backends.console.EmailBackend"),
    DEFAULT_FROM_EMAIL=(str, "Logistimus <no-reply@logistimus.local>"),
    AI_PROVIDER=(str, ""),
    AI_API_KEY=(str, ""),
    AI_MODEL=(str, ""),
    AI_ALLOW_EXTERNAL_CONTEXT=(bool, False),
    DEVICE_KEY_PEPPER=(str, ""),
    SIGNED_URL_TTL_SECONDS=(int, 600),
    ENABLE_ADMIN=(bool, False),
    SPECTACULAR_SETTINGS__SERVE_PERMISSIONS=(str, "AllowAny"),
)

# Read .env if present (docker-compose injects env directly; local dev uses .env)
environ.Env.read_env(BASE_DIR / ".env")

# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------
DJANGO_ENV = env("DJANGO_ENV")
VERSION = env("APP_VERSION", default="0.1.0")
DEBUG = env("DEBUG")
SECRET_KEY = env("SECRET_KEY")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")

if not DEBUG and SECRET_KEY == "unsafe-dev-key-change-me":  # pragma: no cover
    raise RuntimeError("SECRET_KEY must be set to a real value in production")

INSTALLED_APPS = [
    "daphne",
    # Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "django_filters",
    "drf_spectacular",
    "corsheaders",
    "channels",
    "storages",
    # Local apps
    "apps.core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # Logistimus middleware (order matters: request id -> tenant context)
    "apps.core.middleware.RequestContextMiddleware",
    "apps.core.middleware.TenantContextMiddleware",
    # Last in request phase → runs first on the response phase, while the
    # request-id context var is still set (error_payload needs it)
    "apps.core.middleware.ApiErrorEnvelopeMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ---------------------------------------------------------------------------
# Database — PostgreSQL (+PostGIS in production), SQLite fallback for local/tests
# ---------------------------------------------------------------------------
DATABASES = {"default": env.db("DATABASE_URL")}

if DATABASES["default"]["ENGINE"] == "django.db.backends.sqlite3":
    DATABASES["default"].setdefault("OPTIONS", {})
    DATABASES["default"]["OPTIONS"].setdefault("timeout", 20)

# Connection pool / RLS notes: TenantContextMiddleware wraps requests in a
# transaction and issues `SET LOCAL app.organization_id`, which is safe with
# pgbouncer transaction pooling (see docs/backend/DATABASE_SCHEMA.md §15).

# ---------------------------------------------------------------------------
# Redis: cache + Channels layer + Celery
# ---------------------------------------------------------------------------
REDIS_URL = env("REDIS_URL")
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_URL,
        "KEY_PREFIX": "logistimus",
        "TIMEOUT": 300,
    }
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [REDIS_URL]},
    }
}

# ---------------------------------------------------------------------------
# Celery
# ---------------------------------------------------------------------------
CELERY_BROKER_URL = env("CELERY_BROKER_URL")
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND")
CELERY_TIMEZONE = "UTC"
CELERY_TASK_TRACK_STARTED = True

# ---------------------------------------------------------------------------
# Auth / JWT
# ---------------------------------------------------------------------------
AUTH_USER_MODEL = "core.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "apps.core.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
        "apps.core.permissions.HasPermission",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_CLASSES": (
        "apps.core.throttles.UserRateThrottle",
        "apps.core.throttles.AnonRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "user": "300/min",
        "anon": "60/min",
        "login": "5/min",
        "password_reset": "5/hour",
        "public_track": "20/min",
        "ai_chat": "20/min",
    },
    "EXCEPTION_HANDLER": "apps.core.exceptions.api_exception_handler",
    "DEFAULT_RENDERER_CLASSES": ("rest_framework.renderers.JSONRenderer",),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DATETIME_FORMAT": "%Y-%m-%dT%H:%M:%SZ",
    "DATE_FORMAT": "%Y-%m-%d",
    "COERCE_DECIMAL_TO_STRING": True,  # money must never become a float
}

from datetime import timedelta  # noqa: E402

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(hours=12),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,  # rotation handled by apps.accounts
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "sub",
    "TOKEN_OBTAIN_SERIALIZER": "apps.accounts.serializers.CustomTokenObtainPairSerializer",
}

# ---------------------------------------------------------------------------
# Password validation
# ---------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# Internationalization / static / files
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# Object storage (S3-compatible: AWS S3 in prod, MinIO in dev)
S3_ENDPOINT_URL = env("S3_ENDPOINT_URL")
S3_ACCESS_KEY_ID = env("S3_ACCESS_KEY_ID")
S3_SECRET_ACCESS_KEY = env("S3_SECRET_ACCESS_KEY")
S3_BUCKET_NAME = env("S3_BUCKET_NAME")
S3_REGION_NAME = env("S3_REGION_NAME")
S3_USE_SSL = env.bool("S3_USE_SSL")
SIGNED_URL_TTL_SECONDS = env.int("SIGNED_URL_TTL_SECONDS")
if S3_ENDPOINT_URL:
    STORAGES["default"] = {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        "OPTIONS": {
            "endpoint_url": S3_ENDPOINT_URL,
            "access_key": S3_ACCESS_KEY_ID,
            "secret_key": S3_SECRET_ACCESS_KEY,
            "bucket_name": S3_BUCKET_NAME,
            "region_name": S3_REGION_NAME,
            "use_ssl": S3_USE_SSL,
            "default_acl": "private",
            "querystring_auth": True,
            "location": f"{DJANGO_ENV}/",
            "file_overwrite": False,
        },
    }

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# CORS / CSRF
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True  # refresh cookie is cross-origin in dev
CSRF_TRUSTED_ORIGINS = [o for o in CORS_ALLOWED_ORIGINS if o.startswith("https://")]

# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------
EMAIL_BACKEND = env("EMAIL_BACKEND")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL")

# ---------------------------------------------------------------------------
# AI abstraction (never fabricated: empty provider => honest 503)
# ---------------------------------------------------------------------------
AI_PROVIDER = env("AI_PROVIDER")
AI_API_KEY = env("AI_API_KEY")
AI_MODEL = env("AI_MODEL")
AI_ALLOW_EXTERNAL_CONTEXT = env.bool("AI_ALLOW_EXTERNAL_CONTEXT")

# Device keys for GPS ingestion are hashed with a pepper from the environment.
DEVICE_KEY_PEPPER = env("DEVICE_KEY_PEPPER")

# Django admin is a platform tool, not the tenant UI (see SECURITY_PLAN §10)
ENABLE_ADMIN = env.bool("ENABLE_ADMIN")

# ---------------------------------------------------------------------------
# Logging — structured, request_id-aware, no secrets
# ---------------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "apps.core.logging.JsonFormatter",
        },
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "json"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "apps": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}

# ---------------------------------------------------------------------------
# drf-spectacular
# ---------------------------------------------------------------------------
SPECTACULAR_SETTINGS = {
    "TITLE": "Logistimus API",
    "DESCRIPTION": (
        "Logistimus — Global Logistics Operating System. Multi-tenant REST API. "
        "All tenant data is scoped to the organization in your access token; "
        "no client-supplied organization id is ever trusted."
    ),
    "VERSION": "v1",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "SCHEMA_PATH_PREFIX": r"/api/v1",
    "TAGS": [
        {"name": "auth", "description": "Registration, login, sessions"},
        {"name": "organizations", "description": "Companies, branches, members, API keys"},
        {"name": "orders", "description": "Order lifecycle"},
        {"name": "shipments", "description": "Transport legs, tracking, public track"},
        {"name": "dispatch", "description": "Dispatch board and assignments"},
        {"name": "fleet", "description": "Vehicles, telemetry, maintenance, fuel"},
        {"name": "drivers", "description": "Driver profiles, duty logs, performance"},
        {"name": "warehouses", "description": "Warehouses and dock bays"},
        {"name": "inventory", "description": "Items, stock levels, movements"},
        {"name": "crm", "description": "Customers, contracts, leads"},
        {"name": "finance", "description": "Invoices, payments, expenses"},
        {"name": "documents", "description": "Uploads, signed URLs"},
        {"name": "tracking", "description": "GPS, live locations"},
        {"name": "analytics", "description": "KPIs and reports"},
        {"name": "notifications", "description": "In-app notifications"},
        {"name": "ai", "description": "AI assistant abstraction"},
        {"name": "integrations", "description": "Webhooks, API keys, providers"},
        {"name": "subscriptions", "description": "Plans and entitlements"},
        {"name": "customer-portal", "description": "Customer-facing portal"},
        {"name": "driver-portal", "description": "Driver-facing portal"},
        {"name": "super-admin", "description": "Platform administration"},
        {"name": "health", "description": "Liveness and readiness"},
    ],
}
