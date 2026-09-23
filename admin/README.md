Service-Provider app: onboards freight-forwarder companies and issues their
API keys, manages staff accounts, and hosts an audit log and cross-company
reports. ADMIN role only — package logging (the one thing
`WAREHOUSE_ATTENDANT` accounts do) lives in `../warehouse` instead; this app
only provisions those accounts, it doesn't have a screen for using them.

This is the schema owner for the whole system — it owns the full Prisma
schema (including tables only `../api`, `../warehouse`, and every
`../customer-portal` deployment use, like portal users/settings/rates/
manifests) and is the sole app allowed to run `prisma migrate`/`db push`
against the shared database. `../api` and `../warehouse` each keep their
own mirrored copy of the schema (same physical tables, generated but never
migrated) — see the root README's "Adding a schema change".

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4
- PostgreSQL via Prisma 6 — one of three apps in the repo with a database
  connection (`../api`, `../warehouse` are the other two)
- Auth.js (NextAuth v5, Credentials provider, JWT sessions)

## Roles

| Role | Companies | Users | Audit log | Reports |
| --- | --- | --- | --- | --- |
| `ADMIN` | ✅ | ✅ | ✅ | ✅ |
| `WAREHOUSE_ATTENDANT` | ❌ | ❌ | ❌ | ❌ |

`WAREHOUSE_ATTENDANT` accounts exist in the shared `users` table (created
here, under Users) but have nothing to do in this app — every page under
`/dashboard` is ADMIN-only. They log into `../warehouse` instead, with the
same credentials.

## Setup

1. Install dependencies (this app has its own `package.json`/`node_modules`
   — no shared install step with the rest of the repo):

   ```bash
   npm install
   ```

2. Start Postgres. Either run the bundled Docker Compose file:

   ```bash
   docker compose up -d
   ```

   or point `DATABASE_URL` in `.env` at any Postgres instance you already have running.

3. Copy `.env.example` to `.env` (already done for local dev) and set `AUTH_SECRET`
   (`openssl rand -base64 32`) and `DATABASE_URL`.

4. Run the migration and seed the initial admin account:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

   Seeds exactly one account — `admin@freightforwarder.test` / `password123`
   — enough to log in and create the first real company (which provisions
   its own Warehouse/customer-portal accounts through the normal flows,
   not the seed script).

5. Start the dev server:

   ```bash
   npm run dev
   ```

   Visit http://localhost:3000.

## Companies (onboarding client applications)

`/dashboard/companies` is where a new freight forwarder gets registered.
Each company gets an `apiKey` (generated on creation, regenerable — see
`CompaniesView.tsx` for the show/copy/regenerate UI) that its
`customer-portal` deployment and mobile app build both use as their
`TENANT_API_KEY` / `x-api-key` — both to identify themselves to `../api`
and as their credential for it, so many client apps (one per company) can
safely share the same `../api` instance and database, since every table
they touch is scoped by companyId. Creating a company also provisions that
deployment's initial admin account: an OTP is generated (`src/lib/otp.ts`),
hashed into a `PortalUser` row created directly here (with `companyId` set
and `mustChangePassword` true), and both the OTP and API key are emailed to
the company's contact via Resend (`src/lib/email.ts`) — or, without
`RESEND_API_KEY` configured, logged to the console and returned in the API
response for `CompaniesView.tsx` to display instead.

## Project structure

- `prisma/schema.prisma` — owns the schema for the whole system: `User`,
  `Package`, and `Company` (this app's own concerns) alongside `PortalUser`,
  `PortalSettings`, `ShippingRate`, `Location`, `Manifest`, `FaqItem`,
  `AuthorizedPickupPerson`, and `DeliveryAssignment` (used by `../api`,
  `../warehouse`, and every `../customer-portal` deployment, but still
  migrated and owned here).
- `src/lib/auth.ts` / `src/lib/auth.config.ts` — Auth.js config, split so
  `src/proxy.ts` (route protection) can run without Node-only dependencies.
  Every `/dashboard/**` route requires `role === "ADMIN"`.
- `src/components/Sidebar.tsx` — left-hand nav (Companies, Users, Audit
  Log, Reports).
- `src/app/api/companies/**` — admin-only freight forwarder company
  directory; see "Companies" above.
- `src/app/api/users/**` — admin-only staff user management (`ADMIN` and
  `WAREHOUSE_ATTENDANT` accounts, shared with `../warehouse`).
- `src/app/dashboard/reports/**` — cross-company financial/customers/
  packages reports (system-wide, distinct from each `customer-portal`
  instance's own per-tenant reports).

## Useful scripts

- `npm run db:studio` — Prisma Studio to browse the database.
- `npm run lint` — ESLint.
- `npm run build` — production build + typecheck.
