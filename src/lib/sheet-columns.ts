/** Stable import state id — assembly uses "default". */
export const GATEWAY_SHEET_IMPORT_STATE_ID = "gateway" as const;

/**
 * Column indices for the gateway Google Sheet (0-based).
 * Extend this map when typed fields are added to GatewaySheetRecord.
 */
export const SHEET_COLUMNS = {
  /** Column D — DealID (same identifier as Assembly.dealId). */
  rowKey: 3,
  /** Column E — Sales rep name. */
  salesRep: 4,
  /** Column J — Invoice date. */
  invoiceDate: 9,
  /** Column AB — Invoice amount excl. VAT (EUR). */
  revenueEur: 27,
} as const;
