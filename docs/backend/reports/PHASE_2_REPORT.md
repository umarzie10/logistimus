# Phase 2 Report — RBAC, Multi-tenancy, Auth, and Organizations

- **Status:** ✅ PASS
- **Date:** 2026-11-09
- **Domain:** Backend + Frontend Auth Integration

---

## 1. Executive Summary

Phase 2 establishes the core authentication, authorization, multi-tenancy, and organization governance foundations for Logistimus:
1. **Multi-Tenancy & Data Isolation** — Shared-schema multi-tenancy with PostgreSQL Row Level Security (RLS) policies, server-controlled tenant context via `TenantContextMiddleware` and `ContextVars`, and UUID primary keys on all tenant-scoped entities.
2. **Authentication & Session Lifecycle** — 15-minute stateless JWT access tokens kept in SPA memory, paired with HttpOnly 30-day refresh tokens featuring automatic token rotation, cryptographic family tracking, and immediate reuse-detection revocation.
3. **Role-Based Access Control (RBAC)** — Granular catalog of 168 permissions across 12 operational modules, 7 built-in immutable roles (`owner`, `admin`, `dispatcher`, `accountant`, `warehouse_manager`, `driver`, `customer`), custom role creation/modification with cached Redis permission resolution.
4. **Organization & Team Governance** — Multiple workspaces per user, primary branch management, team invitations via async Celery emails, API key issuance with SHA-256 hashed storage, and a strict "last owner" retention guard.
5. **OpenAPI 3.0.3 Contract** — Self-documenting views with `@extend_schema`, custom `JWTAuthenticationExtension`, and a fully validated schema export (`docs/backend/openapi-v1.yaml`) with 0 errors and 0 warnings.
6. **Frontend Integration** — Centralized TypeScript API client (`Frontend/src/lib/api.ts`) wired to real backend endpoints for `/sign-in`, `/sign-up`, `/verify-email`, `/forgot-password`, and `/reset-password`.

---

## 2. Implemented Architecture & Modules

### `apps.accounts` — Authentication & User Sessions
- **Models:**
  - `User` — Email-first identity (`AbstractBaseUser`, UUID pk, lockouts, verification timestamp).
  - `RefreshToken` — Cryptographic hash storage, family identifier, rotation timestamps, absolute 30-day expiry.
  - `EmailVerification` — 6-digit verification code (SHA-256 hashed at rest), 15-minute TTL, 60-second resend cooldown.
  - `PasswordResetToken` — High-entropy token (SHA-256 hashed at rest), 1-hour TTL, revokes active refresh families on use.
  - `LoginHistory` — Audit trail recording IP, user agent, success/failure status, and failure reason.
- **Security Defenses:**
  - Rate limiting: DRF IP throttle (5/min) + cache-backed per-email throttle (10/15min).
  - Account lockout: Automatic temporary lockout for 15 minutes after 10 consecutive failed attempts.
  - Anti-enumeration: Forgot password and resend verification always answer `202 Accepted`.
  - CSRF defense: Mutating cookie endpoints (`/refresh/`, `/logout/`, `/switch-organization/`) require custom header `X-Requested-With: XMLHttpRequest`.

### `apps.permissions` — Granular RBAC
- **Catalog:**
  - 168 discrete permissions across 12 modules (`org`, `users`, `fleet`, `orders`, `dispatch`, `finance`, `analytics`, `warehouse`, `crm`, `driver`, `ai`, `compliance`).
  - Seeded into database via migration `0003_seed_catalog.py`.
- **Roles:**
  - Built-in roles flagged with `is_builtin=True` (cannot be deleted or renamed).
  - Custom roles per organization with assignable catalog permissions.
  - Role permission lookup cached in Redis (`roles:effective:{org_id}:{role_name}`) and automatically invalidated on grant edits or member role changes.

### `apps.organizations` — Tenancy & Workspace Operations
- **Models:**
  - `Organization` — Tenancy root, slug, base currency, active status.
  - `Membership` — User-to-organization join with role binding and active/suspended status.
  - `Branch` — Physical facility / depot with single `is_primary` constraint per tenant.
  - `OrganizationSettings` — Operational defaults (locale, timezone, currency, metrics).
  - `Invitation` — Token-hashed invitation with 7-day TTL and email dispatch.
  - `ApiKey` — Scoped machine access with truncated prefix display and secret returned once on creation/rotation.
