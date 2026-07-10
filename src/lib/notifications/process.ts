import {
  NotificationChannel,
  NotificationStatus,
  type NotificationOutbox,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getNotificationChannelSettings,
  type NotificationChannelSettings,
} from "@/lib/notifications/event-settings";
import { getUserChannelOptOuts } from "@/lib/notifications/preferences";
import {
  NOTIFICATION_EVENTS,
  slackTextFromInApp,
  type NotificationEventHandler,
} from "@/lib/notifications/registry";
import { sendEmail } from "@/lib/notifications/send";
import { sendSlackDm } from "@/lib/notifications/slack";
import type { NotificationRecipient } from "@/lib/notifications/types";

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 25;
// A row stuck in PROCESSING longer than this is assumed to belong to a
// crashed run and is eligible for reclaim. Claiming sets scheduledFor to the
// claim time, so scheduledFor doubles as the claim timestamp.
const STALE_PROCESSING_MS = 10 * 60 * 1000;

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
  const staleCutoff = new Date(now.getTime() - STALE_PROCESSING_MS);
  const rows = await prisma.notificationOutbox.findMany({
    where: {
      OR: [
        {
          status: NotificationStatus.PENDING,
          scheduledFor: { lte: now },
        },
        {
          status: NotificationStatus.FAILED,
          attempts: { lt: MAX_ATTEMPTS },
          scheduledFor: { lte: now },
        },
        // Reclaim rows orphaned by a crash mid-processing.
        {
          status: NotificationStatus.PROCESSING,
          attempts: { lt: MAX_ATTEMPTS },
          scheduledFor: { lte: staleCutoff },
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

  const settings = await getNotificationChannelSettings(row.eventType);
  const anyChannelEnabled =
    settings.enabled && (settings.emailEnabled || settings.inAppEnabled || settings.slackEnabled);
  if (!anyChannelEnabled) {
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

  // Atomic claim so the cron and enqueue-triggered runs never double-process.
  // scheduledFor is stamped with the claim time so a crashed run's PROCESSING
  // rows become reclaimable once they turn stale (see STALE_PROCESSING_MS).
  const claimStaleCutoff = new Date(Date.now() - STALE_PROCESSING_MS);
  const claimed = await prisma.notificationOutbox.updateMany({
    where: {
      id: row.id,
      OR: [
        { status: { in: [NotificationStatus.PENDING, NotificationStatus.FAILED] } },
        {
          status: NotificationStatus.PROCESSING,
          scheduledFor: { lte: claimStaleCutoff },
        },
      ],
    },
    data: { status: NotificationStatus.PROCESSING, scheduledFor: new Date() },
  });
  if (claimed.count === 0) return "skipped";

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

    const optOuts = await getUserChannelOptOuts(
      recipients.flatMap((recipient) => (recipient.userId ? [recipient.userId] : [])),
      row.eventType,
    );

    // Channels already delivered in a previous (partially failed) attempt.
    const priorDeliveries = await prisma.notificationDelivery.findMany({
      where: { outboxId: row.id, status: NotificationStatus.SENT },
      select: { channel: true, recipientEmail: true },
    });
    const alreadySent = new Set(
      priorDeliveries.map((d) => `${d.channel}:${d.recipientEmail.toLowerCase()}`),
    );

    let hadFailure = false;

    for (const recipient of recipients) {
      const userOptOuts = recipient.userId ? optOuts.get(recipient.userId) : undefined;
      const channels = enabledChannelsFor(settings, recipient, userOptOuts);

      for (const channel of channels) {
        if (alreadySent.has(`${channel}:${recipient.email.toLowerCase()}`)) continue;
        const ok = await deliverToChannel({ row, handler, payload, recipient, channel });
        if (!ok) hadFailure = true;
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
    const exhausted = attempts >= MAX_ATTEMPTS;
    if (exhausted) {
      console.error(
        `[notifications] Outbox row ${row.id} (${row.eventType}) permanently failed after ${attempts} attempts: ${message}`,
      );
    }
    await prisma.notificationOutbox.update({
      where: { id: row.id },
      data: {
        status: NotificationStatus.FAILED,
        attempts,
        lastError: exhausted
          ? `Permanently failed after ${attempts} attempts: ${message}`
          : message,
        scheduledFor: new Date(Date.now() + backoffMinutes(attempts) * 60_000),
      },
    });
    return "failed";
  }
}

function enabledChannelsFor(
  settings: NotificationChannelSettings,
  recipient: NotificationRecipient,
  userOptOuts: Set<NotificationChannel> | undefined,
): NotificationChannel[] {
  const channels: NotificationChannel[] = [];
  if (settings.emailEnabled && !userOptOuts?.has(NotificationChannel.EMAIL)) {
    channels.push(NotificationChannel.EMAIL);
  }
  // Bell notifications need a user account to attach to.
  if (
    settings.inAppEnabled &&
    recipient.userId &&
    !userOptOuts?.has(NotificationChannel.IN_APP)
  ) {
    channels.push(NotificationChannel.IN_APP);
  }
  if (settings.slackEnabled && !userOptOuts?.has(NotificationChannel.SLACK)) {
    channels.push(NotificationChannel.SLACK);
  }
  return channels;
}

async function deliverToChannel(input: {
  row: NotificationOutbox;
  handler: NotificationEventHandler;
  payload: Record<string, unknown>;
  recipient: NotificationRecipient;
  channel: NotificationChannel;
}): Promise<boolean> {
  const { row, handler, payload, recipient, channel } = input;

  const renderedEmail =
    channel === NotificationChannel.EMAIL ? await handler.render(payload, recipient) : null;
  const renderedInApp =
    channel === NotificationChannel.EMAIL ? null : await handler.renderInApp(payload, recipient);

  const delivery = await prisma.notificationDelivery.create({
    data: {
      outboxId: row.id,
      channel,
      recipientEmail: recipient.email,
      recipientUserId: recipient.userId ?? null,
      subject: renderedEmail?.subject ?? renderedInApp?.title ?? row.eventType,
      status: NotificationStatus.PROCESSING,
    },
  });

  try {
    let providerId: string | null = null;

    if (channel === NotificationChannel.EMAIL && renderedEmail) {
      providerId = await sendEmail({
        to: recipient.email,
        subject: renderedEmail.subject,
        html: renderedEmail.html,
        text: renderedEmail.text,
      });
    } else if (channel === NotificationChannel.IN_APP && renderedInApp) {
      await prisma.notification.create({
        data: {
          userId: recipient.userId!,
          outboxId: row.id,
          sourceApp: row.sourceApp,
          eventType: row.eventType,
          title: renderedInApp.title,
          body: renderedInApp.body,
          url: renderedInApp.url ?? null,
        },
      });
    } else if (channel === NotificationChannel.SLACK && renderedInApp) {
      const text = handler.renderSlack
        ? await handler.renderSlack(payload, recipient)
        : slackTextFromInApp(renderedInApp);
      providerId = await sendSlackDm(recipient, text);
    }

    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        resendMessageId: providerId,
        error: null,
      },
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed";
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: NotificationStatus.FAILED,
        error: message,
      },
    });
    return false;
  }
}
