import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import {
  buildWeeklyHolidaySlackMessage,
  getHolidayDigestTimeZone,
  getWeekRangeForTimeZone,
  isHolidayDigestEnabled,
  loadWeeklyHolidayEntries,
  loadWeeklyPublicHolidays,
} from "@/lib/holiday-weekly-digest";
import { holsUrl } from "@/lib/notifications/urls";
import { postSlackWebhook } from "@/lib/slack";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isHolidayDigestEnabled()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "disabled" });
  }

  const webhookUrl = process.env.SLACK_HOLIDAY_DIGEST_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "SLACK_HOLIDAY_DIGEST_WEBHOOK_URL not configured",
    });
  }

  try {
    const timeZone = getHolidayDigestTimeZone();
    const { weekStart, weekEnd, weekLabel } = getWeekRangeForTimeZone(timeZone);
    const [entries, publicHolidays] = await Promise.all([
      loadWeeklyHolidayEntries(weekStart, weekEnd),
      loadWeeklyPublicHolidays(weekStart, weekEnd),
    ]);
    const message = buildWeeklyHolidaySlackMessage({
      weekLabel,
      entries,
      publicHolidays,
      timeZone,
      holsUrl: holsUrl(),
    });

    await postSlackWebhook(webhookUrl, message);

    return NextResponse.json({
      ok: true,
      sent: true,
      weekLabel,
      count: entries.length,
      publicHolidayCount: publicHolidays.length,
      timeZone,
    });
  } catch (error) {
    console.error("Weekly holiday digest cron failed:", error);
    return NextResponse.json({ error: "Weekly holiday digest failed" }, { status: 500 });
  }
}
