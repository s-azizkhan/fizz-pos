# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> The import above pulls in two hard rules: this is **Next.js 16** (read `node_modules/next/dist/docs/` before writing framework code — APIs differ from training data) and **all UI must follow the Fizz brand spec** in `brand.md`. Both are mandatory.

## Commands

```bash
npm run dev            # Next dev server (localhost:3000)
npm run build          # Production build
npm run lint           # ESLint (eslint-config-next)
npm run db:push        # Push Drizzle schema to DB (no migration file)
npm run db:generate    # Generate a SQL migration into drizzle/
npm run db:seed        # Seed/promote the admin user (scripts/seed-admin.ts)
```

No test runner is configured. Type-check via `npm run build` or `npx tsc --noEmit`.

Required env: `DB_URL` (postgres), `SESSION_SECRET` (JWT signing). Seeder reads optional `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME`.

## Architecture

**Single-store café POS.** Public marketing/menu site + an authed `/dashboard` operating the till, inventory, menu, expenses, and analytics.

### Single-store model
Every row links to one store identified by the fixed UUID `STORE_ID` in `lib/store/constants.ts`. `getStore()` (`lib/store/data.ts`) lazily creates that singleton row. The schema is multi-store-ready but the app is hardwired to one store — scope new queries by `STORE_ID`.

### Auth (two-layer)
- `proxy.ts` is the Next 16 middleware (renamed from `middleware.ts`). It does an **optimistic** check only — verifies the JWT signature with no DB hit, redirecting `/dashboard/*` ↔ `/login`. Must stay Edge-compatible: no `next/headers`, no `server-only` imports.
- Real authorization lives in the **DAL** (`lib/auth/dal.ts`), close to the data. `verifySession()` / `getCurrentUser()` read the cookie, verify the JWT, and confirm the user still exists in the DB. Both are `react`-`cache`d (one DB hit per render) and `server-only`. Server Actions call `getCurrentUser()` before doing work.
- Session = `jose` HS256 JWT in the `fizz_session` httpOnly cookie, 7-day expiry (`lib/auth/session.ts`). Passwords are scrypt `<saltHex>.<hashHex>` (`lib/auth/password.ts`).
- Roles: `admin` > `manager` > `staff` (`lib/db/schema/user.ts`).

### Data flow
- **DB**: Drizzle + postgres.js. Client singleton in `lib/db/index.ts` (reused across hot reloads, `prepare: false`). Schema is split one-table-per-file under `lib/db/schema/`, re-exported via the barrel `index.ts`. Money is `numeric(precision,scale)` stored as **strings** to avoid float drift — convert with `Number()` / `.toFixed(2)`, never do float math on stored values.
- **Mutations** go through Server Actions in `app/actions/*.ts` (`'use server'`). They validate input with **zod schemas that live next to the table** in `lib/db/schema/*` (e.g. `checkoutSchema` in `order.ts`), recompute money server-side (never trust client totals — see `computeTotals` in `actions/order.ts`), write in a `db.transaction`, then `revalidatePath` the affected routes.
- **Reads** for pages live in `lib/store/*.ts` (server-only data loaders, often `react`-`cache`d), separate from the Drizzle table schemas in `lib/db/schema/`. Note the naming collision: `lib/store/` = page data loaders/helpers, `lib/db/schema/store.ts` = the store DB table.

### UI
- App Router, Server Components by default; `'use client'` only for interactivity. Pages in `app/dashboard/*/page.tsx` are thin servers that load data and render a client component from `components/fizz/`.
- All brand UI lives in `components/fizz/`, organized by feature (`pos/`, `orders/`, `menu/`, `inventory/`, `analytics/`, `margins/`, `dashboard/`).
- Client UI state → zustand (`lib/store/ui.ts`); only the sidebar-collapse preference is persisted.
- Tailwind v4 (CSS-first config in `app/globals.css` `@theme`). Use brand token classes (`bg-ink`, `text-fizz`, `rounded-fizz`, …) — never raw hex.

### Order lifecycle
An order is `open` (editable running tab) → `paid` (settled) or `void`. `saveOrder` persists an open tab without payment; `checkout` settles it; `voidOrder` cancels. Line items snapshot name/price onto the row so receipts stay stable when the menu changes later. Order/invoice numbers are claimed atomically via `nextOrderNumber()` / `nextInvoiceNumber()` (SQL increment on the store row).
