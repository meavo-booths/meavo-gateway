import { GATEWAY_SHEET_IMPORT_STATE_ID } from "@/lib/sheet-columns";

export type SheetSourceId = "ops-file";

export type SheetSourceDefinition = {
  id: SheetSourceId;
  name: string;
  description: string;
  importStateId: string;
  rowKeyLabel: string;
  envSpreadsheetIdKey: string;
  envTabNameKey: string;
};

export const SHEET_SOURCES: SheetSourceDefinition[] = [
  {
    id: "ops-file",
    name: "Ops File",
    description:
      "Imports rows from the Ops File Google Sheet into the gateway database. Row 1 is headers; DealID is the unique key (same ID as Assembly for matching). Revenue, invoice date, and sales rep power the home page revenue card.",
    importStateId: GATEWAY_SHEET_IMPORT_STATE_ID,
    rowKeyLabel: "DealID",
    envSpreadsheetIdKey: "GOOGLE_SHEETS_SPREADSHEET_ID",
    envTabNameKey: "GOOGLE_SHEETS_TAB_NAME",
  },
];

const SHEET_SOURCE_BY_ID = new Map(SHEET_SOURCES.map((source) => [source.id, source]));

export function isSheetSourceId(value: FormDataEntryValue | null | undefined): value is SheetSourceId {
  return typeof value === "string" && SHEET_SOURCE_BY_ID.has(value as SheetSourceId);
}

export function isSheetSourceConfigured(source: SheetSourceDefinition): boolean {
  return Boolean(process.env[source.envSpreadsheetIdKey]);
}
