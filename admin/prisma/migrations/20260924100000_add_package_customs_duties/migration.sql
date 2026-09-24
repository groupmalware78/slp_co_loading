-- Jamaica Customs Agency duty/fee fields on packages — see the comment on
-- Package.declaredValue in schema.prisma. Purely additive nullable
-- columns, no data migration needed.
ALTER TABLE "packages"
  ADD COLUMN "dutyImportDuty" DOUBLE PRECISION,
  ADD COLUMN "dutyStampDuty" DOUBLE PRECISION,
  ADD COLUMN "dutyAdditionalStampDuty" DOUBLE PRECISION,
  ADD COLUMN "dutyGct" DOUBLE PRECISION,
  ADD COLUMN "dutySct" DOUBLE PRECISION,
  ADD COLUMN "dutyStandardComplianceFee" DOUBLE PRECISION,
  ADD COLUMN "dutyEnvironmentalLevy" DOUBLE PRECISION,
  ADD COLUMN "dutyCustomsAdminFee" DOUBLE PRECISION;
