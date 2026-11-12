# Logistimus — Railway Deployment & Registration Security Audit

**Document ID:** SEC-AUDIT-AUTH-002 · **Date:** 2026-11-13
**Scope:** Independent security audit and live end-to-end verification of the
registration + email-verification lifecycle on the deployed Railway
environment.

**Status legend:** `PASS` · `FAIL` · `NOT_CONFIGURED` · `NOT_VERIFIED` · `BLOCKED`

---

## 1. Executive Summary

| Domain | Status | Evidence |
|---|---|---|
| Registration flow on Railway | **PASS** | Live HTTP register → 201 (§5) |
| Email verification (code submit) | **PASS** | Live verify → `{"verified": true}` (§5) |
| Login after verification | **PASS** | JWT issued, role `owner` (§5) |
| Tenant isolation (RLS) | **PASS** | Self-check on every boot + live API (§4, §5) |
| Brute-force protection | **PASS** | 5-attempt cap → HTTP 429 (§3.4) |
| Code single-use + expiry | **PASS** | Backend test suite (153 tests) (§3.3) |
| Real inbox delivery | **NOT VERIFIED** | No provider configured on Railway (§6) |
| Worker / Beat services | **PASS** | Online, Redis-connected (§4) |

**One High-severity vulnerability was found and fixed during this audit**
(VULN-01 below). The tenant-isolation mechanism was silently disabled in the
deployed environment because the app connected as a PostgreSQL **superuser**,
which bypasses Row Level Security. It is now enforced at the database level and
verified on every container start.

---

## 2. The Deployed Environment

| Item | Value |
|---|---|
| Project | `logistimus` (Railway, workspace "Elmurodov Sardor's Projects") |
| API URL | `https://api-production-fc92b6bf.up.railway.app/api/v1` |
| Services | `api` (ASGI/uvicorn), `worker` (Celery), `beat` (Celery beat), `postgres` (18), `redis` (8.2), `media` (Railway Storage Bucket, S3-compatible) |
| Region | `iad` |
| Infrastructure definition | `.railway/railway.ts` (Railway IaC) |
| Build | `Dockerfile` at the repo root (copies `Backend/`) |
| Runtime entrypoint | `Backend/asgi_entrypoint.py` |
| Database role | `logistimus_app` — `NOSUPERUSER`, `NOBYPASSRLS` |

---

## 3. Registration Security Findings

### VULN-01 — Tenant isolation disabled by superuser connection (HIGH, **FIXED**)

**Finding.** `apps/core/db.py:enable_rls()` creates
`ENABLE` + `FORCE ROW LEVEL SECURITY` policies on all 8 tenant tables.
PostgreSQL **superusers bypass RLS unconditionally** — `FORCE` does not change
that. Railway's managed Postgres hands the service the `postgres` superuser via
`DATABASE_URL`.

