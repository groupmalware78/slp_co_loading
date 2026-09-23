Five independent apps sharing one Postgres database. No monorepo tooling —
each app has its own `package.json`, `node_modules`, and lock file, and is
run and deployed separately. Two of them (`admin/`, `api/`) connect to
Postgres directly, each with its own Prisma schema against the same
database; the rest — the three `customer-portal` instances and the
Flutter mobile app — have no database connection at all and talk to `api/`
over plain REST instead.

## Projects

- **[api/](api/)** — the one REST API of record for external/client
  applications: every `customer-portal` instance and the mobile app call
  it, in any language, authenticated by an `x-api-key` header checked
  against each company's own key (`src/app/api/v1/**`), plus a bearer-JWT
  layer on top for the mobile app's per-user session
  (`src/app/api/v1/mobile/**`). Publishes its own OpenAPI/Swagger docs at
  `/docs` — that's the contract, not this README. **`v1/**` must never be
  reachable from the public internet** — access to it is equivalent to
  full data access for whichever company's key is presented. Owns its own
  mirrored Prisma schema (never migrates — see "Adding a schema change"
  below). Runs on port 3010.

- **[admin/](admin/)** — Service-Provider: onboards freight-forwarder
  companies and issues their API keys (`/dashboard/companies`), staff user
  management, an audit log, cross-company reports, and (merged in from a
  formerly-standalone Warehouse app) logging/editing packages received at
  the warehouse. Companies/Users/Audit/Reports/Manifests/Rates/Banking are
  `ADMIN`-only; Packages is open to `ADMIN`, `SCANNER`, `LOGGER`, and `CSR`
  alike, each with different capabilities there (see `src/lib/rbac.ts`).
  **Owns the database schema and all migrations** — every table in the
  system, including the ones only `customer-portal`/`api` use. Runs on
  port 3000.

- **[customer-portal/](customer-portal/)**, **[customer-portal-bhf/](customer-portal-bhf/)**,
  **[customer-portal-ids/](customer-portal-ids/)** — a self-service CMS +
  customer portal, deployed once per freight forwarder (like a WordPress
  install per site — see its README). These three are the same app, one
  physical copy per company (Swift Cargo Express, Blue Horizon Freight,
  Island Direct Shipping), distinguished by each instance's own
  `TENANT_API_KEY` in `.env`. Role-based (Admin/CSR/Customer/Driver), with
  a public no-login tracking page too. **Has no database connection of its
  own** — every read and write goes through `api/`'s REST endpoints via a
  small hand-written `fetch()` wrapper (`src/lib/apiClient.ts` — no shared
  client library; each instance has its own copy). Run on ports
  3001/3002/3003 respectively.

- **[customer-portal-mobile/](customer-portal-mobile/)** — Flutter app (iOS
  + Android) for the Driver and Customer roles only, talking to `api/`'s
  `/v1/mobile/**` routes directly (a bearer-JWT API, obtained by a login
  call carrying this build's own `x-api-key`) — see its README.

## Running everything locally

No shared install step — each app below needs its own `npm install` (and,
for `admin`/`api`, `npm run db:generate`) on a fresh clone or after
pulling `package.json` changes:

```bash
for d in admin api customer-portal customer-portal-bhf customer-portal-ids; do
  (cd "$d" && npm install)
done
```

`admin` and `api` connect to Postgres — start it once (`docker compose up
-d` from `admin/`, or your own local Postgres) and run `npm run
db:generate` in each of those two. The three `customer-portal` instances
instead need `ADMIN_API_URL` (pointing at `api/`) and their own
`TENANT_API_KEY` in `.env` — see each app's README.

```bash
./run-all.sh   # starts admin, api, all 3 customer-portal instances, and
               # the mobile app on whatever iOS/Android targets are
               # available. Safe to re-run — anything already running is
               # left alone.
./stop-all.sh  # stops everything run-all.sh started
```

Logs land in `logs/<app>.log`. To run just one or two apps by hand instead:

```bash
cd api && npm run dev               # http://localhost:3010
cd customer-portal && npm run dev   # http://localhost:3001
```

Since `customer-portal` has no database of its own, `api/` needs to be up
and reachable at its `ADMIN_API_URL` for `customer-portal` to do anything
useful (including `next build`'s static prerendering, which calls `api/`
for branding/settings on pages like `/` and `/contact`).

## Adding a schema change

- `admin/` is the sole schema owner — **every** table, including the ones
  only `api`/`customer-portal` read or write. A schema change always goes
  through `admin/prisma/schema.prisma` and its migrations, following the
  process in `admin/README.md`.
- `api/prisma/schema.prisma` mirrors the same physical tables — copy the
  change there too, but **never** run `prisma migrate`/`db push` from it;
  it only ever needs `npx prisma generate` against the already-migrated
  database.
- If the change adds or changes a field `customer-portal` or the mobile
  app needs, add/update the corresponding route in `api/src/app/api/v1/**`
  to expose it, then update `customer-portal/src/lib/apiTypes.ts` and
  `apiClient.ts` (and the mobile app's own Dart models/`api_client.dart`)
  to match — these are hand-written to mirror `api/`'s routes, not
  generated, so every side needs the edit. `api/`'s own `/docs` (Swagger)
  is the source of truth for what the contract actually is.
- Any code change in `customer-portal/` still needs to be copied into
  `customer-portal-bhf/` and `customer-portal-ids/` by hand — they're
  separate physical copies, not symlinks.
# slp_co_loading
