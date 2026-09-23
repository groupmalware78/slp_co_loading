-- CreateEnum
CREATE TYPE "ApiKeyScope" AS ENUM ('FULL', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "ApiKeyRotationTrigger" AS ENUM ('ADMIN_MANUAL', 'PORTAL_MANUAL', 'AUTOMATIC');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "apiKeyHash" TEXT,
ADD COLUMN     "apiKeyPrefix" TEXT,
ADD COLUMN     "apiKeyPreviousExpiresAt" TIMESTAMP(3),
ADD COLUMN     "apiKeyPreviousHash" TEXT,
ADD COLUMN     "apiKeyRotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "apiKeyRotationDays" INTEGER NOT NULL DEFAULT 90,
ADD COLUMN     "apiKeyScope" "ApiKeyScope" NOT NULL DEFAULT 'FULL',
ADD COLUMN     "apiKeyWebhookSecret" TEXT,
ADD COLUMN     "apiKeyWebhookUrl" TEXT,
ADD COLUMN     "requestsPerMinute" INTEGER NOT NULL DEFAULT 300,
ALTER COLUMN "apiKey" DROP NOT NULL;

-- CreateTable
CREATE TABLE "api_key_rotation_events" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "trigger" "ApiKeyRotationTrigger" NOT NULL,
    "rotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gracePeriodEndsAt" TIMESTAMP(3),
    "webhookDeliveredAt" TIMESTAMP(3),
    "webhookAttempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "api_key_rotation_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_key_rotation_events_companyId_rotatedAt_idx" ON "api_key_rotation_events"("companyId", "rotatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "companies_apiKeyHash_key" ON "companies"("apiKeyHash");

-- CreateIndex
CREATE UNIQUE INDEX "companies_apiKeyPreviousHash_key" ON "companies"("apiKeyPreviousHash");

-- AddForeignKey
ALTER TABLE "api_key_rotation_events" ADD CONSTRAINT "api_key_rotation_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

