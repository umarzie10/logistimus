# Logistimus — Security Plan

Status: **Phase 0 deliverable** · Applies to every phase; verified in Phase 9 with a full review.

Threat model summary: Logistimus is a multi-tenant B2B SaaS. The dominant risks are **cross-tenant data exposure** (IDOR via ids/queries/filters), **privilege escalation** (role/permission bypass, platform-admin reachability), **session/token theft**, **injection** (SQL/CSV/file), and **financial/data integrity errors**. Anonymous surfaces are limited to marketing pages, public shipment tracking (rate-limited), and auth endpoints.

---

## 1. Authentication

| Control | Implementation |
|---|---|
| Password hashing | Django PBKDF2-SHA256 (default, ≥ 720k iterations). No plaintext, no custom crypto. |
| Password policy | min 8 chars, must differ from last 3 (history table optional), rejected common passwords (small blocklist). Enforced server-side; frontend hint is advisory. |
| Access token | JWT (`simplejwt`), 15 min, claims `sub`, `org`, `role`, `jti`, `iat/exp`. Signed with `SECRET_KEY` (rotatable). **Held in memory client-side only.** |
| Refresh token | opaque 256-bit random, stored **hashed** (SHA-256), cookie `lr_refresh`: `HttpOnly; SameSite=Lax; Secure; Path=/api/v1/auth`. 12 h (or 30 d with `rememberDevice`). |
| Rotation & reuse | every refresh issues a new token and revokes the old; presenting a revoked token revokes the whole `family_id` (theft detection) → `401 refresh_revoked`. |
| Logout | revokes current family; `POST /auth/logout` is cookie-authenticated. |
| CSRF | refresh/logout/switch-org require `X-Requested-With: XMLHttpRequest` + `SameSite=Lax`; state-changing endpoints accept JSON only (`Content-Type: application/json`) which blocks simple cross-site form posts; `CsrfViewMiddleware` kept for session-based admin; CORS allowlist restricts origins. |
| Email verification | 6-digit code, hashed at rest, 15 min TTL, 5 attempts max, resend cooldown 60 s / 5 per hour; unverified users cannot log in (`403 email_not_verified`). |
| Password reset | single-use token (hashed), 60 min TTL, invalidates **all** sessions on success; enumeration-safe responses (`202` always). |
| Lockout | 10 consecutive failures → 15 min lock (`locked_until`), per email + per IP; `423` with `retry_after_seconds`. |
| Login history | IP, UA, success/failure persisted; visible to the user and to org admins. |
| 2FA | TOTP (`django-otp`-style implementation) — Phase 2 optional flag per org; when enabled, login returns `mfa_required` and `POST /auth/mfa/verify` completes the session. Scope documented as org-settings opt-in. |
| Session view | `GET /auth/session` returns current identity; no sensitive fields (never password hashes, full tokens, or other tenants' memberships). |

**Never:** log passwords/tokens; return `401` vs `403` distinctions that leak resource existence on public surfaces; store refresh tokens in `localStorage`.

## 2. Authorization

- **Two axes:** (a) org role → permissions (`module.action` codes), (b) platform role (`platform_admin`) → `/super-admin/*` only.
- `IsPlatformAdmin` is a separate class + middleware; platform routes live in their own router with **no** org fallback. An org `super_admin` role is *not* a platform admin.
- Permission checks on **every** endpoint via DRF permission classes (default deny: `IsAuthenticated` + `HasPermission('module.action')`).
- Object-level checks where ownership matters: driver (`driver_id == self.driver`), customer (`customer == self.customer`), document access (association + permission).
- **Frontend role checks are cosmetic only** — server always re-checks.
- Denial semantics: cross-tenant detail → `404` (no existence leak); same-tenant no-permission → `403` with stable `code`.

## 3. Tenant isolation (core control)

1. **Server-controlled context:** `org` claim inside the signed access token, set only by `POST /auth/switch-organization` after membership validation. No request body/query/header supplies the tenant.
2. **TenantManager:** default queryset `filter(organization_id=ctx.org)`; `Model.save()` injects `organization_id` from context; explicit override requires a service-layer call.
3. **Serializers** never accept `organization_id` as writable input (ignored/`read_only`).
4. **Tenant-aware constraints:** unique keys include `organization_id`; active-dispatch and active-subscription partial uniques.
5. **PostgreSQL RLS** on high-value tables (`orders`, `shipments`, `dispatches`, `vehicles`, `drivers`, `stock_levels`, `stock_movements`, `invoices`, `payments`, `documents`, `notifications`, `customers`, `vehicles_location`): policy `organization_id = current_setting('app.organization_id')`, set with `SET LOCAL` inside the request transaction by middleware. `FORCE ROW LEVEL SECURITY`. Missing-policy tables fail `manage.py check_database_conventions` in CI.
6. **Background jobs** set `app.organization_id` per tenant record before queries (Celery task base class `TenantTask`).
7. **WebSockets:** group names built only from the verified token `org`; join permission re-checked; payload org-tagged; cross-tenant join impossible.
8. **Super admin** uses `app.platform_admin = 'on'` + explicit policy branch + `scope=platform` audit rows.
9. **Test mandate:** isolation suite (Company A vs B) covering id tampering, query params, filters, search, exports, WebSocket groups, background tasks, and portal scopes — runs in every CI build.

## 4. Input validation & injection

- All request bodies through DRF serializers (typed fields, explicit `validators`); `django-filter` for query params; ordering whitelists (`ordering_fields`) — never raw `order_by` from user input.
- SQL only via ORM/`RawSQL` with parameters; no string-built SQL; no `extra()` with user data.
- Search uses `icontains`/trigram, not raw FTS strings.
- CSV export: formula-injection guard (prefix `'` for cells starting `= + - @`).
- File uploads: content-type + extension allowlist (pdf/png/jpg/jpeg/csv/xlsx), 25 MB cap, checksum recorded, stored outside web root in private bucket, sanitized filename, no executable types, no path traversal (server-generated keys `org/{uuid}/…`).
- JSON body size limits (Nginx `client_max_body_size`), request size/time limits.

## 5. Transport, headers, cookies

- TLS 1.2+ enforced at Nginx; HSTS; redirect HTTP→HTTPS.
- Security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy` (default-src 'self'; no inline scripts in API responses), `Permissions-Policy`, `Cross-Origin-Opener-Policy`.
- Cookies: `Secure`, `HttpOnly` (refresh), `SameSite=Lax`; access token never in a cookie.
- CORS: explicit allowlist from env (frontend origin only), `credentials=True`, no wildcard in prod.

## 6. Rate limiting & abuse

| Surface | Limit | Mechanism |
|---|---|---|
| login | 5/min/IP + 10/15min/email | DRF throttle + lockout counters |
| forgot/resend | 5/h/email, 20/h/IP | DRF throttle |
| public track | 20/min/IP | DRF throttle |
| AI chat | 20/min/user | DRF throttle |
| device ingest | per-device quota | throttle + device auth |
| default authed | 300/min/user | scoped throttle classes |
| API keys | per-key RPM from `scopes`/quota | Redis token bucket |

429 responses carry `Retry-After`. Bot/credential-stuffing: lockout + login-history anomaly fields.

## 7. Secrets & configuration

- All secrets via environment (`SECRET_KEY`, `DATABASE_URL`, `REDIS_URL`, `S3_*`, `AI_*`, provider keys, `DEVICE_KEY_PEPPER`, `SIGNING_SALT`); `.env.example` documents names only; `.env*` git-ignored; pre-commit + CI secret scan (`gitleaks`/`detect-secrets`).
- Production `SECRET_KEY` rotated via env; token invalidation on rotation documented.
- Object storage credentials least-privilege (write-only prefix per env); device keys hashed (pepper from env).
- AI/external providers: egress allowlist; tenant data leaves only when `AI_ALLOW_EXTERNAL_CONTEXT=true` (default false) and redaction filters strip PII columns.

## 8. Data protection & privacy

- PII fields (driver license, phone, medical, customer contacts) marked `sensitive=True` → masked serializers by default, full view requires `pii.view` permission; audit access to PII.
- Encryption at rest: DB volume + bucket SSE; `integration_connections.credentials` Fernet-encrypted with env key.
- Backups: encrypted `pg_dump` (daily, 30-day retention) + bucket versioning; restore drill in runbook.
- Retention: telemetry raw 180 d → rollups; login history 1 y; audit logs ≥ 2 y (append-only, no DELETE grant for app role); soft-deleted rows purged after 30 d by job.
- Exports (CSV) are tenant-scoped and audited (`action=export`).

## 9. Audit logging

- `audit_logs` rows for: auth events, org/member/role changes, permission changes, API key create/rotate/revoke, invoice void, payment record, stock adjustment, document access (URL issuance), super-admin actions (`scope=platform`), feature-flag/config changes.
- Fields: actor, action, object, before/after JSON, IP, UA, `request_id`. Append-only; DB role for the app has no `DELETE` on the table.
- `request_id` propagated: HTTP header → logs → error envelope → audit rows.

## 10. Error handling & information disclosure

- Unified envelope (`code`, `message`, `details`, `request_id`); no stack traces, no SQL, no settings in responses (`DEBUG=False`).
- Custom handlers for 400/401/403/404/405/409/413/429/500 → envelope.
- 500s log full traceback server-side only; client gets `internal_error` + `request_id`.
- Django admin (if enabled) is staff-only, IP-restricted, and **not** the tenant UI; prefer disabling in prod (`ENABLE_ADMIN=false`).

## 11. WebSocket security

- Authenticate in `connect()` (query-token JWT, validate `exp`/`org`); reject before joining any group.
- Group names `org:{id}:*` derived from token; role-restricted channels (`dispatch`) re-check permission at join.
- Heartbeat 30 s; origin check against allowlist; message payload schema-validated; per-connection message rate cap; close with proper codes (`4401` unauthenticated, `4403` forbidden).

## 12. Background jobs

- `TenantTask` base sets org context; task inputs are ids (not serialized objects); retries with backoff + idempotency keys for email/webhook delivery; failed-task alerts (monitoring).
- No secrets in task args/logs; email templates escape user content (no HTML injection in mail).

## 13. Dependencies & supply chain

- Pinned versions (`pyproject.toml` + lock via `uv`), `pip-audit` in CI (fail on critical CVEs, documented exceptions), Docker base images pinned by digest, non-root container user, minimal image (no compilers in runtime stage), `ruff` security rules (`S` bandit-equivalent set).

## 14. API key security (integrations)

- Format `lr_live_<43 random>`; **stored as SHA-256 hash only**; shown once at creation/rotation; prefix + metadata in UI.
- Scopes (`orders:read`, `finance:write`, …) enforced per view; expiry optional; revocation immediate; `last_used_at` tracked; per-key rate limit; usage in audit log.

## 15. Plan entitlements & financial integrity

- Plan limits enforced server-side (`SubscriptionGuard`): disabled module → `402/403`, `max_vehicles` → `409 plan_limit_reached`.
- Money: `Decimal` end-to-end; `quantize(0.01, ROUND_HALF_UP)`; currency stored per record; no float serialization (strings in JSON).
- No payment processing claimed until a provider integration exists and is tested; `Payment` records are manual/imported with audit trail.
- Invoice void/payment writes are transactional and audited.

## 16. Multi-tenant file access

- Private bucket, no public ACLs; all downloads via short-lived signed URLs issued **after** permission + tenant check; URL issuance audited for documents.
- Upload path per org (`org/{org_id}/…`) so bucket policies can also scope by prefix.

## 17. Monitoring & incident response

- Structured JSON logs (level, `request_id`, `org` (uuid only), actor, route, latency, status) → shipped to file/Sentry (env-gated).
- `/metrics/`: request count/latency, DB pool, Celery queue depth, WS connections, auth failures.
- Alerts (documented thresholds): 5xx > 1%, auth failure spike, queue backlog, disk > 85%, backup failure.
- Incident runbook in `docs/backend/OPERATIONS.md`: triage → contain (revoke keys/tokens, disable feature flag) → restore (backup drill) → postmortem. Token/secret rotation procedure documented.

## 18. Verification checklist (run in Phase 9, evidence in report)

- [ ] `pip-audit` clean; gitleaks clean; `ruff` S-rules clean.
- [ ] Tenant isolation matrix green (CRUD × 12 roles × portals × WS × exports × tasks).
- [ ] `check_database_conventions`: every tenant table has RLS policy + required indexes.
- [ ] Auth abuse: lockout, reset token reuse, refresh reuse, expired code, resend cooldown — all as specified.
- [ ] IDOR sweep: every detail endpoint probed with foreign UUID → 404.
- [ ] Upload attack cases: wrong type, oversize, path traversal name, zip-bomb-ish (size cap) → rejected.
- [ ] CSV injection guard verified; search/`ordering` injection attempts rejected.
- [ ] Headers/cookies/CORS verified against prod config; `DEBUG=False` asserted in prod settings test.
- [ ] Rate limits observed under script (`429` + `Retry-After`).
- [ ] WS: unauthenticated connect rejected; cross-org group join rejected.
- [ ] Audit rows exist for every action in §9 (asserted by tests).
- [ ] No secrets in repo/history; `.env.example` complete.

## 19. Explicit "never" list (from requirements, tracked)

Never commit secrets · never log passwords/tokens · never trust frontend permission checks · never trust client tenant ids · never return cross-tenant data · never run prod with `DEBUG=True` · never disable security controls for dev convenience · never fake payment/AI/routing success · never broadcast cross-tenant WS events · never claim a feature works without a test proving it.
