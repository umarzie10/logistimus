# Security Readiness — Logistimus

**Phase 5 deliverable** of the production readiness assessment.
Scope: configuration hardening, transport, auth/authz, tenant isolation,
secrets, dependency vulnerabilities, information disclosure.

Every status below is backed by command output captured while the assessment
ran (2026-11-10). **No security control was disabled to make deployment pass**
— two controls were *added* during this phase (§7, §8).

**Status legend:** `PASS` · `FAIL` · `NOT_CONFIGURED` · `NOT_VERIFIED` · `BLOCKED`

---

## 1. Configuration hardening

| Check | Status | Evidence |
|---|---|---|
| `DEBUG=False` forced under prod settings | **PASS** | probe: `DEBUG = False` (unconditional in `prod.py:6`, not env-overridable) |
| Secret must be real | **PASS** | sentinel compare raises; assert on `unsafe-dev-key-change-me` |
| Placeholder secret rejected | **PASS** | rejects `change-me`/`changeme` substring; negative test `prod_placeholder_secret.py` |
| Short secret rejected | **PASS** | `< 50 chars` → RuntimeError; negative test `prod_short_secret.py` |
| Valid secret boots | **PASS** | `PROD_BOOT_OK` |
| `ALLOWED_HOSTS` explicit | **PASS** | probe: `['api.logistimus.example.com', 'app.logistimus.example.com', 'localhost', '127.0.0.1']` |
| `CSRF_TRUSTED_ORIGINS` derived from https origins | **PASS** | `['https://app.logistimus.example.com']` |
| Non-PostgreSQL refused | **PASS** | `RuntimeError("Production requires PostgreSQL…")` |
| Django admin surface off | **PASS** | `admin installed = False` (`ENABLE_ADMIN` defaults false; root URLconf has no `/admin/`) |

```
$ uv run python /tmp/opencode/prod_security_probe.py
DEBUG                       = False
admin installed             = False
```

---

## 2. Transport security

| Check | Status | Evidence |
|---|---|---|
| `SECURE_SSL_REDIRECT` | **PASS** | `True`; live: `HTTP 301 -> https://localhost/api/v1/health/` |
| HSTS | **PASS** | `SECURE_HSTS_SECONDS=31536000` + includeSubDomains + preload; nginx adds `strict-transport-security: max-age=63072000; includeSubDomains` |
| Secure cookies | **PASS** | `SESSION_COOKIE_SECURE=True`, `CSRF_COOKIE_SECURE=True` |
| HttpOnly session cookie | **PASS** | `SESSION_COOKIE_HTTPONLY=True` |
| SameSite | **PASS** | session + CSRF `Lax` |
| Proxy header trust | **PASS** | `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')` — trusts nginx only |
| TLS termination | **PASS (test certs)** | self-signed `infrastructure/tls/` (git-ignored). Real CA certs → `NOT_CONFIGURED` before public rollout |
| DB TLS | `NOT_CONFIGURED` | in-network only; required if the DB ever leaves the host |

---

## 3. Security headers

| Header | Value | Status |
|---|---|---|
| `X-Frame-Options` | `DENY` | **PASS** |
| `X-Content-Type-Options` | nosniff | **PASS** |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | **PASS** |
| `Cross-Origin-Opener-Policy` | `same-origin` | **PASS** |
| HSTS | 63072000 + includeSubDomains | **PASS** |
| nginx `server_tokens` | `off` | **PASS** |

```
$ uv run python /tmp/opencode/prod_security_probe.py
X_FRAME_OPTIONS             = DENY
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY      = strict-origin-when-cross-origin
COOP                        = same-origin
```

---

## 4. Authentication & authorization

| Check | Status | Evidence |
|---|---|---|
| Default permission = authenticated | **PASS** | `('IsAuthenticated', 'apps.core.permissions.HasPermission')` |
| Every view explicit about authz | **PASS** | `permission_coverage_check` system check registered |
| JWT access token lifetime | **PASS** | 15 min |
| JWT refresh lifetime + rotation | **PASS** | 12 h, `ROTATE_REFRESH_TOKENS=True` |
| Signing key = `SECRET_KEY` | **PASS** | `HS256`, refuses placeholder/short keys (§1) |
| Unauthenticated access rejected | **PASS** | live smoke: protected endpoint → **HTTP 401** |
| Password validators | **PASS** | 4: similarity, min length 8, common-password, numeric |
| Password hashing | **PASS** | Django default PBKDF2 (`MD5PasswordHasher` is `test.py` only) |
| Login brute-force throttle | **PASS** | `LoginRateThrottle` `5/min` applied (`accounts/views.py:204`) |
| Password-reset throttle | **PASS** | `PasswordResetRateThrottle` `5/hour` (`views.py:361,390`) |

