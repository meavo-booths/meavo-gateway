"use server";

import { revalidatePath } from "next/cache";
import { NotificationChannel } from "@prisma/client";
import { requireUser } from "@/lib/action-auth";
import { NOTIFICATION_EVENT_TYPES } from "@/lib/notifications/event-catalog";
import { setUserNotificationPreference } from "@/lib/notifications/preferences";

export async function setMyNotificationPreference(
  eventType: string,
  channel: NotificationChannel,
  enabled: boolean,
): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!NOTIFICATION_EVENT_TYPES.includes(eventType)) {
    return { error: "Unknown notification event." };
  }

  try {
    await setUserNotificationPreference(user.id, eventType, channel, enabled);
  } catch (error) {
    console.error("Failed to update notification preference:", error);
    return { error: "Could not save the preference. Try again." };
  }
  revalidatePath("/profile");
  return {};
}
