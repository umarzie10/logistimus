# Monitoring Readiness — Logistimus

**Phase 8 deliverable** of the production readiness assessment.
Scope: how we would *know* something is wrong — logs, health signals,
error tracking, metrics, alerting, uptime probing — and what is missing.

**Status legend:** `PASS` · `FAIL` · `NOT_CONFIGURED` · `NOT_VERIFIED` · `BLOCKED`

---

## 1. Logging — PASS (with §9 gaps)

| Check | Status | Evidence |
|---|---|---|
| Structured JSON logs from Django | **PASS** | `apps/core/logging.py` `JsonFormatter` — one JSON object per line with `ts`, `level`, `logger`, `message`, plus `request_id` / `organization_id` correlation when present. `LOGGING` in `config/settings/base.py` wires it to the console handler; `prod.py` sets root to `INFO` and pins the json formatter. Sample shape: `{"ts":"2026-11-10T08:32:22.933+00:00","level":"INFO","logger":"apps.accounts.tasks","message":"…"}` |
| App logs reach `docker logs` | **PASS** | uvicorn/gunicorn stdout → container stdout (Django handler is a `StreamHandler`); observed in a live worker container during Phase 8 verification |
| nginx access log reach `docker logs` | **PASS (fixed this phase)** | The image's stock main conf writes `/var/log/nginx/access.log` **inside** the container — `docker logs nginx` was empty by design. `infrastructure/nginx/nginx.conf` now opens `access_log /dev/stdout main;` and `error_log /dev/stderr notice;`. Verified in a throwaway `nginx:1.27-alpine`: `docker logs` shows `172.17.0.1 - - [10/Nov/2026:08:38:57 +0000] "GET / HTTP/1.1" 301 …` |
| Healthcheck probes don't pollute the log | **PASS** | `/nginx-health` carries `access_log off;` — probes produce no log line (verified: only the deliberately-made 301s appeared) |
| Log rotation | **PASS (added this phase)** | `x-logging: &default-logging` anchor in `docker-compose.deploy.yml` — `json-file`, `max-size: 10m`, `max-file: 3` — applied to **all 8 services** (`docker compose config` → 9 × `max-size: 10m` = 8 services + the anchor field). Previously there was **no** `logging:` block anywhere: logs grew until the disk filled |
| Log shipping / centralization | `NOT_CONFIGURED` | Logs stay on the host, capped at ~30 MB per container. No Loki/ELK/CloudWatch |
| Log retention beyond rotation | `NOT_CONFIGURED` | Rotated files are deleted after 3 copies; nothing is archived |

---

## 2. Application health endpoints — PASS

| Endpoint | Status | Behaviour | Evidence |
|---|---|---|---|
| `GET /api/v1/health/` | **PASS** | Liveness — no auth, no DB, 200 always; returns `version`, `environment`, `request_id` | `apps/core/health.py` `HealthView`; Phase 3 smoke through nginx/TLS returned `"environment":"production"` |
| `GET /api/v1/health/ready/` | **PASS** | Readiness — real `SELECT 1` + Redis write/read; **200 when both ok, 503 otherwise** (fails closed) | `ReadinessView`; Phase 3 smoke: `database:ok,redis:ok` |
| `GET /api/v1/platform/system-health/` | **PASS** | Platform-admin diagnostics | `apps/core/platform_urls.py`, covered by `tests/test_platform_admin_qa.py` |

Both public endpoints are intentionally unthrottled and reveal no tenant data
(documented in `SECURITY_READINESS.md`).

---

## 3. Container healthchecks — PASS (completed this phase)

Before Phase 8, **3 of 8 services had no healthcheck at all** (worker, beat,
nginx) — nginx had no healthcheck, so a dead proxy would still satisfy
`depends_on` and `docker ps` would show it "Up".

| Service | Healthcheck | Status |
|---|---|---|
| db | `pg_isready -U … -d …` | PASS (pre-existing) |
| redis | `redis-cli ping` | PASS (pre-existing) |
| minio | `curl -fsS http://127.0.0.1:9000/minio/health/live` | PASS (pre-existing) |
| api | `uv run python healthcheck.py` (DB+Redis, real queries) | PASS (pre-existing) |
| frontend | `node -e fetch('http://localhost:3000/')` | PASS (pre-existing) |
| **worker** | `celery inspect ping -d "celery@$(hostname)"` | **PASS (added this phase)** |
| **beat** | `/proc` scan for the celery beat process | **PASS (added this phase)** |
| **nginx** | `curl -fsS http://127.0.0.1/nginx-health` | **PASS (added this phase)** |

