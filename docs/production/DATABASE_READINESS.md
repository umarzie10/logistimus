# Database Readiness — Logistimus

**Phase 4 deliverable** of the production readiness assessment.
Scope: schema/migration discipline, tenant isolation (PostgreSQL RLS), seeds,
connection handling, backup/restore posture. Nothing in this document was
re-written for the assessment — every status below is backed by command
output captured while the assessment ran (Nov 2026).

**Status legend:** `PASS` · `FAIL` · `NOT_CONFIGURED` · `NOT_VERIFIED` · `BLOCKED`

---

## 1. Engine requirements

| Check | Status | Evidence |
|---|---|---|
| Production refuses non-PostgreSQL | **PASS** | `config/settings/prod.py:49-50` raises `RuntimeError("Production requires PostgreSQL…")` when `DATABASE_URL` is not `postgres://` |
| Test/dev default (SQLite) cannot leak into prod | **PASS** | `base.py` default is `sqlite:///…`; `prod.py` re-declares `DATABASES` from `DATABASE_URL` and validates the engine — a prod boot with SQLite raises before any query |
| PostGIS available in prod image path | **PASS** | `platform_views.py:306` runs `SELECT PostGIS_Version();`; CI and deploy stack both use `postgis/postgis:16-3.4` |
| Prod boot with PostgreSQL | **PASS** | `PROD_BOOT_OK` (see `docs/production/CONFIGURATION_AUDIT.md` §boot guards) |

```
$ uv run python /tmp/opencode/prod_boot_check.py
PROD_BOOT_OK
$ grep -n "postgresql" Backend/config/settings/prod.py
49:    if DATABASES["default"]["ENGINE"] != "django.db.backends.postgresql":
50:        raise RuntimeError("Production requires PostgreSQL (DATABASE_URL postgres://...)")
```

---

## 2. Migration discipline

| Check | Status | Evidence |
|---|---|---|
| No migration drift | **PASS** | `makemigrations --check --dry-run` → `No changes detected` |
| Migrations apply on a **fresh** PostgreSQL | **PASS** | Full deploy-stack smoke: `Applying organizations.0003_enable_rls... OK`, `Applying permissions.0002_enable_rls... OK`, `Applying permissions.0003_seed_catalog... OK` |
| Migrations apply under **production settings** | **PASS** | Smoke ran `manage.py migrate --noinput` inside the api container pinned to `config.settings.prod` |
| System checks pass after migrate | **PASS** | Re-run produced no `logistimus.E001` output; `manage.py check` clean |
| CI enforces drift + conventions | **PASS** | `.github/workflows/backend.yml` runs `makemigrations --check --dry-run`, `migrate --noinput`, `check_database_conventions` |

```
$ uv run manage.py makemigrations --check --dry-run --settings=config.settings.dev
No changes detected

# inside the deploy stack (config.settings.prod, fresh PostGIS volume)
$ docker compose … exec -T api uv run manage.py migrate --noinput
  Applying organizations.0002_initial... OK
  Applying organizations.0003_enable_rls... OK
  Applying permissions.0002_enable_rls... OK
  Applying permissions.0003_seed_catalog... OK
  Applying sessions.0001_initial... OK
```

### 2.1 Defect found and fixed during this phase — `logistimus.E001` deadlocked fresh installs

**Symptom.** On an empty database, `manage.py migrate` aborted:

```
SystemCheckError: System check identified some issues:
?: (logistimus.E001) Tenant table 'organizations_branch' lacks a PostgreSQL RLS policy.
?: (logistimus.E001) Tenant table 'permissions_role' lacks a PostgreSQL RLS policy.
… (8 tenant tables)
```

**Root cause.** `rls_convention_check` (`apps/core/checks.py`) compared *every*
tenant model's table against `rls_enabled_tables()`. Django runs system
checks **before** applying migrations, so on a fresh database no table exists
and no RLS policy exists — the check failed, the migration that would have
created the policy never ran. Deployment was structurally impossible.

**Fix (minimal, security-preserving).** The check now distinguishes
"table exists without RLS" (still a hard `E001` error) from "table not
created yet" (a database migrations have not run against). Added
`apps.core.db.existing_tables()` and gated the error on presence.

```python
present = db.existing_tables()
…
if table in present and table not in enabled:   # error
```

