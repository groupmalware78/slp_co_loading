-- Replaces per-company billing rate (Company.perPackageRate) with one
-- global rate (PlatformSettings.perPackageRate). Seeds the singleton row
-- to 0.50 — the highest of the existing per-company rates (Swift Cargo
-- Express) — since no single existing value was clearly "the" rate to
-- standardize on; admin can adjust it from /dashboard/rates going forward.
ALTER TABLE "companies" DROP COLUMN "perPackageRate";

ALTER TABLE "platform_settings" ADD COLUMN     "perPackageRate" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "platform_settings" SET "perPackageRate" = 0.50 WHERE id = 'platform';
