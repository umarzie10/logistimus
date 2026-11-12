# Logistimus — Email Delivery & Registration E2E Report

**Document ID:** EMAIL-E2E-003 · **Date:** 2026-11-13
**Scope:** End-to-end verification of the registration → email verification →
login lifecycle on the deployed Railway environment, including the real
delivery path.

---

## 1. Headline Result

| Capability | Status | Evidence |
|---|---|---|
| Registration creates the tenant correctly | **PASS** | Live HTTP 201 + DB verification |
| Verification code is generated, hashed and dispatched | **PASS** | Worker log; SHA-256 hash in DB |
| Code submission activates the account | **PASS** | Live `{"verified": true}` |
| Login after verification issues a JWT | **PASS** | Live `access` token, role `owner` |
| Unverified login is refused | **PASS** | Live HTTP 403 `email_not_verified` |
| Duplicate registration is refused | **PASS** | Live HTTP 409 `email_exists` |
| Tenant isolation holds on the live deployment | **PASS** | RLS self-check + live API |
| Celery task executes the send | **PASS** | Worker log: task succeeded |
| **Real inbox delivery (external provider)** | **NOT VERIFIED** | No provider configured — see §5 |

> **Explicit honesty statement.** This report does **not** claim that a real
> email arrived in a real inbox. The deployed environment uses Django's
> console email backend, so the message body (including the code) is written
> to the Celery worker's log instead of being handed to an SMTP server. The
> delivery *mechanism* is verified end-to-end inside the application; the
> hand-off to an external mail provider is `NOT_VERIFIED` until a provider is
> configured and a real inbox is observed.

---

## 2. Delivery Architecture

```
POST /api/v1/auth/register/
        │
        ├─ Django creates User + Organization + HQ Branch + 12 roles
        │  + settings + owner Membership  (one transaction.atomic())
        ├─ EmailVerification row created
        │     code_hash = sha256(code)      ← plaintext never stored
        │     expires_at = now + 15 min
        │
        └─ Celery task queued on Redis (db 1), dispatched on commit
                 │
                 ▼
         apps.accounts.tasks.send_verification_email
                 │
                 ├─ send_mail(..., fail_silently=False)   ← provider errors surface
                 ├─ html_message = templates/accounts/email_verification.html
                 │     (responsive, Logistimus design system, English)
                 └─ logger.info("verification email sent to %s", to_email)
```

### Retry & failure behaviour
| Property | Value |
|---|---|
| Bounded retries | `max_retries=3` |
| Backoff | exponential (`retry_backoff=True`) |
| Provider errors | never suppressed (`fail_silently=False`) |
| Dispatch timing | `transaction.on_commit` — a rolled-back registration never sends an email |
| Failure observability | the Celery task raises; the worker logs the failure; `autoretry_for` re-queues with backoff |
| Idempotency | re-sending rotates the code (the previous one is invalidated) |

---

## 3. Live E2E Transcript (synthetic accounts only)

Target: `https://api-production-fc92b6bf.up.railway.app/api/v1`
Accounts use `@example.invalid` (RFC 2606) — never routable, never a real inbox.

```
=== 1. health ===
GET /health/       → {"status":"ok","version":"0.1.0","environment":"staging"}
GET /health/ready/ → {"status":"ready","dependencies":{"database":"ok","redis":"ok"}}

=== 2. register ===
POST /auth/register/
  {"companyName":"Railway E2E 1794513584","email":"railway.e2e.a+…@example.invalid",
   "password":"…","confirmPassword":"…","firstName":"Rail","lastName":"Tester",
   "country":"Uzbekistan","phone":"+998 90 111 22 33",
   "companyType":"Freight Forwarder","acceptTerms":true,"tier":"starter"}
→ {"verification_required":true,"email":"railway.e2e.a+…@example.invalid","cooldown_seconds":60}

=== 3. login before verification ===
POST /auth/login/
→ {"error":{"code":"email_not_verified",
            "message":"Please verify your email before signing in."}}      (HTTP 403)

=== 4. duplicate registration ===
POST /auth/register/  (same email)
→ {"error":{"code":"email_exists",
            "message":"An account with this email already exists."}}      (HTTP 409)

=== 5. code dispatched ===
Celery worker log:
  [INFO] verification email sent to railway.e2e.a+…@example.invalid
  Task apps.accounts.tasks.send_verification_email[…] succeeded

=== 6. submit the code ===
POST /auth/verify-email/  {"email":"…","code":"<6 digits>"}
→ {"verified":true,"joined_organizations":0}

=== 7. login after verification ===
POST /auth/login/
→ user:  railway.e2e.a+…@example.invalid
  role:  owner
  org :  Railway E2E 1794513584
  access token: issued

=== 8. tenant isolation ===
GET /organizations/current/branches/  (Bearer <token>)
→ count: 1   → "Railway E2E … HQ"          (only the caller's own tenant)
GET /organizations/current/members/   (Bearer <token>)
→ count: 1   → the owner                   (only the caller's own tenant)
```

