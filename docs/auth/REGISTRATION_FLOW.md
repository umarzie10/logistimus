# Logistimus — Registration & Email Verification Lifecycle

Comprehensive architectural and operational documentation for the Logistimus
enterprise B2B SaaS registration (Sign Up) and email verification flow.

---

## 1. Executive Overview

Logistimus implements a secure, conversion-optimized, two-step registration
experience designed specifically for multi-tenant enterprise logistics organizations:

1. **Step 1 — Administrator Account Details:**
   - First Name & Last Name (validated, sanitized)
   - Corporate Work Email (RFC 5322 regex validation, normalized lowercase)
   - Master Password (minimum 8 characters, password strength evaluation, visibility toggle)
   - Confirm Password (real-time matching verification, visibility toggle)
2. **Step 2 — Organization Profile:**
   - Company Name (minimum 2 characters, URL-safe slug auto-generation)
   - Company Type (curated logistics choices: Freight Forwarder, Logistics Company, Warehouse, Distributor, Manufacturer, Other)
   - Country of Operation (international country code & prefix selector)
   - Business Phone Number (international format validation with country code)
   - Company Website (optional URL)
   - Terms of Service & Privacy Policy Acceptance (explicit agreement)
3. **Email Verification Lifecycle:**
   - 6-digit cryptographically secure verification code (`secrets.randbelow(1_000_000)`)
   - Stored hashed at rest (`apps.accounts.models.EmailVerification.code_hash`)
   - 15-minute TTL (`apps.accounts.services.VERIFY_TTL`)
   - 60-second resend cooldown rate limit (`apps.accounts.services.COOLDOWN_SECONDS`)
   - Automatic activation upon confirmation and invitation consumption

---

## 2. Multi-Tenant Architecture & Data Flow

When a user submits the registration form, the backend executes an atomic transaction
preventing orphaned or partially created rows:

```
[Client: Step 1 + Step 2 Form]
                 │
                 ▼
         POST /api/v1/auth/register/
                 │
                 ├── 1. Email format, uniqueness check (409 if exists)
                 ├── 2. Password length (>=8) & confirmPassword match (400 if mismatch)
                 ├── 3. Company type & phone format validation
                 │
        ┌────────┴─────────────────────────────────────────┐
        │ with transaction.atomic():                       │
        │   1. User.objects.create_user(..., verified=None)│
        │   2. Organization.objects.create(...)            │
        │   3. db.set_organization_context(org.id) [RLS]   │
        │   4. Branch.objects.create(type="hq", primary)   │
        │   5. perm_services.seed_builtin_roles(org) (12)  │
        │   6. org_services.get_or_create_settings(org.id) │
        │      -> saves company_type, website, country     │
        │   7. Membership.objects.create(role="owner")     │
        │   8. EmailVerification code generated (hashed)   │
        │   9. audit.record(action="auth.registered")      │
        └──────────────────────────────────────────────────┘
                 │
                 ▼
     HTTP 201: {"verification_required": true, "email": "...", "cooldown_seconds": 60}
                 │
                 ▼
     Frontend redirects: /verify-email?email=<user_email>
                 │
                 ▼
         POST /api/v1/auth/verify-email/ {email, code}
                 │
                 ▼
     Account activated (user.email_verified_at = now)
     Pending organization invitations consumed
```

### Security & Privilege Invariants:
- The registrant is granted the organization-scoped `owner` role **only** inside their newly created tenant.
- No platform-admin or Django superuser permissions are ever assigned.
- Organization ID is generated server-side via `uuid.uuid4()`; client payloads cannot dictate or inject tenant IDs.
- RLS context is established via `db.set_organization_context(org.id)` inside the transaction.

---

## 3. Frontend UX & Design System Implementation

The registration interface strictly adheres to `Frontend/DESIGN.md`:

### 3.1 Visual Tokens Applied:
- **Ice White (`#F4FEFF`):** Background ground surface (`sky` class).
- **Royal Blue (`#0E2F76`):** Primary action buttons, active step indicator, icons, brand panel background.
- **Powder Blue (`#A9C0E0`):** Input resting borders, focus rings, secondary badges.
- **Midnight (`#061336`):** Primary headings, deep text contrast.
- **Muted Blue (`#3F5C96`):** Field labels, descriptive subtitles.
- **Danger (`#C08A88`):** Inline validation errors, duplicate email alerts.
- **Success (`#7FA9A6`):** Password strength meter, matching password badge.
- **Radius Tokens:** `--radius-card: 28px` on main container, `--radius-input: 16px` on form controls.

