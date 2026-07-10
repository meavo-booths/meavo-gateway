"use server";

import { revalidatePath } from "next/cache";
import { NotificationChannel } from "@prisma/client";
import { auth } from "@/lib/auth";
import { NOTIFICATION_EVENT_TYPES } from "@/lib/notifications/event-catalog";
import { setUserNotificationPreference } from "@/lib/notifications/preferences";

export async function setMyNotificationPreference(
  eventType: string,
  channel: NotificationChannel,
  enabled: boolean,
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!NOTIFICATION_EVENT_TYPES.includes(eventType)) throw new Error("Unknown event type");

  await setUserNotificationPreference(session.user.id, eventType, channel, enabled);
  revalidatePath("/profile");
}
