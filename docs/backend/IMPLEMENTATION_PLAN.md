# Logistimus — Backend Implementation Plan

Status: **Phase 0 deliverable** · Stack: Python 3.12 (uv), Django 5.2 LTS, DRF, Channels, Celery, drf-spectacular, django-filter, cors-headers · PostgreSQL 16+PostGIS, Redis, S3-compatible storage (MinIO in dev), Nginx, Docker Compose, GitHub Actions.

---

## 0. Ground rules (apply to every phase)

1. **Audit first, code second** — Phase 0 (this document set) is complete before any app code.
2. **Incremental, verified phases** — a phase ends only when its Definition of Done (DoD) checklist passes; each phase ends with a report (§9 template).
3. **No mock endpoints** — if functionality isn't real, the endpoint doesn't exist yet (frontend keeps its honest "backend required" state).
4. **Frontend stays functional** — wiring happens per module after the backend module lands; demo data is removed only for wired features; loading/empty/error/success states required.
5. **Tenant isolation is not optional** — no endpoint merges without `organization_id` scoping + tests.
6. **Money = Decimal** · **IDs = UUID** · **API = `/api/v1/`** · **errors = shared envelope**.
7. Commits are small and buildable; `manage.py check`, `makemigrations --check`, `pytest` green at every commit.

---

## Phase 1 — Foundation

