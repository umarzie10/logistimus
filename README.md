# Logistimus — Next-Gen Logistics & Freight Operations Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.4.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Audit Score](https://img.shields.io/badge/Audit_Readiness-98%2F100-success)](./Frontend/docs/frontend-audit/FRONTEND-READINESS.md)

Logistimus is an enterprise freight logistics, corridor dispatch, and warehouse management system (WMS) control plane. Built with Next.js 16 App Router, React 19, and Tailwind CSS v4, adhering strictly to the flat, shadowless **Logistimus Design System (`DESIGN.md`)**.

---

## Key Modules & Features

- **Operations Dashboard (`/dashboard`):** Real-time fleet telematics, corridor status, interactive live map with refresh simulation, and live operational activity feed.
- **Corridor Dispatch (`/dispatch`):** Highway route scheduling, active corridor progress tracking, driver pool availability, and AI route optimization suggestions.
- **Fleet Management (`/fleet`):** 362-unit fleet monitoring, 3D truck models, odometer tracking, and CAN-bus telematics diagnostics modal.
- **Regulatory Drivers Roster (`/drivers`):** Regulatory driver roster, medical/ADR certifications, on-time rates, and ELD Hours-of-Service (HOS) logbook inspector.
- **Warehouse Management WMS (`/warehouse`):** Loading dock bay management (occupied vs available), GS1-128 barcode inbound scanner, and bin location tracking.
- **Customer CRM & SLAs (`/crm`):** Enterprise shipper accounts, SLA metrics, new customer onboarding modal, and customer billing ledger inspection.
- **Finance & Billing (`/finance`):** Revenue ledgers, client invoices, and RFC 4180 CSV billing statements export.
- **Analytics & ESG (`/analytics`):** Fuel curves, CO2 reduction metrics, SLA achievement charts, and full audit text export.
- **Public Tracking Portal (`/portal`):** Public cargo consignment tracking with verified progress timeline and honest "Shipment Not Found" states.
- **Mobile Driver PWA (`/driver`):** Smartphone-optimized turn-by-turn navigation toggle, waypoint tracking, and digital proof-of-delivery (e-POD).
- **Notification Center (`/notifications`):** Operational alerts, delivery receipts, unread filter, and quick notification popover in the app header.
- **Authentication & Security:** SPA sign-in, company registration, password reset (`/reset-password`), 6-digit email verification (`/verify-email`), and honest key rotation notices.

---

## Design System Specifications (`DESIGN.md`)

- **Color Palette:**
  - `Ice White` (`#F4FEFF`): Clean primary background
  - `Powder Blue` (`#A9C0E0`): Focus rings, chips, secondary surfaces
  - `Royal Navy` (`#0E2F76`): Primary buttons, headers, brand accents
  - `Midnight Navy` (`#061336`): High-contrast typography and dark surfaces
  - `Muted Slate` (`#3F5C96`): Sub-headers, secondary labels, metadata
  - `Line` (`#CFDBEE` / `#2A4A8E`): 1px structural dividers
  - Desaturated Semantic States: `Success` (`#7FA9A6`), `Warning` (`#C9B58A`), `Danger` (`#C08A88`)
- **Typography:** Hanken Grotesk (`300, 400, 500, 600`) and DM Mono (`400`). Stat numbers & headings set to `300` (font-light), buttons to `500` (font-medium), tables formatted with `tabular-nums`.
- **Zero Shadows & Zero Gradients:** Strictly flat, editorial UI surfaces with no drop shadows or surface gradients.
- **Radius Tokens:** Cards (`28px`), Frames (`20px`), Inputs (`16px`), Buttons/Chips (`999px` full radius).

---

## Project Structure

```
Logistimus/
├── Frontend/                 # Next.js 16 Application
│   ├── docs/
│   │   └── frontend-audit/   # Comprehensive 6-part audit & readiness documentation
│   ├── public/               # Static assets & 3D vehicle renders
│   ├── scripts/              # Audit verification & design normalization scripts
│   ├── src/
│   │   ├── app/              # Next.js App Router (26 static routes)
│   │   ├── components/       # Marketing and App Shell components
│   │   └── lib/              # Client utilities & RFC 4180 CSV export
│   ├── tests/                # Playwright responsive test suites
│   ├── DESIGN.md             # Authoritative design system reference
│   ├── package.json
│   └── tsconfig.json
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js 20+ (recommended: Node.js 22 or 24)
- npm or pnpm

### Installation

```bash
cd Frontend
npm install
```

### Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

### Production Build & Type Check

```bash
# Type check with strict mode
npx tsc --noEmit

# Lint check with Next.js rules
npm run lint

# Production build
npm run build

# Start production server
npm run start
```

### Running Automated QA & Playwright Tests

```bash
node tests/run-audit-qa.js
```

---

## Audit & Verification Reports

Complete production readiness documentation is located in [`Frontend/docs/frontend-audit/`](./Frontend/docs/frontend-audit/):
1. `PROJECT-INVENTORY.md`: Complete route and component inventory.
2. `FRONTEND-AUDIT.md`: Design system, accessibility, and token audit.
3. `ISSUES.md`: Resolved issues register.
4. `FIX-LOG.md`: Step-by-step modification and hardening log.
5. `TEST-REPORT.md`: Playwright 95/95 multi-breakpoint test matrix.
6. `FRONTEND-READINESS.md`: Production readiness assessment & backend API contracts.

---

## License

Private & Proprietary — Developed for Logistimus Freight Operations.
