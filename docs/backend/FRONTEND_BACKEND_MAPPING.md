# Logistimus — Frontend ↔ Backend Mapping

Status: **Phase 0 deliverable** · Source: audit of `Frontend/src` (50 files, 26 routes) · Framework: Next.js 16.4.3, React 19.3, Tailwind v4, no API client, no auth provider, no data fetching anywhere.

This document connects, for every frontend surface:

**Frontend Page → UI Component → User Action → API Endpoint → Backend Module → Database Model**

Conventions used throughout the backend:

- All endpoints are versioned under `/api/v1/`.
- Every tenant-owned row carries `organization_id` (UUID). The server resolves it from the authenticated session, never from the request body/query.
- IDs exposed to clients are UUIDs. Human-readable references (`ORD-24101`, `INV-2026-0881`, `SKU-9921`) are generated server-side per tenant with a unique constraint.
- Timestamps are ISO 8601 with timezone. Money is `Decimal` + `currency` (ISO 4217).

Legend for `Auth`: `Public` · `Authenticated` · `Member` (org-scoped) · `Role:<x>` · `Portal:customer` · `Portal:driver` · `PlatformAdmin`.

---

## 1. Summary matrix

| # | Frontend route | Frontend file | Primary user actions | Backend module | Key endpoints |
|---|---|---|---|---|---|
| 1 | `/sign-in` | `app/sign-in/page.tsx` | Login | `accounts` | `POST /auth/login`, `POST /auth/logout`, `GET /auth/session` |
| 2 | `/sign-up` | `app/sign-up/page.tsx` | Register company workspace | `accounts`, `organizations`, `subscriptions` | `POST /auth/register` |
| 3 | `/verify-email` | `app/verify-email/page.tsx` | 6-digit code verify, resend | `accounts` | `POST /auth/verify-email`, `POST /auth/resend-verification` |
| 4 | `/forgot-password` | `app/forgot-password/page.tsx` | Request reset link | `accounts` | `POST /auth/forgot-password` |
| 5 | `/reset-password` | `app/reset-password/page.tsx` | Set new password (≥8, match) | `accounts` | `POST /auth/reset-password` |
| 6 | `/dashboard` | `app/dashboard/page.tsx` | KPI view, refresh map, navigate | `analytics`, `orders`, `fleet`, `tracking` | `GET /analytics/dashboard`, `GET /orders/`, `GET /tracking/live` |
| 7 | `/orders` | `app/orders/page.tsx` | Search, filter status, export CSV, view detail, create order | `orders`, `shipments` | `GET/POST /orders/`, `GET /orders/{id}/`, `POST /orders/{id}/status` |
| 8 | `/dispatch` | `app/dispatch/page.tsx` | Assign route+driver+vehicle, apply AI route suggestion | `dispatch`, `routing` | `GET/POST /dispatch/board`, `POST /dispatch/assignments`, `POST /routing/suggestions/{id}/apply` |
| 9 | `/fleet` | `app/fleet/page.tsx` | Inspect telematics modal | `fleet`, `tracking` | `GET /fleet/vehicles/`, `GET /fleet/vehicles/{id}/telemetry/` |
| 10 | `/drivers` | `app/drivers/page.tsx` | View ELD logbook modal | `drivers` | `GET /drivers/`, `GET /drivers/{id}/logbook/` |
| 11 | `/warehouse` | `app/warehouse/page.tsx` | Scan barcode, register pallet/stock, dock view | `warehouses`, `inventory` | `GET/POST /inventory/items/`, `GET /warehouses/{id}/docks/` |
| 12 | `/crm` | `app/crm/page.tsx` | Add customer (validated), view account ledger | `crm` | `GET/POST /crm/customers/`, `GET /crm/customers/{id}/ledger/` |
| 13 | `/finance` | `app/finance/page.tsx` | KPI view, invoice list, export CSV | `finance` | `GET /finance/invoices/`, `GET /finance/kpis/` |
| 14 | `/analytics` | `app/analytics/page.tsx` | SLA/fuel report, download audit report | `analytics` | `GET /analytics/sla/`, `GET /analytics/fuel/`, `GET /analytics/report/` |
| 15 | `/ai` | `app/ai/page.tsx` | Chat with assistant, receive recommendation | `ai_assistant` | `POST /ai/chat/`, `GET /ai/conversations/` |
| 16 | `/notifications` | `app/notifications/page.tsx` | Filter, mark read, mark all read, clear | `notifications` | `GET/DELETE /notifications/`, `POST /notifications/{id}/read` |
| 17 | `/settings` | `app/settings/page.tsx` | Edit org profile, rotate API key | `organizations`, `integrations` | `GET/PATCH /organizations/current/`, `POST /organizations/api-keys/{id}/rotate/` |
| 18 | `/admin` | `app/admin/page.tsx` | Platform stats, tenant list | `super_admin` | `GET /super-admin/platform-stats/`, `GET /super-admin/organizations/` |
| 19 | `/portal` | `app/portal/page.tsx` | Public tracking lookup, timeline | `customer_portal` (public track) | `GET /shipments/track/?ref=` |
| 20 | `/driver` | `app/driver/page.tsx` | Current trip, GPS toggle, POD signature | `driver_portal`, `tracking` | `GET /driver-portal/trip/current/`, `POST .../pod/` |
| 21 | `/pricing` | `app/pricing/page.tsx` | Tier toggle, CTA → `/sign-up?tier=` | `subscriptions` | `GET /subscriptions/plans/` (CTA consumes `tier`) |
| 22 | `AppSidebar` | `components/app/AppSidebar.tsx` | Nav, workspace switch, badges | `organizations`, `notifications`, `analytics` | `GET /organizations/`, `GET /notifications/?unread=1`, `GET /analytics/nav-badges/` |
| 23 | `AppHeader` | `components/app/AppHeader.tsx` | Search, notification dropdown, user chip | `accounts`, `notifications`, core search | `GET /auth/session`, `GET /notifications/`, `GET /search/?q=` |
| 24 | `/` marketing | `app/page.tsx` + `components/marketing/*` | CTAs to `/sign-up`, `/dashboard`, `/portal`, `/pricing` | none (static) | — |
| 25 | `/privacy`, `/terms` | static | none | none | — |
| 26 | `/platform` | linked from `EcosystemSection` — **route does not exist** (404) | none | none | either add page later or drop the link (frontend change, out of backend scope) |