Evidence for the three new checks:

- **worker** — verified in the real `logistimus-worker:latest` image:
  - worker running → healthcheck command exits **0** (`pong`);
  - container *without* a worker → exits **1**, `Error: No nodes replied within time constraint` — **even while another worker on the same broker was alive**.
  - Why `-d "celery@$(hostname)"`: plain `inspect ping` *broadcasts* to every worker on the shared Redis broker, so with `--scale worker=N` a dead replica would be masked by a live one. Docker sets `hostname` = container id, which is exactly the node name celery derives, so the ping is pinned to this replica. (First discovered the masking the hard way: a no-worker test container answered `pong` from its sibling.)
- **beat** — `python:3.12-slim` ships no `ps`, so the check scans `/proc/*/cmdline` for `celery` + `beat`, skipping its own pid and its shell (whose cmdline embeds the script and would self-match). Verified both directions: process present → **rc=0**, absent → **rc=1**.
- **nginx** — a new `location = /nginx-health` on port 80 (plain HTTP, no TLS, no upstream dependency) added to `infrastructure/nginx/nginx.conf`. Note it had to go **inside** the redirect server as a location: a server-context `return 301` runs *before* location matching and would swallow the probe. Verified live: `/nginx-health` → **200 `ok`**, `/` and `/some/path` → **301** (behaviour unchanged), and `nginx -t` passed (container booted).

`docker compose -f docker-compose.deploy.yml config --quiet` → **OK**;
8/8 services now have a `test:`.

> **Honest limit:** Docker does **not** restart an unhealthy container (only
> Swarm does). A healthcheck is a *visibility* signal — `docker ps` shows
> `unhealthy`, `depends_on: condition: service_healthy` gates dependent
> starts — not auto-remediation. Remediation is `restart: unless-stopped`
> on exit plus the operator runbooks.

---

## 4. Error tracking (Sentry) — NOT_CONFIGURED

`prod.py`: `SENTRY_DSN = env("SENTRY_DSN", default="")` and `sentry_sdk.init(...)`
only runs when the variable is set. It is **empty** — no exception reporting
service is wired.

Status: mechanism **PASS** (code path exists, `traces_sample_rate=0.0`,
`send_default_pii=False`), configuration **`NOT_CONFIGURED`**.

To enable: set `SENTRY_DSN` in `Backend/.env` on the host (documented in
`ENVIRONMENT_VARIABLES.md`). Nothing in the codebase needs changing.

---

## 5. Metrics — NOT_CONFIGURED

No Prometheus, no `django-prometheus`, no StatsD, no request-latency or
business metrics export. Nothing scrapes; nothing graphs.

Impact: post-incident forensics rely on reading JSON logs by hand. Acceptable
for a first staging deploy; not acceptable for capacity planning.

---

## 6. Alerting — NOT_CONFIGURED (top follow-up)

There is **no channel** on which anything proactively announces a problem:

| Signal that exists today | How a human finds out |
|---|---|
| Red GitHub Actions run (deploy / backup / canary) | Only by opening the Actions tab |
| Container `unhealthy` in `docker ps` | Only by running `docker ps` |
| Sentry | Nothing — not configured (§4) |
| 5xx spike in nginx access log | Only by reading logs |

`DISASTER_RECOVERY.md` and `BACKUP_RECOVERY.md §8.4` both depend on this gap
closing: **a nightly backup that fails today fails silently.**

Cheapest first step: a webhook (email/Slack) on workflow failures + a
`docker events`/healthcheck watcher on the host. Owner: Phase 10 follow-up.

---

## 7. Uptime canary — mechanism PASS, configuration NOT_CONFIGURED

New this phase: `.github/workflows/canary.yml` — hourly probe (`7 * * * *`)
of a single URL, plus manual dispatch with an optional override.

