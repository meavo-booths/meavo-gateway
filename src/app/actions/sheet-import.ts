"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { importGatewaySheet } from "@/lib/sheets-import";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!(await isAdmin(session.user.id))) throw new Error("Forbidden");
}

export async function refreshGatewaySheet(): Promise<void> {
  await requireAdmin();
  await importGatewaySheet();
  revalidatePath("/admin/sheet-import");
}
