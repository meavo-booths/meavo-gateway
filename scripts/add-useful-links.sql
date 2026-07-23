-- Targeted migration: UsefulLink table for the Library "Useful links" page.
-- Additive and idempotent — safe to run repeatedly.
-- Apply: npx prisma db execute --file scripts/add-useful-links.sql --schema node_modules/@meavo/db/prisma/schema.prisma

CREATE TABLE IF NOT EXISTS "UsefulLink" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "iconKey" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsefulLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UsefulLink_sortOrder_idx"
  ON "UsefulLink"("sortOrder");

DO $$ BEGIN
  ALTER TABLE "UsefulLink"
    ADD CONSTRAINT "UsefulLink_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
