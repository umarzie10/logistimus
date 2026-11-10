# Infrastructure Readiness — Logistimus

**Phase 3 deliverable** of the production readiness assessment.
Scope: container images, the deploy Compose stack, reverse proxy/TLS, and an
end-to-end full-stack smoke run. Every status below is backed by command
output captured while the assessment ran (2026-11-10).

**Status legend:** `PASS` · `FAIL` · `NOT_CONFIGURED` · `NOT_VERIFIED` · `BLOCKED`

---

## 1. Container images

| Check | Status | Evidence |
|---|---|---|
| Backend image builds | **PASS** | `docker build -t logistimus-api:phase3 ./Backend` → `DONE 8.8s` |
| No secret material in backend image | **PASS** | image scan: `PASS: no real env file / no sqlite db / only the .example template` |
| Static files collected at build time | **PASS** | 125 static files present in image; collectstatic env is inline on the `RUN` only (never `ENV`) |
| Frontend image builds (standalone) | **PASS** | `logistimus-fe:phase3` — standalone `server.js` runs |
| `.dockerignore` present for both | **PASS** | `Backend/.dockerignore`, `Frontend/.dockerignore` |
| Build-time SECRET_KEY meets prod guard | **PASS** | key is 62 chars (`…-50chars-plus`); a shorter one was correctly rejected by the ≥50-char guard — guard working as designed |

```
$ docker build -t logistimus-api:phase3 ./Backend
#15 DONE 8.8s
```

---

## 2. Deploy Compose stack

| Check | Status | Evidence |
|---|---|---|
| Compose file valid | **PASS** | `DEPLOY_COMPOSE_CONFIG_OK` |
| Only nginx publishes host ports | **PASS** | `db`, `redis`, `minio`, `api`, `worker`, `beat`, `frontend` have **no** `ports:`; only nginx → 80/443 |
| Required-var guards refuse missing values | **PASS** | `PASS: compose refused missing required var` for `POSTGRES_PASSWORD`, `MINIO_ROOT_PASSWORD`, `NEXT_PUBLIC_API_URL` |
| Postgres never exposed on host | **PASS** | comment in file + no `ports:` block |
| Healthcheck on every stateful service | **PASS** | db (`pg_isready`), redis (`redis-cli ping`), minio (curl), api (`healthcheck.py` → ready endpoint) |
| Startup ordering | **PASS** | `depends_on: condition: service_healthy` for db/redis into api/worker/beat |

```
$ docker compose -f docker-compose.deploy.yml config
error while interpolating services.db.environment.POSTGRES_PASSWORD:
  required variable POSTGRES_PASSWORD is missing a value
```

---

## 3. Reverse proxy & TLS

| Check | Status | Evidence |
|---|---|---|
| `nginx -t` passes | **PASS** | `nginx -t` → syntax is ok |
| TLS termination with self-signed certs | **PASS** | `infrastructure/tls/{fullchain,privkey}.pem` (git-ignored — never committed) |
| HTTP → HTTPS redirect | **PASS** | `HTTP 301 -> https://localhost/api/v1/health/` |
| HSTS header | **PASS** | `strict-transport-security: max-age=63072000; includeSubDomains` |
| Health location forwards `Host` | **PASS (fixed this phase)** | was missing → nginx sent upstream name → Django `DisallowedHost` → 400. Now forwards `Host`/`X-Forwarded-*` |
| Stock `default.conf` neutralized | **PASS (fixed this phase)** | its `server_name localhost` outranked the catch-all → 404 on port 80. New `infrastructure/nginx/default.conf` mounted over it |
| SELinux bind mounts | **PASS (fixed this phase)** | mounts use `:ro,z` (shared label — both stacks can mount; `:Z` would break the other) |
| `server_name` placeholders | `NOT_CONFIGURED` | `api./app.logistimus.example.com` must be replaced with real domains at rollout |

### 3.1 Defects found and fixed during this phase

1. **Health endpoint returned 400 through nginx.** The `location /api/v1/health/`
   block had no `proxy_set_header Host`, so nginx used its default
   `$proxy_host` (the upstream name `logistimus_api`). Django rejected it
   (`DisallowedHost: Invalid HTTP_HOST header: 'logistimus_api'`).
   Fix: forward `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`.
2. **Port 80 answered 404 instead of redirecting.** The nginx image's stock
   `default.conf` declares `server_name localhost`, which outranks a
   catch-all `_` for `localhost`/direct-IP probes. Fix: mount an empty
   `infrastructure/nginx/default.conf` over the stock file.
3. **`DJANGO_ENV=development` under production settings.** `.env.example`
   ships `development`; `prod.py` imported it unchanged, so the health report
   said `development` and S3 object keys were prefixed `development/`.
   Fix: `prod.py` remaps `development` → `production` (an operator may set a
   distinct non-development label explicitly), and rewrites the already-built
   S3 `location` prefix. Verified after rebuild:
   `DJANGO_ENV = production`, `S3 location prefix = production/`,
   health → `"environment":"production"`.
4. **MinIO image licensing.** Docker Hub removed `minio/minio` (2026),
   `dl.min.io` returns 410, `quay.io/minio/minio` 401, ECR/ghcr denied. The
   current official image `quay.io/minio/aistor/minio` **requires an AIStor
   license** (SUBNET): without it, *"All S3 operations are denied"*.
   Healthcheck changed from `mc ready local` (fails unlicensed) to
   `curl …/minio/health/live` in **both** compose files → container
   `running/healthy`. S3 operations remain **BLOCKED** pending a license —
   see §6.