---

## 2. Detailed mappings

### 2.1 Authentication (`/sign-in`, `/sign-up`, `/verify-email`, `/forgot-password`, `/reset-password`)

#### `/sign-in`

| Layer | Detail |
|---|---|
| UI component | `SignInPage`: `email` (type=email, required), `password` (required, show/hide toggle), `rememberDevice` checkbox "Remember this device (30 days)", submit "Sign In to Workspace" |
| Validation | browser-native email + required only. Password min length enforced **server-side** (backend is source of truth) |
| User action | submit → loading state → redirect `/dashboard` |
| Currently does | `setTimeout(600)` then `router.push("/dashboard")` — no API call, prefilled demo values `alisher@logistimus.com` |
| API | `POST /api/v1/auth/login` `{email, password, rememberDevice}` → `200 {access, refresh_expires_in, user, organization, memberships[]}` · `401 invalid_credentials` · `403 email_not_verified` · `423 locked` · `429 rate_limited` |
| Session restore | `GET /api/v1/auth/session` → current user, active org, memberships, role, permissions |
| Logout | `POST /api/v1/auth/logout` (revokes refresh family) |
| Module | `accounts` |
| Models | `User`, `EmailVerification`, `PasswordResetToken`, `LoginHistory`, `RefreshToken` (rotation + revocation), `AccountLockout` counters |

Token strategy (decided): **refresh token in `httpOnly; SameSite=Lax; Secure` cookie** (30d when `rememberDevice`, else 12h), **short-lived JWT access token (15 min) held in memory** by the frontend API client, refreshed silently via `POST /auth/refresh`. The access token carries `sub` and `org` claims; `org` is set by the server from the user's active membership.

#### `/sign-up`

| Layer | Detail |
|---|---|
| Form fields | companyName (req), fleetSize (select: `10 – 50 / 50 – 200 / 200 – 1,000 / 1,000+ Vehicles`), adminFullName (req), businessPhone (req, `+998 90 123 45 67`), email (req), password (req, hint "Minimum 8 characters with numbers"), terms checkbox (req) |
| Query param | `?tier=starter\|growth\|enterprise` from pricing page → must select the plan for the new org's trial |
| API | `POST /api/v1/auth/register` `{companyName, fleetSize, adminFullName, businessPhone, email, password, acceptTerms, tier}` → `201 {verificationChallenge: "email", email}` then `POST /auth/verify-email` |
| Server behavior | creates `User` (role `owner`), `Organization` (name, fleet_size_band, verification_status=pending), `Membership`, `Subscription` (plan from `tier`, `trial_ends_at = now + 14d`), default `Branch` (from companyName/`HQ`), email verification code (6-digit, 15 min TTL, rate-limited) |
| Duplicate email | `409 email_exists` |
| Module | `accounts`, `organizations`, `subscriptions` |
| Models | `User`, `Organization`, `OrganizationMembership`, `Branch`, `Subscription`, `Plan` |

