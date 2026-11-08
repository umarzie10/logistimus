# Logistimus — API Specification v1

Status: **Phase 0 deliverable** · Base path: **`/api/v1/`** · Content type: `application/json` · Generated contract: `drf-spectacular` → `/api/schema/` + `/api/docs/` (Swagger UI) + `/api/redoc/`. The OpenAPI document is the single source of truth for frontend TypeScript types (generated via `openapi-typescript` at integration time).

---

## 1. Conventions

### 1.1 HTTP

| Rule | Value |
|---|---|
| Resource naming | plural kebab-case nouns: `/orders/`, `/nav-badges/` is not a resource → `/analytics/nav-badges/` |
| Collections | always list endpoints with pagination envelope |
| Success codes | `200` read/update, `201` create, `204` delete/no-content, `202` accepted (async/email sent) |
| Errors | `400` validation, `401` unauthenticated, `403` permission, `404` not found (or hidden cross-tenant), `409` state conflict, `410` expired token, `412` precondition, `423` locked, `429` rate limited |
| Idempotency | mutating endpoints accept `Idempotency-Key` header (stored 24h) for create/POST actions prone to retry |
| Optimistic concurrency | `If-Match` with `updated_at` version on PATCH where race matters (inventory, dispatch) → `412` |

### 1.2 Authentication & tenancy headers

| Header | Owner | Meaning |
|---|---|---|
| `Cookie: lr_refresh=…` | server-set httpOnly | refresh token; used by `POST /auth/refresh` only |
| `Authorization: Bearer <access>` | client | 15-min JWT with `sub`, `org`, `role`, `jti` |
| `X-Request-Id` | client optional | correlation id, echoed in logs |
| — | — | **No client-supplied tenant header is trusted.** `org` claim comes from the server-validated membership. |

### 1.3 Pagination, filtering, sorting

- Default: **cursor-free page-number pagination** for UI lists: `?page=1&page_size=20` (max `100`).
- Envelope:

```json
{
  "count": 137,
  "page": 1,
  "page_size": 20,
  "pages": 7,
  "results": [ … ]
}
```

- Filtering: `django-filter` — `?status=`, `?search=` (registered search fields per viewset), `?date_from=`, `?date_to=` (ISO date).
- Sorting: `?ordering=-created_at` (whitelist per serializer; `-` prefix for desc).
- Every list endpoint is tenant-scoped by the ORM layer (see `SECURITY_PLAN.md` §3).

### 1.4 Error envelope (all endpoints)

```json
{
  "error": {
    "code": "invalid_transition",
    "message": "Order cannot move from Delivered to Loading.",
    "details": { "allowed_from": ["In transit", "Cancelled"] },
    "request_id": "5f2c…"
  }
}
```

Stable machine-readable `code` values are listed per endpoint below. `message` is human-readable English (frontend may localize by `code`).

### 1.5 Money, time, IDs

- Money: `"amount": "38400.00"` (stringified decimal, 2 dp) + `"currency": "USD"`. Never floats.
- Time: RFC 3339 UTC, e.g. `"2026-10-30T14:30:00Z"`. Org timezone applied **only** for display formatting client-side.
- IDs: UUID v4 strings for `id`. Business refs (`ORD-24101`, `INV-2026-0881`, `SKU-9921`, `DSP-8801`) are separate `ref` fields, unique per organization.

### 1.6 Standard list query surface (per resource)

`?page&page_size&search&ordering&<resource filters>` — each viewset declares `filterset_fields`, `search_fields`, `ordering_fields` in OpenAPI.

---

## 2. Health & meta

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health/` | Public | `{status:"ok", version, db:"ok", redis:"ok", time}` |
| GET | `/health/ready/` | Public | k8s readiness (DB + Redis ping) |
| GET | `/metrics/` | Internal (network-restricted) | Prometheus text format |

---

## 3. `accounts` — authentication

### `POST /auth/register`

```json
// request
{ "companyName": "TransAsia Logistics LLC", "fleetSize": "200 – 1,000 Vehicles",
  "adminFullName": "Alisher Davronov", "businessPhone": "+998 90 123 45 67",
  "email": "admin@transasia.uz", "password": "…", "acceptTerms": true,
  "tier": "growth" }