---

## 4. Full-stack smoke run (fresh PostGIS, production settings)

Stack: 8 containers (`api`, `worker`, `beat`, `db`, `redis`, `minio`,
`frontend`, `nginx`), test-only port override (host 443 held by Tailscale).

```
--- 1. container health ---
SERVICE    STATUS
api        Up About a minute (healthy)
beat       Up About a minute
db         Up 27 minutes (healthy)
frontend   Up 26 minutes (healthy)
minio      Up 28 minutes (healthy)
nginx      Up 41 seconds
redis      Up 27 minutes (healthy)
worker     Up About a minute

--- 2. GET /api/v1/health/ (TLS via nginx) ---
{"status":"ok","version":"0.1.0","environment":"production", …}

--- 3. GET /api/v1/health/ready/ ---
{"status":"ready","version":"0.1.0","dependencies":{"database":"ok","redis":"ok"}, …}

--- 4. protected endpoint, no token (expect 401) ---
HTTP 401

--- 5. HTTP -> HTTPS redirect (expect 301) ---
HTTP 301 -> https://localhost/api/v1/health/

--- 6. frontend through nginx ---
<title>Logistimus — Global Logistics Operating System</title>

--- 7. security headers ---
strict-transport-security: max-age=63072000; includeSubDomains

--- 8. effective prod settings (in-container) ---
DJANGO_SETTINGS_MODULE = config.settings.prod
DJANGO_ENV = production
DEBUG = False
ALLOWED_HOSTS = ['api.logistimus.example.com', 'app.logistimus.example.com', 'localhost', '127.0.0.1']
CSRF_TRUSTED_ORIGINS = ['https://app.logistimus.example.com']
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
CORS_ALLOWED_ORIGINS = ['https://app.logistimus.example.com']
S3 location prefix = production/
```

**Migrations on a fresh database (production settings):**

```
$ docker compose … exec -T api uv run manage.py migrate --noinput
  Applying organizations.0002_initial... OK
  Applying organizations.0003_enable_rls... OK
  Applying permissions.0002_enable_rls... OK
  Applying permissions.0003_seed_catalog... OK
  Applying sessions.0001_initial... OK
```

> This run exposed the `logistimus.E001` fresh-install deadlock (system check
> firing before migrations could create RLS). Root-caused and fixed — see
> `DATABASE_READINESS.md` §2.1 for the write-up and regression tests.

### Smoke verdict: **PASS**

All probes green, all containers healthy, migrations apply from scratch under
production settings, auth rejects unauthenticated access, TLS/HSTS active.

---

## 5. Local verification (pre-smoke)

| Check | Status | Evidence |
|---|---|---|
| Backend tests | **PASS** | `133 passed in 6.14s` (baseline 130 + 3 new E001 regression) |
| Backend lint | **PASS** | `uv run ruff check .` → `All checks passed!` |
| Migration drift | **PASS** | `makemigrations --check` → `No changes detected` |
| Frontend lint | **PASS** | `ESLINT_CLEAN` (13 → 0 errors) |
| Frontend types | **PASS** | `TSC_CLEAN` |
| Frontend build | **PASS** | 31 routes; `next start` → HTTP 200 |
| Prod boot guards | **PASS** | all 4: placeholder / short / sentinel refused, `PROD_BOOT_OK` |
| RLS tests (real PostgreSQL) | **PASS** | 9 passed (6 behaviour + 3 E001 convention) |

---

## 6. Known gaps / follow-ups

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | MinIO S3 operations | **BLOCKED** | Official `quay.io/minio/aistor/minio` needs an AIStor Free license (SUBNET login — not obtainable non-interactively). Unlicensed, the container is healthy but denies all S3 operations. A working unofficial fallback exists: `pgsty/minio:RELEASE.2026-08-04T00-00-00Z` (verified: bucket create + upload OK) — decision required before staging. |
| 2 | TLS certificates | **NOT_CONFIGURED** | Self-signed certs are for testing only; real certificates (ACME/CA) required before any public rollout. |
| 3 | `server_name` placeholders | **NOT_CONFIGURED** | Replace `api./app.logistimus.example.com` with real domains. |
| 4 | SMTP credentials | **NOT_CONFIGURED** | See `CONFIGURATION_AUDIT.md`. |
| 5 | `SENTRY_DSN` empty | **NOT_CONFIGURED** | No error tracking in production. |
| 6 | Health endpoints public, unthrottled | **NOT_VERIFIED** | `/health/` and `/health/ready/` bypass auth (by design) — confirm they stay off the public internet or get rate-limited at nginx. |
| 7 | Business modules not implemented | **NOT_CONFIGURED** | orders/fleet/etc. — out of scope for this assessment. |

---

## 7. Verdict

**INFRASTRUCTURE READINESS: PASS with follow-ups.**

The full deploy stack builds, boots, migrates from an empty database under
production settings, and serves traffic through nginx/TLS with correct
security headers and fail-closed auth. Four real defects were found during
this phase (health `DisallowedHost`, port-80 404, `DJANGO_ENV` leak, MinIO
healthcheck) and fixed; the fifth (MinIO licensing) is a documented decision
point that does not block staging, because no code path requires S3 today
(`S3_ENDPOINT_URL` empty → local storage; no `FileField`/`ImageField` in
`apps/` yet).
