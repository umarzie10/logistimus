# Project Inventory: Logistimus Frontend

**Audit Date:** November 2026  
**Platform:** Next.js 16.4.3 (App Router, Turbopack, React 19)  
**Language:** TypeScript 5.8 (Strict Mode)  
**Styling Engine:** Tailwind CSS v4 (`@theme` token architecture)  
**Design System Authority:** `Frontend/DESIGN.md`

---

## 1. Architecture & Framework Overview

- **Routing:** Next.js App Router with React Server Components by default and client-side interactivity isolated via `"use client"`.
- **Styling Architecture:** Direct CSS-first tokens in `globals.css` with `@theme` block defining `--color-ice`, `--color-powder`, `--color-royal`, `--color-midnight`, the blue ramp (`50` through `950`), desaturated semantic state colors (`success`, `warning`, `danger`), text & line tokens (`muted`, `line`), and shape tokens (`card: 28px`, `frame: 20px`, `input: 16px`).
- **Typography:** Hanken Grotesk (weights 300, 400, 500, 600) via Next.js Google font loader + DM Mono (weight 400).
- **Icons:** `lucide-react`.
- **Client Utilities:** Custom download and RFC 4180 CSV serializer in `src/lib/download.ts`, class merging utility in `src/lib/utils.ts`.

---

## 2. Route Inventory (26 Routes)

All routes are fully prerendered static pages (`○ Static`) during `next build`:

| Path | Category | Purpose | Interactivity / State |
|---|---|---|---|
| `/` | Marketing | High-converting editorial landing page (sections 01–10) | Interactive drawer, calculator, mockups |
| `/pricing` | Marketing | Transparent tiered pricing with annual toggle | Monthly/annual billing toggle, FAQ accordion |
| `/portal` | Public / Customer | Public cargo consignment tracking portal | Real-time tracking search, verified vs not-found states |
| `/driver` | Mobile / PWA | Turn-by-turn mobile driver portal | GPS active toggle, e-POD digital signature simulation |
| `/admin` | Administration | Platform super-admin multi-tenant control plane | Dark midnight mode, organization telemetry |
| `/dashboard` | SaaS Platform | Central operational overview & live fleet map | Live fleet map refresh, telemetry activity feed |
| `/orders` | SaaS Platform | Dispatch order management & manifest center | Multi-criteria search, status filter, CSV export, manifest drawer |
| `/dispatch` | SaaS Platform | Active corridor scheduling & driver pool | Driver assignment modal, AI route optimization apply toggle |
| `/fleet` | SaaS Platform | 362-unit fleet management & CAN-bus telematics | 3D vehicle models, live CAN-bus telematics inspection modal |
| `/drivers` | SaaS Platform | Regulatory roster, licensing & duty tracking | ELD logbook inspection modal with HOS timeline |
| `/warehouse` | SaaS Platform | WMS distribution docks & bin inventory | Bay status indicators, GS1-128 barcode inbound scanner modal |
| `/crm` | SaaS Platform | Enterprise shipping accounts & SLA agreements | Customer onboarding modal, client billing ledger inspection |
| `/finance` | SaaS Platform | Invoicing, accounts receivable & settlements | Billing statements CSV export, status filters |
| `/analytics` | SaaS Platform | Predictive intelligence & emissions telemetry | Full audit report text export, SLA performance charts |
| `/ai` | SaaS Platform | AI logistics dispatch copilot | Conversation message stream with actionable recommendations |
| `/notifications`| Platform Utility| Operational alert center | Unread filter, mark all read, clear list, severity tags |
| `/settings` | Platform Utility| Organization profile & API access control | Key rotation notice (honest backend requirement) |
| `/sign-in` | Authentication | Workspace authentication entrypoint | Form validation, client-side session routing |
| `/sign-up` | Authentication | Company registration & workspace setup | Multi-field onboarding validation, routing |
| `/forgot-password`| Authentication| Password recovery dispatch | One-time recovery dispatch simulation |
| `/reset-password`| Authentication| Secure password reset screen | Password strength & matching validation, redirect |
| `/verify-email` | Authentication| 6-digit confirmation code verification | Auto-focusing 6-digit pin input, resend timer |
| `/privacy` | Legal | Privacy policy document | Editorial text layout |
| `/terms` | Legal | Terms of service document | Editorial text layout |
| `/_not-found` | Platform Error | 404 fallback page | Navigation recovery links |
| `/error` | Platform Error | Global Next.js runtime error boundary | Client retry trigger, recovery to dashboard |

---

## 3. Component Catalog

### Marketing Components (`src/components/marketing/`)
- `Navbar.tsx`: Pill navigation bar with desktop dropdown menus, brand logo, and responsive mobile slide-out drawer.
- `Footer.tsx`: Minimal brand-compliant footer adhering to DESIGN.md palette and typography.
- `HeroSection.tsx`: Editorial hero with primary conversion call-to-actions.
- `BrandStatement.tsx`: Core value proposition presentation.
- `DashboardShowcase.tsx`: Realistic multi-viewport operations platform preview.
- `DashboardMockup.tsx`: High-fidelity interactive UI simulation.
- `InteractiveTools.tsx`: Cost & fleet sizing calculators.
- `NetworkMap.tsx`: Central Asian & Eurasian corridor mapping.
- `EcosystemSection.tsx`: Integration architecture & connected modules.
- `GlobalSection.tsx`: Global connectivity and border crossing telemetry.
- `Logo.tsx`: Dual-variant SVG brand mark (light mode & on-dark).

### Application Shell Components (`src/components/app/`)
- `AppShell.tsx`: Unified wrapper providing the responsive sidebar, sticky header, and main viewport padding.
- `AppSidebar.tsx`: Multi-module navigation with unread badges, active state indicators, dedicated portal links, and popover workspace selector (`Central Logistics Hub`, `Samarkand Yard`, `Tashkent Air Depot`).
- `AppHeader.tsx`: Contextual title, quick-order action button, live network pulse badge, notifications bell popover with unread counter, and user avatar.

---

## 4. Dependencies & Environment

```json
{
  "dependencies": {
    "clsx": "^2.1.1",
    "lucide-react": "^1.16.0",
    "next": "16.4.3",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "tailwind-merge": "^3.5.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.4.3",
    "postcss": "^8",
    "tailwindcss": "^4.0.0",
    "typescript": "^5"
  }
}
```
No external runtime state management library is required: state is kept clean, colocated, and deterministic using React 19 hooks.