#### `/verify-email`

| Layer | Detail |
|---|---|
| UI | 6 single-char numeric inputs with auto-advance; "Confirm Authorization"; "Resend Code" (cooldown) |
| API | `POST /api/v1/auth/verify-email` `{email, code}` → `200 {access, refresh...}` after marking `email_verified_at` · `400 invalid_code` · `410 code_expired` |
| Resend | `POST /api/v1/auth/resend-verification` `{email}` → always `202` (enumeration-safe), cooldown 60s, max 5/hour |
| Models | `EmailVerification` |

#### `/forgot-password` and `/reset-password`

| Layer | Detail |
|---|---|
| Forgot form | `email` required → success panel echoing the address |
| API | `POST /api/v1/auth/forgot-password` `{email}` → always `202` regardless of existence; dispatches one-time token (TTL 60 min) to Celery email task |
| Reset form | `password` (≥8 checked client-side), `confirmPassword` (must match), error banner `role="alert"` |
| Gap to close | reset page reads **no** `?token=` today. Backend issues `token` in the email link → `/reset-password?token=...`; frontend must read it (small, allowed integration change) |
| API | `POST /api/v1/auth/reset-password` `{token, password}` → `200`, revokes **all** refresh tokens for the user · `410 token_expired` |
| Models | `PasswordResetToken` (single use, hashed), `RefreshToken` |

---

### 2.2 `/dashboard` — Operations Dashboard

| UI component | Data today (hardcoded) | Backend endpoint | Model(s) |
|---|---|---|---|
| KPI row `STATS` | Active Orders `1,284` (+12%), In Transit `362` (+8%), On-Time Rate `96.4%` (+2.1%), Fleet Utilization `87%` (+3.4%) | `GET /api/v1/analytics/dashboard/?period=week` → `{metrics:[{key,label,value,change_pct,is_up}]}` | aggregate over `Order`, `Shipment`, `Vehicle` |
| Live Fleet Map (SVG) + refresh button | static corridors; legend `Moving (284) / Delayed (14) / Depot (64)`; "Live"/"Updated HH:MM:SS" chip | `GET /api/v1/tracking/live/` → `{summary:{moving,delayed,at_depot}, vehicles:[{vehicle_id, ref, lat,lng, status, last_seen}]}`; WebSocket `ws://…/ws/tracking/?token=` pushes deltas. Refresh button invalidates the query. | `VehicleLocation`, `Vehicle` |
| Fleet Status card | 4 rows `{id, loc, status}`; "View all (362)"; avg speed `68 km/h`; fuel `29.2 L/100km` | `GET /api/v1/fleet/vehicles/?status=&page_size=4&ordering=-last_seen` and `GET /api/v1/analytics/fleet-summary/` | `Vehicle`, `VehicleLocation`, `FuelRecord` |
| Active Orders table | `{id, customer, route, status, eta}` × 4 | `GET /api/v1/orders/?status=active&page_size=5` | `Order`, `OrderStatusHistory` |
| Live Activity feed | 4 events `{icon,title,time,detail}` | `GET /api/v1/notifications/?type=activity&page_size=5` (or WebSocket `activity` group) | `Notification`, `ActivityLog` |
| Workspace subtitle | `Workspace demo-logistimus` | from `GET /auth/session` → `organization.slug` | `Organization` |

Module: `analytics` (aggregation), `tracking` (live), `orders`, `fleet`, `notifications`.
**Hard rule:** no dashboard metric may be hardcoded — every number is computed from tenant-scoped rows.

---

### 2.3 `/orders` — Order Management

**Interface (frontend source of truth for the serializer):**

```ts
interface Order {
  id: string;            // ref, e.g. "ORD-24101"
  customer: string;
  cargo: string;
  weight: string;        // display "14,200 kg" → backend: weight_kg Decimal + unit
  origin: string;
  destination: string;
  driver: string;        // "Akmal Saidov (TRK-01)" → backend: driver {name} + vehicle {ref}
  status: "In transit" | "Delivered" | "Loading" | "Delayed" | "Draft";
  created: string;       // "Today, 06:30" → backend created_at, frontend formats
  eta: string;           // "Today, 14:30" → backend eta_at
}
```