```
`201` → `{"verification_required": true, "email": "admin@transasia.uz", "cooldown_seconds": 60}`
Errors: `400 validation_error` (password < 8 → `weak_password`; invalid email; `acceptTerms` false → `terms_required`), `409 email_exists`, `400 invalid_tier`.
Side effects: `User` (role owner), `Organization` (+ HQ `Branch`), `Membership`, `Subscription` (trial 14d, plan from `tier`), verification code.

### `POST /auth/verify-email` — `{email, code}` · `POST /auth/resend-verification` — `{email}` (`202`, always)
Errors: `400 invalid_code`, `410 code_expired`, `429 rate_limited`.

### `POST /auth/login`

```json
// request
{ "email": "admin@transasia.uz", "password": "…", "rememberDevice": true }
```
`200` →
```json
{ "access": "<jwt>", "expires_in": 900,
  "user": {"id":"…","first_name":"Alisher","last_name":"Davronov","email":"…","role":"owner","platform_role":null,"email_verified_at":"…"},
  "organization": {"id":"…","name":"TransAsia Logistics LLC","slug":"transasia","base_currency":"USD"},
  "memberships": [{"organization_id":"…","organization_name":"…","role":"owner"}] }
```
Sets `lr_refresh` cookie. Errors: `401 invalid_credentials`, `403 email_not_verified`, `423 account_locked` (`retry_after_seconds`), `429 too_many_attempts`.
Rate limit: 5/min/IP + 10/15min/email → increments `LoginHistory` + lockout counter (10 fails → 15 min lock).

### `POST /auth/refresh` — cookie only, `SameSite=Lax`
`200 {access, expires_in}` · rotates refresh (reuse detection: replayed token revokes the whole family → `401 refresh_revoked`).
CSRF: requires `X-Requested-With: XMLHttpRequest` (custom header) + same-site cookie.

### `POST /auth/logout` → `204` (revokes current refresh family)
### `GET /auth/session` → same shape as login body (no `access` re-issue unless near expiry)

### `POST /auth/switch-organization` — `{organization_id}`
Server verifies `Membership` for `user` → issues new access token with new `org` claim + resets cookie scope.
Errors: `403 not_a_member` (never reveals whether the org exists).

### Password lifecycle
| Endpoint | Body | Notes |
|---|---|---|
| POST `/auth/forgot-password` | `{email}` | `202` always; token TTL 60 min, single-use, hashed at rest; Celery email |
| POST `/auth/reset-password` | `{token, password}` | `200`; revokes all sessions; errors `410 token_expired`, `400 token_invalid` |
| POST `/auth/change-password` | `{current_password, new_password}` | authenticated; revokes other sessions |

### `GET /auth/login-history/?page=` → `{results:[{id, ip, user_agent, successful, created_at}]}` (own history; admin sees org members' via `/users/{id}/login-history/`).

---

## 4. `organizations` — companies, branches, users, keys

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/organizations/mine/` | Auth | memberships list (sidebar workspaces) |
| GET | `/organizations/current/` | Member | `{id,name,slug,legal_name,tax_id,headquarters_address,base_currency,verification_status,fleet_size_band,created_at}` |
| PATCH | `/organizations/current/` | Role:owner/admin | update profile · `403 forbidden` otherwise |
| GET | `/organizations/current/branches/` | Member | `{count, results:[{id,name,type,status,is_primary}]} ` |
| POST | `/organizations/current/branches/` | Role:admin | create branch |
| PATCH | `/organizations/current/branches/{id}/` | Role:admin | update |
| GET | `/organizations/current/settings/` | Member | feature flags, notification prefs, distance unit, date format |
| PATCH | `/organizations/current/settings/` | Role:admin | update |
| GET | `/organizations/current/members/?page=&role=` | Role:admin | member list `{user:{id,name,email}, role, status, last_login_at}` |
| POST | `/organizations/current/invitations/` | Role:admin | `{email, role}` → invitation email · `409 already_member` |
| POST | `/organizations/current/invitations/{id}/resend/` | Role:admin | `202` |
| DELETE | `/organizations/current/invitations/{id}/` | Role:admin | `204` |
| POST | `/organizations/current/members/{user_id}/` → PATCH | Role:owner | change role · cannot demote last owner (`409 last_owner`) |
| DELETE | `/organizations/current/members/{user_id}/` | Role:owner | remove · `409 last_owner` |

**Registration of companies** happens via `/auth/register` (§3). Super Admin can create/verify orgs via §13.

### API keys (used by `/settings` "Rotate Key")
| Method | Path | Auth |
|---|---|---|
| GET | `/organizations/current/api-keys/` | Role:admin — returns `{id, name, prefix:"prod_live_8492…", scopes[], created_at, expires_at, last_used_at, revoked}` — **never the secret** |
| POST | `/organizations/current/api-keys/` | Role:admin — `{name, scopes:["orders:read",…], expires_in_days?}` → secret returned **once** |
| POST | `/organizations/current/api-keys/{id}/rotate/` | Role:admin — new secret once; old secret valid 24h grace |
| DELETE | `/organizations/current/api-keys/{id}/` | Role:admin — revoke (`204`) |

