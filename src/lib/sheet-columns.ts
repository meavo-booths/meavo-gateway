/** Stable import state id — assembly uses "default". */
export const GATEWAY_SHEET_IMPORT_STATE_ID = "gateway" as const;

/**
 * Column indices for the gateway Google Sheet (0-based).
 * Extend this map when typed fields are added to GatewaySheetRecord.
 */
export const SHEET_COLUMNS = {
  /** Column D — DealID (same identifier as Assembly.dealId). */
  rowKey: 3,
  /** Column I — Sales rep name. */
  salesRep: 8,
  /** Column K — Invoice / PO date (`inv_po_date`). */
  invoiceDate: 10,
  /** Column W — Invoice amount excl. VAT (EUR). */
  revenueEur: 22,
} as const;
