# Logistimus — Frontend Application

This directory contains the Next.js 16 App Router application for the **Logistimus** freight operations platform.

- **Framework:** Next.js 16.4.3 (App Router, Turbopack, React 19)
- **Styling:** Tailwind CSS v4 with `@theme` token architecture
- **Design System:** [`DESIGN.md`](./DESIGN.md)
- **Audit Documentation:** [`docs/frontend-audit/`](./docs/frontend-audit/)

### Available Scripts

- `npm run dev`: Starts local development server on port 3000.
- `npm run build`: Generates optimized static production build.
- `npm run start`: Runs production server.
- `npm run lint`: Runs ESLint validation.
- `npx tsc --noEmit`: Verifies TypeScript strict type safety.
- `node tests/run-audit-qa.js`: Runs full Playwright 5-viewport responsive QA suite.

For full project documentation, see the root [`README.md`](../README.md).