| Action | UI | Endpoint | Notes |
|---|---|---|---|
| List + search | search box (id, customer, origin, destination), status select (`all/in transit/delivered/loading/delayed`) | `GET /api/v1/orders/?search=&status=&page=&page_size=&ordering=` | Server-side filtering/pagination replaces the client-side `filter()` |
| Row detail | `Eye` → right drawer with cargo, weight, transport, origin→destination, ETA | `GET /api/v1/orders/{uuid}/` | detail payload includes `history[]`, `documents[]`, `notes[]` |
| Create | "Create New Order" modal: Customer Name, Origin City, Destination City, Cargo Details & Weight (kg) → "Confirm & Dispatch" | `POST /api/v1/orders/` `{customer_id?|customer_name, origin, destination, cargo_description, weight_kg}` → `201` | validation: required fields, `weight_kg > 0`; generates `ref` `ORD-<seq>` scoped to org; `409 ref_collision` impossible (sequence per org) |
| Export CSV | `toCsv` + `downloadTextFile("orders-export.csv")` | keep client-side (already honest) or `GET /api/v1/orders/export/?format=csv` when rows exceed page size | client-side export stays for ≤1 page; server export added for full data |
| Status change | not present yet in UI (status only displayed) | `POST /api/v1/orders/{id}/status/` `{status, note?}` with validated transition table | transition validation lives in the service layer |

**Status machine (backend-owned):**

```
Draft → Loading → In transit → Delivered
   ↘ Cancelled (from Draft/Loading)
In transit → Delayed → In transit (recovery) → Delivered
Delayed → Cancelled
```

Invalid transition → `409 invalid_transition` `{allowed_from:[…]}`.

**Models:** `Order`, `OrderItem`, `OrderStatusHistory`, `OrderNote`, `Address` (pickup/delivery), `Customer` (FK).

**Module:** `orders` (+ `shipments` for tracking legs; the frontend currently uses one concept — `Order` is the aggregate, `Shipment` represents its transport legs and is surfaced by the tracking endpoints).

---

### 2.4 `/dispatch` — Dispatch Board

| UI | Action | Endpoint | Model |
|---|---|---|---|
| 4 KPIs: Active Dispatches `48` (44 on-time / 4 delayed), Available Vehicles `84`, Corridor Efficiency `94.8%` (+1.8%), Avg Fuel `28.9 L` | read | `GET /api/v1/dispatch/stats/` | aggregate over `Dispatch`, `Vehicle`, `FuelRecord` |
| "Active Highway Corridors" cards `DispatchLane {id, lane, dist, duration, vehicle, driver, cargo, status, progress, statusColor}` | read | `GET /api/v1/dispatch/board/?status=&page=` | `Dispatch` |
| "Assign New Route" → modal: select driver+truck (`AVAILABLE_DRIVERS`), select corridor (3 lanes), cargo text | submit "Confirm Assignment" | `POST /api/v1/dispatch/assignments/` `{driver_id, vehicle_id, route_id, cargo_description}` → `201 Dispatch` | `Dispatch`, `DispatchStop`, `Route` |
| "Apply Suggested Route" toggle (`saving 42 km`) | click | `GET /api/v1/routing/suggestions/` then `POST /api/v1/routing/suggestions/{id}/apply/` | `RouteSuggestion` |
| Driver pool panel `{name, vehicle, location, status}` | read | `GET /api/v1/drivers/?availability=available` | `Driver` |

**Corridor (lane) templates** are tenant-owned `Route` rows (origin/destination names, `distance_km`, `duration_min`), not literals in the frontend. Distance/duration come from PostGIS `ST_Distance` when coordinates exist, else from the stored template.

**Route optimization:** `routing` module exposes a `RouteOptimizerProvider` interface (`optimize(stops) -> ordered route + eta`). With no provider configured, suggestions endpoint returns `503 provider_unavailable` with a clear message — **no fabricated optimization results**.

**Live updates:** WebSocket group `org:{org_id}:dispatch` — assignment, progress, status changes.

---

### 2.5 `/fleet`

