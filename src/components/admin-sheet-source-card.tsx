import { Prisma } from "@prisma/client";
import { refreshSheetSource } from "@/app/actions/sheet-import";
import { parseGatewaySheetRecordData } from "@/lib/sheets-import";
import type { SheetSourceDefinition } from "@/lib/sheet-sources";
import { Button, Card } from "@/components/ui";

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

function formatDateTime(value: Date | null): string {
  if (!value) return "Never";
  return value.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AdminSheetSourceCard({
  source,
  importState,
  configured,
  records,
}: {
  source: SheetSourceDefinition;
  importState: ImportState;
  configured: boolean;
  records: SheetRecord[];
}) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{source.name}</h2>
          <p className="mt-1 text-sm text-slate-600">{source.description}</p>
        </div>
        <form action={refreshSheetSource}>
          <input type="hidden" name="sourceId" value={source.id} />
          <Button type="submit" disabled={!configured}>
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

      {!configured && (
        <p className="text-sm text-amber-700">
          Not configured — set{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5">{source.envSpreadsheetIdKey}</code> and{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5">{source.envTabNameKey}</code> on the gateway
          Vercel project.
        </p>
      )}

      <div className="border-t border-slate-100 pt-4">
        <h3 className="text-sm font-semibold text-slate-900">Recent rows</h3>
        {records.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No imported rows yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">{source.rowKeyLabel}</th>
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
      </div>
    </Card>
  );
}
