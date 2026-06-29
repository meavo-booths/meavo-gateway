import { prisma } from "@/lib/prisma";
import {
  NOTIFICATION_EVENT_CATALOG,
  type NotificationEventDefinition,
} from "@/lib/notifications/event-catalog";

export type AdminNotificationEvent = NotificationEventDefinition & {
  enabled: boolean;
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

export async function isNotificationEventEnabled(eventType: string): Promise<boolean> {
  const setting = await prisma.notificationEventSetting.findUnique({
    where: { eventType },
    select: { enabled: true },
  });
  return setting?.enabled ?? true;
}

export async function getAdminNotificationEvents(): Promise<AdminNotificationEvent[]> {
  await ensureNotificationEventSettings();

  const settings = await prisma.notificationEventSetting.findMany({
    where: { eventType: { in: NOTIFICATION_EVENT_CATALOG.map((event) => event.eventType) } },
    select: { eventType: true, enabled: true },
  });
  const enabledByType = new Map(settings.map((setting) => [setting.eventType, setting.enabled]));

  return NOTIFICATION_EVENT_CATALOG.map((event) => ({
    ...event,
    enabled: enabledByType.get(event.eventType) ?? true,
  }));
}

export async function setNotificationEventEnabled(
  eventType: string,
  enabled: boolean,
): Promise<void> {
  const known = NOTIFICATION_EVENT_CATALOG.some((event) => event.eventType === eventType);
  if (!known) return;

  await prisma.notificationEventSetting.upsert({
    where: { eventType },
    create: { eventType, enabled },
    update: { enabled },
  });
}
