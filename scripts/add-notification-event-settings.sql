CREATE TABLE IF NOT EXISTS "NotificationEventSetting" (
  "eventType" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationEventSetting_pkey" PRIMARY KEY ("eventType")
);

INSERT INTO "NotificationEventSetting" ("eventType", "enabled", "updatedAt")
VALUES
  ('hols.vacation.requested', true, CURRENT_TIMESTAMP),
  ('hols.vacation.approved', true, CURRENT_TIMESTAMP),
  ('hols.vacation.rejected', true, CURRENT_TIMESTAMP),
  ('assembly.questionnaire.submitted', true, CURRENT_TIMESTAMP),
  ('gateway.user.created', true, CURRENT_TIMESTAMP),
  ('gateway.employee.hired', true, CURRENT_TIMESTAMP),
  ('gateway.employee.contract_ended', true, CURRENT_TIMESTAMP)
ON CONFLICT ("eventType") DO NOTHING;