| UI | Endpoint | Model |
|---|---|---|
| KPIs: Total Fleet `362`, In Operation `314` (87%), Scheduled Service `12`, ELD Compliance `100%` | `GET /api/v1/fleet/stats/` | `Vehicle`, `MaintenanceRecord` |
| Vehicle grid `Vehicle {id, model, plate, type, status, driver, odometer, fuel, maintenance, image}` × 6 | `GET /api/v1/fleet/vehicles/?status=&type=&search=&page=` | `Vehicle` (`odometer_km`, `fuel_level_pct`), `VehicleCategory`, `Driver` |
| "Inspect Telematics" modal: speed `68 km/h`, oil temp `92 °C`, engine `Optimal` + driver/odometer/fuel/service rows | `GET /api/v1/fleet/vehicles/{id}/telemetry/latest/` → `{speed_kmh, oil_temp_c, engine_status, recorded_at}` | `VehicleTelemetry` (Redis latest + Postgres history) |
| image paths `/assets/3d/vehicles/*.webp` | kept as static assets; backend stores `image_key` optional | — |

Telemetry ingestion is `integrations` (device provider abstraction) → `tracking`. With no device connected, `telemetry/latest` returns `404 no_telemetry` and the UI shows the empty state (no fake readings).

---

### 2.6 `/drivers`

| UI | Endpoint | Model |
|---|---|---|
| KPIs: `214 Drivers`, `168` on duty, Safety `98.2/100`, Duty avg `6.8 h` | `GET /api/v1/drivers/stats/` | `Driver`, `DutyLog` |
| Driver cards `Driver {name,id,experience,license,assigned,onTimeRate,safetyScore,phone,status}` × 4 | `GET /api/v1/drivers/?status=&page=` | `Driver` (PII fields role-restricted) |
| "View Logbook" modal: hours driven/remaining, safety index, duty timeline | `GET /api/v1/drivers/{id}/logbook/?date=` → `{hours_driven, hours_remaining, safety_index, entries[]}` | `DutyLog` (ELD entries) |

`phone` and license/medical documents are **restricted**: serialized only for `Role:fleet_manager+` / owner / admin; masked (`+998 90 *** ** 67`) for others.

---

### 2.7 `/warehouse`

| UI | Action | Endpoint | Model |
|---|---|---|---|
| KPIs: capacity `88%`, docks `3/5`, `24,000 m²` | read | `GET /api/v1/warehouses/{id}/stats/` | `Warehouse`, `DockBay` |
| Dock cards `DOCKS {id,status,truck,activity,time}` × 5 | read | `GET /api/v1/warehouses/{id}/docks/` | `DockBay` |
| Inventory table `InventoryItem {sku,desc,loc,qty,status}` | read | `GET /api/v1/inventory/items/?search=&status=&warehouse=&page=` | `InventoryItem`, `StockLevel` |
| "Scan New Barcode" modal: SKU/Barcode, Pallet Quantity, Product Description, Bin Location → "Register Pallet & Stock" (validates SKU + description non-empty) | submit | `POST /api/v1/inventory/movements/` `{sku, quantity, unit, bin_location, movement_type:"receipt", source:"barcode_scan"}` → `201` + updated item | `StockMovement`, `StockLevel` |
| Success pill "✓ Registered {sku}" | after create | response `created_item` | — |

**Atomicity:** the stock movement runs in `transaction.atomic()` with `select_for_update()` on `StockLevel`, invariant `quantity_on_hand = Σ movements` verified; negative stock → `409 insufficient_stock`.

---

### 2.8 `/crm`

| UI | Action | Endpoint | Model |
|---|---|---|---|
| Header `customers.length + 80` fake count | replace with real total | `GET /api/v1/crm/stats/` → `{total_customers}` | `Customer` |
| Customer cards `Customer {name,industry,contact,email,activeShipments,monthlyVolume,slaScore,contract}` | read | `GET /api/v1/crm/customers/?search=&contract_tier=&page=` | `Customer` |
| "Add New Customer" modal (validation: name, contact, email required; email format; industry optional → `General Logistics`) | submit "Create Account" | `POST /api/v1/crm/customers/` `{name, industry?, contact_name, contact_email, contract_tier}` → `201` | `Customer` |
| "View Account Ledger" modal (3 tiles + settlement `INV-2026-OCT-84`, terms Net 30) | open | `GET /api/v1/crm/customers/{id}/ledger/` → `{monthly_volume, sla_score, active_shipments, invoices[]}` | `Customer`, `Invoice` |

Contract tiers are DB rows (`ContractTier` seeded from pricing): `Tier 1 Priority SLA`, `Growth Standard SLA`, `Cold-Chain Certified SLA`, `Custom Enterprise Frame`.

