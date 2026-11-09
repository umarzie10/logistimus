# QA Audit Report: Repository & Configuration (01_REPOSITORY_AUDIT.md)

- **Audit Date:** 2026-11-09
- **Auditor:** Principal QA Engineer & Application Security Engineer
- **Target Repository:** `Backend/` (Logistimus Modular Monolith)
- **Status:** ✅ VERIFIED & AUDITED

---

## 1. Executive Summary

A comprehensive architectural and repository audit of the Logistimus backend was performed. The backend is structured as a Django 5.2 LTS modular monolith powered by Python 3.13, DRF, Django Channels (Daphne), Celery, PostGIS 16, and Redis 7. 

The repository exhibits strict enterprise design patterns:
- Zero hardcoded secrets in version control.
- Separation of environments into `base`, `dev`, `prod`, and `test` settings.
- Fail-closed security architecture in production (refuses to boot without PostgreSQL, S3, or real SECRET_KEY).
- Server-enforced multi-tenancy with PostgreSQL Row-Level Security (RLS) policies.
- Structured JSON logging with request-ID correlation.
- Container-isolated development environment preventing host pollution.

---

## 2. Django Configuration & Installed Applications

### Framework Versions
- **Python:** 3.13.15 (managed via `uv`)
- **Django:** 5.2a1 (LTS track)
- **DRF:** 3.15.2
- **Channels:** 4.2.0 (ASGI via `daphne` 4.1.2)
- **Celery:** 5.4.0
- **Database Driver:** `psycopg` 3.2.3 (PostgreSQL / PostGIS)

### Installed Applications Stack
`INSTALLED_APPS` is cleanly ordered to guarantee proper ASGI, static file, and authentication handling:
1. `daphne` (ASGI server priority)
2. Django Core (`admin`, `auth`, `contenttypes`, `sessions`, `messages`, `staticfiles`)
3. Third-Party Additions:
   - `rest_framework`
   - `rest_framework_simplejwt`
   - `django_filters`
   - `drf_spectacular` (OpenAPI 3.0.3 generator)
   - `corsheaders`
   - `channels`
   - `storages` (S3/MinIO)
4. Domain Modular Apps:
   - `apps.core`: Foundation, tenancy context, audit logs, error middleware, system checks, database helpers.
   - `apps.permissions`: 168-entry RBAC catalog, role management, permission grants, Redis cache.
   - `apps.organizations`: Multi-tenant organization entities, memberships, branches, settings, invitations, API keys.
   - `apps.accounts`: User identity, JWT login, refresh token families, email verification, password reset, login history.

---

## 3. Middleware Ordering & Safety Analysis

The middleware stack in `config/settings/base.py` enforces a strict lifecycle:

| Order | Middleware Class | Purpose / Security Function |
|---|---|---|
| 1 | `django.middleware.security.SecurityMiddleware` | Transport security, HSTS, SSL redirect in production |
| 2 | `whitenoise.middleware.WhiteNoiseMiddleware` | Production-grade compressed static asset delivery |
| 3 | `corsheaders.middleware.CorsMiddleware` | Origin validation before session/auth handling |
| 4 | `django.contrib.sessions.middleware.SessionMiddleware` | Session storage (admin/internal only) |
| 5 | `django.middleware.common.CommonMiddleware` | URL normalization and standard headers |
| 6 | `django.middleware.csrf.CsrfViewMiddleware` | CSRF cookie token protection |
| 7 | `django.contrib.auth.middleware.AuthenticationMiddleware` | Session-based user binding |
| 8 | `django.contrib.messages.middleware.MessageMiddleware` | Flash message framework |
| 9 | `django.middleware.clickjacking.XFrameOptionsMiddleware` | DENY clickjacking headers |
| 10 | `apps.core.middleware.RequestContextMiddleware` | Injects/propagates `X-Request-Id` into `ContextVar` |
| 11 | `apps.core.middleware.TenantContextMiddleware` | Wraps request in a DB transaction, sets `SET LOCAL app.organization_id`, clears context |
| 12 | `apps.core.middleware.ApiErrorEnvelopeMiddleware` | Catches exceptions/non-2xx responses under `/api/` and formats into `{error: {code, message, details, request_id}}` |

**Audit Finding:** The middleware order is architecturally sound. `RequestContextMiddleware` runs prior to `TenantContextMiddleware` ensuring logs and errors carry the correlation ID, while `ApiErrorEnvelopeMiddleware` wraps the return path ensuring unhandled exceptions always yield structured JSON instead of HTML leakages.

