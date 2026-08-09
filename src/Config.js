/**
 * Global constants for ExpiryOS. No logic here — only configuration values.
 */
const CONFIG = {
  SHEET_NAMES: {
    BATCHES: "Master Inventory"
  },
  HEADERS: {
    BATCH_ID: "Batch ID",
    BARCODE: "Barcode",
    BRAND: "Brand",
    PRODUCT: "Product",
    EXPIRY: "Expiry",
    EARLIEST_EXPIRY: "Earliest Expiry",
    EXPIRY_OFFSET: "Expiry Offset",
    MONTHS_REMAINING: "Months Remaining",
    STATUS: "Status"
  },
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
