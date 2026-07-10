import { NotificationChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Per-user channel opt-outs for one event type. Absence of a row means the
 * channel is on. Returns a map of userId -> set of opted-out channels.
 */
export async function getUserChannelOptOuts(
  userIds: string[],
  eventType: string,
): Promise<Map<string, Set<NotificationChannel>>> {
  const optOuts = new Map<string, Set<NotificationChannel>>();
  if (userIds.length === 0) return optOuts;

  const rows = await prisma.userNotificationPreference.findMany({
    where: { userId: { in: userIds }, eventType, enabled: false },
    select: { userId: true, channel: true },
  });

  for (const row of rows) {
    const set = optOuts.get(row.userId) ?? new Set<NotificationChannel>();
    set.add(row.channel);
    optOuts.set(row.userId, set);
  }
  return optOuts;
}

export type UserEventPreferences = {
  eventType: string;
  email: boolean;
  inApp: boolean;
  slack: boolean;
};

export async function getUserNotificationPreferences(
  userId: string,
  eventTypes: string[],
): Promise<Map<string, UserEventPreferences>> {
  const rows = await prisma.userNotificationPreference.findMany({
    where: { userId, eventType: { in: eventTypes } },
    select: { eventType: true, channel: true, enabled: true },
  });

  const result = new Map<string, UserEventPreferences>();
  for (const eventType of eventTypes) {
    result.set(eventType, { eventType, email: true, inApp: true, slack: true });
  }
  for (const row of rows) {
    const prefs = result.get(row.eventType);
    if (!prefs) continue;
    if (row.channel === NotificationChannel.EMAIL) prefs.email = row.enabled;
    else if (row.channel === NotificationChannel.IN_APP) prefs.inApp = row.enabled;
    else if (row.channel === NotificationChannel.SLACK) prefs.slack = row.enabled;
  }
  return result;
}

export async function setUserNotificationPreference(
  userId: string,
  eventType: string,
  channel: NotificationChannel,
  enabled: boolean,
): Promise<void> {
  await prisma.userNotificationPreference.upsert({
    where: { userId_eventType_channel: { userId, eventType, channel } },
    create: { userId, eventType, channel, enabled },
    update: { enabled },
  });
}
