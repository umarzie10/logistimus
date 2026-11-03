# Frontend Issues Register

**Scope:** Logistimus Frontend Source Audit  
**Status:** All identified issues resolved and verified.

---

## Severity Summary

| Severity | Total Identified | Total Resolved | Remaining |
|---|---|---|---|
| **Critical (P0)** | 4 | 4 | 0 |
| **High (P1)** | 6 | 6 | 0 |
| **Medium (P2)** | 5 | 5 | 0 |
| **Low (P3)** | 3 | 3 | 0 |
| **Total** | **18** | **18** | **0** |

---

## Detailed Issues Log

### P0 — Critical Issues

#### ISS-01: Full Page Reload on Authentication Forms
- **Description:** `sign-in/page.tsx` and `sign-up/page.tsx` used `window.location.href = "/dashboard"`, triggering full browser document teardown and violating SPA state management.
- **Root Cause:** Placeholder implementation before App Router router integration.
- **Resolution:** Replaced with Next.js App Router `useRouter().push("/dashboard")`.

#### ISS-02: Missing Application Error Boundary & Loading State
- **Description:** The application lacked root `loading.tsx` and `error.tsx` boundary handlers, leaving unhandled async exceptions and hydration delays without branded fallback UI.
- **Root Cause:** Omission during rapid scaffolding.
- **Resolution:** Implemented `src/app/loading.tsx` (pulsing skeleton card) and `src/app/error.tsx` (client error boundary with retry trigger and control plane recovery).

#### ISS-03: Dead Interactive Controls (16 Controls)
- **Description:** Multiple user-facing action buttons were non-functional: Export CSV in Orders, Download Audit in Analytics, Export Statements in Finance, Add Customer & View Ledger in CRM, live map refresh in Dashboard, Assign Route & Apply Suggested Route in Dispatch, Start GPS in Driver, View Logbook in Drivers, Inspect Telematics in Fleet, Barcode Scanner in Warehouse, Key Rotate in Settings, Bell icon in AppHeader, Workspace Selector in AppSidebar.
- **Root Cause:** Buttons lacked `onClick` event handlers and local state feedback.
- **Resolution:** Fully wired every button with client-side state, modals, RFC 4180 CSV downloads, or honest backend-requirement disclaimers.

#### ISS-04: Fabricated Trust & Security Badges
- **Description:** `sign-in/page.tsx` presented unverified claims ("Over 1,280 active carriers", "1,284+ Active Fleet", "99.8% SLA", "42+ Hubs", and "SOC2 & ISO 27001").
- **Root Cause:** Placeholder marketing copy.
- **Resolution:** Replaced with honest capability statements ("TLS 1.3 · Secure Session", "Real-Time GPS & ELD", "Multi-Modal Fleet Dispatch", "Automated WMS & Billing").

---

### P1 — High Severity Issues

#### ISS-05: Widespread Unused Import Specifiers (84 Specifiers across 21 Files)
- **Description:** 84 unused icons and types cluttered imports, risking tree-shaking regressions and failing strict linter policies.
- **Resolution:** Cleaned via `scripts/audit/fix-unused-imports.mjs`.

#### ISS-06: 64 Ad-Hoc Shadows Violating DESIGN.md §4
- **Description:** Elements used Tailwind `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-2xl`, and `drop-shadow-*`, violating the flat design standard.
- **Resolution:** Completely stripped via `scripts/audit/normalize-design.mjs`.

#### ISS-07: 6 Off-Spec UI Surface Gradients
- **Description:** Six surface gradients (`bg-gradient-to-*`) were present on card headers, banners, and map containers.
- **Resolution:** Converted to flat palette surfaces (`bg-[#0E2F76]` or `bg-[#DBE9F5]`).

#### ISS-08: Off-Palette Colors (~130 Occurrences)
- **Description:** Default Tailwind greens, ambers, reds, cyans, and purples were used instead of the specified desaturated semantic state tokens (`#7FA9A6`, `#C9B58A`, `#C08A88`).
- **Resolution:** Mapped to `--color-success`, `--color-warning`, `--color-danger`, and the blue ramp (`blue-50` through `blue-950`).

#### ISS-09: Unloaded Typography Weights (121 `font-bold` Occurrences)
- **Description:** Code used `font-bold` (700) and `font-black` (900), but Hanken Grotesk only loads weights 300, 400, 500, 600.
- **Resolution:** Systematically remapped headings and stats to `font-light` (300) and buttons to `font-medium` (500).

#### ISS-10: Button & Interactive Radius Inconsistency
- **Description:** Action buttons and Link CTAs used `rounded-xl` (16px) or `rounded-lg` instead of the specified full pill radius (`rounded-full`).
- **Resolution:** Updated all buttons and interactive chips to `rounded-full` while preserving `rounded-input` (16px) on form fields.

---

### P2 — Medium Severity Issues

#### ISS-11: Missing Essential Auth & Communication Routes
- **Description:** Routes `/reset-password`, `/verify-email`, and `/notifications` were missing from the application tree.
- **Resolution:** Created clean, responsive, fully typed pages for all three routes.

#### ISS-12: Unescaped Entities in JSX
- **Description:** Raw apostrophe in `settings/page.tsx` (`don't`) caused React hydration/ESLint warnings.
- **Resolution:** Replaced with `&apos;`.

#### ISS-13: Missing Not-Found / Error Fallback State in Tracking Portal
- **Description:** `portal/page.tsx` always rendered shipment ORD-24101 regardless of user query.
- **Resolution:** Added query validation and an explicit "Shipment Not Found" state card.

#### ISS-14: Lack of Table Numeric Formatting
- **Description:** Numeric tables and metrics lacked tabular figures, causing layout shifts when numbers updated.
- **Resolution:** Applied `tabular-nums` across all KPI metrics and table data cells.

#### ISS-15: Bell Icon in AppHeader Lacked Notification View
- **Description:** Header notification bell was a dead button.
- **Resolution:** Added popover with 3 operational alerts and deep link to `/notifications`.

---

### P3 — Low Severity Issues

#### ISS-16: Ad-Hoc Navy Hexes (`#162B5E`, `#1A3A75`, `#163B84`)
- **Description:** Hardcoded hex values outside the blue ramp.
- **Resolution:** Mapped to dark-mode line token `#2A4A8E` and royal ramp colors.

#### ISS-17: Soft Background Tint Drift (`#F8FBFE`, `#EAF2FB`)
- **Description:** Sub-pixel gray/blue tints inconsistent with `--color-ice` (`#F4FEFF`) and `--color-blue-100` (`#DBE9F5`).
- **Resolution:** Normalized to white (`#FFFFFF`) or blue-100 (`#DBE9F5`).

#### ISS-18: Arbitrary Drop-Shadow in Brand Logo
- **Description:** `Logo.tsx` contained `drop-shadow-[0_0_8px_rgba(244,254,255,0.25)]`.
- **Resolution:** Removed in compliance with zero-shadow directive.
