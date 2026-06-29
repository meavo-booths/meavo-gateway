"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setNotificationEventEnabled as setEnabled } from "@/lib/notifications/event-settings";
import { isAdmin } from "@/lib/permissions";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!(await isAdmin(session.user.id))) throw new Error("Forbidden");
}

export async function setNotificationEventEnabled(
  eventType: string,
  enabled: boolean,
): Promise<void> {
  await requireAdmin();
  await setEnabled(eventType, enabled);
  revalidatePath("/admin/notifications");
}