---

## 5. `permissions` — RBAC

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/roles/` | Member | org roles (built-in + custom) `{id, name, is_builtin, permissions[]}` |
| POST | `/roles/` | Role:admin | create custom role |
| PATCH | `/roles/{id}/` · DELETE | Role:owner/admin | update/remove (built-ins undeletable → `409 builtin_role`) |
| GET | `/permissions/` | Member | permission catalog grouped by module (`orders.order.view`, `orders.order.create`, `finance.invoice.view`, …) |
| GET | `/auth/me/permissions/` | Auth | effective permission codes for the current user+org → frontend gates UI (cosmetic only; server enforces) |

Roles seeded: `owner`, `super_admin`(org), `company_admin`, `operations_manager`, `dispatcher`, `fleet_manager`, `driver`, `warehouse_manager`, `accountant`, `sales_manager`, `customer`, `support_agent`.
Permission model: **module × action** (`view/create/change/delete/export`) with optional object scope (`own` for drivers/customers).

---

## 6. `orders` + `shipments`

### `GET /orders/`
Filters: `status`, `customer`, `driver`, `origin`, `destination`, `date_from`, `date_to`, `search` (ref, customer, origin, destination, cargo).
Ordering: `-created_at`, `eta_at`, `status`.
Row shape:
```json
{"id":"…","ref":"ORD-24101","customer":{"id":"…","name":"Northwind Freight Corp"},
 "cargo":"Industrial Electronic Components","weight_kg":"14200.00","weight_display":"14,200 kg",
 "origin":"Tashkent Central Depot","destination":"Samarkand Regional Hub",
 "driver":{"id":"…","name":"Akmal Saidov","vehicle_ref":"TRK-01"},
 "status":"in_transit","status_label":"In transit",
 "created_at":"…","eta_at":"…"}
```

### `POST /orders/` — `Role:orders.create`
```json
{"customer_id":"…","origin":"Tashkent Central Depot","destination":"Samarkand Regional Hub",
 "cargo":"…","weight_kg":"14200.00","pickup_at":"…","delivery_due_at":"…","notes":"…"}
```
`201` full order. Validation: `weight_kg > 0`, origin/destination required, `customer_id` must belong to org (else `400 customer_not_found`). `ref` = `ORD-<per-org sequence>`.

### `GET /orders/{id}/` → detail + `history[]`, `notes[]`, `documents[]`, `items[]`
### `PATCH /orders/{id}/` — partial update (`Role:orders.change`)
### `DELETE /orders/{id}/` — soft delete (archive) only if `draft` → `409 not_archivable` otherwise. `Role:orders.delete`
### `POST /orders/{id}/status/` — `{status, note?}`
Validated transitions (else `409 invalid_transition` with `details.allowed_from`):
`draft→loading|cancelled` · `loading→in_transit|cancelled` · `in_transit→delivered|delayed|cancelled` · `delayed→in_transit|delivered|cancelled` · `delivered→∅` · `cancelled→∅`.
Writes `OrderStatusHistory`, emits activity notification, broadcasts WebSocket `order.status_changed`.

### `GET /orders/{id}/history/` · `POST /orders/{id}/notes/` `{body}` · `DELETE /orders/{id}/notes/{note_id}/`

### Shipments (transport legs / tracking)
| Method | Path | Purpose |
|---|---|---|
| GET | `/shipments/?order=&status=&page=` | legs list |
| GET | `/shipments/{id}/` | detail + stops + current location |
| POST | `/shipments/{id}/delivery/` | `{delivered_at, received_by, signature_document_id?}` → `200`, status `delivered`, POD required when `settings.require_pod` |
| GET | `/shipments/track/?ref=ORD-24101` | **Public, rate-limited 20/min/IP** → `{ref, status, status_label, timeline:[{stage, detail, occurred_at, current}]}`; unknown → `404 shipment_not_found` |

---

## 7. `dispatch` + `routing`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/dispatch/stats/` | Role:dispatch.view | `{active, on_time, delayed, available_vehicles, corridor_efficiency_pct, efficiency_delta_pct, avg_fuel_rate_l}` |
| GET | `/dispatch/board/?status=&page=` | Role:dispatch.view | rows `{id, ref:"DSP-8801", lane, distance_km, duration_min, vehicle:{ref}, driver:{name}, cargo, status, progress_percent, delay_min}` |
| GET | `/dispatch/board/lanes/` | Member | corridor templates `{id, label, origin, destination, distance_km, duration_min}` |
| POST | `/dispatch/assignments/` | Role:dispatch.assign | `{route_id, driver_id, vehicle_id, cargo_description, order_id?}` → `201 Dispatch` · errors `409 driver_unavailable`, `409 vehicle_unavailable`, `400 driver_vehicle_mismatch` |
| PATCH | `/dispatch/{id}/` | Role:dispatch.assign | progress/status updates |
| POST | `/dispatch/{id}/cancel/` | Role:dispatch.assign | `{reason}` |
| GET | `/dispatch/{id}/` | Role:dispatch.view | detail + stops |
| GET | `/dispatch/history/?date_from=&date_to=` | Role:dispatch.view | dispatch history |
| GET | `/routing/suggestions/` | Role:dispatch.view | provider-backed suggestions; `503 provider_unavailable` if no optimizer configured (**never fabricated**) |
| POST | `/routing/suggestions/{id}/apply/` | Role:dispatch.assign | applies to board, records `RouteSuggestion.applied_at` |

