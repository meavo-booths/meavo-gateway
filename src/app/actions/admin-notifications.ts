"use server";

import { revalidatePath } from "next/cache";
import { NotificationChannel } from "@prisma/client";
import { auth } from "@/lib/auth";
import { setNotificationEventChannelEnabled as setChannelEnabled } from "@/lib/notifications/event-settings";
import { isAdmin } from "@/lib/permissions";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!(await isAdmin(session.user.id))) throw new Error("Forbidden");
}

export async function setNotificationEventChannelEnabled(
  eventType: string,
  channel: NotificationChannel,
  enabled: boolean,
): Promise<void> {
  await requireAdmin();
  await setChannelEnabled(eventType, channel, enabled);
  revalidatePath("/admin/notifications");
}
