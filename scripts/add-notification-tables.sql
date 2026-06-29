-- Targeted migration: notification outbox tables only.
-- Safe to run when gateway schema is behind assembly/hols satellite models.

DO $$ BEGIN
  CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "NotificationOutbox" (
  "id" TEXT NOT NULL,
  "sourceApp" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "idempotencyKey" TEXT,
  "payload" JSONB NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationOutbox_idempotencyKey_key"
  ON "NotificationOutbox"("idempotencyKey");

CREATE INDEX IF NOT EXISTS "NotificationOutbox_status_scheduledFor_idx"
  ON "NotificationOutbox"("status", "scheduledFor");

CREATE TABLE IF NOT EXISTS "NotificationDelivery" (
  "id" TEXT NOT NULL,
  "outboxId" TEXT NOT NULL,
  "recipientEmail" TEXT NOT NULL,
  "recipientUserId" TEXT,
  "subject" TEXT NOT NULL,
  "resendMessageId" TEXT,
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "sentAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NotificationDelivery_outboxId_idx"
  ON "NotificationDelivery"("outboxId");

CREATE INDEX IF NOT EXISTS "NotificationDelivery_createdAt_idx"
  ON "NotificationDelivery"("createdAt");

DO $$ BEGIN
  ALTER TABLE "NotificationDelivery"
    ADD CONSTRAINT "NotificationDelivery_outboxId_fkey"
    FOREIGN KEY ("outboxId") REFERENCES "NotificationOutbox"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