Live: WebSocket `org:{id}:dispatch` events `assignment_created`, `progress_updated`, `status_changed`.

---

## 8. `fleet`

| Method | Path | Purpose |
|---|---|---|
| GET `/fleet/stats/` | `{total, in_operation, utilization_pct, scheduled_service, eld_compliance_pct}` |
| GET `/fleet/vehicles/?status=&type=&search=&page=` | `{id, ref:"TRK-01", model, plate, type, status, driver:{name}, odometer_km, fuel_level_pct, maintenance_next_at, image}` |
| POST `/fleet/vehicles/` | `Role:fleet.create` — `{ref, model, plate, type, category_id, odometer_km}` · `409 ref_exists` |
| GET/PATCH `/fleet/vehicles/{id}/` | detail / update (`Role:fleet.change`) |
| DELETE `/fleet/vehicles/{id}/` | archive → `409 assigned_vehicle` if driver assigned |
| GET `/fleet/vehicles/{id}/telemetry/latest/` | `{speed_kmh, oil_temp_c, engine_status, recorded_at}` or `404 no_telemetry` |
| GET `/fleet/vehicles/{id}/telemetry/?from=&to=` | history (paged) |
| GET `/fleet/vehicles/{id}/maintenance/` | schedule + history `{type, due_at, due_odometer, status, cost}` |
| POST `/fleet/vehicles/{id}/maintenance/` | create schedule/history |
| GET `/fleet/vehicles/{id}/fuel/?page=` | fuel records `{liters, price, cost, odometer_km, recorded_at}` |
| POST `/fleet/vehicles/{id}/fuel/` | `{liters, price, odometer_km}` — Decimal math server-side |
| GET `/fleet/categories/` | vehicle categories |

WebSocket: `org:{id}:fleet` for telemetry/status pushes.

---

## 9. `drivers`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/drivers/stats/` | Role:driver.view | `{active, on_duty, safety_score, avg_duty_hours, medicals_valid_pct}` |
| GET | `/drivers/?status=&availability=&search=&page=` | Role:driver.view | `{id, name, ref:"DRV-102", experience_years, license_class, on_time_rate, safety_score, phone(masked by role), status, assigned_vehicle}` |
| POST | `/drivers/` | Role:driver.create | create profile (optionally linked to a `User` for portal access) |
| GET/PATCH | `/drivers/{id}/` | view / `Role:driver.change` | full PII (license no., address, medical) only to `fleet_manager+`; others get masked serializer |
| GET | `/drivers/{id}/logbook/?date=` | Role:driver.view (or self) | `{hours_driven, hours_remaining, safety_index, entries:[{at, activity, status, detail}]}` |
| GET | `/drivers/{id}/schedule/?from=&to=` | | duty schedule |
| POST | `/drivers/{id}/availability/` | `{status}` | available/on_duty/off_duty |
| GET | `/drivers/{id}/performance/?period=` | | `{on_time_rate, safety_score, deliveries, avg_delay_min}` |
| GET | `/drivers/{id}/documents/` | | license/medical docs metadata (files via `documents` module) |

**Self-access rule:** a driver-role user hitting `/drivers/{other}/…` receives `404` unless granted `driver.view_all`.

---

## 10. `warehouses` + `inventory`

