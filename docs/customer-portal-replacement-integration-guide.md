# Integrating your own web app with `api/`

This is for a company that wants to stop using our `customer-portal` app
and build (or point an existing) web app of their own against `api/`
directly — getting the same functionality (packages, customers, staff,
deliveries, branding, invoices) without running our frontend.

**The canonical contract is the live OpenAPI spec, not this document.**
Every `api/` deployment serves it, unauthenticated:

- JSON: `GET <api-base-url>/api/docs/spec`
- Swagger UI: `<api-base-url>/docs`

This guide covers what the spec can't: which auth pattern to use, how the
pieces fit together, and a data-export plan. Where the two disagree,
trust the spec — it's generated from the same Zod schemas the routes
validate against.

## 1. How this actually works today (customer-portal's own setup)

`customer-portal` has no database of its own. Every request it can't
answer from its own session goes to `api/` over plain REST, authenticated
by one header:

```
x-api-key: cp_...
```

That key identifies **your company** (a row in `api/`'s `Company` table),
not an individual user. It's issued once, when your company is
registered in our Service-Provider app, and it's the same credential for
every server-to-server call your app makes — there's no per-user token
layered under it for the ordinary `/v1/**` surface (see §3).

Two independent things are true about a request:

1. **Is this company allowed to talk to the API at all, and with what
   permissions?** — governed by the `x-api-key` (its scope: `FULL` or
   `READ_ONLY`, and its `requestsPerMinute` rate limit).
2. **Which of that company's staff/customers is making this particular
   click, and are they allowed to?** — governed entirely by **your own
   app**, not by `api/`. `api/` hands you a "yes, these credentials are
   valid" answer and nothing more (see §3); enforcing who-can-do-what
   inside your own UI is on you, same as it is for `customer-portal`
   today (see `customer-portal/src/lib/rbac.ts` if you want to see how we
   do it — packages editability, delivery permissions, etc. are all
   plain role checks in the frontend app, not in `api/`).

## 2. Getting your API key

Issued from our Service-Provider app (`admin/dashboard/companies`) when
your company is registered. Two settings you should ask us about before
migrating traffic:

- **Scope** — `FULL` (read+write) or `READ_ONLY`. You need `FULL` for
  anything that creates or updates data (packages, customers, deliveries,
  manifests). `READ_ONLY` rejects every non-`GET`/`HEAD` request with 403.
- **Rate limit** — `requestsPerMinute`, default 300/company (not per-IP,
  not per-endpoint), enforced with a sliding window. `0` means unlimited.
  If you're about to run a bulk export (§7), ask us to raise this
  temporarily rather than assuming 300.

Rate-limit responses are `429` with a `Retry-After` header — always
back off on that header rather than hardcoding a request pace, since the
limit is configurable per company.

## 3. Authentication pattern for your web app's own users

This is the one place the OpenAPI spec doesn't tell the whole story, so
read this section carefully.

**`POST /v1/auth/login`** (`x-api-key` + `{email, password}`) checks the
credentials against our `PortalUser` table and, on success, returns:

```json
{ "user": { "id", "name", "email", "role", "active", "mustChangePassword", "emailVerified" } }
```

**That's it — no token, no session id, nothing bearer-able.** It's a bare
"yes, these credentials are correct for this tenant" primitive. It
doesn't even check `active`/`mustChangePassword` for you — `customer-portal`
applies those rules itself after calling it.

`customer-portal` turns that bare answer into a real session using its
own NextAuth (Auth.js) setup — an encrypted cookie signed with
`customer-portal`'s own `AUTH_SECRET`, entirely internal to that app.
There is no artifact from this endpoint that another client can receive
and hand off to a different app. **You will need to do the equivalent
yourself**: call `/v1/auth/login` server-side (never expose your
`x-api-key` to a browser), and on success mint your own session
(signed cookie, JWT, whatever your stack already uses) recording at
least `userId`, `companyId`, and `role`. Every subsequent page load in
your app checks *your* session, not `api/`'s.

**If your users are only `DRIVER` or `CUSTOMER` roles**, there's a
shortcut: `POST /v1/mobile/auth/login` (same credential check, but
restricted to those two roles, and rejects `mustChangePassword` accounts
outright) returns a real, portable 30-day bearer JWT:

```json
{ "token": "...", "user": { "id", "name", "email", "role" } }
```

Your client can hold that token directly and send
`Authorization: Bearer <token>` on later requests — no session
infrastructure of your own required for those calls. The catch: the
business routes that accept this token (`/v1/mobile/**`) are a narrower
surface than the full `/v1/**` set — shipments, deliveries, pre-alerts,
and profile, self-service only. If you're rebuilding customer-portal's
*staff*-facing screens (packages directory, customer management,
branding settings), those still need the plain `x-api-key` routes and
your own session layer regardless of which login flow you pick for
end users.

**Recommendation**: build your own session layer once (most teams already
have one) and use it for every role. Reach for the mobile bearer-token
login only if your app is customer/driver-facing only and you'd rather
not stand up session infrastructure at all for that piece.

## 4. Endpoint reference by feature

Full detail is in the OpenAPI spec (§ above); this is the map of which
group covers which piece of customer-portal functionality, taken
directly from what `customer-portal/src/lib/apiClient.ts` itself calls.

| Feature | Base path | Notes |
|---|---|---|
| Tenant identity | `/v1/tenant/resolve` | Resolves your `companyId` from the API key — call this on startup. |
| Tenant email | `/v1/tenant/email/send` | Sends through your configured provider (Resend/SMTP/platform default); you never touch the provider directly. **Not in the OpenAPI spec — see §6.** |
| Staff/customer login | `/v1/auth/login` | See §3. |
| Customers | `/v1/customers`, `/v1/customers/{id}`, `/v1/customers/by-email`, `/v1/customers/stats` | `pageSize` up to 5000. |
| Packages/shipments | `/v1/packages`, `/v1/packages/{id}`, `/v1/packages/{id}/calculate-fee`, `/v1/packages/{id}/invoice`, `/v1/packages/{id}/regenerate-invoice`, `/v1/packages/{id}/status-events`, `/v1/packages/stats`, `/v1/packages/financial-stats` | `pageSize` capped at 100 — loop `page` for bulk reads. A pre-alert is just `POST /v1/packages` with `status` defaulting to `PENDING`. `regenerate-invoice` **isn't in the OpenAPI spec** — see §6. |
| Staff/customer accounts | `/v1/portal-users`, `.../{id}`, `.../by-email`, `.../{id}/change-password`, `.../{id}/set-password`, `.../signup`, `.../password-reset/**`, `.../email-verification/**` | `GET /v1/portal-users` has **no pagination** — see §7 for why this matters at export time. |
| Authorized pickups | `/v1/authorized-pickups` | Scoped to a `portalUserId`. |
| Deliveries | `/v1/delivery-assignments`, `.../{id}`, `.../{id}/complete`, `.../{id}/proof` | `driverId` present on create = staff direct-assign; omitted = customer request. |
| Locations | `/v1/locations` | Branch/pickup locations, standard CRUD. |
| Shipping rates | `/v1/shipping-rates` | Weight-tier pricing, standard CRUD. |
| Fee tiers | `/v1/fee-ranges` | Backs `/v1/packages/{id}/calculate-fee`. |
| FAQs | `/v1/faqs` | Standard CRUD. |
| Branding/settings | `/v1/portal-settings/{companyId}` | `companyId` in the path must match your own API key's company — 403 otherwise. |
| Email provider config | `/v1/portal-settings/{companyId}/email-provider`, `.../email-provider/test` | Secrets are write-only — you get `hasSecretConfigured: boolean` back, never the secret itself. **Not in the OpenAPI spec** — see §6. |
| Branding/avatar/receipt files | `/v1/files/portal-settings/{companyId}/{logo,favicon,hero-image}`, `/v1/files/portal-users/{id}/avatar`, `/v1/files/packages/{id}/receipt` | GET (download) / POST (multipart upload) / DELETE on each. |
| Manifests | `/v1/manifests`, `/v1/manifests/generate` | Generating snapshots every currently-`RECEIVED` package and advances them to `SHIPPED` in one transaction. |
| Mobile (driver/customer only) | `/v1/mobile/**` | Separate bearer-JWT auth — see §3. |

## 5. Binary data — excluded by default, fetched explicitly

Generated invoice PDFs, customer-uploaded receipts, delivery proof
photos/signatures, and branding/avatar images are all stored as raw
bytes in the database, but **excluded from every ordinary response by
default** (a global Prisma `omit` on the shared client) — you'll never
get a multi-megabyte blob buried in a `/v1/packages` list response by
accident. Fetch them explicitly, one at a time, from their own dedicated
endpoints (the `/v1/files/**` group and `/v1/packages/{id}/invoice`).

## 6. Gaps to know about before you build

- **Five endpoints exist but aren't in the OpenAPI spec**: `POST
  /v1/packages/{id}/regenerate-invoice`, `GET`/`PATCH
  /v1/portal-settings/{companyId}/email-provider`, `POST
  .../email-provider/test`, and `POST /v1/tenant/email/send`. They work
  exactly as described in §4 above — just don't expect to find them by
  browsing `/docs`.
- **`/v1/auth/login` returns no token** — see §3, this is the one design
  decision you actually have to make yourself.
- **`GET /v1/portal-users` has no pagination.** Fine for ordinary use;
  worth confirming with us if your company has an unusually large staff
  roster before relying on it for anything latency-sensitive.
- **`/api/docs/spec` and `/docs` are unauthenticated** — anyone who can
  reach your `api/` deployment's URL can see the full schema shape
  (endpoint names, field names). No secrets are in it, but don't treat
  the URL itself as private.

## 7. Data migration plan — exporting to your own database

Three entities cover essentially everything: `Customer`, `PortalUser`
(staff + customer accounts), and `Package` (shipments). Here's how to
pull all of it for your company.

### 7.1 Customers — usually one request

```
GET /v1/customers?page=1&pageSize=5000
```

Loop `page` only if `total` exceeds 5000 (most single-tenant companies
won't). Response fields: `id, name, email, phone, trn, customerCode,
createdAt, updatedAt`. Nothing sensitive to redact — this is the full
row as-is.

### 7.2 Staff & customer accounts

```
GET /v1/portal-users
```

One call, no pagination (see §6 — if this ever becomes a problem for
your tenant size, ask us). Returned fields never include `passwordHash`
— there's no way to migrate existing passwords, by design. Plan for
either (a) a forced password reset for every migrated account on first
login to your new app, or (b) treating our system as the identity
provider going forward (unusual once you've fully replaced
customer-portal, but an option during a transition period). Two other
fields — `passwordResetToken` and `emailVerificationToken` — are never
embedded in this bulk response either; they're only ever returned
transiently from their own single-purpose issue endpoints, so there's
nothing to carry over there either.

### 7.3 Packages — the one that needs real pagination

```
GET /v1/packages?page=1&pageSize=100
GET /v1/packages?page=2&pageSize=100
...
```

`pageSize` is capped at 100 (unlike customers' 5000), so a tenant with
50,000 packages is 500 requests. At the default 300/minute rate limit
that's comfortably doable if you pace requests (roughly 4-5/second,
leaving headroom) and back off on any `429` using its `Retry-After`
header rather than assuming a fixed rate. For a one-time migration of a
large tenant, ask us to raise `requestsPerMinute` for the export window
instead of tuning your own pacing to the default.

Each package's binary attachments — the generated invoice PDF, the
customer's uploaded receipt — aren't included in this listing (§5); fetch
them per-package if you need them in your new system:

```
GET /v1/packages/{id}/invoice          # generated invoice PDF, if one exists
GET /v1/files/packages/{id}/receipt    # customer's uploaded receipt, if one exists
```

Full status history per package (useful if you want to preserve an
audit trail, not just the current state):

```
GET /v1/packages/{id}/status-events
```

### 7.4 What you can't export via the API

Our own internal audit log (who-changed-what on the Service-Provider
side) isn't exposed through `/v1/**` at all — it's `admin`-internal data
about our staff's actions, not your tenant's operational data, so this
is expected rather than a gap in the export path.

### 7.5 Suggested export shape

```
for page in 1..totalPages(customers):
    fetch /v1/customers?page=X&pageSize=5000 → upsert into your DB

fetch /v1/portal-users → upsert into your DB (flag mustChangePassword=true on all)

for page in 1..totalPages(packages):
    fetch /v1/packages?page=X&pageSize=100 → upsert into your DB
    for each package with generatedInvoiceFileName set:
        fetch /v1/packages/{id}/invoice → store the PDF
    for each package with invoiceFileName set:
        fetch /v1/files/packages/{id}/receipt → store the file
```

Run customers and portal-users first (packages reference both by id), and
keep a checkpoint of the last successful page so a rate-limit pause or
transient error doesn't force restarting from page 1.
