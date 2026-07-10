"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/action-auth";
import { isSheetSourceId } from "@/lib/sheet-sources";
import { importGatewaySheet } from "@/lib/sheets-import";

export async function refreshSheetSource(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();

  const sourceId = formData.get("sourceId");
  if (!isSheetSourceId(sourceId)) return { error: "Invalid sheet source." };

  try {
    switch (sourceId) {
      case "ops-file":
        await importGatewaySheet();
        break;
      default:
        return { error: "Unsupported sheet source." };
    }
  } catch (error) {
    // importGatewaySheet records the failure in SheetImportState; the status
    // section on the page shows the detail after revalidation.
    console.error("Sheet import failed:", error);
    revalidatePath("/admin/sheet-import");
    return { error: "Import failed — see the status below for details." };
  }

  revalidatePath("/admin/sheet-import");
  return {};
}
