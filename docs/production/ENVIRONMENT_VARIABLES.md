# Logistimus — Environment Variable Reference

**Covers:** local dev · tests · staging · production
**Source of truth:** `Backend/config/settings/{base,dev,test,prod}.py` (all variables below were
extracted from these files during Phase 2; none are decorative).

---

## 0. How configuration is layered

```
base.py  ── defaults + shared config
  ├─ dev.py    (DJANGO_SETTINGS_MODULE=config.settings.dev)   local development
  ├─ test.py   (config.settings.test)                          test suite
  └─ prod.py   (config.settings.prod)                          staging AND production
```

**Staging = production settings.** There is deliberately no separate `staging.py`: staging runs the
same hardened module (`prod.py`) with staging values for `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`,
`SECRET_KEY`, `DATABASE_URL`, `SENTRY_DSN`. This prevents config drift between the environment you
rehearse in and the environment you ship to. Differentiate environments **only** through values.

| Environment | Settings module | Notes |
|---|---|---|
| Local dev | `config.settings.dev` | SQLite/PostGIS compose stack, console email, admin on by default, local-FS media when no S3 endpoint |
| Test | `config.settings.test` | in-memory cache/channel layer, MD5 hasher, `DJANGO_TEST_DATABASE_URL` or SQLite |
| Staging | `config.settings.prod` | real env values; synthetic data only |
| Production | `config.settings.prod` | real env values; boot refuses dev sentinel `SECRET_KEY` |

**Reading order:** `manage.py` defaults to `dev`; `wsgi.py`/`asgi.py` default to `prod`.
Containers run `config.asgi` → prod. Never rely on bare `manage.py` for production commands —
always pass `--settings=config.settings.prod` or run inside the container where prod is the default.

Backend reads `Backend/.env` via `environ.Env.read_env()` (optional — env vars from the
process environment always win in practice for containers). The frontend reads
`Frontend/.env` / process env at **build** time.

Additionally, `docker-compose.deploy.yml` on the deployment host reads the
repository root `.env` (template: `.env.example`) to interpolate container
variables before starting (`POSTGRES_PASSWORD`, `MINIO_ROOT_PASSWORD`,
`NEXT_PUBLIC_API_URL`). See `.env.example` in the project root.

---

## 1. Backend — core

| Variable | Default | Purpose | Staging / Production |
|---|---|---|---|
| `DJANGO_ENV` | `development` | informational environment label in logs | `production` |
| `DJANGO_SETTINGS_MODULE` | `config.settings.dev` (manage.py) | selects settings module | `config.settings.prod` |
| `APP_VERSION` | `0.1.0` | version reported by `/api/v1/health/` | release tag |
| `DEBUG` | `True` | debug mode | **must be unset/False** — `prod.py` forces `False` regardless |
| `SECRET_KEY` | dev sentinel constant | signs sessions/CSRF/JWT | **required** — `prod.py` refuses to boot if it equals the dev sentinel |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Django Host header allow-list | comma list, e.g. `api.staging.example.com` |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | exact origins allowed by CORS; **https entries are also added to `CSRF_TRUSTED_ORIGINS`** | every deployed frontend origin |
| `ENABLE_ADMIN` | `False` (base) · dev treats missing as `True` · prod default `False` | installs `django.contrib.admin` | leave `False` unless admin is intentionally exposed |
| `DJANGO_TEST_DATABASE_URL` | empty | test DB for `test.py` (`empty` → in-memory SQLite) | set in CI only |

## 2. Backend — data services

| Variable | Default | Purpose | Staging / Production |
|---|---|---|---|
| `DATABASE_URL` | `sqlite:///…/db.sqlite3` | primary DB | **required** `postgres://…` — `prod.py` rejects SQLite |
| `DB_CONN_MAX_AGE` | `60` (prod) | persistent connection lifetime (seconds) | keep `60` behind pgbouncer-less direct connections |
| `REDIS_URL` | `redis://localhost:6379/0` | cache **and** Channels layer | dedicated Redis URL |
| `CELERY_BROKER_URL` | `redis://localhost:6379/1` | Celery broker | dedicated DB index |
| `CELERY_RESULT_BACKEND` | `redis://localhost:6379/2` | Celery results | dedicated DB index |

## 3. Backend — object storage (S3 / MinIO)

| Variable | Default | Purpose | Staging / Production |
|---|---|---|---|
| `S3_ENDPOINT_URL` | `""` | empty → local filesystem storage (dev only) | **required** in prod (prod boot evidence: `default = S3Boto3Storage`) |
| `S3_ACCESS_KEY_ID` | `""` | storage access key | secret manager / container secret |
| `S3_SECRET_ACCESS_KEY` | `""` | storage secret key | secret manager / container secret |
| `S3_BUCKET_NAME` | `logistimus` | uploads bucket | per-environment bucket |
| `S3_REGION_NAME` | `us-east-1` | bucket region | provider region |
| `S3_USE_SSL` | `True` | HTTPS to storage endpoint | `True` |
| `SIGNED_URL_TTL_SECONDS` | `600` | lifetime of presigned upload/download URLs | `600` (or lower) |

## 4. Backend — auth & email

