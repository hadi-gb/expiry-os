/**
 * Global constants for ExpiryOS. No logic here — only configuration values.
 */
const CONFIG = {
  SHEET_NAMES: {
    BATCHES: "Master Inventory",
    ACTION_CENTER: "Action Center",
    COMPLETED_BATCHES: "Completed Batches"
  },
  HEADERS: {
    BATCH_ID: "Batch ID",
    BARCODE: "Barcode",
    BRAND: "Brand",
    PRODUCT: "Product",
    QUANTITY: "Quantity",
    EXPIRY: "Expiry",
    EARLIEST_EXPIRY: "Earliest Expiry",
    EXPIRY_OFFSET: "Expiry Offset",
    MONTHS_REMAINING: "Months Remaining",
    STATUS: "Status",
    ACTION: "Action",
    NOTES: "Notes",
    STOCK_COMPLETED: "Stock Completed",
    COMPLETED_DATE: "Completed Date",
    COMPLETED_BY: "Completed By"
  },
  // Action Center shows a batch once its Expiry Offset (months, from
  // StatusEngine.js) falls to or below this value — covers both "within
  // 12 months" and "already expired" (negative offsets) with one
  // condition. See docs/MILESTONE_3_ARCHITECTURE.md.
  ACTION_CENTER_WINDOW_MONTHS: 12,
  // Closed set for the Action column's dropdown (data validation rejects
  // anything outside this list). Adjust freely for the business's actual
  // workflow.
  ACTION_OPTIONS: ["No Action Yet", "Discount", "Bundle", "Return Supplier", "Destroy", "Hold"],
  NO_BARCODE_VALUE: "NO BARCODE",
  BATCH_ID_PREFIX: "BAT-",
  BATCH_ID_PAD_LENGTH: 6,
  STATUS_LABELS: {
    EXPIRED: "🔴 EXPIRED",
    URGENT: "🔴 URGENT",
    HIGH: "🟠 HIGH",
    MEDIUM: "🟡 MEDIUM",
    SAFE: "🟢 SAFE"
  },
  STATUS_COLORS: {
    EXPIRED: "#990000",
    URGENT: "#F4CCCC",
    HIGH: "#FCE5CD",
    MEDIUM: "#FFF2CC",
    SAFE: "#D9EAD3"
  },
  // Months Remaining upper bound (exclusive) for each category, ascending.
  // Hardcoded for now per explicit decision; a future milestone may move
  // these to sheet-side settings cells if they need to become user-tunable.
  STATUS_THRESHOLDS: {
    URGENT: 3,
    HIGH: 6,
    MEDIUM: 12
  }
};
