Warehouse app: logs packages received at the warehouse and edits/deletes
existing ones. `ADMIN`/`WAREHOUSE_ATTENDANT` roles only — the same shared
staff accounts `../admin` (Service-Provider) provisions. Company
onboarding, staff management, the audit log, and cross-company reports all
live in `../admin` instead; this app is purely the package-logging screen
that used to be `../admin`'s own dashboard.

Connects to Postgres directly, with its own mirrored copy of `../admin`'s
Prisma schema (same physical database and tables — `../admin` is the sole
migration authority, see the root README's "Adding a schema change").

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4
- PostgreSQL via Prisma 6 — one of three apps in the repo with a database
  connection (`../admin`, `../api` are the other two)
- Auth.js (NextAuth v5, Credentials provider, JWT sessions) — logs in
  against the same `users` table `../admin` owns

## Roles

| Role | View packages | Add package | Edit package | Delete package |
| --- | --- | --- | --- | --- |
| `ADMIN` | ✅ | ✅ | ✅ | ✅ |
| `WAREHOUSE_ATTENDANT` | ✅ | ✅ | ✅ | ❌ |

## Setup

1. Install dependencies (own `package.json`/`node_modules`):

   ```bash
   npm install
   ```

2. Point `DATABASE_URL` in `.env` at the same Postgres `../admin` uses (it
   must already be migrated and have at least one `ADMIN`/
   `WAREHOUSE_ATTENDANT` account — create a company in `../admin` first).

3. Generate the Prisma client:

   ```bash
   npm run db:generate
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Visit http://localhost:3020. Sign in with any `ADMIN` or
   `WAREHOUSE_ATTENDANT` account from `../admin`'s Users page.

## Logging packages

Click **Log package** on the dashboard. The modal is built for warehouse
scanning workflows:

- The tracking number field auto-focuses and stays focused between scans.
- A hardware barcode scanner acts as a keyboard: it types the barcode then
  sends `Enter`, which submits the package automatically.
- No scanner? Type the tracking number and press `Enter`, or use **Scan with
  camera** to decode a barcode through the device camera.
- "Received by" and the timestamp are set automatically from the signed-in
  user and the current time — nothing to fill in.
- Status defaults to `Received` and can be changed per scan to `Damaged`,
  `Empty package`, or `Returned`; it resets to `Received` after each submit.
- The modal stays open after each scan (tracking field clears and
  refocuses, and a running "logged this session" list appears) so an
  attendant can keep scanning box after box.
- Closing the modal (`Done — close`, the `×` button, or `Esc`) refreshes the
  packages list behind it.

## Project structure

- `prisma/schema.prisma` — mirrors `../admin`'s schema. Never run `prisma
  migrate`/`db push` here.
- `src/app/dashboard/page.tsx` — the package list/log/edit screen
  (`PackagesView`, `PackageEditModal`, `LogPackageModal`, `PackageList`,
  `PackageFilters`, `PackageStatusBadge`, `BarcodeCameraScanner`).
- `src/app/api/packages/**` — list/create/edit/delete packages
  (role-checked). Note the DELETE handler explicitly clears
  `PackageStatusEvent`/`DeliveryAssignment` rows for a package before
  deleting it, in one transaction — neither relation cascades at the
  schema level.
- `src/app/api/customers/**` — a lightweight customer picker (name/email
  only, no financial data) for the package edit modal's "reassign
  customer" field.
- `src/lib/packageStatusNotify.ts` / `src/lib/invoicePdf.ts` — sends the
  customer-facing "package ready" email with the generated invoice PDF on
  a status change. Duplicated in `../api` (which also changes package
  status, e.g. via manifest generation) rather than shared — small and
  unlikely to drift.

## Useful scripts

- `npm run db:generate` — regenerate the Prisma client after pulling a
  schema change from `../admin`.
- `npm run lint` — ESLint.
- `npm run build` — production build + typecheck.
