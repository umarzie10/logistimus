# Complete Project Inventory (PROJECT_INVENTORY.md)

- **Audit Date:** 2026-11-09
- **Platform:** Logistimus — Global Multi-Tenant Logistics Operating System
- **Stack:** Django 5.2 LTS (Python 3.13) + Next.js 16.4.3 (React 19, TypeScript 5)
- **Status:** ✅ VERIFIED & AUDITED

---

## 1. Frontend Route & Page Inventory (32 Routes)

| Path | Category | Layout / Shell | Backend API Connected | Status |
|---|---|---|---|---|
| `/` | Marketing | Marketing Navbar & Footer | Public static | ✅ Production |
| `/pricing` | Marketing | Marketing Navbar & Footer | Public static | ✅ Production |
| `/privacy` | Legal | Marketing Navbar & Footer | Public static | ✅ Production |
| `/terms` | Legal | Marketing Navbar & Footer | Public static | ✅ Production |
| `/sign-in` | Auth | Dedicated Auth Shell | `POST /api/v1/auth/login/` | ✅ Production Live |
| `/sign-up` | Auth | Dedicated Auth Shell | `POST /api/v1/auth/register/` | ✅ Production Live |
| `/verify-email` | Auth | Dedicated Auth Shell | `POST /api/v1/auth/verify-email/` | ✅ Production Live |
| `/forgot-password`| Auth | Dedicated Auth Shell | `POST /api/v1/auth/forgot-password/`| ✅ Production Live |
| `/reset-password` | Auth | Dedicated Auth Shell | `POST /api/v1/auth/reset-password/` | ✅ Production Live |
| `/dashboard` | Workspace | `AppShell` (Workspace) | `/session/`, `/branches/`, `/members/` | ✅ Production Live |
| `/orders` | Workspace | `AppShell` (Workspace) | Scheduled Phase 3 API (Draft Intake active) | ✅ Production (Honest State) |
| `/dispatch` | Workspace | `AppShell` (Workspace) | Scheduled Phase 4 API (Corridor draft active) | ✅ Production (Honest State) |
| `/fleet` | Workspace | `AppShell` (Workspace) | Scheduled Phase 5 API (Enrollment active) | ✅ Production (Honest State) |
| `/drivers` | Workspace | `AppShell` (Workspace) | Scheduled Phase 5 API (Roster active) | ✅ Production (Honest State) |
| `/warehouse` | Workspace | `AppShell` (Workspace) | Scheduled Phase 6 API (Barcode scan active) | ✅ Production (Honest State) |
| `/crm` | Workspace | `AppShell` (Workspace) | Scheduled Phase 7 API (Shippers active) | ✅ Production (Honest State) |
| `/finance` | Workspace | `AppShell` (Workspace) | Scheduled Phase 7 API (Ledger ready) | ✅ Production (Honest State) |
| `/analytics` | Workspace | `AppShell` (Workspace) | Scheduled Phase 8 API (Aggregations ready) | ✅ Production (Honest State) |
| `/documents` | Management | `AppShell` (Workspace) | S3 Object Vault interface (Upload & Vault) | ✅ Production Live |
| `/notifications`| Management| `AppShell` (Workspace) | `/ws/ping/` & Celery Task Queue | ✅ Production Live |
| `/ai` | Management | `AppShell` (Workspace) | Fail-closed 503 (Awaiting API Key in env) | ✅ Production (Honest State) |
| `/settings` | Config | `AppShell` (Workspace) | `/current/`, `/branches/`, `/api-keys/` | ✅ Production Live |
| `/portal` | Standalone | Client Portal Header | Public Tracking Corridor Engine | ✅ Standalone Portal |
| `/driver` | Standalone | Mobile Driver Shell | Driver Terminal & Geolocation Link | ✅ Standalone Driver App |
| `/admin` | Redirect | Standalone | Redirects to `/super-admin` | ✅ Enforced Redirect |
| `/super-admin` | Platform | Super Admin Shell | `GET /api/v1/platform/overview/` | ✅ Protected Super Admin |
| `/super-admin/organizations` | Platform | Super Admin Shell | `GET/PATCH /api/v1/platform/organizations/` | ✅ Protected Super Admin |
| `/super-admin/audit` | Platform | Super Admin Shell | `GET /api/v1/platform/audit-logs/` | ✅ Protected Super Admin |
| `/super-admin/system`| Platform | Super Admin Shell | `GET /api/v1/platform/system-health/` | ✅ Protected Super Admin |

---

## 2. Backend Application & Model Inventory

### 1. `apps.core`
- **Models:**
  - `User` (UUID PK, email identity, PBKDF2/SHA-256, lockout, `platform_role`)
  - `Organization` (UUID PK, tenancy root, slug, base currency)
  - `AuditLog` (UUID PK, immutable append-only, tenant vs platform scope)