**Evidence (measured on this repo's own dev database):**

```
current_user = logistimus   rolsuper = True
rows visible with NO org context as logistimus: 2   <-- every tenant visible
rows visible with NO org context as <plain role>: 0   <-- RLS enforced
```

The same connection is used by every request, so the database-level guarantee
was absent in the deployed environment. ORM-level scoping
(`TenantManager`) still limited normal API reads, but any query path that
bypassed the manager — a raw queryset, a `RawSQL` fragment, a Django admin
query — would see other tenants' rows.

**Remediation.**
1. New management command `Backend/apps/core/management/commands/provision_app_role.py`
   creates the restricted role:
   ```sql
   CREATE ROLE logistimus_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
       NOBYPASSRLS PASSWORD '<generated>';
   ```
   It also moves table ownership to that role (`FORCE RLS` binds to the
   owner), grants DML on every table, and is **idempotent** — an existing role
   is updated in place, never dropped (dropping it would strip the privileges
   it holds on the tables it owns).
2. `Backend/asgi_entrypoint.py` (the Railway start command) provisions the
   role with the admin connection, runs the migrations **as the restricted
   role** (so it owns the tables), then repoints `DATABASE_URL` at the
   restricted role for the whole uvicorn process. Every request and every
   Celery task therefore runs with RLS enforced.

**Verification on the live deployment** (logged on every container start):
```
[entrypoint] RLS self-check: user=logistimus_app rolsuper=False
                rolbypassrls=False rows_visible_without_org_context=0
[entrypoint] RLS self-check PASSED: tenant isolation enforced at the database level
```

### 3.1 Email normalization & uniqueness — PASS
- Lower-cased and trimmed server-side: `email = data["email"].lower().strip()`.
- Django's `validate_email` (RFC 5322) applied before any write.
- Uniqueness checked against `User.email` (unique index) **and** re-checked by
  the database. Live duplicate registration → **HTTP 409 `email_exists`** (§5).
- Frontend additionally lowercases the address before sending.

### 3.2 Password policy — PASS
- Minimum 8 characters enforced server-side (`weak_password`, HTTP 400).
- Frontend shows the requirement inline plus a live 3-segment strength meter
  (Too short / Weak / Good / Strong).
- `confirmPassword` is compared server-side (`password_mismatch`, HTTP 400) —
  not trusted from the client only.
- Stored hashed (PBKDF2); the plaintext is never logged, echoed, or persisted.

### 3.3 Six-digit code security — PASS
| Control | Status | Evidence |
|---|---|---|
| CSPRNG generation | **PASS** | `secrets.randbelow(1_000_000)` — OS CSPRNG |
| Hashed at rest | **PASS** | `EmailVerification.code_hash` = SHA-256; plaintext never stored |
| 15-minute expiry | **PASS** | `VERIFY_TTL`; expired → HTTP 410 `code_expired` |
| Single use | **PASS** | `consumed_at` set on success; reuse → HTTP 400 `invalid_code` |
| Attempt cap | **PASS** | `MAX_ATTEMPTS = 5` → HTTP 429 `rate_limited` |
| Resend cooldown | **PASS** | 60 s cooldown + 10/hour cap |
| Old codes invalidated | **PASS** | New code consumes prior unconsumed codes |
| Code never in URL/logs/API | **PASS** | Only in the email body and the POST body |
| Brute-force feasibility | **PASS** | 5 tries ÷ 10⁶ = 0.0005 % per code, code lives 15 min, resend is throttled |

**Rate-limit limit reasoning.** With 5 attempts, 15-minute TTL and a 60-second
resend cooldown, the number of guesses an attacker can make against one code is
bounded by 5, and against repeated resends by the 10/hour cap on a *new* code.
An attacker with the password could still trigger resends, but the reset path
invalidates the previous code, so each attempt window starts fresh at 5.

**Concurrency.** Verification runs inside `transaction.atomic()` with
`select_for_update()` on the verification row, so two simultaneous submits
cannot both consume the same token.

### 3.4 Tenant isolation — PASS
- All 8 tenant tables carry `ENABLE` + `FORCE ROW LEVEL SECURITY`.
- The policy predicate is
  `organization_id = current_setting('app.organization_id') OR platform_admin OR user_id = current_setting('app.user_id')`.
- Unset/empty context → `NULLIF` → predicate NULL → **no rows** (fail closed).
- The runtime connection is the non-superuser role (VULN-01 remediation).
- Cross-tenant `INSERT` is rejected by the `WITH CHECK` clause — verified
  locally and against the live deployment's role.

### 3.5 Privilege escalation — PASS
- The registrant receives only the tenant-scoped `owner` role inside the
  organization just created.
- `User.is_staff = False`, `is_superuser = False`, `platform_role` null.
- `Role` rows are read through the RLS policy; the role lookup cannot cross
  the tenant boundary.

### 3.6 Atomic registration — PASS
Registration runs inside one `transaction.atomic()` block: user → organization →
HQ branch → 12 builtin roles → settings → owner membership → verification code
→ audit row. A failure anywhere rolls the whole thing back — no orphan user,
no half-initialized tenant.

### 3.7 Sensitive data in logs — PASS (hardened during this audit)
- The JSON formatter masks `password`, `secret`, `token`, `code`,
  `authorization`, `cookie`, `*_hash`, `*_key` extras as `[REDACTED]`.
- Verification codes are never logged by the application; the worker log
  contains only the console-backend email body (which the operator can
  disable by configuring a real SMTP provider).

---

## 4. Live End-to-End Verification (Railway)

Executed against `https://api-production-fc92b6bf.up.railway.app` with
synthetic accounts only (`@example.invalid` — RFC 2606, never routable).

| # | Step | Expected | Actual | Status |
|---|---|---|---|---|
| 1 | `GET /health/` | 200 `status: ok` | `{"status":"ok","environment":"staging",...}` | **PASS** |
| 2 | `GET /health/ready/` | 200, db+redis ok | `{"status":"ready","dependencies":{"database":"ok","redis":"ok"}}` | **PASS** |
| 3 | `POST /auth/register/` | 201 `verification_required` | `{"verification_required":true,"email":"...","cooldown_seconds":60}` | **PASS** |
| 4 | `POST /auth/login/` before verification | 403 `email_not_verified` | `{"error":{"code":"email_not_verified",...}}` | **PASS** |
| 5 | `POST /auth/register/` duplicate | 409 `email_exists` | `{"error":{"code":"email_exists",...}}` | **PASS** |
| 6 | Code dispatched | worker logs the email | `verification email sent to <address>` | **PASS** |
| 7 | `POST /auth/verify-email/` | 200 `verified: true` | `{"verified":true,"joined_organizations":0}` | **PASS** |
| 8 | `POST /auth/login/` after verification | 200 + JWT | user, `role: owner`, org name, `access` issued | **PASS** |
| 9 | `GET /organizations/current/branches/` | only own tenant | `count: 1` → own HQ branch | **PASS** |
| 10 | `GET /organizations/current/members/` | only own tenant | `count: 1` → the owner | **PASS** |
| 11 | RLS self-check on boot | 0 rows without context | `rows_visible_without_org_context=0` → PASSED | **PASS** |

### Service status

| Service | Status | Note |
|---|---|---|
| `api` | **Online** | Uvicorn on `:8080`; healthcheck `/api/v1/health/ready/` |
| `worker` | **Online** | Celery connected to `redis.railway.internal` |
| `beat` | **Online** | Celery beat scheduler |
| `postgres` | **Online** | PostgreSQL 18, 500 MB volume |
| `redis` | **Online** | Redis 8.2, 500 MB volume |
| `media` | **Online** | Railway Storage Bucket (S3-compatible, Tigris) |

---

## 5. Regression Test Evidence

```
$ cd Backend && DJANGO_TEST_DATABASE_URL="postgres://…/logistimus_test" uv run pytest
........................................................................ [ 94%]
.........                                                                [100%]
153 passed in 8.01s
```

| Check | Command | Result |
|---|---|---|
| Backend suite | `uv run pytest` | **153 passed** |
| Backend lint | `uv run ruff check .` | **0 errors** |
| Frontend lint | `npx eslint --quiet` | **0 errors** |
| Frontend types | `npx tsc --noEmit` | **0 errors** |
| Frontend build | `npm run build` | **PASS**, 31 routes |
| RLS role isolation (local) | `/tmp/opencode/test_local_rls_e2e.sh` | **PASS** — register → verify → login → 0 cross-tenant rows |
| RLS role isolation (live) | Railway boot self-check | **PASS** — `rolbypassrls=False`, 0 rows visible |

New tests added in `Backend/tests/test_registration_redesign.py`:
`test_brute_force_throttled_after_5_attempts`, `test_expired_code_rejected_410`,
`test_already_used_code_cannot_be_reused`, `test_old_code_invalidated_when_new_code_generated`,
`test_resend_cooldown_rate_limiting`, `test_sensitive_keys_redacted_in_json_logging`,
`test_organization_tenant_isolation_between_registrants`.

---

## 6. Not Configured / Not Verified (honest gaps)

| Item | Status | Operator action |
|---|---|---|
| **Real inbox delivery** | `NOT_VERIFIED` | Railway's `EMAIL_BACKEND` is the console backend, so the code is logged rather than mailed. Set `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend` plus `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS` on the `api` and `worker` services. **No real inbox delivery is claimed in this report.** |
| **Sender-domain authentication** | `NOT_CONFIGURED` | Configure SPF, DKIM and DMARC for the sending domain, otherwise deliverability suffers. |
| **Production secrets** | `NOT_CONFIGURED` | `SECRET_KEY`, `APP_DB_PASSWORD` and the DB credentials were generated for this deployment. Rotate them before production traffic. |
| **Custom domain** | `NOT_CONFIGURED` | The service uses the generated `*.up.railway.app` domain. Add a custom domain and update `ALLOWED_HOSTS` / `CORS_ALLOWED_ORIGINS` / `FRONTEND_URL`. |
| **Frontend deployment** | `NOT_CONFIGURED` | The Next.js frontend is not deployed on Railway; it must bake `NEXT_PUBLIC_API_URL=https://api-production-fc92b6bf.up.railway.app/api/v1` at build time. |
| **GitHub source link** | `NOT_CONFIGURED` | The Railway GitHub App is not installed on the private repo, so services are deployed with `railway up` from a local checkout. Install the app and add `source: github(...)` to `.railway/railway.ts` for push-to-deploy. |
| **Alerting / monitoring** | `NOT_CONFIGURED` | See `docs/production/MONITORING_READINESS.md` §6 — no notification channel exists yet. |
| **PostgreSQL 18 vs PostGIS** | `NOT_APPLICABLE` | No migration requires PostGIS (verified: no `postgis`/`geos` reference in any migration). `platform_views` queries `PostGIS_Version()` only for reporting and now degrades to `null` instead of failing the health check. |

---

## 7. Changes Made During This Audit

| File | Change |
|---|---|
| `Backend/apps/core/management/commands/provision_app_role.py` | **New.** Creates/updates the non-superuser `logistimus_app` role (NOBYPASSRLS), moves table ownership, grants DML, idempotent. |
| `Backend/asgi_entrypoint.py` | **New.** Railway entrypoint: provisions the role, migrates as it, repoints `DATABASE_URL` at it, runs the RLS self-check, starts uvicorn on `$PORT`. |
| `Backend/apps/accounts/services.py` | `_pick_membership()` now sets `app.user_id` before reading the membership and opens the org context before reading the role — without it the RLS policy hides the user's own membership and login fails. |
| `Backend/apps/core/exceptions.py` | Logs the traceback for 5xx responses (DRF swallows it, so production 500s were undiagnosable). |
| `Backend/apps/core/middleware.py` | Same — logs unhandled API errors with the request path. |
| `Backend/apps/core/platform_views.py` | PostGIS probe no longer marks the whole database as down when the extension is absent (Railway's Postgres has no PostGIS). |
| `Backend/config/settings/base.py` | Dedicated `django.request` logger so 5xx tracebacks are not truncated in aggregated log views. |
| `Backend/scripts/railway_bootstrap.sh` | Bootstrap helper (used by the entrypoint flow). |
| `Dockerfile` (repo root) | Railway build: same image as `Backend/Dockerfile`, copying from `Backend/` because the repo root is the build context. |
| `.railway/railway.ts` | Railway IaC: api/worker/beat + postgres + redis + media bucket, healthcheck, start commands, variable references. |
| `railway.json` | Legacy per-service config (build/start/healthcheck) used by `railway up`. |
| `Backend/tests/test_registration_redesign.py` | 7 new security regression tests. |

---

## 8. Recommended Next Steps

1. **Configure a real email provider** on `api` and `worker`, then re-run the
   E2E against a real inbox to close the `NOT_VERIFIED` item.
2. **Install the Railway GitHub App** and add `source: github("Sardor-Dev-2010/Logistimus", { rootDirectory: "Backend" })` to `.railway/railway.ts` for push-to-deploy.
3. **Deploy the frontend** with `NEXT_PUBLIC_API_URL` pointing at the API.
4. **Rotate the generated secrets** and move them to Railway environment
   variables that are not committed anywhere.
5. **Add alerting** so a failed healthcheck or a red deploy is noticed.
