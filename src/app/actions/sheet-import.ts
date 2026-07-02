"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { getSheetSource, isSheetSourceId } from "@/lib/sheet-sources";
import { importGatewaySheet } from "@/lib/sheets-import";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!(await isAdmin(session.user.id))) throw new Error("Forbidden");
}

export async function refreshSheetSource(formData: FormData): Promise<void> {
  await requireAdmin();

  const sourceId = formData.get("sourceId");
  if (!isSheetSourceId(sourceId)) throw new Error("Invalid sheet source");

  getSheetSource(sourceId);

  switch (sourceId) {
    case "ops-file":
      await importGatewaySheet();
      break;
    default:
      throw new Error("Unsupported sheet source");
  }

  revalidatePath("/admin/sheet-import");
}