| Method | Path | Purpose |
|---|---|---|
| GET | `/warehouses/` | `{id, name, code, area_m2, address, is_primary}` |
| POST | `/warehouses/` | `Role:warehouse.manage` |
| GET | `/warehouses/{id}/stats/` | `{storage_capacity_pct, docks_in_use, docks_total, total_area_m2, low_stock_count}` |
| GET | `/warehouses/{id}/docks/?status=` | `[{id:"Bay 01", status:"occupied", truck, activity, eta_minutes}]` |
| POST | `/warehouses/{id}/docks/{dock_id}/assign/` | `{vehicle_id, activity}` |
| POST | `/warehouses/{id}/docks/{dock_id}/release/` | |
| GET | `/warehouses/{id}/zones/` | storage zones |
| GET | `/inventory/items/?search=&status=&warehouse=&low_stock=true&page=&ordering=` | `{sku, description, bin_location, quantity_on_hand, unit, reorder_point, status:"optimal|low_stock|out_of_stock", updated_at}` |
| POST | `/inventory/items/` | create SKU master |
| GET/PATCH | `/inventory/items/{sku}/` | detail / manual adjustment (`Role:inventory.adjust`) |
| POST | `/inventory/movements/` | **atomic**: `{sku, movement_type:"receipt|shipment|transfer|adjustment", quantity, unit, bin_location, source:"barcode_scan|manual", reference?}` → `201 {movement, item}` · `409 insufficient_stock` · `400 sku_not_found` |
| GET | `/inventory/movements/?sku=&type=&date_from=&page=` | stock ledger |
| GET | `/inventory/alerts/?page=` | low/out-of-stock alerts |

Transaction guarantee: `select_for_update()` on the row, quantity recomputed from movements, `CheckConstraint(quantity_on_hand >= 0)` as last line of defense.

---

## 11. `crm`

| Method | Path | Purpose |
|---|---|---|
| GET | `/crm/stats/` | `{total_customers, active_shipments, avg_sla_score}` |
| GET | `/crm/customers/?search=&contract_tier=&page=&ordering=` | `{id, name, industry, contact_name, contact_email, active_shipments, monthly_volume{amount,currency}, sla_score, contract_tier}` |
| POST | `/crm/customers/` | `{name, industry?, contact_name, contact_email, contract_tier}` · validation: name/contact/email required, email format → `400 validation_error` with per-field `details` |
| GET/PATCH/DELETE | `/crm/customers/{id}/` | detail / update / archive |
| GET | `/crm/customers/{id}/ledger/` | `{monthly_volume, sla_score, active_shipments, invoices:[{ref, amount, currency, status, issued_at, terms}]}` |
| GET | `/crm/customers/{id}/shipments/?page=` | customer shipment history |
| GET | `/crm/leads/?status=&page=` · POST `/crm/leads/` · PATCH `/crm/leads/{id}/` | lead pipeline |
| GET/POST | `/crm/contacts/` | contacts per customer |
| GET/POST | `/crm/contracts/?customer=` | contracts `{id, tier, starts_at, ends_at, terms, status}` |
| POST | `/crm/customers/{id}/communications/` | logged call/email/note → activity history |

---

## 12. `finance`

| Method | Path | Purpose |
|---|---|---|
| GET | `/finance/kpis/?period=month` | `{monthly_revenue{amount,currency}, revenue_yoy_pct, pending_invoices{amount,currency}, pending_accounts, carrier_settlements{amount,currency}, settlement_on_time_pct, gross_margin_pct, margin_vs_budget_pct}` — computed, tenant-scoped |
| GET | `/finance/invoices/?status=&customer=&date_from=&date_to=&search=&page=` | `{ref:"INV-2026-0881", customer, issue_date, due_date, terms:"Net 30", status:"paid|pending|overdue|draft|void", total{amount,currency}}` |
| POST | `/finance/invoices/` | `{customer_id, issue_date, terms, line_items:[{description, quantity, unit_price, tax_rate}]}` → server computes totals in Decimal · `400 negative_total` |
| GET | `/finance/invoices/{id}/` | detail + line items + payments |
| POST | `/finance/invoices/{id}/payments/` | `{amount, currency, paid_at, method:"manual|bank_transfer|other"}` → marks paid when `Σ payments ≥ total` · **no payment-provider claims** |
| POST | `/finance/invoices/{id}/void/` | `Role:finance.void` |
| GET | `/finance/invoices/export/?format=csv` | streamed CSV (server-side, full dataset) |
| GET/POST | `/finance/expenses/?category=&date_from=&page=` | `{category, description, amount{amount,currency}, vendor, occurred_at, vehicle?}` |
| GET/POST | `/finance/settlements/?carrier=&status=` | carrier settlements |
| GET | `/finance/reports/profit-loss/?date_from=&date_to=` | `{revenue, expenses, profit, by_category[]}` |
| GET | `/finance/currencies/` | supported currencies + org base |

`Decimal(14,2)` everywhere; `currency` ISO-4217 on every money field; conversion only at report level with stored rate + rate date (never implicit float math).

---

## 13. `documents`