---

### 2.9 `/finance`

| UI | Endpoint | Model |
|---|---|---|
| KPIs: Monthly Revenue `$482,900` (+14.2% YoY), Pending Invoices `$41,350` (2 accounts), Carrier Settlements `$194,200` (100% on-time), Gross Margin `26.8%` (+2.4%) | `GET /api/v1/finance/kpis/?period=month` | computed from `Invoice`, `Payment`, `Expense` |
| Invoice table `{id, client, amount, status(paid/pending/overdue), date, due}` × 5 | `GET /api/v1/finance/invoices/?status=&search=&page=` | `Invoice`, `InvoiceLineItem` |
| "Export Statements" CSV | keep client-side (rows fit a page); full export `GET /finance/invoices/export/?format=csv` | — |

Amounts are `Decimal(14,2)` + `currency` (org base currency default). `status` derived: `due_date < today and unpaid → overdue`. **No payment processing is claimed** — `Payment` records are manual/imported until a provider is integrated.

---

### 2.10 `/analytics`

| UI | Endpoint | Model |
|---|---|---|
| SLA: target `95.0%`, actual `96.4%`, `4,120` shipments, avg delay `14.2 min`, weekly W1–W5 series | `GET /api/v1/analytics/sla/?date_from=&date_to=&granularity=week` | `Shipment`, `Order` (`on_time`, `delivered_at`) |
| Fuel: fleet avg `28.4 L/100km`, eco-score `94/100`, 3 vehicle classes, CO₂ avoided `14.2 t` | `GET /api/v1/analytics/fuel/?date_from=&date_to=` | `FuelRecord`, `VehicleCategory`, `Route` |
| "Download Full PDF Audit" → currently a `.txt` | `GET /api/v1/analytics/report/?format=txt\|pdf&date_from=&date_to=` (Celery-generated, stored in object storage, signed URL) | `ReportArtifact` |
| Static "Last 30 Days (Oct 01–31)" pill | becomes a real control fed by `GET /analytics/horizons/` | — |

Label honesty fix while integrating: button says PDF, file is TXT → either generate a real PDF server-side or relabel.

---

### 2.11 `/ai` — AI Assistant

| UI | Endpoint | Model |
|---|---|---|
| Chat input → 600 ms canned reply | `POST /api/v1/ai/chat/` `{message, conversation_id?}` → `{message, conversation_id, recommendation?}` | `AIConversation`, `AIMessage` |
| Recommendation card `{title, action, impact}` | `POST /api/v1/ai/recommendations/{id}/accept/` or `/dismiss/` | `AIRecommendation` |
| Header "Confidence 99.4%" | `GET /api/v1/ai/status/` → `{provider: "openai"|null, model, connected}`; if unconfigured → `{connected:false}` and the UI must show **Unavailable**, not a fake confidence | — |

`ai_assistant` is an abstraction: `AIProvider` interface (`complete(prompt, context)`, `embed`). Context is built **only** from rows the requesting user can read (tenant + permission scoped). Without `AI_PROVIDER` env config: `503 ai_unavailable` — never a fabricated answer.

---

### 2.12 `/notifications`

| UI | Action | Endpoint |
|---|---|---|
| List `NotificationItem {id,type(warning/success/info),title,detail,time,read,module}` × 5 | read | `GET /api/v1/notifications/?filter=all|unread|warning&page=` → `{results, unread_count, count}` |
| Toggle read (row click) | `PATCH /api/v1/notifications/{id}/` `{read}` or `POST .../read/` |
| "Mark all read" | `POST /api/v1/notifications/read-all/` |
| "Clear list" | `DELETE /api/v1/notifications/` (soft-clear = mark archived) |
| live arrival | WebSocket `org:{id}:notifications` |

`time` ("12m ago") is computed client-side from `created_at`.

---

### 2.13 `/settings`

| UI | Action | Endpoint | Model |
|---|---|---|---|
| Company profile: Legal Entity Name, Tax ID (`UZ 309 482 114`), HQ Address, Base Currency select (USD/UZS/EUR) | **no save button today** → integration adds `Save` (allowed, minimal) | `GET /organizations/current/` · `PATCH /organizations/current/` `{legal_name, tax_id, headquarters_address, base_currency}` | `Organization`, `OrganizationSettings` |
| Branch list × 4 `{name,type,status}` | read | `GET /organizations/current/branches/` | `Branch` |
| API key `prod_live_849…` + "Rotate Key" (currently shows honest "backend required" notice) | rotate | `POST /organizations/api-keys/{id}/rotate/` → new secret shown **once** | `APIKey` (hash stored, prefix+scopes+expires_at) |
| Workspace switcher (sidebar) | switch | `POST /auth/switch-organization/` `{organization_id}` → validates membership → new access token with new `org` claim | `OrganizationMembership` |