| Variable | Default | Purpose | Staging / Production |
|---|---|---|---|
| `REFRESH_COOKIE_PATH` | `/api/v1/auth/` | path the HttpOnly refresh cookie is scoped to | keep default |
| `DEVICE_KEY_PEPPER` | `""` | pepper for device-key derived values | **set a long random value** |
| `EMAIL_BACKEND` | console backend (base.py) | Django email transport | **required**: `django.core.mail.backends.smtp.EmailBackend` — otherwise email is only printed to logs |
| `EMAIL_HOST` | `""` | SMTP server host | real SMTP host (added in Phase 2 — previously unplumbed) |
| `EMAIL_PORT` | `587` | SMTP port | usually `587` (STARTTLS) or `465` (SSL) |
| `EMAIL_HOST_USER` | `""` | SMTP username | secret |
| `EMAIL_HOST_PASSWORD` | `""` | SMTP password | secret — secret manager only |
| `EMAIL_USE_TLS` | `True` | STARTTLS on submission | `True` for 587 |
| `EMAIL_TIMEOUT` | `30` | SMTP socket timeout (s) | keep `30` |
| `DEFAULT_FROM_EMAIL` | `Logistimus <no-reply@logistimus.local>` | From header | real sender domain |
| `FRONTEND_URL` | `http://localhost:3000` | absolute base for reset/verify links in emails | public frontend origin |

## 5. Backend — AI features (optional)

| Variable | Default | Purpose |
|---|---|---|
| `AI_PROVIDER` | `""` | empty disables AI features |
| `AI_MODEL` | `""` | model id |
| `AI_API_KEY` | `""` | provider key — secret, never committed |
| `AI_ALLOW_EXTERNAL_CONTEXT` | `False` | allow external context calls |

## 6. Backend — production hardening & observability

| Variable | Default | Purpose | Staging / Production |
|---|---|---|---|
| `SECURE_SSL_REDIRECT` | `True` (prod) | redirect HTTP→HTTPS | `True` when TLS terminates at nginx (dev stack without TLS: `False`) |
| `SECURE_HSTS_SECONDS` | `31536000` (prod) | HSTS max-age (1 year, incl. subdomains + preload) | keep `31536000` |
| `SENTRY_DSN` | `""` | Sentry init (prod.py); empty = disabled | set for staging + prod (`send_default_pii=False`, `traces_sample_rate=0.0`) |

## 7. Compose-only variables (local dev stack)

Read by `Backend/docker-compose.yml` interpolation — **dev defaults are deliberately non-secret**:

`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`.

> `CHANNEL_LAYER_URL` appears in the compose file but is **not read by any settings module**
> (the Channels layer uses `REDIS_URL`). Harmless, slated for cleanup in Phase 3.

## 8. Frontend

| Variable | Default | Purpose | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | backend base URL used by `src/lib/api.ts` | **inlined at build time** — must be set during `npm run build`, not only at runtime. It is the *only* env var that reaches the client bundle. |

**API URL consistency rule:** backend serves everything under `/api/v1/`
(`Backend/config/urls.py`), so the frontend value must be `<backend-origin>/api/v1`
with **no trailing slash**. Staging example:
`NEXT_PUBLIC_API_URL=https://api.staging.example.com/api/v1`.

---

## 9. Secret-handling rules (verified)

1. No real secrets are committed: `git ls-files | grep -E '(^|/)\.env'` → only `Backend/.env.example`
   (plus the new `Frontend/.env.example`).
2. `.gitignore` ignores **every** `.env*` file (root + `Frontend/`) and re-includes only
   `!.env.example` / `!.env.*.example` — coverage evidence (Phase 2 run):

   ```text
   IGNORED     : Backend/.env        <- .gitignore:24:.env*
   IGNORED     : Frontend/.env       <- Frontend/.gitignore:21:.env*
   IGNORED     : Backend/.env.staging  <- .gitignore:24:.env*
   IGNORED     : Backend/.env.production <- .gitignore:24:.env*
   RE-INCLUDED : Frontend/.env.example  <- Frontend/.gitignore:22:!.env.example
   IGNORED     : Frontend/.env.local    <- Frontend/.gitignore:21:.env*
   IGNORED     : Frontend/.env.staging  <- Frontend/.gitignore:21:.env*
   ```
3. Git history scan: the only env-family file ever added is the `.env.example` template.
4. The frontend bundle contains no secrets — only `NEXT_PUBLIC_API_URL` (grep over `Frontend/src`).
5. Templates contain **placeholders only** (`.env.example` files in repo root dirs).

## 10. Missing / not-yet-provisioned variables (blockers tracked)

| Variable | Status | Phase |
|---|---|---|
| Staging SMTP credentials (`EMAIL_HOST`/`EMAIL_HOST_USER`/`EMAIL_HOST_PASSWORD` + `EMAIL_BACKEND=…smtp…`) | plumbing added in Phase 2; actual staging provider credentials **NOT_CONFIGURED** (none provisioned) | 9 (staging) |
| Real production `SECRET_KEY` / `DEVICE_KEY_PEPPER` values | NOT_CONFIGURED (must exist in the secret store at deploy time; boot now fails closed without them) | 6/10 |
| `SENTRY_DSN` for staging+prod | NOT_CONFIGURED (optional) | 8 |
