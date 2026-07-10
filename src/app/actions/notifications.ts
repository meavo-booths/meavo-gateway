"use server";

import type { NotificationFeed } from "@meavo/navigation";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@meavo/navigation/server";
import { requireUser } from "@/lib/action-auth";
import { prisma } from "@/lib/prisma";

export async function refreshNotificationsAction(): Promise<NotificationFeed> {
  const user = await requireUser();
  return getNotifications(prisma, { userId: user.id });
}

export async function markNotificationReadAction(notificationId: string): Promise<void> {
  const user = await requireUser();
  await markNotificationRead(prisma, { userId: user.id, notificationId });
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await requireUser();
  await markAllNotificationsRead(prisma, { userId: user.id });
}
