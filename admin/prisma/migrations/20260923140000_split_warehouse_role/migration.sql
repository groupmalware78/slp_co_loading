-- Splits WAREHOUSE_ATTENDANT into SCANNER (log new packages only) and
-- LOGGER (edit existing packages only), and adds CSR (read-only). Existing
-- WAREHOUSE_ATTENDANT accounts had both log and edit permissions — their
-- real-world use is editing, so they remap to LOGGER, not SCANNER.
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'SCANNER', 'LOGGER', 'CSR');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING (
  CASE "role"::text
    WHEN 'WAREHOUSE_ATTENDANT' THEN 'LOGGER'
    ELSE "role"::text
  END::"Role_new"
);
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'SCANNER';
COMMIT;
