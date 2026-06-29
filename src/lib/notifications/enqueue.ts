import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isNotificationEventEnabled } from "@/lib/notifications/event-settings";
import type { EnqueueNotificationInput } from "@/lib/notifications/types";

export async function enqueueNotification(input: EnqueueNotificationInput): Promise<void> {
  const enabled = await isNotificationEventEnabled(input.eventType);
  if (!enabled) return;

  try {
    await prisma.notificationOutbox.create({
      data: {
        sourceApp: input.sourceApp,
        eventType: input.eventType,
        idempotencyKey: input.idempotencyKey ?? null,
        payload: input.payload as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (
      input.idempotencyKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return;
    }
    throw error;
  }
}
