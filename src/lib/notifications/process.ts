import { NotificationStatus, type NotificationOutbox } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isNotificationEventEnabled } from "@/lib/notifications/event-settings";
import { NOTIFICATION_EVENTS } from "@/lib/notifications/registry";
import { sendEmail } from "@/lib/notifications/send";

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 25;

function backoffMinutes(attempts: number): number {
  return Math.min(60, 2 ** Math.max(attempts, 1));
}

export async function processNotificationOutbox(limit = BATCH_SIZE): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
}> {
  const now = new Date();
  const rows = await prisma.notificationOutbox.findMany({
    where: {
      scheduledFor: { lte: now },
      OR: [
        { status: NotificationStatus.PENDING },
        {
          status: NotificationStatus.FAILED,
          attempts: { lt: MAX_ATTEMPTS },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows) {
    const result = await processOutboxRow(row);
    if (result === "sent") sent += 1;
    else if (result === "failed") failed += 1;
    else skipped += 1;
  }

  return { processed: rows.length, sent, failed, skipped };
}

async function processOutboxRow(
  row: NotificationOutbox,
): Promise<"sent" | "failed" | "skipped"> {
  const handler = NOTIFICATION_EVENTS[row.eventType];
  if (!handler) {
    await prisma.notificationOutbox.update({
      where: { id: row.id },
      data: {
        status: NotificationStatus.FAILED,
        attempts: { increment: 1 },
        lastError: `Unknown event type: ${row.eventType}`,
        scheduledFor: new Date(Date.now() + backoffMinutes(row.attempts + 1) * 60_000),
      },
    });
    return "failed";
  }

  const enabled = await isNotificationEventEnabled(row.eventType);
  if (!enabled) {
    await prisma.notificationOutbox.update({
      where: { id: row.id },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        lastError: "Event disabled in admin",
      },
    });
    return "skipped";
  }

  await prisma.notificationOutbox.update({
    where: { id: row.id },
    data: { status: NotificationStatus.PROCESSING },
  });

  const payload =
    row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
      ? (row.payload as Record<string, unknown>)
      : {};

  try {
    const recipients = await handler.resolveRecipients(payload);
    if (recipients.length === 0) {
      await prisma.notificationOutbox.update({
        where: { id: row.id },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          lastError: null,
        },
      });
      return "skipped";
    }

    let hadFailure = false;

    for (const recipient of recipients) {
      const rendered = await handler.render(payload, recipient);
      const delivery = await prisma.notificationDelivery.create({
        data: {
          outboxId: row.id,
          recipientEmail: recipient.email,
          recipientUserId: recipient.userId ?? null,
          subject: rendered.subject,
          status: NotificationStatus.PROCESSING,
        },
      });

      try {
        const messageId = await sendEmail({
          to: recipient.email,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        });
        await prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: NotificationStatus.SENT,
            sentAt: new Date(),
            resendMessageId: messageId,
            error: null,
          },
        });
      } catch (error) {
        hadFailure = true;
        const message = error instanceof Error ? error.message : "Send failed";
        await prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: NotificationStatus.FAILED,
            error: message,
          },
        });
      }
    }

    if (hadFailure) {
      throw new Error("One or more deliveries failed");
    }

    await prisma.notificationOutbox.update({
      where: { id: row.id },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        lastError: null,
      },
    });
    return "sent";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed";
    const attempts = row.attempts + 1;
    await prisma.notificationOutbox.update({
      where: { id: row.id },
      data: {
        status: NotificationStatus.FAILED,
        attempts,
        lastError: message,
        scheduledFor: new Date(Date.now() + backoffMinutes(attempts) * 60_000),
      },
    });
    return "failed";
  }
}
