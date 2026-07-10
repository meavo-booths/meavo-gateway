import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { enqueueNotification } from "@/lib/notifications/enqueue";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const date = new Date().toISOString().slice(0, 10);
    await enqueueNotification({
      sourceApp: "tasks",
      eventType: "tasks.digest.daily",
      idempotencyKey: `tasks:digest:${date}`,
      payload: { date },
    });
    return NextResponse.json({ ok: true, date });
  } catch (error) {
    console.error("Daily task digest cron failed:", error);
    return NextResponse.json({ error: "Daily task digest failed" }, { status: 500 });
  }
}
