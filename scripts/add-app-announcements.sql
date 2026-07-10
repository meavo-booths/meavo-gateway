-- Targeted migration: AppAnnouncement table for the Library "App News" page,
-- plus the first announcement. Additive and idempotent — safe to run repeatedly.
-- Apply: npx prisma db execute --file scripts/add-app-announcements.sql --schema node_modules/@meavo/db/prisma/schema.prisma

CREATE TABLE IF NOT EXISTS "AppAnnouncement" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppAnnouncement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AppAnnouncement_publishedAt_idx"
  ON "AppAnnouncement"("publishedAt");

DO $$ BEGIN
  ALTER TABLE "AppAnnouncement"
    ADD CONSTRAINT "AppAnnouncement_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- First announcement (release date 10 Jul 2026). Body uses the gateway
-- template-markup dialect (bullets, **bold**).
INSERT INTO "AppAnnouncement" ("id", "title", "body", "publishedAt", "updatedAt")
VALUES (
  'app-news-0001',
  'New: notifications in MEAVO 🔔',
  $announcement$MEAVO can now notify you in three ways:

- **Bell** — the bell icon in the top navigation shows your notifications no matter which MEAVO app you're in. Click a notification to jump straight to the relevant page, and use "Mark all read" to clear the badge.
- **Email** — the same updates delivered to your work inbox.
- **Slack** — personal DMs from the MEAVO bot (off by default — turn it on if you want it).

What you'll be notified about depends on your role — for example: when your holiday request is approved or rejected, when a task is assigned to you, a morning digest of your overdue and due-today tasks, and team events like new assembly questionnaires or VIP deals won.

**You're in control.** Go to **Profile → Notification settings** and you'll see a simple grid: one row per event, with toggles for Email, Bell, and Slack. Switch off anything you don't want, or switch Slack on for the events you'd like as DMs. Changes take effect immediately.

Tip: Slack messages are matched to you by your work email address, so no setup is needed — just enable the toggle.$announcement$,
  '2026-07-10 00:00:00',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
