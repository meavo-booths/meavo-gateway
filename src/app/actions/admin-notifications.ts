"use server";

import { revalidatePath } from "next/cache";
import { NotificationChannel } from "@prisma/client";
import { requireAdmin } from "@/lib/action-auth";
import { setNotificationEventChannelEnabled as setChannelEnabled } from "@/lib/notifications/event-settings";

export async function setNotificationEventChannelEnabled(
  eventType: string,
  channel: NotificationChannel,
  enabled: boolean,
): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await setChannelEnabled(eventType, channel, enabled);
  } catch (error) {
    console.error("Failed to update notification event setting:", error);
    return { error: "Could not save the setting. Try again." };
  }
  revalidatePath("/admin/notifications");
  return {};
}