- **Opt-in:** the probe job runs only when the repository variable
  `CANARY_URL` is set (e.g. `https://api.<domain>/api/v1/health/ready/` —
  pointing it at `/ready/` also covers DB + Redis). While unset, a
  `not-configured` job prints a notice instead, so the workflow never looks
  broken — it looks *unconfigured*.
- **Probe logic verified** against a local HTTP server: 200 → pass (rc=0),
  404 → `::error::` + rc=1, non-http(s) scheme → rc=1.
- **Limits:** a red run is still only visible in the Actions tab (§6 — no
  alerting yet), and GitHub disables scheduled workflows after **60 days
  without repository activity** (same caveat as `backup.yml`).

Status: workflow **PASS** (YAML validated, logic tested), monitoring value
**`NOT_CONFIGURED`** until `CANARY_URL` exists — and a canary URL needs a
deployed staging/production host, which does not exist yet.

---

## 8. Consolidated gaps

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | No alerting | `NOT_CONFIGURED` | §6 — top follow-up; makes §7 backup failures silent too |
| 2 | No Sentry DSN | `NOT_CONFIGURED` | §4 — one env var away |
| 3 | No metrics | `NOT_CONFIGURED` | §5 |
| 4 | No log shipping | `NOT_CONFIGURED` | §1 — host-local only, 30 MB/container cap |
| 5 | Canary URL not set | `NOT_CONFIGURED` | §7 — needs a real host first |
| 6 | Schedules stop after 60 days idle | `NOT_VERIFIED` | GitHub platform rule; affects `backup.yml` + `canary.yml` |
| 7 | Healthchecks are signals, not auto-restarts | by design | §3 note |
| 8 | Public unthrottled health endpoints | accepted | documented in `SECURITY_READINESS.md` |
| 9 | No dashboards | `NOT_CONFIGURED` | follows from §5 |

---

## 9. Verification performed this phase

| Check | Command / action | Result |
|---|---|---|
| nginx conf valid | throwaway `nginx:1.27-alpine` with the real mounts, `nginx -t` implicit via boot | container Up, workers started |
| `/nginx-health` serves | `curl http://127.0.0.1:18080/nginx-health` | **200 `ok`** |
| Redirect behaviour preserved | `curl /` and `curl /some/path` | **301** both |
| nginx logs visible | `docker logs phase8-nginx` after a request | access-log line present (`"GET / HTTP/1.1" 301`); `/nginx-health` absent (`access_log off`) |
| compose parses with new anchors/healthchecks | `docker compose … config --quiet` (placeholder env staged, removed after) | **OK**; 8 × `test:`, 9 × `max-size: 10m` |
| worker healthcheck, positive | exec the exact command in a live `logistimus-worker:latest` container | **rc=0** |
| worker healthcheck, negative | same command in a worker-less container while another worker shared the broker | **rc=1**, `No nodes replied` |
| worker healthcheck, targeted | `-d celery@$hostname` vs broadcast | broadcast **falsely passed**; targeted ping correct — why `-d` is used |
| beat healthcheck, positive/negative | python `/proc` scan vs a process named `celerybeat` vs plain `sleep` | **rc=0** / **rc=1** |
| canary probe logic | local `python3 -m http.server`, 200 / 404 / bad scheme | **rc=0 / rc=1 / rc=1** |
| workflow YAML | duplicate-key-preserving loader, now **6 files** | `YAML OK ×6` (incl. `canary.yml`) |
| test containers removed | `docker ps -a \| grep phase8` | none left; dev `backend-db-1`/`backend-redis-1` untouched |
| deployed | nothing — no `up -d`, no host contacted | **PASS** |

---

## 10. Verdict

**MONITORING: PARTIAL — ready to observe, not yet ready to be alerted.**

What works now: structured JSON application logs, nginx logs actually
visible in `docker logs` (fixed this phase), bounded log rotation on every
service (added this phase), liveness + readiness endpoints with real
dependency checks, and **healthchecks on all 8 containers** (three added
this phase, the worker one proven per-replica against a live image).

What does not exist: error tracking (one env var away), metrics, log
shipping, dashboards, and — the one that matters most — **any alerting
channel**, so today every failure above requires a human to go looking.
The hourly canary workflow is built and tested but stays silent until both
`CANARY_URL` and an alert destination exist.

None of these blocks a staging deployment; §8 item 1 (alerting) is the
first follow-up once a host and a notification channel exist.