---

### 2.14 `/admin` — Super Admin

| UI | Endpoint | Model |
|---|---|---|
| KPIs: `142 Organizations`, MRR `$284,500`, Telematics `8,420 units` / 4.2M pings, SLA `99.98%` / 42 ms | `GET /api/v1/super-admin/platform-stats/` | aggregates over `Organization`, `Subscription`, `VehicleLocation` |
| Tenant table `{name, tier, fleet, users, mrr, status}` × 4 | `GET /api/v1/super-admin/organizations/?page=` | `Organization`, `Subscription`, `OrganizationMembership` |
| `ROOT LEVEL` badge, "Switch to Tenant App" | role gate `platform_admin` (separate claim, separate middleware, separate audit trail) | `User.platform_role`, `AuditLog(scope=platform)` |

Ordinary org users receive `403` on every `/super-admin/*` route; the endpoint set is registered under a distinct router with `IsPlatformAdmin`.

---

### 2.15 `/portal` — Customer portal & public tracking

| UI | Action | Endpoint | Auth |
|---|---|---|---|
| Tracking input + "Track Shipment" (only `ORD-24101` accepted today) | lookup | `GET /api/v1/shipments/track/?ref=ORD-24101` → `{ref,status,status_label,timeline[]}` · `404` unknown | `Public` (rate-limited 20/min/IP) |
| 4-step timeline (Booked → Picked Up → On Highway → Final Destination, ETA) | from response `timeline: [{stage, detail, occurred_at, current}]` | `ShipmentStatusHistory` |
| "Switch to Carrier Ops" link, `NP` avatar | session-aware header | `GET /auth/session` | `Authenticated` |

Authenticated customer-portal scope (`customer_portal` module): customer users (`role=customer`) see only their own org's **customer records**: dashboard, shipments, invoices, documents — enforced by `organization_id` **and** `customer_id` ownership.

---

### 2.16 `/driver` — Driver portal

| UI | Action | Endpoint | Model |
|---|---|---|---|
| Header: driver name, vehicle `TRK-01 (Volvo FH540)` | read | `GET /api/v1/driver-portal/me/` | `Driver`, `Vehicle` |
| Active trip banner `#DSP-8801`, route, `310 km total · 142 km remaining · ETA 14:30`, status | read (WebSocket updates) | `GET /api/v1/driver-portal/trip/current/` | `Dispatch`, `DispatchStop` |
| Next waypoint card (Jizzakh Rest Stop, km 204, 18 km) | read | `GET /api/v1/driver-portal/trip/current/stops/?next=1` | `DispatchStop` |
| "Start Turn-by-Turn GPS" ⇄ "GPS Active" toggle (today admits "no live GPS backend") | toggle | `POST /api/v1/driver-portal/trip/gps/{start\|stop}/` → device session; driver app then posts location → `tracking` | `GPSDeviceSession`, `VehicleLocation` |
| "Collect Digital Signature" → `signed=true` POD banner | submit | `POST /api/v1/driver-portal/trip/pod/` `{signature_image?|signature_pdf?, recipient_name, note?}` → `201 {verified:true, document_url}` | `ProofOfDelivery`, `Document` |
| Footer: `Inspection Log`, `Duty Hours (4h 12m)`, `SOS Dispatch` — currently **dead spans** | wire to | `GET/POST /driver-portal/inspections/`, `GET /driver-portal/duty-hours/`, `POST /driver-portal/sos/` | `VehicleInspection`, `DutyLog`, `SOSAlert` |

Driver access rule: driver user sees only `Driver.user_id == self` assignments. Querying another driver → `404` (not 403, to avoid existence leaks).

---

### 2.17 App chrome (`AppSidebar`, `AppHeader`)

