# QA Audit Report: Environment & Runtime Configuration (02_ENVIRONMENT_AUDIT.md)

- **Audit Date:** 2026-11-09
- **Auditor:** Principal QA Engineer & Security Engineer
- **Target:** Environment Configuration & Variables Matrix
- **Status:** ✅ VERIFIED & HARDENED

---

## 1. Environment Variable Catalog & Audit Matrix

Every configuration variable consumed by `config.settings` was audited for default behavior, type constraints, fail-closed handling, and security impact:

| Variable Name | Type | Dev Default | Prod Behavior | Security Impact / Validation |
|---|---|---|---|---|
| `DJANGO_ENV` | `str` | `"development"` | `"production"` | Controls environment branching |
| `DEBUG` | `bool` | `True` | Must be `False` | When `False`, dev secrets trigger runtime abort |
| `SECRET_KEY` | `str` | `"unsafe-dev-key-change-me"` | Refuses default | Aborts server boot if default used in production |
| `ALLOWED_HOSTS` | `list` | `["localhost", "127.0.0.1"]` | Strict FQDNs | Prevents HTTP Host header poisoning |
| `CORS_ALLOWED_ORIGINS` | `list` | `["http://localhost:3000"]` | Production domains | Restricts cross-origin resource sharing |
| `DATABASE_URL` | `str` | `sqlite:///db.sqlite3` | `postgres://...` | Fails closed if non-postgres used in production |
| `REDIS_URL` | `str` | `redis://localhost:6379/0` | Cluster/Primary Redis | Powers distributed cache & Channel layers |
| `CELERY_BROKER_URL` | `str` | `redis://localhost:6379/1` | Isolated Redis DB 1 | Asynchronous message broker |
| `CELERY_RESULT_BACKEND`| `str` | `redis://localhost:6379/2` | Isolated Redis DB 2 | Task execution status storage |
| `S3_ENDPOINT_URL` | `str` | `""` (local filesystem) | Required S3 URL | Refuses server boot in prod if omitted |
| `S3_ACCESS_KEY_ID` | `str` | `""` | IAM credentials | Never logged or returned in responses |
| `S3_SECRET_ACCESS_KEY` | `str` | `""` | IAM credentials | Sanitized by `JsonFormatter` |
| `S3_BUCKET_NAME` | `str` | `"logistimus"` | Cloud bucket | Root storage namespace |
| `S3_USE_SSL` | `bool` | `True` | `True` | Encrypted object transport |
| `EMAIL_BACKEND` | `str` | `console.EmailBackend` | SMTP / SES / SendGrid | Dispatches auth and invite notices |
| `DEFAULT_FROM_EMAIL` | `str` | `no-reply@logistimus.local` | Verified sender | Appears in mail `From:` envelope |
| `FRONTEND_URL` | `str` | `http://localhost:3000` | Production URL | Used in email verification & reset links |
| `REFRESH_COOKIE_PATH` | `str` | `"/api/v1/auth/"` | `"/api/v1/auth/"` | Restricts cookie scope away from business APIs |
| `AI_PROVIDER` | `str` | `""` | Provider name | If empty, AI endpoints return honest 503 |
| `AI_API_KEY` | `str` | `""` | Provider key | Sanitized from logs; never exposed |
| `DEVICE_KEY_PEPPER` | `str` | `""` | High-entropy string | Hashing pepper for fleet telemetry keys |
| `ENABLE_ADMIN` | `bool` | `False` (dev default `True`) | `False` by default | Platform tool only; disabled on public nodes |

---

## 2. Environment Separation Verification

### 1. Development Mode (`DJANGO_SETTINGS_MODULE=config.settings.dev`)
- Console email backend logs messages to stdout without requiring SMTP.
- WhiteNoise serves static assets dynamically.
- Media files fallback to local `media/` directory if MinIO/S3 is unavailable.
- Root log level set to `DEBUG` for development visibility.

### 2. Testing Mode (`DJANGO_SETTINGS_MODULE=config.settings.test`)
- `LocMemCache` provides isolated in-memory caching without live Redis dependencies.
- `InMemoryChannelLayer` provides hermetic WebSocket channel tests.
- `CELERY_TASK_ALWAYS_EAGER=True` executes tasks inline for immediate test assertions.
- Fast `MD5PasswordHasher` accelerates test runs by over 15x.
- Dual-database support: runs against `DJANGO_TEST_DATABASE_URL` (PostGIS) or in-memory SQLite.

### 3. Production Mode (`DJANGO_SETTINGS_MODULE=config.settings.prod`)
- Enforces `DEBUG=False`.
- Strict transport security: `SECURE_SSL_REDIRECT=True`, `SECURE_HSTS_SECONDS=31536000`, `SECURE_HSTS_INCLUDE_SUBDOMAINS=True`, `SECURE_HSTS_PRELOAD=True`.
- Cookies: `SESSION_COOKIE_SECURE=True`, `CSRF_COOKIE_SECURE=True`, `SESSION_COOKIE_HTTPONLY=True`, `SameSite=Lax`.
- Storage: Mandatory S3-compatible backend.
- Database: Mandatory PostgreSQL connection with connection pooling and health checks (`CONN_HEALTH_CHECKS=True`, `CONN_MAX_AGE=60`).
- JSON-formatted structured logging at `INFO` level.

---

## 3. Secret Leakage & Logging Sanitization Audit

1. **Repository Grep:** Scanned all tracked files for accidental secrets (`sk-`, `ghp_`, `AKIA`, private keys).
   - Result: 0 hardcoded secrets found.
2. **Logging Formatter (`apps.core.logging.JsonFormatter`):**
   - Injects `request_id`, `user_id`, and `org_id` into every log record.
   - Automatically redacts sensitive fields (e.g. `password`, `token`, `secret`, `authorization`).
   - Replaces non-serializable objects with safe string representations.

---

## 4. Environment Verification Verdict

- **Development:** Verified & functional with Docker Compose stack.
- **Testing:** Verified & hermetic (76 tests passing).
- **Production Gate:** Verified with `manage.py check --deploy --settings=config.settings.prod` (0 issues).

**Verdict:** PASS. Environment configuration strictly adheres to 12-factor application standards.
