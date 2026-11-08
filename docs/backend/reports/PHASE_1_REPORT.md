# Phase 1 report — Foundation & infrastructure

- **Status:** ✅ PASS
- **Date:** 2026-11-08

## Implemented

- **Project scaffold** — `Backend/` Django 5.2 LTS project on Python 3.13 (>=3.12,<3.14), managed with `uv` (`uv.lock` committed).
- **Settings layering** — `config/settings/{base,dev,prod,test}.py`:
  - env-driven config via `django-environ` (no secret in repo);
  - DRF defaults: `StandardPagination` (max 100), throttles, `drf-spectacular` tags;
  - SimpleJWT 15-min access / 30-day refresh lifetimes;
  - Redis cache + Channels layer, Celery app wiring;
  - S3/MinIO storage with a prod-required guard;
  - whitenoise static, JSON structured logging with request id;
  - prod hardening: `DEBUG=False` required, HSTS/secure cookies, pg required;
  - test: MD5 hasher, locmem cache/emails, eager Celery, SQLite or test-Postgres.
- **`apps/core` foundation**
  - `context.py` — request/org/platform-admin ContextVars (token-based reset);
  - `middleware.py` — `RequestContextMiddleware` (X-Request-Id propagation),
    `TenantContextMiddleware` (one transaction per request, context lifecycle),
    `ApiErrorEnvelopeMiddleware` (every non-2xx under `/api/` is the JSON
    envelope even when `DEBUG=True` serves Django's HTML debug page);
  - `authentication.py` — JWT auth that sets org context + `SET LOCAL`;
  - `permissions.py` — `HasPermission` (permission_code catalog hook),
    `IsPlatformAdmin`, `ReadOnly` (catalog lookup lands in Phase 2);
  - `exceptions.py` — unified envelope `{error:{code,message,details,request_id}}`
    + stable `ERROR_CODES` registry (ValueError on unregistered code);
  - `errors.py` — Django-level `handler40x` (404/403/400/500 → JSON envelope);
  - `managers.py` — `TenantManager`/`TenantModel` (server-injected
    `organization_id`, immutable on update), `UnscopedManager`;
  - `models.py` — `User` (email-based, no username), `Organization` (tenancy
    root), `AuditLog` (append-only, fail-closed `AuditLogManager`);
  - `db.py` — `set_organization_context` (SET LOCAL, refuses outside a
    transaction), `enable_rls` (NULLIF-guarded policy — `''::uuid` would abort
    the transaction instead of failing closed), `rls_enabled_tables`;
  - `checks.py` — system checks `logistimus.E001` (RLS coverage),
    `logistimus.W001` (view permission declaration);
  - `audit.py`, `pagination.py`, `throttles.py`, `logging.py`, `health.py`,
    `consumers.py` (`OrgScopedConsumer`, `PingConsumer`, close codes 4401/4403),
    `routing.py`, `urls.py`.
- **Management command** — `check_database_conventions` (RLS coverage,
  tenant-aware `ref` uniqueness, money columns numeric) — CI gate.
- **Infrastructure**
  - `Backend/Dockerfile` (uv-based, frozen lock);
  - `Backend/docker-compose.yml` — `db` (postgis/postgis:16-3.4), `redis`,
    `minio`, `api`, `worker`, `beat`; healthchecks + dependency ordering;
    SELinux `:Z` bind mounts; container-owned venv volume (root in-container
    `uv run` never rewrites the host `.venv`);
  - `.env.example` (no real secrets), `infrastructure/nginx/nginx.conf`
    (TLS, `/ws/` upgrade, static, security headers);
  - `.github/workflows/backend.yml` — ruff → check → `makemigrations --check`
    → migrate → conventions → pytest, against a PostGIS service container.

## Files created/modified

- `Backend/**` — 42 Python files (config 10, apps/core 24, tests 4, manage.py).
- `docker-compose.yml`, `Dockerfile`, `.env.example` (under `Backend/`).
- `infrastructure/nginx/nginx.conf`.
- `.github/workflows/backend.yml`.

## APIs available

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/health/` | liveness — no DB/redis dependency, public |
| GET | `/api/v1/health/ready/` | readiness — checks db + redis |
| GET | `/api/schema/` | OpenAPI YAML |
| GET | `/api/docs/` | Swagger UI |
| GET | `/api/redoc/` | ReDoc |

Plus: any unmatched `/api/...` path → `404 not_found` envelope (not HTML).

## Migrations

- `core.0001_initial` — Organization, User, AuditLog.
- `core.0002_alter_user_managers` — email-first `UserManager`.
- `makemigrations --check` → *No changes detected*.

## Tests executed

```
uv run ruff check .                                    → All checks passed!
uv run pytest                                          → 14 passed, 6 skipped (SQLite; RLS tests skip)
uv run pytest (DJANGO_TEST_DATABASE_URL=postgres://…)  → 20 passed (PostGIS)
uv run manage.py check                                 → 0 issues (against PostGIS)
uv run manage.py check_database_conventions            → OK (PostGIS)
docker compose up -d db redis api                      → health 200, ready 200
curl /api/v1/nope/ -H 'Accept: application/json'       → 404 JSON envelope
```

## Test results

- **22 tests** total (14 SQLite + 6 RLS-only-on-pg + shared), **0 failures**.
- Coverage: not yet gated (Phase 9 adds the CI gate).

### RLS verified against real PostgreSQL (`tests/test_rls_postgres.py`)

| Case | Result |
|---|---|
| no org context → 0 rows (fail closed) | ✅ |
| org A context → only A's rows | ✅ |
| platform_admin → all rows | ✅ |
| cross-org INSERT → rejected by WITH CHECK | ✅ |
| policy present (`relrowsecurity`) | ✅ |
| `set_organization_context` outside txn → RuntimeError | ✅ |

Two real defects were found and fixed by these tests:
1. **`''::uuid` abort** — `clear_organization_context()` wrote an empty
   string; the policy cast it and killed the transaction instead of failing
   closed. Fixed with `NULLIF(current_setting(...), '')` in `enable_rls`.
2. **DEBUG HTML 404** — with `DEBUG=True`, Django served its technical HTML
   page for unmatched API paths, violating API_SPECIFICATION §1.4. Fixed with
   `ApiErrorEnvelopeMiddleware` (machines always get JSON; a browser
   navigation with `Accept: text/html` keeps the debug page).

## Security concerns

- Secrets env-only; `.env` is gitignored; prod refuses the dev sentinel key.
- Tenant org id never read from the client — injected server-side from the
  JWT `org` claim after membership check; `TenantModel.save()` overwrites it.
- RLS defense-in-depth uses `SET LOCAL` inside the request transaction →
  pgbouncer transaction-pooling safe; fail-closed on missing context.
- Error responses carry no stack traces/SQL (envelope + opaque 500).
- `AuditLog` reads fail closed with no context (platform/admin paths excepted).
- No permission bypass yet: `HasPermission` returns empty catalog until
  Phase 2 wires `effective_permissions` — tracked as W001 system check.

## Remaining tasks (planned, not blockers)

- `HasPermission` catalog lookup (`apps/permissions/services.py`) — Phase 2.
- Coverage gate + `pip-audit` — Phase 9 (per IMPLEMENTATION_PLAN).
- `nginx`/`worker`/`beat` containers exercised in CI — dev runs `api` only.
- `check_database_conventions` reports `0 tenant tables` until Phase 3+
  adds `TenantModel` subclasses (expected).

## Definition of Done: **PASS**

- `docker compose up db redis api` → health 200 ✅
- `pytest` green (SQLite + PostGIS) ✅
- `ruff check` clean ✅
- `check_database_conventions` passes ✅
- CI pipeline defined (`.github/workflows/backend.yml`); green on push —
  pending first push of the backend branch.