This does **not** weaken the control: an existing tenant table without a
policy still fails CI and `manage.py check`. It only stops the check from
failing a database that has not been migrated at all.

**Regression coverage added** (`Backend/tests/test_rls_postgres.py`,
`TestRLSConventionCheck`):

| Test | Asserts |
|---|---|
| `test_migrated_database_passes` | real migrated PostgreSQL → zero E001 |
| `test_absent_table_is_not_an_error` | model exists, table absent → no error (fresh-install case) |
| `test_existing_table_without_rls_is_an_error` | table exists, RLS missing → `logistimus.E001` |

```
$ uv run pytest tests/test_rls_postgres.py -v
collected 9 items
tests/test_rls_postgres.py .........                                  [100%]
============================== 9 passed in 0.95s ===============================
$ uv run pytest
133 passed in 6.14s
```

---

## 3. Tenant isolation (PostgreSQL RLS)

Logistimus is multi-tenant with **fail-closed** row-level security: policies
compare `organization_id` to `current_setting('app.organization_id', true)`;
an unset/empty context yields NULL, the predicate is NULL, and **no rows are
returned**.

| Check | Status | Evidence |
|---|---|---|
| RLS enabled on every tenant table | **PASS** | Migrations `organizations/0003_enable_rls`, `permissions/0002_enable_rls`; `EnableRLS` custom operation |
| Fail-closed with no org context | **PASS** | `test_fail_closed_without_context` — 6 RLS tests against real PostgreSQL |
| Org context scopes rows | **PASS** | `test_org_context_scopes_rows` |
| Platform admin sees all | **PASS** | `test_platform_admin_sees_all` |
| Cross-org INSERT rejected by `WITH CHECK` | **PASS** | `test_cross_org_insert_rejected` |
| Convention enforced in CI (`E001`) | **PASS** | `apps/core/checks.py` registered under `Tags.security` |
| `memberships` readable pre-org (login/session) via `user_column` | **PASS** | `organizations/0003_enable_rls.py` passes `user_column="user_id"` — reads only, writes stay tenant-locked |
| `FORCE ROW LEVEL SECURITY` applied | **PASS** | `enable_rls(..., force=True)` default |

```
$ DJANGO_TEST_DATABASE_URL=postgres://…/logistimus_test uv run pytest tests/test_rls_postgres.py -v
collected 9 items
… 6 RLS behaviour tests + 3 E001 convention tests
============================== 9 passed in 0.95s ===============================
```

The 6 behavioural tests **skip on SQLite** and only run against PostgreSQL
(`pytestmark = skipif(connection.vendor != "postgresql")`) — they were
executed against a real PostGIS 16 instance for this assessment.

---

## 4. Seed data

| Check | Status | Evidence |
|---|---|---|
| Permission catalog seeded idempotently | **PASS** | `permissions/0003_seed_catalog.py` — reads `apps/permissions/catalog.py`, filters `existing`, `bulk_create`; re-running is a no-op |
| Seeds run through migration (no manual step) | **PASS** | Applied during fresh-stack migrate |
| Catalog is single source of truth | **PASS** | Comment + code: `Permission` table mirrors `catalog.all_codes()` |
| Business/tenant demo data | **NOT_CONFIGURED** | No org/user seed migration exists — correct for production; staging synthetic data is Phase 9 |

---

## 5. Connection handling & pooling

| Setting | Value | Status |
|---|---|---|
| `CONN_MAX_AGE` | `60` (env `DB_CONN_MAX_AGE`) | **PASS** — `prod.py:54` |
| `CONN_HEALTH_CHECKS` | `True` | **PASS** — `prod.py:55` |
| `connect_timeout` | `5`s | **PASS** — `prod.py:56` |
| Pooler in front of Postgres | — | **NOT_CONFIGURED** — single-node deployment; PgBouncer not present. Acceptable at current scale; revisit if connection count grows (see §8) |
| Health endpoint exercises DB | **PASS** | `/api/v1/health/ready/` runs `SELECT 1` and returns `dependencies.database` |
| Container healthcheck exercises DB | **PASS** | `healthcheck.py` probes `/api/v1/health/ready/` and accepts **200 only**; a dead DB → container unhealthy → orchestrator restart |

