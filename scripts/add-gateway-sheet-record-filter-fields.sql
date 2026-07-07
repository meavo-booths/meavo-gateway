-- Targeted migration: filter fields on GatewaySheetRecord.
-- Safe to run when the installed @meavo/db schema is behind other apps.

ALTER TABLE "GatewaySheetRecord"
  ADD COLUMN IF NOT EXISTS "market" TEXT,
  ADD COLUMN IF NOT EXISTS "clientType" TEXT,
  ADD COLUMN IF NOT EXISTS "newVsRepeat" TEXT;

CREATE INDEX IF NOT EXISTS "GatewaySheetRecord_market_idx"
  ON "GatewaySheetRecord"("market");

CREATE INDEX IF NOT EXISTS "GatewaySheetRecord_clientType_idx"
  ON "GatewaySheetRecord"("clientType");

CREATE INDEX IF NOT EXISTS "GatewaySheetRecord_newVsRepeat_idx"
  ON "GatewaySheetRecord"("newVsRepeat");
