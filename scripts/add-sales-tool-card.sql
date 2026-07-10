-- Seed the Sales tool card (sales.meavo.app) so Admin can grant access.
-- Apply with: npx prisma db execute --file scripts/add-sales-tool-card.sql --schema node_modules/@meavo/db/prisma/schema.prisma

INSERT INTO "ToolCard" ("id", "name", "description", "url", "iconKey", "kind", "linkedAppKey", "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES (
  'seed-sales-tool',
  'Sales',
  'Generate quotes and convert them into won deals.',
  'https://sales.meavo.app',
  'sales',
  'APP_ACCESS',
  'sales',
  2,
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "url" = EXCLUDED."url",
  "iconKey" = EXCLUDED."iconKey",
  "kind" = EXCLUDED."kind",
  "linkedAppKey" = EXCLUDED."linkedAppKey",
  "isActive" = true,
  "updatedAt" = NOW();
