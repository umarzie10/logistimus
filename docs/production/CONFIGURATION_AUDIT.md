# Phase 1 — Production Configuration Audit

**Project:** Logistimus (Django 5.2 + DRF backend, Next.js 16 frontend)
**Date:** 2026-11-10
**Auditor role:** Senior DevOps / Django / Next.js / Security engineer
**Method:** direct inspection + executed verification commands (evidence below).
No production deployment was performed. No secrets were exposed.

Status legend: `PASS` · `FAIL (fixed)` · `NOT_CONFIGURED` · `NOT_VERIFIED` · `BLOCKED`

---

## 1. Executive summary

| Area | Result |
|---|---|
| Backend production settings (`config.settings.prod`) | **PASS** (1 critical bug found & fixed) |
| Frontend production build | **PASS** (31/31 routes) |
| Secret handling | **PASS** (only `NEXT_PUBLIC_API_URL` reaches the bundle) |
| Error boundaries | **PASS** after adding `global-error.tsx` (was missing) |
| Lint / type gates for CI | **PASS** (ESLint 0 errors, `tsc` 0 errors) |
| Test suites | **PASS** (backend 130 passed, frontend build clean) |
| Dependency vulnerabilities | **PASS** (`npm audit --omit=dev` = 0) |
| Known gaps (documented, non-blocking for staging) | see §6 |

---

## 2. Issues found and fixed in this phase

### 2.1 CRITICAL — production booted with the dev sentinel `SECRET_KEY` — `FAIL (fixed)`

**Evidence (before fix):**

```text
$ uv run python /tmp/opencode/prod_negative_secret.py
FAIL: production booted with the dev sentinel secret
```

**Root cause:**
- `base.py`'s guard (`raise` when `DEBUG=False` and `SECRET_KEY == DEV_KEY_SENTINEL`) can
  never fire for the prod module: `base.py` is imported *before* `prod.py` forces
  `DEBUG = False`, so at base-import time `DEBUG` still holds its env default `True`.
- `prod.py`'s own assertion compared the literal `"unsafe-dev-key-change-me"` — a **different,
  shorter string** than `DEV_KEY_SENTINEL` — so it never matched either.

Result: a production deployment with no `SECRET_KEY` env var silently ran with the
publicly-known repository constant (JWT forgery, session/CSRF signing forgery).

**Fix** (`Backend/config/settings/prod.py`):

```python
if SECRET_KEY == DEV_KEY_SENTINEL:
    raise RuntimeError("SECRET_KEY must be set to a real value in production")
assert SECRET_KEY != "unsafe-dev-key-change-me", "Set SECRET_KEY"
```

**Evidence (after fix):**

```text
$ uv run python /tmp/opencode/prod_negative_secret.py
PASS: production refused dev secret -> SECRET_KEY must be set to a real value in production

$ uv run python /tmp/opencode/prod_boot_check.py
DEBUG = False
ALLOWED_HOSTS = ['api.example.com']
CSRF_TRUSTED_ORIGINS = ['https://app.example.com']
CORS_ALLOWED_ORIGINS = ['https://app.example.com']
CORS_ALLOW_CREDENTIALS = True
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
X_FRAME_OPTIONS = DENY
DB_ENGINE = django.db.backends.postgresql
DB_CONN_MAX_AGE = 60
DB_CONN_HEALTH_CHECKS = True
STORAGES = {'default': 'S3Boto3Storage', 'staticfiles': 'CompressedManifestStaticFilesStorage'}
ADMIN_INSTALLED = False
LOG_ROOT_LEVEL = INFO
LOG_HANDLER = json
JWT_ACCESS_LIFETIME = 0:15:00
JWT_REFRESH_LIFETIME = 12:00:00
JWT_ROTATE = True
PROD_BOOT_OK
```

### 2.2 Frontend lint gate — 13 ESLint errors — `FAIL (fixed)`

CI requires a clean lint run. Errors and resolutions:

| Error class | Count | Resolution |
|---|---|---|
| `react-hooks/set-state-in-effect` | 8 | loaders converted from `async/await` to `function loadX(): Promise<void> { return promise.then(cb).catch(cb).finally(cb) }` — all `setState` now happens only in promise callbacks, never synchronously inside the effect. Two redundant URL-param effects deleted (`reset-password`, `verify-email` — `useState(initial)` already seeds the state). |
| `@typescript-eslint/no-explicit-any` | 4 | `documents/page.tsx` cast → `DocumentItem["category"]`; `api.ts` error envelope → `unknown` + typed cast; `getMembers()` → new `OrgMemberRow` interface matching backend `membership_row` (`user{id,name,email}, role, status, last_login_at`). |
| `react/no-unescaped-entities` | 1 | `settings/page.tsx` `UZS (so'm)` → `so&apos;m`. |

