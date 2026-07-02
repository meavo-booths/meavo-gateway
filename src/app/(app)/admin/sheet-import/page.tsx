import { AdminSheetImport } from "@/components/admin-sheet-import";
import { getServiceAccountEmail } from "@/lib/google-sheets-client";
import { prisma } from "@/lib/prisma";
import {
  isSheetSourceConfigured,
  SHEET_SOURCES,
  type SheetSourceId,
} from "@/lib/sheet-sources";

export const dynamic = "force-dynamic";

async function loadRecentRecords(sourceId: SheetSourceId) {
  switch (sourceId) {
    case "ops-file":
      return prisma.gatewaySheetRecord.findMany({
        orderBy: { lastImportedAt: "desc" },
        take: 25,
      });
    default:
      return [];
  }
}

export default async function AdminSheetImportPage() {
  const sources = await Promise.all(
    SHEET_SOURCES.map(async (source) => {
      const [importState, records] = await Promise.all([
        prisma.sheetImportState.findUnique({
          where: { id: source.importStateId },
        }),
        loadRecentRecords(source.id),
      ]);

      return {
        source,
        importState,
        configured: isSheetSourceConfigured(source),
        records,
      };
    })
  );

  return (
    <AdminSheetImport
      sources={sources}
      serviceAccountEmail={getServiceAccountEmail()}
    />
  );
}