**Scope**
- `Backend/` scaffold: `config/{settings/{base,dev,prod,test}.py, urls.py, asgi.py, wsgi.py, celery.py}`, `manage.py`, `apps/` package with `core`.
- `uv` project (`pyproject.toml`) pinning: Django 5.2.x, djangorestframework, django-filter, drf-spectacular, django-cors-headers, channels, channels-redis, celery, redis, psycopg[binary], djangorestframework-simplejwt, django-storages[s3], whitenoise, gunicorn, uvicorn, pytest, pytest-django, factory-boy, faker, freezegun, hypothesis (optional), ruff, mypy/django-stubs (light).
- Settings split + env loading (`pydantic-settings` or `django-environ`): `DJANGO_ENV`, `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `DATABASE_URL`, `REDIS_URL`, `CELERY_BROKER_URL`, `CORS_ALLOWED_ORIGINS`, `S3_*`, `AI_*`.
- `core` app: `TenantManager`/`TenantModel` base, shared API response/pagination/error classes, `AuditService`, request middleware (`X-Request-Id`, tenant context + `SET LOCAL app.organization_id`), health endpoints, OpenAPI config, throttling classes, custom `check_database_conventions` management command (RLS/index policy).
- Docker: `Backend/Dockerfile` (multi-stage, non-root), root `docker-compose.yml` (`db` postgis/postgis:16-3.4, `redis`, `minio`, `api`, `worker`, `beat`, `nginx`), `.env.example`.
- CI: GitHub Actions `backend.yml` — ruff, `manage.py check`, `makemigrations --check`, pytest, build image.
- Docs tooling: `docs/backend/` linked from README.

**Files:** `Backend/**` (~40 files), `docker-compose.yml`, `.env.example`, `.github/workflows/backend.yml`, `infrastructure/nginx/*`.
**APIs:** `GET /api/v1/health/`, `/api/v1/health/ready/`, `/api/schema/`, `/api/docs/`.
**Migrations:** `core` (audit log table) only.
**Tests:** settings load in test env, health endpoint 200, tenant middleware sets/clears context, error envelope shape, pagination contract.
**Security:** `DEBUG=False` in prod settings, secret from env, no secret in repo, CORS allowlist parsed from env, security headers in Nginx config.

**DoD:** `docker compose up db redis api` → health 200; `pytest` green; `ruff check` clean; `check_database_conventions` passes; CI pipeline green on push.

---

## Phase 2 — Identity & multi-tenancy

**Scope**
- `accounts`: User model extension (platform_role, lockout fields), full auth flow per API spec §3 (register → verify → login → refresh/rotate → logout → session → switch-org → forgot/reset/change password → login history), rate limits + lockout, Celery email (console backend in dev).
- `organizations`: Organization, Branch, Department, Membership, invitations, org profile/branches/settings/members endpoints, API keys (hash, rotate, revoke).
- `permissions` (RBAC): Permission catalog seed, Role/RolePermission, `HasPermission`/`IsOwner`/`IsPlatformAdmin` classes, `GET /auth/me/permissions/`, role CRUD.
- Tenant context: access-token `org` claim, `TenantManager`, RLS enablement migration for the tables that exist so far (orders tables come in Phase 3 — the migration adds a CI check that flags new tenant tables missing RLS).
- Audit logging on: login, logout, org switch, member changes, role changes, API key events.

**Files:** `apps/accounts/**`, `apps/organizations/**`, `apps/permissions/**`, `apps/core/{middleware,context,audit}.py`, tests under `tests/{accounts,organizations,permissions}/`.
**APIs:** API spec §3, §4, §5 (≈35 endpoints).
**Migrations:** accounts, organizations, permissions (+ seeds).
**Tests:** registration happy/duplicate/weak-password; login success/bad-password/lockout/unverified; refresh rotation + **reuse detection revokes family**; verify/resend cooldown; forgot/reset single-use + expiry; org switch rejects non-member; RBAC matrix (each role × sample endpoint → 200/403); **tenant isolation suite (A cannot read B via id, query, or filter)**; audit rows written.

**DoD:** all §3–§5 endpoints live and documented in OpenAPI; isolation test suite green; frontend `/sign-in`, `/sign-up`, `/verify-email`, `/forgot-password`, `/reset-password` wired to real endpoints with error/loading/success states and demo values removed; `pytest` green.

---

## Phase 3 — Core logistics (orders, shipments, dispatch, routes, fleet, drivers)

**Scope**
- `orders` (Order, OrderItem, OrderStatusHistory, Address, sequences) + status machine service.
- `shipments` (Shipment, ShipmentStop, ShipmentStatusHistory, POD), public track endpoint.
- `dispatch` (Dispatch, DispatchStop, stats, board, assignments with partial-unique availability), WebSocket `dispatch` group.
- `routing` (Route, RouteStop, RouteSuggestion + `RouteOptimizerProvider` abstraction; `503 provider_unavailable` without provider).
- `fleet` (Vehicle, VehicleCategory, VehicleDocument, MaintenanceRecord, FuelRecord, assignment history, stats, telemetry endpoints returning `404 no_telemetry` when absent).
- `drivers` (Driver, DriverDocument, DutyLog, VehicleInspection, SOS, logbook, performance), PII masking by role.

**Files:** `apps/{orders,shipments,dispatch,routing,fleet,drivers}/**`, `apps/core/events.py` (domain events), tests per app.
**APIs:** spec §6–§9 (≈55 endpoints) + WebSocket `/ws/dispatch/`, `/ws/orders/`.
**Migrations:** 6 apps.
**Tests:** status machine table-driven (valid/invalid transitions); ref generation uniqueness under concurrency (transaction test); dispatch availability race (two assignments for same driver → one 409); **cross-tenant 404s** for every detail endpoint; driver sees only own records; POD flow; Decimal weight math; fuel cost computation; logbook aggregation; search/filter/pagination contract for each list.

**DoD:** all endpoints real (no placeholders), OpenAPI updated, isolation + business-logic tests green; frontend `/orders`, `/dispatch`, `/fleet`, `/drivers` wired (search/filter server-side, create-order modal posts, detail drawer fetches, export uses fetched rows) with loading/empty/error states; demo arrays removed for those pages.

---

## Phase 4 — Warehouse, inventory & CRM

**Scope**
- `warehouses`: Warehouse, DockBay, StorageZone, stats, dock assign/release.
- `inventory`: InventoryItem, StockLevel, StockMovement (atomic service + `FOR UPDATE` + negative check), low-stock alerts, barcode `source=barcode_scan`.
- `crm`: Customer, Contact, Contract, ContractTier seed, Lead, Communications, stats, ledger (joins finance read models — finance ships in Phase 5, ledger returns invoice list only after Phase 5; until then the CRM ledger endpoint returns volumes from CRM rows and is marked in the report as Phase 5-dependent).

**APIs:** spec §10, §11 (≈30 endpoints).
**Migrations:** 3 apps.
**Tests:** concurrent stock movements cannot go negative (threaded/`TransactionTestCase`); movement ledger invariant vs counter; CRM validation errors per-field; cross-tenant isolation; customer archive rules.

**DoD:** atomicity proven by test; `/warehouse`, `/crm` wired (scan modal posts movements, add-customer validated, ledger shows real invoices post-Phase-5) with all four UI states; demo data removed.

---

## Phase 5 — Finance & documents

**Scope**
- `finance`: Invoice, InvoiceLineItem, Payment, Expense, CarrierSettlement, KPIs (Decimal), overdue job, CSV export, P&L report; CRM ledger completes.
- `documents`: private storage + upload validation (type/size/checksum), signed URL issuance with permission check, associations, expiry list + Celery reminder task, versioning.
- POD signature files land through `documents`.

**APIs:** spec §12, §13 (≈30 endpoints).
**Migrations:** 2 apps.
**Tests:** invoice totals from line items (Decimal precision, rounding), payment over/under payment states, void rules, overdue flip; upload rejects wrong type/oversize, signed URL denied cross-tenant, expiry query; **no floats** (property test on totals).

**DoD:** `/finance` wired with real KPIs/invoices; CRM ledger real; documents usable from order/POD flows; tests green.

---

## Phase 6 — Real-time & analytics

**Scope**
- `tracking`: VehicleLocation ingest (device auth), live summary (Redis latest), history (PostGIS), device management, WebSocket `tracking` group, retention job.
- `notifications`: model, preferences, CRUD, read/unread, WebSocket push, Celery delivery (in-app + email), domain-event wiring (order status, dispatch, maintenance due, document expiry, low stock, invoice overdue).
- `analytics`: dashboard, SLA, fuel, fleet, customers, drivers, nav badges, report generation job (TXT; PDF only if a real generator is added — else label the button honestly), horizons.

**APIs:** spec §14–§16 (≈25 endpoints) + `/ws/tracking/`, `/ws/notifications/`.
**Migrations:** 3 apps.
**Tests:** device key auth (bad key → 401), live summary respects tenant, WebSocket connect/group isolation (A's token cannot join B's group), notification fan-out per user prefs, analytics values computed from seeded fixtures (assert exact numbers), report job produces a downloadable artifact.

**DoD:** `/dashboard`, `/analytics`, `/notifications` wired to real aggregates (every KPI computed); live map pulls real locations or shows empty state; no hardcoded metric left; tests green.

---

## Phase 7 — SaaS, integrations & AI

**Scope**
- `subscriptions`: Plan/Price/Entitlement seeds from `/pricing`, current/change/cancel, trial logic, `SubscriptionGuard` on module routers (402 on expired/missing entitlement), usage vs limits.
- `integrations`: connections CRUD + test, API keys (already Phase 2 — scope enforcement here), webhooks (sign/retry/delivery log), provider abstractions for GPS/payment/email/SMS/mapping.
- `ai_assistant`: provider interface + no-provider `503 ai_unavailable`, chat with permission-scoped context builder, conversations, recommendations accept/dismiss, rate limit.

**APIs:** spec §17–§19 (≈30 endpoints).
**Tests:** plan guard blocks finance module on expired trial; limit enforcement (max vehicles); webhook HMAC signature verifiable + retry/backoff recorded; API key scope enforcement + revocation; AI unavailable path + context scoping (user cannot get another tenant's data through chat).

**DoD:** `/pricing` CTA provisions real trial via register `tier`; entitlements enforced server-side; AI page shows honest connected/unavailable state; tests green.

---

## Phase 8 — Portals & Super Admin

**Scope**
- `customer_portal`: scoped endpoints (shipments/invoices/documents/support) with object-level ownership.
- `driver_portal`: trip/current, stops, status updates, GPS toggle + location ping, POD upload, inspections, duty hours, SOS.
- `super_admin`: platform stats, org list/verify/suspend, user admin, plans CRUD, subscriptions view, audit-logs, system health, feature flags, config, support tickets — separate router + `IsPlatformAdmin` + platform audit scope.

**APIs:** spec §20–§22 (≈35 endpoints).
**Tests:** customer A cannot see customer B's shipment (404) even inside same org when ownership differs; driver cross-access 404; POD required fields; platform endpoints 403 for org users (matrix over 12 roles); platform audit written with `scope=platform`.

**DoD:** `/portal`, `/driver`, `/admin` wired; role gates verified in UI (redirects) and API (403/404); tests green.

---

## Phase 9 — Production readiness

**Scope**
- Security review: run threat checklist (`SECURITY_PLAN.md` §9), dependency audit (`pip-audit` in CI), secret scan, permission/RLS coverage report, rate-limit verification, HTTPS/cookie flags in Nginx.
- Performance: `django-debug-toolbar`/`silk` (dev only) spot checks, EXPLAIN on top 10 queries, add missing indexes, connection pooling config (pgbouncer), select_related/prefetch audit, N+1 test via `django-falcon`-style assertion or nplusone in tests.
- Testing: coverage gate ≥ 80% on `apps/`, load smoke test (locust, optional local), full tenant-isolation matrix re-run.
- Deployment: prod settings, gunicorn+uvicorn workers, Nginx reverse proxy + WS upgrade, Dockerfile hardening, `.env.example` final, GitHub Actions release workflow (build → test → push image → deploy placeholder), backup/runbook (`docs/backend/OPERATIONS.md`: pg_dump schedule, restore drill, Redis persistence, MinIO lifecycle).
- Monitoring: `/metrics/`, structured JSON logs with `request_id`, Sentry hook (env-driven, optional).
- Documentation: README backend section, OpenAPI final pass, ERD regeneration, phase reports index.

**DoD:** coverage gate passes in CI; `pip-audit` clean (or documented exceptions); load smoke within agreed p95 targets for list endpoints (< 300 ms warm); runbook exists and restore drill executed once locally; all 9 phase reports collected; **no critical TODO/placeholder** (`grep -rn "TODO\|FIXME\|pass  # placeholder" Backend/apps` → 0 hits in shipped paths).

---

## 1. Definition of Done (per module, from the prompt)

A module is complete only when: models + migrations verified · business logic implemented · endpoints implemented · auth/permissions work · tenant isolation tested · frontend integrated · mock data removed · loading/empty/error/success states work · automated tests pass · API docs updated · no critical TODOs. Each phase report states: implemented, files, APIs, migrations, tests run + results, security concerns, remaining tasks, DoD verdict.

## 2. Parallelization notes

- Phases are sequential by dependency; **within** a phase, apps with no mutual FKs can be built in parallel (e.g. `fleet` ∥ `drivers` after `orders` base exists).
- Frontend wiring lags each backend phase by one step (build → verify → wire → verify again with Playwright).
- CI runs on every push; a red pipeline blocks phase completion.

## 3. Risk register

| Risk | Mitigation |
|---|---|
| RLS + pgbouncer interplay | `SET LOCAL` in transaction only; tested in Phase 1 with the real compose stack |
| Frontend has no API client/auth provider | introduce `lib/api` + middleware in Phase 2 (minimal, additive; no redesign) |
| Real routing/GPS/AI providers absent | provider interfaces return honest `503/unavailable`; UI shows empty/unavailable states |
| Scope creep (21 apps) | strict phase gating; report residual tasks instead of half-shipping |
| Currency/tax complexity | base-currency-only arithmetic until multi-currency reporting is explicitly required |
| High-volume telemetry tables | retention job + partitioning plan documented from Phase 6 |

## 4. Phase report template (used at every phase end)

```markdown
# Phase N report — <name>
- Implemented: …
- Files created/modified: …
- APIs available: … (list + OpenAPI tag)
- Migrations: …
- Tests executed: command + counts
- Test results: pass/fail, coverage %
- Security concerns: …
- Remaining tasks: …
- Definition of Done: PASS / FAIL (+reason)
```