| Hardcoded today | Backend source |
|---|---|
| Nav badge Orders `12` | `GET /api/v1/analytics/nav-badges/` → `{orders_open, notifications_unread}` |
| Nav badge Notifications `3` | same response / `notifications.unread_count` |
| `WORKSPACES` (Central Logistics Hub `demo-logistimus`, Samarkand Regional Yard `sam-yard-01`, Tashkent Air Cargo Depot `tas-air-04`) | `GET /api/v1/organizations/mine/` → memberships; active one from session; switch via `POST /auth/switch-organization/` |
| Header user `AD / Alisher D. / Operations Director` | `GET /api/v1/auth/session` → `user.first_name,last_name,role` (initials derived) |
| Header bell: static dot, "3 Unread", 2 fixed alerts | `GET /api/v1/notifications/?unread=1&page_size=5` + WebSocket |
| Header search box (no handler) | `GET /api/v1/search/?q=` → grouped results (orders, vehicles, drivers, customers) |
| "Live Network" chip | `GET /api/v1/health/` (public) — keep static if only decorative; do not fake a live check |
| Sidebar `v2.4` | build env `NEXT_PUBLIC_APP_VERSION` (optional) |

---

### 2.18 `/pricing` → subscriptions

| UI | Endpoint | Model |
|---|---|---|
| 3 tiers (Starter $240/$190, Growth $690/$550, Enterprise $1,850/$1,480), feature lists, monthly/annual toggle | `GET /api/v1/subscriptions/plans/` → `{plans:[{code,name,prices:{monthly,annual,currency},features[],limits[]}], trial_days:14}` | `Plan`, `PlanFeature` |
| CTA → `/sign-up?tier=<code>` | register consumes `tier` → `Subscription` with trial | `Subscription` |
| FAQ (static copy) | stays static | — |

Backend enforces entitlements (`Plan.limits`: max vehicles, modules enabled) — plan checks run in permission/serializers, not only in the UI.

---

### 2.19 Static / no backend

`/` marketing (all `components/marketing/*`), `/privacy`, `/terms`, `not-found.tsx`, `error.tsx`, `loading.tsx` — no backend work. `EcosystemSection` links `/platform` which has **no route** (404): noted as a frontend defect, out of backend scope.

---

## 3. Cross-cutting frontend integration requirements

1. **Centralized API client** — `Frontend/src/lib/api/`: `apiFetch()` with access-token memory store, silent refresh on 401 (single-flight), `AbortController` cancellation, typed error envelope `{code, message, details?}`, org header NOT sent by the client (server-owned context).
2. **States** — every wired screen must implement `loading` (skeleton), `empty` (copy + action), `error` (message + retry), `success` feedback. Existing demo data is removed **per module only when its endpoint lands** (never before), and remaining demo data stays labeled.
3. **Forms** — client validation mirrors server field rules; server errors map onto the existing error banner pattern (`role="alert"`).
4. **Routing guards** — middleware redirects unauthenticated users from `/dashboard|/orders|/fleet|/dispatch|/drivers|/warehouse|/crm|/finance|/analytics|/notifications|/ai|/settings` to `/sign-in`; `/admin` additionally requires `platform_admin`; `/driver` and `/portal` require their portal roles.
5. **No UI redesign** — no component replacement without a technical reason; design system (`Frontend/DESIGN.md`) untouched.

---

## 4. Backend module ↔ frontend route ownership

| Django app | Routes it serves |
|---|---|
| `core` | health, shared pagination/error/response contracts (all) |
| `accounts` | `/sign-in`, `/sign-up`, `/verify-email`, `/forgot-password`, `/reset-password`, header identity |
| `organizations` | sidebar workspaces, `/settings` profile+branches, org switch |
| `permissions` (RBAC) | every endpoint's permission layer, role-gated UI |
| `orders` | `/orders`, `/dashboard` table |
| `shipments` | `/portal` track, order lifecycle/legs |
| `dispatch` + `routing` | `/dispatch`, `/driver` trip |
| `fleet` | `/fleet`, dashboard fleet card |
| `drivers` | `/drivers`, `/driver` profile+duty |
| `warehouses` + `inventory` | `/warehouse` |
| `crm` | `/crm` |
| `finance` | `/finance`, CRM ledger |
| `documents` | POD, order docs, expiry reminders |
| `tracking` | dashboard live map, GPS/telematics, driver GPS |
| `analytics` | `/dashboard`, `/analytics`, nav badges |
| `notifications` | `/notifications`, header bell, WebSocket |
| `ai_assistant` | `/ai` |
| `integrations` | `/settings` API keys, webhooks, providers |
| `subscriptions` | `/pricing`, plan entitlements |
| `customer_portal` | `/portal` (authenticated scope) |
| `driver_portal` | `/driver` |
| `super_admin` | `/admin` |
