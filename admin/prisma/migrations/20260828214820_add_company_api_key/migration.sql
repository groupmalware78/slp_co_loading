-- AlterTable
ALTER TABLE "companies" ADD COLUMN "apiKey" TEXT;

-- Backfill existing companies with a random API key
UPDATE "companies"
SET "apiKey" = 'cp_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE "apiKey" IS NULL;

ALTER TABLE "companies" ALTER COLUMN "apiKey" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "companies_apiKey_key" ON "companies"("apiKey");
