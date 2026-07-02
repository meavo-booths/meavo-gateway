import { AdminSheetSourceCard } from "@/components/admin-sheet-source-card";
import { Card } from "@/components/ui";
import type { SheetSourceDefinition } from "@/lib/sheet-sources";
import { Prisma } from "@prisma/client";

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

export type SheetSourceAdminData = {
  source: SheetSourceDefinition;
  importState: ImportState;
  configured: boolean;
  records: SheetRecord[];
};

type Props = {
  sources: SheetSourceAdminData[];
  serviceAccountEmail: string | null;
};

export function AdminSheetImport({ sources, serviceAccountEmail }: Props) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Manage Google Sheet imports into gateway. Each sheet has its own sync status and recent rows preview.
      </p>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Setup</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>
            Share each Google Sheet with the service account email as <strong>Viewer</strong>
            {serviceAccountEmail ? (
              <>
                : <code className="rounded bg-slate-100 px-1.5 py-0.5">{serviceAccountEmail}</code>
              </>
            ) : (
              <> (set <code className="rounded bg-slate-100 px-1.5 py-0.5">GOOGLE_SERVICE_ACCOUNT_JSON</code> to see the email)</>
            )}
          </li>
          <li>
            Set sheet-specific env vars on the gateway Vercel project (reuse the same{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">GOOGLE_SERVICE_ACCOUNT_JSON</code> as assembly).
          </li>
          <li>
            Cron runs <code className="rounded bg-slate-100 px-1.5 py-0.5">/api/cron/import-sheet</code> every 30
            minutes for configured sources.
          </li>
        </ol>
      </Card>

      {sources.map(({ source, importState, configured, records }) => (
        <AdminSheetSourceCard
          key={source.id}
          source={source}
          importState={importState}
          configured={configured}
          records={records}
        />
      ))}
    </div>
  );
}