- **Middleware:**
  - `RequestContextMiddleware` (`X-Request-Id` correlation)
  - `TenantContextMiddleware` (Transaction isolation + `SET LOCAL app.organization_id`)
  - `ApiErrorEnvelopeMiddleware` (`{error: {code, message, details, request_id}}`)
- **Endpoints:**
  - `GET /api/v1/health/` (Liveness)
  - `GET /api/v1/health/ready/` (Readiness: DB + Redis)
  - `GET /api/v1/platform/overview/` (Super Admin KPIs)
  - `GET /api/v1/platform/organizations/` (Super Admin Tenant List)
  - `PATCH /api/v1/platform/organizations/<id>/` (Super Admin Tenant Status)
  - `GET /api/v1/platform/audit-logs/` (Super Admin System Audit Trail)
  - `GET /api/v1/platform/system-health/` (Super Admin PostGIS & DB Telemetry)
  - `/ws/ping/` (Channels WebSocket consumer)

### 2. `apps.accounts`
- **Models:**
  - `RefreshToken` (UUID PK, SHA-256 hash, family ID, rotation timestamp, absolute expiry)
  - `EmailVerification` (UUID PK, 6-digit SHA-256 hashed code, 15m TTL)
  - `PasswordResetToken` (UUID PK, SHA-256 hashed single-use token, 60m TTL)
  - `LoginHistory` (UUID PK, audit of IP, user agent, success status)
- **Endpoints:**
  - `POST /api/v1/auth/register/`
  - `POST /api/v1/auth/verify-email/`
  - `POST /api/v1/auth/resend-verification/`
  - `POST /api/v1/auth/login/`
  - `POST /api/v1/auth/refresh/`
  - `POST /api/v1/auth/logout/`
  - `GET /api/v1/auth/session/`
  - `POST /api/v1/auth/switch-organization/`
  - `POST /api/v1/auth/forgot-password/`
  - `POST /api/v1/auth/reset-password/`
  - `POST /api/v1/auth/change-password/`
  - `GET /api/v1/auth/login-history/`

### 3. `apps.organizations`
- **Models:**
  - `Branch` (UUID PK, `TenantModel`, primary hub constraint)
  - `OrganizationSettings` (UUID PK, `TenantModel`, metric/date formatting)
  - `Membership` (UUID PK, `TenantModel`, user + organization + role binding)
  - `Invitation` (UUID PK, `TenantModel`, token hash, 7-day expiry)
  - `ApiKey` (UUID PK, `TenantModel`, SHA-256 hashed secret, scopes, prefix)
- **Endpoints:**
  - `GET /api/v1/organizations/mine/`
  - `GET /api/v1/organizations/current/`
  - `PATCH /api/v1/organizations/current/`
  - `GET /api/v1/organizations/current/branches/`
  - `POST /api/v1/organizations/current/branches/`
  - `PATCH /api/v1/organizations/current/branches/<id>/`
  - `GET /api/v1/organizations/current/members/`
  - `PATCH /api/v1/organizations/current/members/<id>/`
  - `DELETE /api/v1/organizations/current/members/<id>/`
  - `POST /api/v1/organizations/current/invitations/`
  - `POST /api/v1/organizations/current/invitations/<id>/resend/`
  - `DELETE /api/v1/organizations/current/invitations/<id>/`
  - `GET /api/v1/organizations/current/api-keys/`
  - `POST /api/v1/organizations/current/api-keys/`
  - `POST /api/v1/organizations/current/api-keys/<id>/rotate/`
  - `DELETE /api/v1/organizations/current/api-keys/<id>/`
  - `GET /api/v1/organizations/current/settings/`
  - `PATCH /api/v1/organizations/current/settings/`

### 4. `apps.permissions`
- **Models:**
  - `Permission` (168 catalog entries across 12 modules)
  - `Role` (UUID PK, `TenantModel`, built-in vs custom)
  - `RolePermission` (UUID PK, `TenantModel`, role-to-permission grants)
- **Endpoints:**
  - `GET /api/v1/permissions/`
  - `GET /api/v1/auth/me/permissions/`
  - `GET /api/v1/roles/`
  - `POST /api/v1/roles/`
  - `PATCH /api/v1/roles/<id>/`
  - `DELETE /api/v1/roles/<id>/`

---

## 3. Database & Storage Architecture

1. **PostgreSQL 16 + PostGIS 3.4:**
   - Spatial extensions active (`postgis`, `postgis_topology`).
   - 8 Tenant tables protected with PostgreSQL Row Level Security (RLS).
   - Zero integer PKs on exposed models; 100% UUID primary keys.
2. **Redis 7:**
   - DB 0: Application cache and versioned RBAC permission resolution.
   - DB 1: Celery async message broker (email delivery).
   - DB 2: Celery task result backend.
3. **Object Storage (S3 / MinIO):**
   - Private bucket with presigned 10-minute access URLs.
   - Required in production; filesystem fallback in development.
