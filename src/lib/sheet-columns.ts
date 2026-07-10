/** Stable import state id — assembly uses "default". */
export const GATEWAY_SHEET_IMPORT_STATE_ID = "gateway" as const;

/** Slugified header keys in imported row JSON (`rowToRecord`). */
export const SHEET_FIELD_KEYS = {
  dealId: "inv_number_po_number",
  salesRep: "sales_rep",
  invoiceDate: "inv_po_date",
  // Column AB — EUR-converted amount. Column L (invoice_amount_excl_vat) is in
  // the original invoice currency (GBP for UK deals), so summing it mixes currencies.
  revenueEur: "invoice_amount_excl_vat_eur",
  market: "market",
  clientType: "client_type",
  newVsRepeat: "new_vs_repeat_client",
} as const;

/**
 * Fallback column indices when header keys are missing (0-based).
 * Prefer `SHEET_FIELD_KEYS` — Google omits leading empty cells so indices shift.
 */
export const SHEET_COLUMNS = {
  rowKey: 3,
  salesRep: 4,
  invoiceDate: 9,
  revenueEur: 27,
} as const;
