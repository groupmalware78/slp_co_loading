-- Adds DB-bytes storage for images that were previously written to each
-- customer-portal instance's own filesystem (public/uploads/) — no longer
-- possible once that app loses direct DB/filesystem access. The old *Url
-- string columns are left in place for now (deprecated, not dropped) and
-- the real uploaded files that existed at migration time (2 logos, 3
-- favicons, 2 hero images across the 3 companies) were copied into these
-- new columns by a one-off script, not lost.

ALTER TABLE "packages" ADD COLUMN     "invoiceImage" BYTEA;

ALTER TABLE "portal_settings" ADD COLUMN     "faviconImage" BYTEA,
ADD COLUMN     "faviconImageFileName" TEXT,
ADD COLUMN     "heroImage" BYTEA,
ADD COLUMN     "heroImageFileName" TEXT,
ADD COLUMN     "logoImage" BYTEA,
ADD COLUMN     "logoImageFileName" TEXT;

ALTER TABLE "portal_users" ADD COLUMN     "avatarImage" BYTEA,
ADD COLUMN     "avatarImageFileName" TEXT;