| Method | Path | Purpose |
|---|---|---|
| GET | `/documents/?category=&order=&shipment=&vehicle=&driver=&page=` | `{id, filename, category, size_bytes, content_type, uploaded_by, created_at, expires_at, version, download_url}` |
| POST | `/documents/upload/` | multipart `{file, category, order_id?, shipment_id?, vehicle_id?, driver_id?, expires_at?}` → stored in private bucket; returns metadata · `400 invalid_file_type` (allowlist pdf/png/jpg/csv/xlsx), `413 file_too_large` (25 MB default) |
| GET | `/documents/{id}/url/` | signed URL, TTL 10 min, permission-checked (`403` if requester lacks object access) |
| DELETE | `/documents/{id}/` | `Role:` owner-of-object or admin |
| GET | `/documents/expiring/?days=30` | expiry reminders (insurance, license, contract) |

Associations are explicit FKs (no generic relations). Access: object permission + tenant check before issuing any URL.

---

## 14. `tracking` (GPS & live)

| Method | Path | Purpose |
|---|---|---|
| GET | `/tracking/live/` | `{summary:{moving, delayed, at_depot}, vehicles:[{vehicle_id, ref, lat, lng, speed_kmh, status, last_seen}]}` — Redis latest-location cache, Postgres history |
| GET | `/tracking/vehicles/{id}/history/?from=&to=&limit=` | paged PostGIS history `{lat, lng, recorded_at, speed_kmh}` (hex/GeoJSON `?format=geojson`) |
| GET | `/tracking/shipments/{id}/` | shipment's current position + path |
| POST | `/tracking/ingest/` | **device-authenticated** (`X-Device-Key` or mTLS) `{device_id, lat, lng, speed, recorded_at}` → `202` · `401 device_unauthorized` |
| GET | `/tracking/devices/` · POST | GPS device ↔ vehicle association (`Role:fleet.manage`) |
| GET | `/tracking/geocode/?q=` | proxy to configured geocoder (never direct client keys) |

WebSocket: `org:{id}:tracking` — server pushes only after verifying the connection's `org` claim; payload `{vehicle_id, lat, lng, speed, ts}`.

---

## 15. `analytics`

| Method | Path | Purpose |
|---|---|---|
| GET | `/analytics/dashboard/?period=day|week|month` | `{metrics:[{key,label,value,change_pct,is_up}], active_orders, in_transit, on_time_rate, fleet_utilization, top_routes[], activity[]}` |
| GET | `/analytics/nav-badges/` | `{orders_open, notifications_unread}` |
| GET | `/analytics/sla/?date_from=&date_to=&granularity=day|week|month` | `{target_pct, actual_pct, delta_pct, completed_shipments, avg_delay_minutes, series:[{period, pct}]}` |
| GET | `/analytics/fuel/?date_from=&date_to=` | `{fleet_avg_l100km, eco_score, by_class:[{class_name, l100km, capacity_pct}], co2_avoided_tons}` |
| GET | `/analytics/fleet/?period=` | utilization, status distribution, distance driven |
| GET | `/analytics/customers/?period=` | per-customer volume, SLA, revenue |
| GET | `/analytics/drivers/?period=` | on-time, safety, utilization |
| GET | `/analytics/report/?format=txt|pdf&date_from=&date_to=` | `202` → job id, then `GET /analytics/report/{job_id}/` → `{status, download_url}` (Celery generates; artifact in private storage) |
| GET | `/analytics/horizons/` | available reporting windows |

All metrics = SQL aggregates over tenant-scoped rows. `search`/`ordering`/pagination only where listed. **Hardcoded dashboard numbers are forbidden.**

---

## 16. `notifications`

| Method | Path | Purpose |
|---|---|---|
| GET | `/notifications/?filter=all|unread|warning&page=` | `{results:[{id, type:"warning|success|info", title, detail, module, read, created_at}], unread_count, count}` |
| POST | `/notifications/{id}/read/` | `204` |
| PATCH | `/notifications/{id}/` | `{read: bool}` |
| POST | `/notifications/read-all/` | `204` |
| DELETE | `/notifications/` | archive all (soft) `204` |
| GET/POST | `/notifications/preferences/` | per-channel prefs `{in_app, email, sms, modules:{orders:true,…}}` |

WebSocket: `org:{id}:notifications` → `{"event":"notification.created", "notification":{…}}`.
Delivery pipeline: domain events → Celery → in-app row (+ email/SMS provider per prefs) → channel-layer broadcast.

---

## 17. `ai_assistant`

