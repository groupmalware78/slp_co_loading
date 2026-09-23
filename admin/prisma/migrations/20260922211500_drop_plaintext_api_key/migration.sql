-- DropIndex
DROP INDEX "companies_apiKey_key";

-- AlterTable
ALTER TABLE "companies" DROP COLUMN "apiKey",
ALTER COLUMN "apiKeyHash" SET NOT NULL,
ALTER COLUMN "apiKeyPrefix" SET NOT NULL;