---

## 5. Tenant isolation (fail-closed)

| Check | Status | Evidence |
|---|---|---|
| PostgreSQL RLS on every tenant table | **PASS** | `EnableRLS` migrations; `FORCE ROW LEVEL SECURITY` |
| Fail-closed without org context | **PASS** | unset context → NULL predicate → no rows |
| Cross-org insert blocked | **PASS** | `WITH CHECK` rejects |
| Convention enforced in CI | **PASS** | `logistimus.E001` system check |
| Verified against real PostgreSQL | **PASS** | 9 passed (6 behaviour + 3 convention) |

Full write-up: `DATABASE_READINESS.md` §3.

---

## 6. Rate limiting / abuse protection

| Scope | Rate | Status |
|---|---|---|
| `user` | 300/min | **PASS** |
| `anon` | 60/min | **PASS** |
| `login` | 5/min | **PASS** |
| `password_reset` | 5/hour | **PASS** |
| `public_track` | 20/min | **PASS** |
| `ai_chat` | scoped | **PASS** |
| `/health/`, `/health/ready/` | none (`throttle_classes = []`) | `NOT_VERIFIED` — by design for uptime probes; confirm they stay off the public internet or get limited at nginx |
| Global `Accept`-header CPU DoS | fixed by DRF 3.18.3 | **PASS** — see §8 |

Redis-backed via the default cache (same Redis as the deploy stack).

---

## 7. Secrets hygiene

| Check | Status | Evidence |
|---|---|---|
| Hardcoded secrets in source | **PASS** | scan: none |
| Real env files tracked | **PASS** | only `Backend/.env.example`, `Frontend/.env.example` |
| `.gitignore` covers env | **PASS** | `.env*` ignored, `!.env.example` / `!.env.*.example` re-included |
| Secrets in git history (200 commits) | **PASS** | patterns `sk-…`/`AKIA…`/`ghp_…`: none |
| Secrets inside built images | **PASS** | `PASS: no real env file / no sqlite db / only the .example template` |
| Secrets printed by this assessment | **PASS** | probes print effective settings only, never secret values |

```
$ bash /tmp/opencode/phase5_scan.sh
=== 1. hardcoded secret literals in source ===
(empty above = none)
=== 4. secrets in git history (last 200 commits) ===
(empty above = none)
```

---

## 8. Dependency vulnerabilities

### Backend (pip-audit)

**Before — `FAIL`:**

```
$ uv run pip-audit
Found 5 known vulnerabilities in 1 package
Name                Version ID              Fix Versions
djangorestframework 3.15.2  PYSEC-2026-3827 3.17.2
djangorestframework 3.15.2  PYSEC-2026-3828 3.17.2
djangorestframework 3.15.2  CVE-2026-114138 3.18.2
djangorestframework 3.15.2  CVE-2026-114136 3.18.2
djangorestframework 3.15.2  CVE-2026-114137 3.18.2
```

| CVE | Severity | Relevance to this project |
|---|---|---|
| **CVE-2026-114136** | High | **AFFECTED.** Unauthenticated memory-amplification DoS: `Content-Type: application/json; charset=bz2_codec` turns a 108-byte body into a 50,331,648-char value (~97 MiB RSS). Requires only DRF's default parser set — no app config opts in. |
| **CVE-2026-114138** | High 7.5 | **AFFECTED.** Oversized `Accept` header → ~19 s CPU per request on any endpoint (content negotiation runs everywhere). |
| CVE-2026-114137 | High 7.4 | Not applicable — needs `rest_framework.authtoken`; this project uses JWT, `authtoken` not in `INSTALLED_APPS`. |
| PYSEC-2026-3827/3828 | — | same advisory IDs on the 3.15 line |

**Root cause:** `pyproject.toml` pinned `djangorestframework>=3.15,<3.16`,
which made every fix version unreachable.

**Fix applied:** pin relaxed to `>=3.18.2,<3.19`; `uv lock` resolved
**3.18.3** (requires `django>=5.2`; project runs Django 5.2.19).

**After — `PASS`:**

```
$ uv run pip-audit
No known vulnerabilities found

$ DJANGO_TEST_DATABASE_URL=… uv run pytest
133 passed in 5.81s
$ uv run ruff check .
All checks passed!
$ uv run manage.py makemigrations --check --dry-run
No changes detected
$ uv run python /tmp/opencode/prod_boot_check.py
PROD_BOOT_OK
```

### Django

```
$ uv run pip-audit   # (Django resolved separately)
No known vulnerabilities found
```

### Frontend (npm audit)

```
$ npm audit
7 moderate severity vulnerabilities
```