---

## 4. Settings Separation & Environment Configuration

The settings hierarchy follows a 4-tier model:
- `config/settings/base.py`: Declares environment schema via `django-environ` with safe local defaults.
- `config/settings/dev.py`: Enables `DEBUG=True`, console email backend, relaxed localhost CORS origins.
- `config/settings/prod.py`: Enforces:
  - `DEBUG=False`
  - `SECURE_SSL_REDIRECT=True`
  - `SECURE_HSTS_SECONDS=31536000`
  - `SESSION_COOKIE_SECURE=True` & `CSRF_COOKIE_SECURE=True`
  - Hard requirement for real `SECRET_KEY` (fails closed if default dev key is detected)
  - Hard requirement for `S3_ENDPOINT_URL` (refuses to boot without object storage)
  - Hard requirement for PostgreSQL (refuses to boot with SQLite)
- `config/settings/test.py`: Isolated testing configuration:
  - Fast MD5 password hasher
  - `LocMemCache` (hermetic, no live Redis dependency needed for unit tests)
  - Synchronous Celery execution (`CELERY_TASK_ALWAYS_EAGER=True`)
  - Test database selection via `DJANGO_TEST_DATABASE_URL` with in-memory SQLite fallback.

---

## 5. Security & Isolation Controls

1. **Secret Management:** No secrets, API keys, or database credentials are hardcoded. All settings consume `os.environ` through `django-environ`.
2. **CSRF Strategy:**
   - Stateless JWT endpoints do not rely on ambient session cookies.
   - Mutating refresh/logout endpoints that consume the HttpOnly refresh cookie require the explicit header:
     `X-Requested-With: XMLHttpRequest` (enforced by `_require_xhr`).
3. **Database Tenancy (RLS):**
   - Tables inheriting `TenantModel` enforce PostgreSQL Row Level Security.
   - Custom check `logistimus.E001` automatically audits model tables against database catalog RLS policies.
4. **Rate Limiting:**
   - DRF User throttle: `300/min`
   - DRF Anon throttle: `60/min`
   - Login rate throttle: `5/min` per IP + `10/15min` per email address
   - Password reset: `5/hour`

---

## 6. Docker & Container Infrastructure

`Backend/docker-compose.yml` provides a production-parity local stack:
- `db`: `postgis/postgis:16-3.4` with health check `pg_isready`
- `redis`: `redis:7-alpine` with health check `redis-cli ping`
- `minio`: `minio/minio:latest` for S3-compatible local bucket testing
- `api`: ASGI server (`uv run uvicorn config.asgi:application`) with health check dependencies
- `worker`: Celery worker (`uv run celery -A config worker`)
- `beat`: Celery beat periodic scheduler (`uv run celery -A config beat`)
- **Isolation Protection:** Named volume `venvdata:/app/.venv` shadows the bind-mounted host virtual environment, preventing container root commands from corrupting host permissions.

---

## 7. Migration & Schema Integrity

All migration trees are contiguous and free of conflicts:
- `accounts`: `0001_initial`
- `core`: `0001_initial`, `0002_alter_user_managers`
- `organizations`: `0001_initial`, `0002_initial`, `0003_enable_rls`
- `permissions`: `0001_initial`, `0002_enable_rls`, `0003_seed_catalog`

**Audit Verification Command:**
`uv run manage.py makemigrations --check --dry-run` -> **No changes detected.**
`uv run manage.py check_database_conventions` -> **OK: 8 tenant tables checked (8 with RLS), refs and money columns conform.**

---

## 8. Defect & Observation Log

| Severity | Issue | Resolution / Verification |
|---|---|---|
| LOW | WhiteNoise warned of missing `staticfiles/` folder in local environment | Directory created at `Backend/staticfiles/`, warning eliminated |
| LOW | Pytest config had invalid `DJANGO = ...` directive in `pyproject.toml` | Removed redundant key, relying on `-q --strict-markers --ds=config.settings.test` in `addopts` |
| INFORMATIONAL | RLS check requires PostgreSQL; running check against unmigrated database prompts error | Expected fail-closed behavior; verified clean once migrations are applied |

**Conclusion:** Phase 1 audit passes all quality gates. Architecture is sound, decoupled, and secure.
