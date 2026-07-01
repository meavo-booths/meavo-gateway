import { AdminSheetImport } from "@/components/admin-sheet-import";
import { getServiceAccountEmail } from "@/lib/google-sheets-client";
import { GATEWAY_SHEET_IMPORT_STATE_ID } from "@/lib/sheet-columns";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSheetImportPage() {
  const [importState, records] = await Promise.all([
    prisma.sheetImportState.findUnique({
      where: { id: GATEWAY_SHEET_IMPORT_STATE_ID },
    }),
    prisma.gatewaySheetRecord.findMany({
      orderBy: { lastImportedAt: "desc" },
      take: 25,
    }),
  ]);

  return (
    <AdminSheetImport
      importState={importState}
      serviceAccountEmail={getServiceAccountEmail()}
      spreadsheetConfigured={Boolean(process.env.GOOGLE_SHEETS_SPREADSHEET_ID)}
      records={records}
    />
  );
}