All 7 trace to `minimatch` ← `typescript-eslint` ← `eslint-config-next`,
i.e. the **lint toolchain**. Confirmed dev-only:

```
$ npm ls minimatch --omit=dev
logistimus-frontend@0.1.0
└─┬ (empty)                       # not in the production tree
$ python3 -c "…print('eslint in deps?', 'eslint' in deps)"
eslint in deps? False             # devDependencies only
```

**Status: `PASS (dev-only)`** — not shipped to production, and `npm audit fix`
cannot resolve it (blocked upstream by `eslint-config-next@16.4.3`'s pin).
Revisit when `eslint-config-next` bumps `typescript-eslint`.

---

## 9. Information disclosure

| Check | Status | Evidence |
|---|---|---|
| API schema/Swagger/ReDoc gated | **PASS (fixed this phase)** | was `SERVE_PERMISSIONS=AllowAny` → anonymous full API surface. Now `['IsAuthenticated']` in prod; override available via `SPECTACULAR_SETTINGS__SERVE_PERMISSIONS=AllowAny` |
| Error handlers leak no tracebacks | **PASS** | `handler500` logs server-side, returns envelope `{"…": "An unexpected error occurred."}`; 400/403/404 wrapped too |
| Custom JSON error envelope | **PASS** | `ApiErrorEnvelopeMiddleware` |
| Stack traces in responses | **PASS** | `DEBUG=False` + custom handlers |
| Django admin | **PASS** | not installed in prod, no route registered |
| Frontend debug leftovers | **PASS** | `console.log` scan of `Frontend/src`: none |

**Fix applied this phase:**

```python
# prod.py — docs advertise every endpoint to anonymous callers; nothing at
# runtime consumes them (frontend only fetches /api/schema/ from local dev
# during type generation).
if env.str("SPECTACULAR_SETTINGS__SERVE_PERMISSIONS", default="") != "AllowAny":
    SPECTACULAR_SETTINGS["SERVE_PERMISSIONS"] = [
        "rest_framework.permissions.IsAuthenticated"
    ]
```

Verified effective (prod settings, local probe):

```
SERVE_PERMISSIONS           = ['rest_framework.permissions.IsAuthenticated']
  -> docs require auth      = True
```

Test suite unaffected: the three schema tests run under
`config.settings.test`, where the restriction does not apply.

---

## 10. Known gaps / follow-ups

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | SMTP credentials | `NOT_CONFIGURED` | password-reset emails cannot be sent |
| 2 | `SENTRY_DSN` empty | `NOT_CONFIGURED` | no error tracking / no security-event alerting |
| 3 | TLS certificates | `NOT_CONFIGURED` | self-signed are for testing only |
| 4 | DB TLS (`sslmode`) | `NOT_CONFIGURED` | acceptable while DB stays on the isolated container network |
| 5 | Encryption at rest | `NOT_VERIFIED` | host/volume-level — confirm with infrastructure owner |
| 6 | Health endpoints public, unthrottled | `NOT_VERIFIED` | by design for uptime probes; keep off the public internet or limit at nginx |
| 7 | Security monitoring / alerting | `NOT_CONFIGURED` | no SIEM, no log shipping; JSON logs exist but nobody reads them centrally |
| 8 | Dependency update cadence | `NOT_CONFIGURED` | no scheduled `pip-audit`/`npm audit` in CI (the CI `npm audit --audit-level=high` covers high+ only) |
| 9 | `npm audit` 7 moderate | `PASS (dev-only)` | see §8 — blocked upstream by `eslint-config-next` |
| 10 | Secret rotation runbook | `NOT_CONFIGURED` | document before production (Phase 10 `DEPLOYMENT_GUIDE.md`) |

---

## 11. Verdict

**SECURITY READINESS: PASS with follow-ups.**

The baseline is strong — forced `DEBUG=False`, layered secret-key guards,
full transport/header hardening, fail-closed tenant isolation, scoped rate
limiting, clean secrets hygiene and custom error envelopes.

Two **real** defects were found and fixed during this phase, and neither fix
weakens anything:

1. **5 CVEs in DRF 3.15.2** (two High, both unauthenticated DoS and reachable
   on every JSON endpoint with default configuration) — root-caused to an
   over-tight version pin, fixed by upgrading to 3.18.3. Full suite still
   `133 passed`, `PROD_BOOT_OK`.
2. **Public API schema/docs** — anonymous callers could enumerate the entire
   API surface. Gated behind `IsAuthenticated` in production.

Remaining items are operational gaps (SMTP, Sentry, TLS certs, monitoring,
rotation runbook), each carrying an explicit status in §10 and feeding the
overall `PRODUCTION_READINESS_REPORT.md`.