Refresh buttons (`admin`, `admin/organizations`, `admin/system`, `dashboard`) were re-wrapped
with `setLoading(true); loadX();` so the spinner behavior is preserved (loaders no longer set
loading themselves; mount state stays `useState(true)`).

**Evidence:**

```text
$ npm run lint
✖ 66 problems (0 errors, 66 warnings)        # warnings = pre-existing unused-var advisories, non-blocking

$ npx eslint --quiet
(no output = 0 errors)

$ npx tsc --noEmit
(no output = 0 errors)
```

### 2.3 Missing root error boundary — `NOT_CONFIGURED → PASS (fixed)`

Route-level `error.tsx`, `not-found.tsx`, `loading.tsx` existed, but a failure **inside the
root layout** had no boundary. Added `Frontend/src/app/global-error.tsx` (renders its own
`<html>/<body>`, logs the error, offers reload + home), matching the existing error page design.

---

## 3. Backend configuration audit

Settings layering: `base <- dev / test / prod`, selected via `DJANGO_SETTINGS_MODULE`
(`manage.py` defaults to **dev**; `wsgi.py`/`asgi.py` default to **prod**).

| # | Requirement | Status | Evidence / note |
|---|---|---|---|
| 1 | `DEBUG` disabled in production | **PASS** | `prod_boot_check.py` → `DEBUG = False` (`prod.py: DEBUG = False` unconditionally) |
| 2 | `ALLOWED_HOSTS` validated | **PASS** | env-driven, default `localhost,127.0.0.1`; prod test shows `['api.example.com']` from env. Empty value would fail at first request (Django host validation). |
| 3 | `CSRF_TRUSTED_ORIGINS` configured | **PASS** | derived from `CORS_ALLOWED_ORIGINS` (https origins get an explicit `CSRF_TRUSTED_ORIGINS` entry); evidence `['https://app.example.com']` |
| 4 | Secure CORS policy | **PASS** | explicit origin allow-list (`CORS_ALLOWED_ORIGINS`), `CORS_ALLOW_CREDENTIALS = True`, no wildcard observed in `base.py` |
| 5 | Secure cookies / HTTPS | **PASS** | `SESSION_COOKIE_SECURE/HTTPONLY=True`, `CSRF_COOKIE_SECURE=True`, `SECURE_SSL_REDIRECT=True`, `SECURE_HSTS_SECONDS=31536000` + `INCLUDE_SUBDOMAINS` + `PRELOAD`, `SECURE_PROXY_SSL_HEADER` for nginx TLS termination, `X_FRAME_OPTIONS=DENY`, `COOP=same-origin`, `nosniff`, referrer policy |
| 6 | `SECRET_KEY` from environment | **PASS (fixed)** | §2.1 — dev sentinel now rejected at boot; real value comes only from env |
| 7 | DB credentials not hardcoded | **PASS** | `DATABASE_URL` env-driven; defaults are dev-only (`sqlite://` in base, compose dev credentials `logistimus-dev`). No production credential literals in the repo (git history scan: only `Backend/.env.example` ever added) |
| 8 | Logging configuration | **PASS** | structured JSON formatter (`apps/core/logging.py`) with `request_id` + `organization_id` correlation; root level `INFO` in prod; no password/token/body logging found (`grep logger.*(password\|token...)` → 1 hit = email address only in `accounts/tasks.py:52`, no secret) |
| 9 | Static & media handling | **PASS** | prod: `staticfiles = CompressedManifestStaticFilesStorage` (whitenoise), `default = S3Boto3Storage` (S3/MinIO required in prod); `collectstatic` runs in Dockerfile |
| 10 | Django admin surface | **PASS** | admin app only installed when `ENABLE_ADMIN`; prod test → `ADMIN_INSTALLED = False` |
| 11 | JWT posture | **PASS** | access 15 min / refresh 12 h / `ROTATE_REFRESH_TOKENS = True`; refresh token in HttpOnly `lr_refresh` cookie (`httponly=True`, `samesite=Lax`, `secure=SESSION_COOKIE_SECURE`) — verified in `apps/accounts/cookies.py` + test `test_accounts_phase2.py:245` |
| 12 | Connection management | **PASS** | PostgreSQL required in prod, `CONN_MAX_AGE=60`, `CONN_HEALTH_CHECKS=True` |
| 13 | `manage.py` defaults to dev settings | **NOT_CONFIGURED (accepted, documented)** | intentional for local DX; container entrypoint uses `config.asgi` → prod. Deployment must not rely on bare `manage.py` in prod — see `ENVIRONMENT_VARIABLES.md` (Phase 2) |

