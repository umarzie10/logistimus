"""Test settings — fast, isolated, deterministic (SQLite or test Postgres)."""

from .base import *  # noqa: F401,F403
from .base import env  # noqa: F401

DEBUG = False
SECRET_KEY = "test-secret-key-not-for-production"

# Deterministic password hasher for speed (production uses PBKDF2 defaults)
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# In-memory cache keeps tests hermetic (no Redis dependency)
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}

# Database: DJANGO_TEST_DATABASE_URL (e.g. postgres test db) or in-memory SQLite
TEST_DATABASE_URL = env("DJANGO_TEST_DATABASE_URL", default="")
if TEST_DATABASE_URL:
    DATABASES = {"default": env.db("DJANGO_TEST_DATABASE_URL")}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
            "TEST": {"NAME": ":memory:"},
        }
    }

# Celery runs tasks synchronously so tests observe their effects
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Console email so assertions can inspect outbox
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Filesystem storage for uploads in tests
STORAGES["default"] = {"BACKEND": "django.core.files.storage.FileSystemStorage"}  # noqa: F405

# Quiet logs during tests
LOGGING["root"]["level"] = "WARNING"  # noqa: F405
LOGGING["loggers"]["django"]["level"] = "WARNING"  # noqa: F405
LOGGING["loggers"]["apps"]["level"] = "WARNING"  # noqa: F405

# Tests explicitly call the throttled endpoints; keep limits reachable
REST_FRAMEWORK = {  # noqa: F405
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_RATES": {**REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]},  # noqa: F405
}