| Method | Path | Purpose |
|---|---|---|
| GET | `/ai/status/` | `{provider, model, connected}` — `connected:false` when unconfigured (UI must show Unavailable) |
| GET | `/ai/conversations/?page=` · DELETE `/ai/conversations/{id}/` | history |
| POST | `/ai/chat/` | `{message, conversation_id?}` → `200 {conversation_id, message:{role,text,created_at}, recommendation?}` · `503 ai_unavailable` when no provider · `429 rate_limited` |
| POST | `/ai/recommendations/{id}/accept/` · `/dismiss/` | records decision; no autonomous execution |
| POST | `/ai/insights/delay-risk/` `{order_ids?}` | structured insight over authorized rows only |

Context builder filters by the caller's permissions; external provider calls only when `AI_ALLOW_EXTERNAL_CONTEXT=true`.

---

## 18. `integrations`

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/integrations/` | configured integrations `{type:"gps|payment|email|sms|mapping", provider, status, scopes}` |
| POST | `/integrations/{id}/test/` | connectivity check → real result |
| GET/POST | `/integrations/webhooks/` | `{url, events[], secret}` |
| POST | `/integrations/webhooks/{id}/rotate-secret/` | |
| POST | `/integrations/webhooks/{id}/test/` | sends signed sample event |
| GET | `/integrations/webhooks/{id}/deliveries/?page=` | delivery log `{status_code, attempt, created_at}` |
| GET | `/integrations/api-keys/` | alias of §4 API keys |

Outbound webhooks: HMAC-SHA256 `X-Logistimus-Signature`, retries with exponential backoff (3 attempts), delivery log.

---

## 19. `subscriptions`

| Method | Path | Purpose |
|---|---|---|
| GET | `/subscriptions/plans/` | **Public** → `{trial_days:14, plans:[{code:"starter|growth|enterprise", name, prices:{monthly:{amount,currency},annual:{amount,currency}}, features[], limits:{max_vehicles, modules[]}}]}` |
| GET | `/subscriptions/current/` | Member → `{plan, status:"trialing|active|past_due|canceled", trial_ends_at, renews_at, limits, usage:{vehicles, users}}` |
| POST | `/subscriptions/change/` | `{plan_code, billing_period}` → proration computed; `402 payment_required` when a provider is needed and not configured (**never fake success**) |
| POST | `/subscriptions/cancel/` | `{at_period_end:true}` |
| GET | `/subscriptions/invoices/?page=` | subscription billing records |
| GET | `/subscriptions/entitlements/` | `{module_enabled:{orders:true, finance:true, …}}` for frontend feature gates |

Enforcement points: `SubscriptionGuard` on module routers (e.g. `finance` disabled for trial-expired org → `402 plan_expired`), plus `Plan.limits` checks in serializers (`max_vehicles` → `409 plan_limit_reached`).

---

## 20. `customer_portal`

Scoped to users with `role=customer` (and only their own `customer_id` records).

| Method | Path | Purpose |
|---|---|---|
| GET | `/customer-portal/me/` | company, contacts, account manager |
| GET | `/customer-portal/dashboard/` | active shipments, open invoices, recent deliveries |
| GET | `/customer-portal/shipments/?status=&page=` | own shipments only (`404` for others' ids) |
| GET | `/customer-portal/shipments/{id}/` | detail + timeline + documents |
| POST | `/customer-portal/shipments/` | create request when entitlement allows → status `draft` for operator approval |
| GET | `/customer-portal/invoices/?page=` · GET detail | own invoices |
| GET | `/customer-portal/documents/?page=` | own documents (signed URLs) |
| POST | `/customer-portal/support/requests/` · GET list | support tickets `{subject, body, priority}` |

---

## 21. `driver_portal`

Scoped to `role=driver` bound to one `Driver` row.

| Method | Path | Purpose |
|---|---|---|
| GET | `/driver-portal/me/` | profile (masked), vehicle, documents, duty summary |
| GET | `/driver-portal/trip/current/` | active dispatch `{ref, route, total_km, remaining_km, eta_at, status, next_stop}` · `404 no_active_trip` |
| GET | `/driver-portal/trip/current/stops/` | ordered stops |
| POST | `/driver-portal/trip/{id}/status/` | `{status:"arrived|loading|departed|delivered"}` validated transitions |
| POST | `/driver-portal/trip/{id}/gps/{start|stop}/` | GPS session toggle |
| POST | `/driver-portal/trip/{id}/location/` | batch location ping (driver device) |
| POST | `/driver-portal/trip/{id}/pod/` | `{recipient_name, signature_image(base64 png/jpeg ≤512KB), note?}` → creates `Document`, returns `{verified:true, document_id}` · `400 signature_required` |
| GET/POST | `/driver-portal/inspections/` | pre/post-trip inspection `{odometer, defects[], checklist}` |
| GET | `/driver-portal/duty-hours/?date=` | `{driven_minutes, remaining_minutes, status}` |
| POST | `/driver-portal/sos/` | `{lat?, lng?, note?}` → immediate notification to dispatchers + audit |
| GET | `/driver-portal/documents/` | own license/inspections |

Cross-driver access → `404`.

---

## 22. `super_admin`

All under `IsPlatformAdmin` (separate `platform_role` claim + dedicated middleware + platform audit trail). Any org user → `403 platform_admin_required`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/super-admin/platform-stats/` | `{total_tenants, tenants_delta_month, platform_mrr{amount,currency}, annual_run_rate, connected_units, gps_pings_per_day, sla_pct, latency_ms}` |
| GET | `/super-admin/organizations/?page=&status=&search=` | `{name, tier, fleet, users, mrr, status, verification}` |
| POST | `/super-admin/organizations/{id}/verify/` | `{approved: bool, note}` |
| PATCH | `/super-admin/organizations/{id}/` | suspend/activate/rename |
| GET | `/super-admin/users/?page=&search=` · PATCH `/super-admin/users/{id}/` | global user admin (role, lock, unlock) |
| GET/POST | `/super-admin/plans/` · PATCH `/super-admin/plans/{id}/` | plan CRUD + entitlements |
| GET | `/super-admin/subscriptions/?status=` | all tenant subscriptions |
| GET | `/super-admin/audit-logs/?actor=&action=&date_from=&page=` | platform audit |
| GET | `/super-admin/system-health/` | db, redis, celery workers/beat, queue depth, storage |
| GET/POST/PATCH | `/super-admin/feature-flags/` | `{key, enabled, rollout_pct, description}` |
| PATCH | `/super-admin/config/` | platform settings (registration open, maintenance mode) |
| GET | `/super-admin/support/tickets/?page=` · PATCH | support management |

