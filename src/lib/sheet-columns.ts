/** Stable import state id — assembly uses "default". */
export const GATEWAY_SHEET_IMPORT_STATE_ID = "gateway" as const;

/** Slugified header keys in imported row JSON (`rowToRecord`). */
export const SHEET_FIELD_KEYS = {
  dealId: "inv_number_po_number",
  salesRep: "sales_rep",
  invoiceDate: "inv_po_date",
  revenueEur: "invoice_amount_excl_vat",
} as const;

/**
 * Fallback column indices when header keys are missing (0-based).
 * Prefer `SHEET_FIELD_KEYS` — Google omits leading empty cells so indices shift.
 */
export const SHEET_COLUMNS = {
  rowKey: 19,
  salesRep: 8,
  invoiceDate: 10,
  revenueEur: 22,
} as const;