### 3.2 Two-Step Form Navigation:
- **Step 1:** Focuses exclusively on the administrator's credentials. User cannot proceed without resolving validation errors.
- **Step 2:** Focuses on the organization profile. User can click "Back to Account" or click Step 1 in the top indicator at any time; all entered state across both steps is preserved.
- **Show/Hide Password:** Accessible toggles with `Eye` / `EyeOff` icons on both master password and confirmation inputs.
- **Password Strength Evaluation:** Real-time scoring (Weak, Good, Strong) with visual color-coded multi-segment bars.
- **Confirmation Feedback:** Visual green checkmark when passwords match, immediate inline warning if they differ.

---

## 4. API Endpoints Specification

### 4.1 Register Account
- **Endpoint:** `POST /api/v1/auth/register/`
- **Permissions:** `AllowAny`
- **Request Body (JSON):**
  ```json
  {
    "companyName": "TransAsia Global Logistics LLC",
    "email": "admin@transasia.uz",
    "password": "SecurePassword2026!",
    "confirmPassword": "SecurePassword2026!",
    "firstName": "Alisher",
    "lastName": "Navoiy",
    "country": "Uzbekistan",
    "phone": "+998 90 123 45 67",
    "companyType": "Logistics Company",
    "website": "https://transasia.uz",
    "acceptTerms": true,
    "tier": "growth"
  }
  ```
- **Success Response (HTTP 201):**
  ```json
  {
    "verification_required": true,
    "email": "admin@transasia.uz",
    "cooldown_seconds": 60
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: `{"error": {"code": "validation_error" | "weak_password" | "password_mismatch" | "invalid_phone" | "invalid_company_type"}}`
  - `409 Conflict`: `{"error": {"code": "email_exists", "message": "An account with this email already exists."}}`

### 4.2 Verify Email
- **Endpoint:** `POST /api/v1/auth/verify-email/`
- **Permissions:** `AllowAny`
- **Request Body (JSON):**
  ```json
  {
    "email": "admin@transasia.uz",
    "code": "481920"
  }
  ```
- **Success Response (HTTP 200):**
  ```json
  {
    "verified": true,
    "joined_organizations": ["transasia-global-logistics-llc"]
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: `{"error": {"code": "invalid_code", "message": "Invalid verification code."}}`
  - `410 Gone`: `{"error": {"code": "code_expired", "message": "Verification code has expired."}}`

### 4.3 Resend Verification Code
- **Endpoint:** `POST /api/v1/auth/resend-verification/`
- **Permissions:** `AllowAny`
- **Request Body (JSON):** `{"email": "admin@transasia.uz"}`
- **Success Response (HTTP 202 Accepted):** `{"cooldown_seconds": 60}`
- **Rate Limit:** 60s cooldown per email address; max 10 requests per hour.

---

## 5. Verification & Test Evidence

### 5.1 Automated Backend Test Suite
Executed with PostgreSQL / PostGIS container:
- `Backend/tests/test_registration_redesign.py`:
  - `test_full_two_step_registration_creates_records_cleanly` — **PASS**
  - `test_password_mismatch_rejected` — **PASS**
  - `test_invalid_company_type_rejected` — **PASS**
  - `test_invalid_phone_rejected` — **PASS**
  - `test_duplicate_email_rejected_409` — **PASS**
  - `test_unverified_user_cannot_login` — **PASS**
  - `test_email_verification_activates_account` — **PASS**
- Full backend suite: **146 / 146 passed.**

### 5.2 Frontend Code Quality & Build Checks
- `npm run build`: **PASS** (31 routes compiled in 800ms)
- `npx eslint --quiet`: **0 errors**
- `npx tsc --noEmit`: **0 errors**

### 5.3 Browser QA (Playwright MCP)
Interactive visual and flow testing executed against live servers:
1. **Desktop Step 1 Viewport (1280x800):** Verified visual hierarchy, brand panel, truck asset, inputs, and password strength feedback (`signup-step1-desktop.png`).
2. **Desktop Step 2 Viewport (1280x800):** Verified comboboxes, phone formatting, terms checkbox, and button controls (`signup-step2-desktop.png`).
3. **Step 1 Validation Gate:** Verified clicking continue on empty inputs highlights required fields with accessible `aria-invalid` and inline error text.
4. **Password Matching:** Verified mismatch warning and matching checkmark feedback.
5. **State Preservation:** Confirmed advancing to Step 2 and clicking "Back to Account" preserves all entered credentials.
6. **Mobile Viewport (375x812):** Verified responsive single-column layout without horizontal scroll (`signup-mobile-375.png`).
7. **Tablet Viewport (768x1024):** Verified tablet fluid layout (`signup-tablet-768.png`).
8. **End-to-End Live Registration:** Form submitted to live API, returned 201, and redirected to `/verify-email?email=...` with 0 console errors (`verify-email-redirect.png`).
9. **Duplicate Email Handling:** Attempting registration with existing email displayed accessible error alert with direct sign-in link (`signup-duplicate-email-error.png`).
