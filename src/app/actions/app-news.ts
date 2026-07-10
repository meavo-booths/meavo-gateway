"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/action-auth";
import { enqueueNotification } from "@/lib/notifications/enqueue";
import { prisma } from "@/lib/prisma";

export type AppNewsActionState = { ok?: boolean; error?: string } | null;

export async function publishAnnouncement(
  _prev: AppNewsActionState,
  formData: FormData,
): Promise<AppNewsActionState> {
  const user = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title) return { error: "Title is required." };
  if (!body) return { error: "Body is required." };

  const announcement = await prisma.appAnnouncement.create({
    data: { title, body, createdById: user.id },
  });

  void enqueueNotification({
    sourceApp: "gateway",
    eventType: "gateway.news.published",
    idempotencyKey: `gateway:news:published:${announcement.id}`,
    payload: { announcementId: announcement.id },
  }).catch((error) => {
    console.error("Notification enqueue failed:", error);
  });

  revalidatePath("/library/app-news");
  return { ok: true };
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await requireAdmin();
  await prisma.appAnnouncement.delete({ where: { id } });
  revalidatePath("/library/app-news");
}
