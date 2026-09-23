# Customer Portal Mobile

Flutter app for **drivers** and **customers** of Swift Cargo Express. Staff
(ADMIN) are not supported — they use the Service-Provider or Warehouse web
apps instead.

## Scope of this v1

- Targets **one company only** (SCE) — `lib/core/api_config.dart` bakes in
  its API key at build time. Supporting another company would mean either a
  company picker at login (api/ would need to accept a company code/slug
  and resolve the key server-side) or a separate build with a different
  `apiKey`/`API_KEY` define.
- **No push notifications** — data refreshes via pull-to-refresh.
- **Driver**: view assigned deliveries, mark out-for-delivery/failed, and
  complete a delivery by capturing a signature (required) and an optional
  photo — see `lib/screens/driver/complete_delivery_screen.dart`.
- **Customer**: view shipments and download the generated invoice PDF once
  a package reaches Ready for Pickup / Delivered.

## Backend

This app talks to `api/`'s REST endpoints directly (`../api/src/app/api/v1/mobile/**`
for everything account-specific, plus `../api/src/app/api/v1/{locations,shipping-rates}`
for the two public-browsing screens) — NOT `customer-portal`, which has no
mobile routes of its own anymore. Every `customer-portal*` web app and this
one are now equally just REST clients of `api/`.

Two credentials, not one:
- **`x-api-key`** (Swift Cargo Express's key, from `lib/core/api_config.dart`)
  identifies the company. Sent on login and on the two public-browsing
  calls (`listLocations`/`listShippingRates`), which aren't behind a signed-in
  session.
- **Bearer token** — mobile has no cookie jar, so after login every other
  call authenticates with the JWT `POST /v1/mobile/auth/login` returns
  instead (see `api/src/lib/mobileAuth.ts` on the server). Login is
  restricted to `DRIVER`/`CUSTOMER` roles and issues a 30-day token (no
  refresh flow — sign in again after expiry).

Run the backend before this app (api/ needs Postgres reachable too — see
its own README):
```
cd ../api && npm run dev
```

## Running

```
flutter pub get
flutter run
```

By default the app points at:
- iOS Simulator: `http://localhost:3010`
- Android emulator: `http://10.0.2.2:3010` (the emulator's alias for the host)
- A physical device needs your machine's LAN IP instead of either — pass it
  at build/run time: `flutter run --dart-define=API_BASE_URL=http://<lan-ip>:3010`
- To point at a different company's key without editing `api_config.dart`:
  `flutter run --dart-define=API_KEY=cp_...`

## Before shipping to an app store

- Both `ios/Runner/Info.plist` (`NSAllowsArbitraryLoads`) and
  `android/app/src/main/AndroidManifest.xml` (`usesCleartextTraffic`) are
  set to allow plain HTTP for local development against the dev backend.
  Remove both once this points at a real HTTPS deployment.
- Android builds need the Android SDK installed. iOS builds need Xcode.
