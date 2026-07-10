import { NotificationChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  NOTIFICATION_EVENT_CATALOG,
  type NotificationEventDefinition,
} from "@/lib/notifications/event-catalog";

export type NotificationChannelSettings = {
  enabled: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  slackEnabled: boolean;
};

export type AdminNotificationEvent = NotificationEventDefinition & NotificationChannelSettings;

const DEFAULT_CHANNEL_SETTINGS: NotificationChannelSettings = {
  enabled: true,
  emailEnabled: true,
  inAppEnabled: true,
  slackEnabled: false,
};

export async function ensureNotificationEventSettings(): Promise<void> {
  await prisma.notificationEventSetting.createMany({
    data: NOTIFICATION_EVENT_CATALOG.map((event) => ({
      eventType: event.eventType,
      enabled: true,
    })),
    skipDuplicates: true,
  });
}

export async function getNotificationChannelSettings(
  eventType: string,
): Promise<NotificationChannelSettings> {
  const setting = await prisma.notificationEventSetting.findUnique({
    where: { eventType },
    select: { enabled: true, emailEnabled: true, inAppEnabled: true, slackEnabled: true },
  });
  return setting ?? DEFAULT_CHANNEL_SETTINGS;
}

/**
 * An event is worth enqueueing if the master switch is on and at least one
 * delivery channel is enabled.
 */
export async function isNotificationEventEnabled(eventType: string): Promise<boolean> {
  const setting = await getNotificationChannelSettings(eventType);
  return setting.enabled && (setting.emailEnabled || setting.inAppEnabled || setting.slackEnabled);
}

export async function getAdminNotificationEvents(): Promise<AdminNotificationEvent[]> {
  await ensureNotificationEventSettings();

  const settings = await prisma.notificationEventSetting.findMany({
    where: { eventType: { in: NOTIFICATION_EVENT_CATALOG.map((event) => event.eventType) } },
    select: {
      eventType: true,
      enabled: true,
      emailEnabled: true,
      inAppEnabled: true,
      slackEnabled: true,
    },
  });
  const byType = new Map(settings.map((setting) => [setting.eventType, setting]));

  return NOTIFICATION_EVENT_CATALOG.map((event) => {
    const setting = byType.get(event.eventType);
    return {
      ...event,
      enabled: setting?.enabled ?? DEFAULT_CHANNEL_SETTINGS.enabled,
      emailEnabled: setting?.emailEnabled ?? DEFAULT_CHANNEL_SETTINGS.emailEnabled,
      inAppEnabled: setting?.inAppEnabled ?? DEFAULT_CHANNEL_SETTINGS.inAppEnabled,
      slackEnabled: setting?.slackEnabled ?? DEFAULT_CHANNEL_SETTINGS.slackEnabled,
    };
  });
}

const CHANNEL_COLUMN: Record<NotificationChannel, "emailEnabled" | "inAppEnabled" | "slackEnabled"> = {
  [NotificationChannel.EMAIL]: "emailEnabled",
  [NotificationChannel.IN_APP]: "inAppEnabled",
  [NotificationChannel.SLACK]: "slackEnabled",
};

export async function setNotificationEventChannelEnabled(
  eventType: string,
  channel: NotificationChannel,
  enabled: boolean,
): Promise<void> {
  const known = NOTIFICATION_EVENT_CATALOG.some((event) => event.eventType === eventType);
  if (!known) return;

  const column = CHANNEL_COLUMN[channel];
  await prisma.notificationEventSetting.upsert({
    where: { eventType },
    create: { eventType, ...DEFAULT_CHANNEL_SETTINGS, [column]: enabled },
    update: { [column]: enabled },
  });
}
