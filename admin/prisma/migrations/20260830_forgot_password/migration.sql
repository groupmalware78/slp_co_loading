ALTER TABLE "users" ADD COLUMN "passwordResetToken" TEXT, ADD COLUMN "passwordResetExpires" TIMESTAMP(3);
CREATE UNIQUE INDEX "users_passwordResetToken_key" ON "users"("passwordResetToken");
