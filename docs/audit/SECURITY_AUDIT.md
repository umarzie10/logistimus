# Complete Security & Multi-Tenancy Audit (SECURITY_AUDIT.md)

- **Audit Date:** 2026-11-09
- **Auditor:** Application Security Engineer & Penetration Tester
- **Standards:** OWASP Top 10 API Security Risks (2023), CIS PostgreSQL Benchmark
- **Status:** ✅ VERIFIED & HARDENED (PASS)

---

## 1. Multi-Tenancy & Data Isolation Defense

Logistimus implements a two-tier multi-tenant isolation model:

```
Request Layer 1 (Application Level):
Django ORM `TenantManager` automatically appends `WHERE organization_id = <context_org>`
to every SELECT, UPDATE, and DELETE statement.
                │
                ▼
Request Layer 2 (Database Kernel Level):
PostgreSQL 16 Row Level Security (RLS) policy:
`ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`
`CREATE POLICY <policy> ON <table> USING (organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid);`
```

### Adversarial Penetration Test Evidence:
1. **User A reading User B's Branch:** Attacker authenticated as Organization A submits `PATCH /organizations/current/branches/<org_b_branch_id>/`.
   - **Result:** HTTP 404 Not Found (`not_found`). Target record remains untouched in database.
2. **User A deleting User B's Member:** Attacker authenticated as Organization A submits `DELETE /organizations/current/members/<org_b_member_id>/`.
   - **Result:** HTTP 404 Not Found (`not_found`).
3. **Payload Injection:** Attacker includes `{"organization_id": "<org_b_id>"}` in `POST /organizations/current/branches/`.
   - **Result:** Injected payload property is completely ignored; entity is persistently bound to Organization A from the verified token context.
4. **Query Parameter Tampering:** Attacker requests `/organizations/current/branches/?organization_id=<org_b_id>`.
   - **Result:** Ignored; only Organization A records are returned.

---

## 2. Authentication & Session Security Matrix

| Security Vector | Implementation Mechanism | Adversarial Test Verdict |
|---|---|---|
| **Access Token Theft Mitigation** | In-memory storage on frontend; never placed in `localStorage` | ✅ PASS |
| **Refresh Token Family Rotation** | Cryptographic rotation with immediate reuse detection | ✅ PASS |
| **Token Reuse Detection** | Replaying rotated refresh token revokes entire family | ✅ PASS |
| **Brute-Force Lockout** | 10 consecutive failed attempts triggers 15m lockout (HTTP 423) | ✅ PASS |
| **CSRF Defense** | State-changing cookie requests require `X-Requested-With: XMLHttpRequest` | ✅ PASS |
| **Signature Tampering** | Manipulating HMAC signature or using foreign secret key | ✅ PASS (401 Rejected) |
| **Anti-Enumeration** | Forgot password and resend verification return 202 always | ✅ PASS |
| **Single-Use Reset Tokens** | Consuming token twice rejected with `token_invalid` (400) | ✅ PASS |

---

## 3. Platform Administration (Super Admin) Isolation

- **Role Gate:** `User.PlatformRole.PLATFORM_ADMIN` required. Organization roles (`owner`, `admin`, `dispatcher`) never grant access to `/super-admin/*` or `/api/v1/platform/*`.
- **Backend Enforcement:** All `/api/v1/platform/*` endpoints protected with `IsPlatformAdmin`.
- **Frontend Route Protection:** Non-platform admins attempting to access `/super-admin` are greeted with a secure "Access Restricted" screen.
- **Penetration Test:** Organization Owner token accessing `/api/v1/platform/overview/` -> **HTTP 403 Forbidden (`platform_admin_required`)**.

---

## 4. Cryptographic Standards & Secrets Management

- **Password Hashing:** Django PBKDF2 with SHA-256 (32-byte hash).
- **HMAC Signing Key:** 64-character high-entropy secret in production and development (RFC 7518 Section 3.2 compliant).
- **API Key Storage:** Secrets are hashed using SHA-256 (`key_hash`). Plaintext secrets are shown exactly once upon creation/rotation.
- **Zero Secrets in Repository:** Audited with automated regex patterns (`sk-`, `ghp_`, `AKIA`); 0 secrets discovered.
