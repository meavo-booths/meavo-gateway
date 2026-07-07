-- Targeted migration: GatewaySheetRecord only.
-- Safe to run when the installed @meavo/db schema is behind other apps.
-- Do NOT run a full `prisma db push` from gateway alone in that case — it can drop assembly tables.

CREATE TABLE IF NOT EXISTS "GatewaySheetRecord" (
  "id" TEXT NOT NULL,
  "rowKey" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "lastImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GatewaySheetRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GatewaySheetRecord_rowKey_key"
  ON "GatewaySheetRecord"("rowKey");

CREATE INDEX IF NOT EXISTS "GatewaySheetRecord_lastImportedAt_idx"
  ON "GatewaySheetRecord"("lastImportedAt");
