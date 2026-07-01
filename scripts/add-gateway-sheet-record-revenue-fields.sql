-- Targeted migration: revenue fields on GatewaySheetRecord.
-- Safe to run when gateway prisma/schema.prisma is behind assembly satellite models.

ALTER TABLE "GatewaySheetRecord"
  ADD COLUMN IF NOT EXISTS "invoiceDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "revenueEur" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "salesRep" TEXT;

CREATE INDEX IF NOT EXISTS "GatewaySheetRecord_invoiceDate_idx"
  ON "GatewaySheetRecord"("invoiceDate");
