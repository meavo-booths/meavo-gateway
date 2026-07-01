import { Prisma } from "@prisma/client";
import { getSheetValues } from "@/lib/google-sheets-client";
import {
  GATEWAY_SHEET_IMPORT_STATE_ID,
  SHEET_COLUMNS,
  SHEET_FIELD_KEYS,
} from "@/lib/sheet-columns";
import { prisma } from "@/lib/prisma";

const MAX_REVENUE_EUR = 9_999_999_999.99;

function parseSheetDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/[/.-]/);
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map((p) => parseInt(p, 10));
  if (!d || !m || !y) return null;
  const year = y < 100 ? 2000 + y : y;
  const date = new Date(Date.UTC(year, m - 1, d));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseRevenueEur(value: string): Prisma.Decimal | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/[€\s,]/g, "");
  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_REVENUE_EUR) return null;
  return new Prisma.Decimal(amount.toFixed(2));
}

function slugifyHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function rowToRecord(headers: string[], row: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  const max = Math.max(headers.length, row.length);

  for (let i = 0; i < max; i += 1) {
    const header = headers[i]?.trim();
    if (!header) continue;
    const key = slugifyHeader(header) || `column_${i + 1}`;
    record[key] = String(row[i] ?? "").trim();
  }

  return record;
}

function fieldValue(
  record: Record<string, string>,
  key: string,
  columnIndex: number,
  row: string[]
): string {
  return record[key]?.trim() || String(row[columnIndex] ?? "").trim();
}

function extractTypedFields(record: Record<string, string>, row: string[]) {
  const salesRep =
    fieldValue(record, SHEET_FIELD_KEYS.salesRep, SHEET_COLUMNS.salesRep, row) || null;
  const invoiceDate = parseSheetDate(
    fieldValue(record, SHEET_FIELD_KEYS.invoiceDate, SHEET_COLUMNS.invoiceDate, row)
  );
  const revenueEur = parseRevenueEur(
    fieldValue(record, SHEET_FIELD_KEYS.revenueEur, SHEET_COLUMNS.revenueEur, row)
  );

  return { salesRep, invoiceDate, revenueEur };
}

function resolveRowKey(record: Record<string, string>, row: string[]): string | null {
  const dealId = fieldValue(record, SHEET_FIELD_KEYS.dealId, SHEET_COLUMNS.rowKey, row);
  return dealId || null;
}

async function recordImportState(input: {
  rowCount: number;
  errorMessage: string | null;
}) {
  await prisma.sheetImportState.upsert({
    where: { id: GATEWAY_SHEET_IMPORT_STATE_ID },
    create: {
      id: GATEWAY_SHEET_IMPORT_STATE_ID,
      lastRunAt: new Date(),
      rowCount: input.rowCount,
      errorMessage: input.errorMessage,
    },
    update: {
      lastRunAt: new Date(),
      rowCount: input.rowCount,
      errorMessage: input.errorMessage,
    },
  });
}

export async function importGatewaySheet(): Promise<{ imported: number }> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const tabName = process.env.GOOGLE_SHEETS_TAB_NAME ?? "Sheet1";
  if (!spreadsheetId) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is not set");

  try {
    const rows = await getSheetValues(spreadsheetId, tabName);
    if (rows.length < 2) {
      await recordImportState({ rowCount: 0, errorMessage: null });
      return { imported: 0 };
    }

    const headers = rows[0] ?? [];
    let imported = 0;

    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i] ?? [];
      const data = rowToRecord(headers, row);
      const rowKey = resolveRowKey(data, row);
      if (!rowKey) continue;

      const { salesRep, invoiceDate, revenueEur } = extractTypedFields(data, row);

      await prisma.gatewaySheetRecord.upsert({
        where: { rowKey },
        create: {
          rowKey,
          data,
          salesRep,
          invoiceDate,
          revenueEur,
          lastImportedAt: new Date(),
        },
        update: {
          data,
          salesRep,
          invoiceDate,
          revenueEur,
          lastImportedAt: new Date(),
        },
      });
      imported += 1;
    }

    await recordImportState({ rowCount: imported, errorMessage: null });
    return { imported };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    await recordImportState({ rowCount: 0, errorMessage: message });
    throw error;
  }
}

export type GatewaySheetRecordData = Record<string, string>;

export function parseGatewaySheetRecordData(
  data: Prisma.JsonValue
): GatewaySheetRecordData {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value ?? "")])
  );
}