- **Safety Guards:**
  - `last_owner` guard: Prevents demoting or deleting the last active owner of an organization.
  - Cross-tenant access: Model querysets scoped via `TenantManager` return 404 for alien tenant IDs.

### `apps.core.openapi` — OpenAPI Schema Engine
- `JWTAuthenticationExtension`: Registers `jwtAuth` bearer scheme in drf-spectacular.
- Decorated all views across `accounts`, `organizations`, `permissions`, and `health` with `@extend_schema`.
- Exported valid OpenAPI 3.0.3 specification to `docs/backend/openapi-v1.yaml` (52 KB).

### `Frontend/src/lib/api.ts` — Centralized API Client
- In-memory bearer access token storage to guard against XSS storage scraping.
- Automatic inclusion of `X-Requested-With: XMLHttpRequest` header.
- `credentials: "include"` for HttpOnly cookie exchange.
- Unified `ApiError` class parsing `{ error: { code, message, details, request_id } }`.
- Typed methods covering all authentication and organization operations.

---

## 3. API Endpoints Delivered

| Module | Method | Path | Auth / Permission | Description |
|---|---|---|---|---|
| **Health** | GET | `/api/v1/health/` | Public | Liveness probe (200 always) |
| **Health** | GET | `/api/v1/health/ready/` | Public | Readiness probe (DB + Redis check) |
| **Auth** | POST | `/api/v1/auth/register/` | Public | Create user, org, and owner membership |
| **Auth** | POST | `/api/v1/auth/verify-email/` | Public | Confirm 6-digit code, activate account |
| **Auth** | POST | `/api/v1/auth/resend-verification/` | Public | Resend verification code (60s cooldown) |
| **Auth** | POST | `/api/v1/auth/login/` | Public | Authenticate, return access token + cookie |
| **Auth** | POST | `/api/v1/auth/refresh/` | Cookie + XHR | Rotate refresh token and access token |
| **Auth** | POST | `/api/v1/auth/logout/` | Cookie + XHR | Revoke refresh family and clear cookie |
| **Auth** | GET | `/api/v1/auth/session/` | Public / Cookie | Read session profile, re-issue access token |
| **Auth** | POST | `/api/v1/auth/switch-organization/` | Bearer + XHR | Switch active tenant, issue new tokens |
| **Auth** | POST | `/api/v1/auth/forgot-password/` | Public | Trigger password reset link |
| **Auth** | POST | `/api/v1/auth/reset-password/` | Public | Reset password with token, revoke sessions |
| **Auth** | POST | `/api/v1/auth/change-password/` | Bearer | Change password, revoke other sessions |
| **Auth** | GET | `/api/v1/auth/login-history/` | Bearer | Paginated login attempts of current user |
| **Orgs** | GET | `/api/v1/organizations/mine/` | Bearer | Workspaces available for sidebar switcher |
| **Orgs** | GET | `/api/v1/organizations/current/` | Member | Active organization details |
| **Orgs** | PATCH | `/api/v1/organizations/current/` | `org.organization.change` | Update active organization profile |
| **Orgs** | GET | `/api/v1/organizations/current/settings/` | Member | Read organization operational settings |
| **Orgs** | PATCH | `/api/v1/organizations/current/settings/` | `org.settings.change` | Update organization operational settings |
| **Orgs** | GET | `/api/v1/organizations/current/branches/` | Member | List organization branches |
| **Orgs** | POST | `/api/v1/organizations/current/branches/` | `org.branch.create` | Create organization branch |
| **Orgs** | PATCH | `/api/v1/organizations/current/branches/{id}/` | `org.branch.change` | Update organization branch |
| **Orgs** | GET | `/api/v1/organizations/current/members/` | `users.member.view` | Paginated member list with role filter |
| **Orgs** | PATCH | `/api/v1/organizations/current/members/{user_id}/` | `users.member.change` | Update member role |
| **Orgs** | DELETE | `/api/v1/organizations/current/members/{user_id}/` | `users.member.delete` | Remove member from organization |
| **Orgs** | POST | `/api/v1/organizations/current/invitations/` | `users.invitation.create` | Invite member by email and role |
| **Orgs** | POST | `/api/v1/organizations/current/invitations/{id}/resend/` | `users.invitation.create` | Resend invitation email |
| **Orgs** | DELETE | `/api/v1/organizations/current/invitations/{id}/` | `users.invitation.delete` | Revoke invitation |
| **Orgs** | GET | `/api/v1/organizations/current/api-keys/` | `org.apikey.view` | List active and revoked API keys |
| **Orgs** | POST | `/api/v1/organizations/current/api-keys/` | `org.apikey.create` | Create API key (reveals secret once) |
| **Orgs** | POST | `/api/v1/organizations/current/api-keys/{id}/rotate/` | `org.apikey.change` | Rotate key secret (reveals once) |
| **Orgs** | DELETE | `/api/v1/organizations/current/api-keys/{id}/` | `org.apikey.delete` | Revoke API key |
| **RBAC** | GET | `/api/v1/permissions/catalog/` | `org.permission.view` | Full catalog grouped by module |
| **RBAC** | GET | `/api/v1/permissions/me/` | Bearer | Current user's effective permissions |
| **RBAC** | GET | `/api/v1/roles/` | `org.role.view` | List built-in and custom roles |
| **RBAC** | POST | `/api/v1/roles/` | `org.role.create` | Create custom role with permissions |
| **RBAC** | PATCH | `/api/v1/roles/{id}/` | `org.role.change` | Update custom role label/permissions |
| **RBAC** | DELETE | `/api/v1/roles/{id}/` | `org.role.delete` | Delete custom role (if not assigned) |

