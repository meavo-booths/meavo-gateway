import { NextRequest, NextResponse } from "next/server";
import { processNotificationOutbox } from "@/lib/notifications/process";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processNotificationOutbox();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notification processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