```
$ curl -sk --resolve api.logistimus.example.com:8443:127.0.0.1 \
    https://api.logistimus.example.com:8443/api/v1/health/ready/
{"status":"ready","version":"0.1.0","dependencies":{"database":"ok","redis":"ok"},"request_id":"…"}
```

---

## 6. Data protection

| Check | Status | Evidence |
|---|---|---|
| Database not exposed on host | **PASS** | `docker-compose.deploy.yml` — `db` has **no `ports:`** (comment: "intentionally no `ports:` — never expose Postgres on the host"); reachable only on the internal `logistimus` network |
| Password required, never defaulted | **PASS** | `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?…}` — compose refuses to start without it (verified: `PASS: compose refused missing required var`) |
| Secrets in git | **PASS** | `.env*` ignored (re-included for `.env.example`); image scan: `PASS: no real env file / no sqlite db / only the .example template` |
| TLS to database | **NOT_CONFIGURED** | In-network traffic is container-to-container on an isolated Docker network; no `sslmode` set. If the DB ever leaves the host, `sslmode=verify-full` is required |
| Encryption at rest | **NOT_VERIFIED** | Depends on the host/volume encryption — outside this codebase's control |
| PITR / WAL archiving | **NOT_CONFIGURED** | see §7 |

---

## 7. Backup & restore

| Check | Status | Evidence |
|---|---|---|
| Backup tooling in repo | **PASS (Phase 7)** | `infrastructure/backup/backup.sh` — `pg_dump -Fc` + archive validation + 14-day retention; `.github/workflows/backup.yml` runs it nightly 03:17 UTC on the host; pre-deploy dump kept in `.github/workflows/deploy-production.yml` (now validated + retention-scoped). Evidence: `docs/production/BACKUP_RECOVERY.md` §4 |
| Restore tested end-to-end | **PASS (Phase 7)** | `infrastructure/backup/restore-test.sh` on a virgin throwaway container: 26/26 tables, 8808/8808 rows, 249/249 TOC entries, `RESTORE_TEST_PASS`, 10 s. Full output in `BACKUP_RECOVERY.md` §5 |
| Volume present & named | **PASS** | Named volume `pgdata:/var/lib/postgresql/data` — survives container replacement |

---

## 8. Known gaps / follow-ups

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | No connection pooler (PgBouncer) | `NOT_CONFIGURED` | Fine for single-node; `CONN_MAX_AGE=60` keeps connections bounded. Re-evaluate before horizontal scaling of `api`/`worker`. |
| 2 | No WAL archiving / PITR | `NOT_CONFIGURED` | Phase 7 set the backup cadence (daily + pre-deploy); without WAL there is **no point-in-time recovery** — worst case loses up to 24 h. See `BACKUP_RECOVERY.md` §7 for RPO/RTO. |
| 3 | DB TLS not enforced | `NOT_CONFIGURED` | Acceptable while DB stays on the isolated container network. |
| 4 | Encryption at rest | `NOT_VERIFIED` | Host/volume-level; must be confirmed with the infrastructure owner before production. |
| 5 | `db` has no healthcheck-dependent app startup for `migrate` | **PASS (by design)** | `api` waits for `service_healthy` on db+redis; migrate runs as an explicit deploy step, not at container start — prevents a race where multiple replicas migrate simultaneously. |
| 6 | E001 check ordering | **PASS (fixed in Phase 4)** | See §2.1 — regression tests in place. |

---

## 9. Verdict

**DATABASE READINESS: PASS with follow-ups.**

Schema discipline, migration idempotency, fail-closed tenant isolation and
connection hygiene are all verified against a real PostgreSQL 16 + PostGIS
instance, including a from-scratch deploy-stack migration. The one defect
found (E001 deadlocking fresh installs) was root-caused, fixed with minimal
blast radius, and locked in with regression tests.

Open items are operational (PITR/off-host copy → `BACKUP_RECOVERY.md` §8,
TLS/encryption posture) rather than schema defects; none of them blocks a
staging deployment, and each carries an explicit status in §8 and in
`docs/production/PRODUCTION_READINESS_REPORT.md`. Backup and restore — the
items this document explicitly deferred to Phase 7 — are now PASS with
measured evidence (`BACKUP_RECOVERY.md` §4–§5).