---

## 4. Database Migrations

- `accounts.0001_initial`: RefreshToken, EmailVerification, PasswordResetToken, LoginHistory.
- `organizations.0001_initial`: Branch, OrganizationSettings, Membership, Invitation, ApiKey.
- `permissions.0001_initial`: Permission, Role, RolePermission.
- `permissions.0002_initial_roles`: Seed built-in roles (`owner`, `admin`, `dispatcher`, etc.).
- `permissions.0003_seed_catalog`: Seed 168 permissions across 12 modules.

---

## 5. Verification & Test Evidence

### Backend Pytest Suite
```
Platform: Linux, Python 3.13.15, Django 5.2a1, PostgreSQL 16 PostGIS
Database: postgresql://logistimus:logistimus-dev@localhost:5432/logistimus_test

tests/test_core_phase1.py        20 passed
tests/test_accounts_phase2.py    32 passed
tests/test_rbac_phase2.py        24 passed
tests/test_rls_postgres.py        6 passed (RLS tenant isolation & transaction guards)

======================= 76 passed, 125 warnings in 6.36s =======================
```

### OpenAPI 3.0.3 Schema Generation
```
uv run manage.py spectacular --validate --file docs/backend/openapi-v1.yaml
Schema generation summary:
Warnings: 0 (0 unique)
Errors:   0 (0 unique)
Result: docs/backend/openapi-v1.yaml (52 KB)
```

### Frontend Next.js Production Build
```
cd Frontend && npm run build
▲ Next.js 16.4.3 (Turbopack)
✓ Compiled successfully in 979ms
✓ Running TypeScript check passed
✓ Generated 27 static routes
```

---

## 6. Definition of Done Checklist

- [x] Shared-schema multi-tenancy enforced with server-side context and RLS policies.
- [x] UUID primary keys on all externally exposed tables and tenant models.
- [x] Full RBAC engine with catalog permissions, built-in roles, and custom role editor.
- [x] Refresh token rotation with reuse detection and instant family revocation.
- [x] Anti-brute-force rate limiting and 15-minute account lockout after 10 failed attempts.
- [x] Last owner deletion/demotion guard enforcing organization continuity.
- [x] OpenAPI 3.0.3 specification generated cleanly with 0 errors and 0 warnings.
- [x] Frontend authentication pages wired to backend API via `@/lib/api`.
- [x] Full test suite (76/76) passing against PostgreSQL.
