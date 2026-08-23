# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — dev server on **port 4201** (`ng serve --port 4201`), not the default 4200.
- `npm run build` — production build to `dist/`.
- `npm run watch` — development build with file watching.
- `npm test` — Karma + Jasmine unit tests. Run a single spec file with `ng test --include='**/data.service.spec.ts'`.

## Architecture

Angular 17 standalone-components app (no NgModules). Routing is configured in `src/app/app.routes.ts` using `loadComponent` for lazy loading; all feature routes are children of a single `LayoutComponent` shell.

### State management — signals + localStorage

`DataService` (`src/app/services/data.service.ts`) is the single source of truth. It holds writable `signal`s for `portfolioState`, `assetsState`, `liabilitiesState`, `equityInvestmentsState`, `maturitiesState`. Persistence is automatic: an `effect()` per signal writes to `localStorage` under the `wealth_*` keys whenever the signal changes, and signals are seeded from `localStorage` at construction. All persistence is gated by `isPlatformBrowser` to remain SSR-safe.

Key derivations live as `computed()` signals inside `DataService`:
- `allAssets` merges manual assets with `equityInvestmentsState` mapped into `AssetDto` shape — Portfolio Manager view consumes this, not the raw `assetsState`.
- `recalculatePortfolio()` is called from the constructor and after mutations to refresh aggregate totals on `portfolioState`.

`FinancialHealthService` is a thin read-only projection over `DataService.portfolioState()` exposing individual `computed` slices (totals, allocations, health score). Components should generally read from this service rather than touching `portfolioState()` directly.

### Domain model

All DTO shapes are centralized in `src/app/models/master-data.ts`. Note the dual representation of equity: `EquityInvestmentDto` (with SIP/Lumpsum transactions, frequency, status) is the source for the Investments/SIPs view, while the same items are projected into `AssetDto` form (category `'Equity'`) for the unified Portfolio Manager view via `allAssets`. When adding fields to equity, update both shapes and the mapping in `allAssets`.

### Components

Feature areas under `src/app/components/`:
- `layout/` — shell with nav, hosts the router outlet.
- `dashboard/` — net worth, allocations, health summary.
- `portfolio-manager/` — CRUD over the merged assets + liabilities view.
- `investments-sips/` — equity/SIP-specific management with transactions.
- `liquidity-timeline/` — maturity schedule view.

Charts use `ngx-echarts` (echarts 6). Styling is Tailwind CSS 3 configured via `tailwind.config.js` and PostCSS.

## Conventions

- Mutations go through `DataService` methods (e.g. `upsertAsset`); do not write to `localStorage` directly — let the persistence `effect()`s handle it.
- After mutating any source signal that affects portfolio totals, call `recalculatePortfolio()`.
- Keep new routes lazy-loaded via `loadComponent` to match the existing pattern.