---

## 23. WebSocket contract

Endpoint: `wss://<api>/ws/<channel>/?token=<access_jwt>` (query token because browsers can't set headers; token is short-lived and org-bound).

| Channel | Group name | Events |
|---|---|---|
| `/ws/tracking/` | `org:{id}:tracking` | `location.updated` |
| `/ws/dispatch/` | `org:{id}:dispatch` | `assignment_created`, `progress_updated`, `status_changed` |
| `/ws/notifications/` | `org:{id}:notifications` | `notification.created` |
| `/ws/orders/` | `org:{id}:orders` | `order.status_changed` |

Rules: authenticate in `connect()` (reject `401`), join groups **only** using the token's `org` claim, validate payload schemas, heartbeat ping/pong 30s, tolerant reconnection, never broadcast cross-tenant. Permission re-check on group join for role-restricted channels (dispatch).

---

## 24. Rate limits (default)

| Surface | Limit |
|---|---|
| `/auth/login` | 5/min/IP, 10/15min/email |
| `/auth/forgot-password`, `/auth/resend-verification` | 5/hour/email + 20/hour/IP |
| `/shipments/track/` (public) | 20/min/IP |
| `/ai/chat/` | 20/min/user |
| `/tracking/ingest/` | per-device quota (1/min expected) |
| authenticated default | 300/min/user (throttling classes) |

Backed by Redis scopes (`django-ratelimit` or DRF throttle classes), `429` with `Retry-After`.

---

## 25. Error code registry (stable)

`validation_error` · `invalid_credentials` · `email_not_verified` · `email_exists` · `weak_password` · `terms_required` · `account_locked` · `too_many_attempts` · `rate_limited` · `invalid_code` · `code_expired` · `token_expired` · `token_invalid` · `refresh_revoked` · `not_a_member` · `forbidden` · `platform_admin_required` · `not_found` · `invalid_transition` · `not_archivable` · `ref_exists` · `driver_unavailable` · `vehicle_unavailable` · `insufficient_stock` · `sku_not_found` · `negative_total` · `file_too_large` · `invalid_file_type` · `plan_limit_reached` · `plan_expired` · `payment_required` · `provider_unavailable` · `ai_unavailable` · `no_telemetry` · `no_active_trip` · `shipment_not_found` · `last_owner` · `builtin_role` · `idempotency_conflict`

---

## 26. OpenAPI → frontend contract

- `/api/schema/` (YAML), `/api/docs/` (Swagger UI), `/api/redoc/`.
- CI step: `npx openapi-typescript http://localhost:8000/api/schema/ -o Frontend/src/lib/api/schema.d.ts` → typed client; drift fails CI.
- Every operation carries `operationId`, tags per module, examples for error envelope.
