The one REST API of record for this system's client applications — every
`../customer-portal` deployment and the Flutter mobile app call this app,
not the database directly. Meant to be callable from any language: no
shared client library, just plain HTTP + JSON (and multipart for file
uploads), documented as an OpenAPI 3.0 spec served at `/docs`.

**`src/app/api/v1/**` must never be reachable from the public internet** —
every route trusts its `x-api-key` (or bearer token, for `/v1/mobile/**`)
completely, with no role-based field restriction of its own; that's the
calling app's job, applied before it decides what to send. Whoever can
reach `v1/**` with a valid key has full read/write access to that
company's data.

## Stack

- Next.js 16 (App Router) + TypeScript — a pure API app, no pages besides
  `/docs`
- PostgreSQL via Prisma 6 — its own mirrored copy of `../admin`'s schema
  (same physical database and tables; `../admin` is the sole migration
  authority — see the root README's "Adding a schema change")
- `@asteasolutions/zod-to-openapi` + `swagger-ui-react` for `/docs` — the
  spec is generated from the same Zod schemas each route already validates
  requests with (`src/lib/openapi/**`), not hand-maintained separately

## Setup

1. Install dependencies (own `package.json`/`node_modules`):

   ```bash
   npm install
   ```

2. Point `DATABASE_URL` in `.env` at the same Postgres `../admin` uses (it
   must already be migrated — `../admin`'s own setup does that).

3. Generate the Prisma client:

   ```bash
   npm run db:generate
   ```

4. Set `MOBILE_JWT_SECRET` (`openssl rand -base64 32`) — signs the bearer
   tokens `/v1/mobile/auth/login` issues.

5. Start the dev server:

   ```bash
   npm run dev
   ```

   Visit http://localhost:3010/docs for the interactive API reference.

## Authentication

Two credentials, depending on the route:

- **`x-api-key`** — every `/v1/**` route except `/v1/mobile/**` (past
  login) requires this header, checked against a `Company.apiKey`
  (`src/lib/internalAuth.ts` — `requireInternalAuth()`). The same value
  identifies which company the request is scoped to and authorizes it —
  one lookup, not two. Issued per company in `../admin` (Companies → API
  Key).
- **Bearer token** — `/v1/mobile/**` routes (other than
  `POST /v1/mobile/auth/login` itself, which still takes `x-api-key` to
  resolve the company) instead take `Authorization: Bearer <token>`, the
  JWT that login call returns. `src/lib/mobileAuth.ts` verifies it and
  re-checks the account is still active on every call.

## Project structure

- `src/app/api/v1/**` — one route tree per resource (packages, customers,
  portal-users, portal-settings, shipping-rates, locations, faqs,
  manifests, delivery-assignments, authorized-pickups, files) plus
  `mobile/**` for the driver/customer app. Routes mostly do a direct
  Prisma query per call, but a few collapse what would otherwise be
  several sequential round-trips into one server-side transaction —
  signup, login, manifest generation, and completing a delivery (proof +
  status change) are the notable ones.
- `src/lib/internalAuth.ts` / `src/lib/mobileAuth.ts` — the two auth
  models described above.
- `src/lib/openapi/registry.ts` + `src/lib/openapi/paths/*.ts` — the
  OpenAPI registrations, grouped by resource, feeding `document.ts`
  (`generateOpenApiDocument()`) and served at `/api/docs/spec`; `/docs`
  itself is just a `swagger-ui-react` page pointed at that spec.
- `prisma/schema.prisma` — mirrors `../admin`'s schema. Never run `prisma
  migrate`/`db push` here.

## Useful scripts

- `npm run db:generate` — regenerate the Prisma client after pulling a
  schema change from `../admin`.
- `npm run lint` — ESLint.
- `npm run build` — production build + typecheck.
