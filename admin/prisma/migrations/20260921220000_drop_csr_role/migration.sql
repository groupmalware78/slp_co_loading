-- Drops CSR from the Role enum — package logging (the only screen CSR
-- could see) moved to the standalone Warehouse app, and no account ever
-- used this role (verified zero rows before this migration).
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'WAREHOUSE_ATTENDANT');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'WAREHOUSE_ATTENDANT';
COMMIT;
