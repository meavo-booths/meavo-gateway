import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { importGatewaySheet } from "@/lib/sheets-import";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await importGatewaySheet();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Gateway sheet import cron failed:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