---

## 4. Frontend configuration audit

| # | Requirement | Status | Evidence / note |
|---|---|---|---|
| 1 | Production Next.js config | **PASS** | `next.config.ts`: `cacheComponents`, legacy `/super-admin` → `/admin` redirects, Turbopack CSS rule. No `images.unoptimized`, no dev-only flags. |
| 2 | Env var handling | **PASS** | single `process.env` read in the whole client source: `NEXT_PUBLIC_API_URL` (`src/lib/api.ts:12`) with an explicit localhost fallback |
| 3 | Secrets never in client bundle | **PASS** | grep over `Frontend/src` → only `NEXT_PUBLIC_API_URL`. Server-only secrets do not exist in the frontend by design (auth via HttpOnly refresh cookie + short-lived in-memory access token). |
| 4 | API base URL configuration | **PASS (with caveat)** | `NEXT_PUBLIC_API_URL` is inlined **at build time** — it must be set during `next build`, not just at runtime. Caveat documented → Phase 6 workflow bakes it as a build arg; default `http://localhost:8000/api/v1` only for local dev. |
| 5 | Production build | **PASS** | `rm -rf .next && npm run build` → `✓ Compiled successfully`, TypeScript clean, **31/31 static routes generated** |
| 6 | Error boundaries | **PASS (fixed)** | `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx` existed; `app/global-error.tsx` added (§2.3) |
| 7 | API error handling | **PASS** | centralized `request()` in `lib/api.ts` parses the backend error envelope into typed `ApiError {code,message,details,request_id,status}`; 401 triggers one hydration retry from the refresh cookie before surfacing the error |
| 8 | Secure authentication/session handling | **PASS** | access token kept **in memory only** (no localStorage); refresh token in HttpOnly SameSite=Lax Secure cookie set by the backend; `credentials: "include"` on all requests |
| 9 | Lint/type gates | **PASS (fixed)** | §2.2 — 0 ESLint errors, 0 TS errors |
| 10 | Dependency vulnerabilities | **PASS** | `npm audit --omit=dev` → `found 0 vulnerabilities` |

---

## 5. Verification evidence (Phase 1 gate)

All commands executed on 2026-11-10:

```text
# Backend
$ cd Backend && uv run ruff check .
All checks passed!

$ cd Backend && uv run manage.py check --settings=config.settings.dev
System check identified no issues (0 silenced).

$ cd Backend && DJANGO_TEST_DATABASE_URL="postgres://...@localhost:5432/logistimus_test" uv run pytest
130 passed in 7.68s

$ uv run python /tmp/opencode/prod_boot_check.py          → PROD_BOOT_OK (see §2.1)
$ uv run python /tmp/opencode/prod_negative_secret.py     → PASS: production refused dev secret

# Frontend
$ cd Frontend && npm run lint        → 0 errors (66 warnings)
$ cd Frontend && npx tsc --noEmit    → clean
$ cd Frontend && npm run build       → ✓ 31/31 routes
$ npm audit --omit=dev               → found 0 vulnerabilities

# Browser smoke (Playwright MCP, fresh production build on :3000)
login (org user) → /dashboard        → org name rendered, Refresh clicked
/admin                               → "Access Restricted" (correct RBAC for non-platform admin)
/settings, /documents                → rendered
login (superadmin) → /admin, /admin/audit, /admin/organizations, /admin/system
                                     → all rendered, Refresh/Ping buttons clicked
console errors across all runs       → []
```

---

## 6. Known gaps carried to later phases

| Gap | Phase | Impact |
|---|---|---|
| `Backend/.env.example` is stale (documents vars settings never read; misses read vars); no frontend `.env.example` | Phase 2 | onboarding / drift risk |
| `docker-compose.yml`: no restart policies, db/redis/minio ports published on the host, nginx not wired in, no frontend Dockerfile | Phase 3 | staging/prod readiness |
| No staging/production deploy workflows; no frontend CI | Phase 6 | deployment automation |
| Backup/restore procedure not documented or restore-tested | Phase 7 | data safety |
| Monitoring strategy not defined beyond health endpoints | Phase 8 | operability |
| `CSRF_TRUSTED_ORIGINS` derived only from CORS origins — custom admin origins must be added to CORS list to be CSRF-trusted | Phase 2 (docs) | configuration clarity |
| Existing 66 ESLint warnings (mostly unused imports) | Phase 6 (optional cleanup) | noise, non-blocking |

**No blockers for proceeding to Phase 2.**
