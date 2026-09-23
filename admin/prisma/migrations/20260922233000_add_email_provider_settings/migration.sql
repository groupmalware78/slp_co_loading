-- CreateEnum
CREATE TYPE "EmailProvider" AS ENUM ('RESEND', 'SMTP');

-- AlterTable
ALTER TABLE "portal_settings" ADD COLUMN     "emailFromAddress" TEXT,
ADD COLUMN     "emailProvider" "EmailProvider",
ADD COLUMN     "resendApiKeyEncrypted" TEXT,
ADD COLUMN     "smtpHost" TEXT,
ADD COLUMN     "smtpPasswordEncrypted" TEXT,
ADD COLUMN     "smtpPort" INTEGER,
ADD COLUMN     "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "smtpUsername" TEXT;

