import { Prisma } from "@prisma/client";
import { parseGatewaySheetRecordData } from "@/lib/sheets-import";
import { Button, Card } from "@/components/ui";
import { refreshGatewaySheet } from "@/app/actions/sheet-import";

type ImportState = {
  lastRunAt: Date | null;
  rowCount: number;
  errorMessage: string | null;
} | null;

type SheetRecord = {
  id: string;
  rowKey: string;
  data: Prisma.JsonValue;
  lastImportedAt: Date;
};

type Props = {
  importState: ImportState;
  serviceAccountEmail: string | null;
  spreadsheetConfigured: boolean;
  records: SheetRecord[];
};

function formatDateTime(value: Date | null): string {
  if (!value) return "Never";
  return value.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AdminSheetImport({
  importState,
  serviceAccountEmail,
  spreadsheetConfigured,
  records,
}: Props) {
  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Sheet sync</h2>
            <p className="mt-1 text-sm text-slate-600">
              Imports rows from the configured Google Sheet into the gateway database.
              The first row is treated as headers; column D (DealID) is the unique row key — the same ID used in Assembly for later matching.
            </p>
          </div>
          <form action={refreshGatewaySheet}>
            <Button type="submit" disabled={!spreadsheetConfigured}>
              Refresh from sheet
            </Button>
          </form>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="font-medium text-slate-500">Last import</dt>
            <dd className="mt-1 text-slate-900">{formatDateTime(importState?.lastRunAt ?? null)}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Rows imported</dt>
            <dd className="mt-1 text-slate-900">{importState?.rowCount ?? 0}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Status</dt>
            <dd className="mt-1 text-slate-900">
              {importState?.errorMessage ? (
                <span className="text-red-600">{importState.errorMessage}</span>
              ) : importState?.lastRunAt ? (
                "OK"
              ) : (
                "Not run yet"
              )}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Setup</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>
            Share the Google Sheet with the service account email as <strong>Viewer</strong>
            {serviceAccountEmail ? (
              <>
                : <code className="rounded bg-slate-100 px-1.5 py-0.5">{serviceAccountEmail}</code>
              </>
            ) : (
              <> (set <code className="rounded bg-slate-100 px-1.5 py-0.5">GOOGLE_SERVICE_ACCOUNT_JSON</code> to see the email)</>
            )}
          </li>
          <li>
            Set <code className="rounded bg-slate-100 px-1.5 py-0.5">GOOGLE_SHEETS_SPREADSHEET_ID</code> and{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">GOOGLE_SHEETS_TAB_NAME</code> on the gateway Vercel project
            (reuse the same <code className="rounded bg-slate-100 px-1.5 py-0.5">GOOGLE_SERVICE_ACCOUNT_JSON</code> as assembly).
          </li>
          <li>
            Cron runs <code className="rounded bg-slate-100 px-1.5 py-0.5">/api/cron/import-sheet</code> every 30 minutes on production.
          </li>
        </ol>
        {!spreadsheetConfigured && (
          <p className="text-sm text-amber-700">
            Sheet import is not configured — add the Google Sheets environment variables to enable imports.
          </p>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Recent rows</h2>
        {records.length === 0 ? (
          <p className="text-sm text-slate-600">No imported rows yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">DealID</th>
                  <th className="px-3 py-2 font-medium">Data preview</th>
                  <th className="px-3 py-2 font-medium">Imported</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const data = parseGatewaySheetRecordData(record.data);
                  const preview = Object.entries(data)
                    .slice(0, 4)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(" · ");

                  return (
                    <tr key={record.id} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-900">{record.rowKey}</td>
                      <td className="max-w-xl truncate px-3 py-2 text-slate-600">{preview || "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                        {formatDateTime(record.lastImportedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