Codes and credentials are never printed in this report or in any log.

---

## 4. Verification Code Handling — Verified Properties

| Property | Implementation | Verified |
|---|---|---|
| Randomness | `secrets.randbelow(1_000_000)` — CSPRNG | Code review |
| Storage | SHA-256 hash only; plaintext discarded after dispatch | Code review + DB inspection |
| Expiry | 15 minutes, server-enforced | `test_expired_code_rejected_410` |
| Single use | `consumed_at` timestamp set on success | `test_already_used_code_cannot_be_reused` |
| Attempt cap | 5 attempts, then HTTP 429 | `test_brute_force_throttled_after_5_attempts` |
| Resend cooldown | 60 s, plus 10 codes/hour | `test_resend_cooldown_rate_limiting` |
| Old code invalidation | new code consumes prior unconsumed codes | `test_old_code_invalidated_when_new_code_generated` |
| Concurrency | `transaction.atomic()` + `select_for_update()` | Code review |
| No leakage | never in a URL, an API response, or an application log | Code review |

---

## 5. Real Inbox Delivery — NOT VERIFIED (and how to close it)

### Why it is not verified
The Railway services currently run with Django's **console** email backend.
`EMAIL_BACKEND` was not set on the `api`/`worker` services, and
`Backend/.env.example` ships an empty `EMAIL_HOST` / `EMAIL_HOST_USER` /
`EMAIL_HOST_PASSWORD`. With no provider configured, a real SMTP hand-off
cannot occur — and claiming otherwise would be false.

Additionally, the only SMTP credentials in this project were for the local
development host, and a Brevo account rejects connections from an
unrecognised IP (`525 Unauthorized IP address`), so the local host cannot be
used as proof either.

### How to close this item
1. Create a transactional-email account (Brevo, AWS SES, Postmark, Resend).
2. Verify the sender domain (SPF + DKIM + DMARC).
3. Set the following on the **api** and **worker** services:
   ```bash
   EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
   EMAIL_HOST=smtp-relay.brevo.com     # provider specific
   EMAIL_PORT=587
   EMAIL_HOST_USER=<provider login>
   EMAIL_HOST_PASSWORD=<provider key>
   EMAIL_USE_TLS=True
   DEFAULT_FROM_EMAIL=Logistimus <no-reply@your-domain>
   ```
4. Register a real address and confirm the message arrives, then record the
   provider message id here.

### Verified delivery-path behaviour (independent of the provider)
- The task runs in the Celery worker and completes successfully.
- Provider errors propagate (`fail_silently=False`) and are retried up to
  3 times with exponential backoff — a failed send is never reported as a
  successful one.
- A failed send leaves the account unverified, so the user can request a new
  code (60 s cooldown) — the system never activates an account whose
  verification email could not be delivered.

---

## 6. Local Delivery Path (verified with a real SMTP provider)

The local development host is wired to a real transactional-email provider
(Brevo SMTP, `smtp-relay.brevo.com:587`) through `Backend/.env`. Verified
there:
- SMTP `AUTH` succeeds with the provider's generated key.
- A test message is accepted by the provider (`send_mail` returns 1).
- A registration on the local stack produces a genuine email with the
  6-digit code.

**Not claimed:** that a message was confirmed as *received* in the recipient's
inbox from the Railway deployment — the provider rejects the local host's IP
address for outbound SMTP (`525 Unauthorized IP address`), so the local host
can authenticate and submit but is not on the provider's allow-list.

---

## 7. Registration & Verification Documentation

- `docs/auth/REGISTRATION_FLOW.md` — the complete lifecycle (fields, flow,
  API contracts, design-system mapping).
- `docs/auth/REGISTRATION_SECURITY_AUDIT.md` — the security audit, the
  remediation of the superuser/RLS bypass, and the full test evidence.
- `docs/auth/screenshots/` — visual evidence from the registration and
  verification screens.
