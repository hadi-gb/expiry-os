/**
 * Status Engine.
 *
 * Dependency chain — each column derives only from the one directly above
 * it; nothing re-parses raw Expiry text or duplicates the month arithmetic:
 *
 *   Expiry
 *     ↓
 *   Earliest Expiry
 *     ↓
 *   Expiry Offset
 *     ├── Months Remaining
 *     └── Status
 *
 * Expiry Offset holds the one and only month-arithmetic formula (a numeric
 * calendar-month difference from today, negative once expired). Months
 * Remaining and Status both read Expiry Offset directly and never each
 * other, so the calculation exists in exactly one place.
 *
 * Entirely native-formula — no Apps Script custom functions for Months
 * Remaining or Status, since month arithmetic and threshold/text
 * categorization are both native Sheets formula territory. This file
 * contains only a one-time setup utility, no runtime logic.
 *
 * setupStatusColumns() is manually run once (from the Apps Script editor),
 * mirroring setupEarliestExpiryColumn()'s approach: resolve columns by
 * header name, insert what's missing immediately after the previous column,
 * and refuse to overwrite pre-existing manual data or unrelated formulas.
 */

// UI detail, not application configuration — kept local to this file rather
// than Config.js. Pixel width Expiry Offset is compressed to: present and
// inspectable for debugging/demonstrations, but visually out of the way.
const EXPIRY_OFFSET_COLUMN_WIDTH = 24;

/**
 * Builds the Expiry Offset formula for a given Earliest Expiry column
 * letter: whole calendar months between today and that date, negative for
 * already-expired batches. Deliberately not DATEDIF(), which errors on a
 * past end date instead of returning a negative number. This is the only
 * place the month-difference arithmetic is written.
 */
function buildExpiryOffsetFormula(earliestExpiryLetter) {
  const range = earliestExpiryLetter + "2:" + earliestExpiryLetter;
  return "=ARRAYFORMULA(IF(" + range + '="", "", ' +
    "(YEAR(" + range + ")-YEAR(TODAY()))*12 + (MONTH(" + range + ")-MONTH(TODAY()))))";
}

/**
 * Builds the Months Remaining formula for a given Expiry Offset column
 * letter: a human-readable phrase derived from the offset, never
 * recomputing it — "N Months Expired" / "1 Month Expired" /
 * "Expires This Month" / "1 Month Remaining" / "N Months Remaining".
 */
function buildMonthsRemainingFormula(expiryOffsetLetter) {
  const range = expiryOffsetLetter + "2:" + expiryOffsetLetter;
  const expiredBranch = "IF(" + range + '=-1, "1 Month Expired", (-' + range + ')&" Months Expired")';
  const remainingBranch = "IF(" + range + '=0, "Expires This Month", IF(' +
    range + '=1, "1 Month Remaining", ' + range + '&" Months Remaining"))';
  const inner = "IF(" + range + "<0, " + expiredBranch + ", " + remainingBranch + ")";

  return "=ARRAYFORMULA(IF(" + range + '="", "", ' + inner + "))";
}

/**
 * Builds the Status formula for a given Expiry Offset column letter,
 * categorizing via CONFIG.STATUS_THRESHOLDS (months, ascending, exclusive
 * upper bounds) and CONFIG.STATUS_LABELS. Reads Expiry Offset only — never
 * Months Remaining's text, and never recomputes the arithmetic.
 */
function buildStatusFormula(expiryOffsetLetter) {
  const range = expiryOffsetLetter + "2:" + expiryOffsetLetter;
  return "=ARRAYFORMULA(IF(" + range + '="", "", IFS(' +
    range + '<0, "' + CONFIG.STATUS_LABELS.EXPIRED + '", ' +
    range + '<' + CONFIG.STATUS_THRESHOLDS.URGENT + ', "' + CONFIG.STATUS_LABELS.URGENT + '", ' +
    range + '<' + CONFIG.STATUS_THRESHOLDS.HIGH + ', "' + CONFIG.STATUS_LABELS.HIGH + '", ' +
    range + '<' + CONFIG.STATUS_THRESHOLDS.MEDIUM + ', "' + CONFIG.STATUS_LABELS.MEDIUM + '", ' +
    'TRUE, "' + CONFIG.STATUS_LABELS.SAFE + '")))';
}

/**
 * Applies a background fill per Status category so the sheet is scannable
 * without relying on the emoji alone. Replaces only rules this function
 * previously added to the Status column (detected by each existing rule's
 * range starting at that column) — any other conditional formatting
 * elsewhere on the sheet is left untouched. Covers rows 2 through the
 * sheet's current max row, so newly added rows are covered without needing
 * to re-run this.
 */
function applyStatusFormatting(sheet, statusColumn) {
  const range = sheet.getRange(2, statusColumn, sheet.getMaxRows() - 1, 1);

  const otherRules = sheet.getConditionalFormatRules().filter(function (rule) {
    return !rule.getRanges().some(function (existingRange) {
      return existingRange.getColumn() === statusColumn;
    });
  });

  const statusRules = [
    [CONFIG.STATUS_LABELS.SAFE, CONFIG.STATUS_COLORS.SAFE],
    [CONFIG.STATUS_LABELS.MEDIUM, CONFIG.STATUS_COLORS.MEDIUM],
    [CONFIG.STATUS_LABELS.HIGH, CONFIG.STATUS_COLORS.HIGH],
    [CONFIG.STATUS_LABELS.URGENT, CONFIG.STATUS_COLORS.URGENT],
    [CONFIG.STATUS_LABELS.EXPIRED, CONFIG.STATUS_COLORS.EXPIRED]
  ].map(function (labelAndColor) {
    const label = labelAndColor[0];
    const color = labelAndColor[1];

    let rule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(label)
      .setBackground(color)
      .setRanges([range]);

    if (label === CONFIG.STATUS_LABELS.EXPIRED) {
      rule = rule.setFontColor("#FFFFFF");
    }

    return rule.build();
  });

  sheet.setConditionalFormatRules(otherRules.concat(statusRules));
}

/**
 * One-time setup: creates Expiry Offset, Months Remaining, and Status (in
 * that order) immediately after Earliest Expiry, writing native-formula
 * ARRAYFORMULA columns built from each source column's current position.
 * Expiry Offset's column is compressed to a minimal width rather than
 * hidden, so it stays visible and inspectable for debugging/demonstrations.
 * Safe to run more than once; refuses to overwrite any anchor cell that
 * already holds a manual value or an unrelated formula.
 */
function setupStatusColumns() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.BATCHES);

  let headerMap = getHeaderMap(sheet);
  const earliestExpiryColumn = getColumn(headerMap, CONFIG.HEADERS.EARLIEST_EXPIRY);
  const expiryOffsetColumn = ensureColumnAfter(
    sheet, headerMap, earliestExpiryColumn, CONFIG.HEADERS.EXPIRY_OFFSET
  );

  const earliestExpiryLetter = getColumnLetter(sheet, earliestExpiryColumn);
  const expiryOffsetCell = sheet.getRange(2, expiryOffsetColumn);
  setFormulaIfSafe(
    expiryOffsetCell, buildExpiryOffsetFormula(earliestExpiryLetter), "MONTH(TODAY())", "Expiry Offset column"
  );

  sheet.setColumnWidth(expiryOffsetColumn, EXPIRY_OFFSET_COLUMN_WIDTH);
  const expiryOffsetLetter = getColumnLetter(sheet, expiryOffsetColumn);

  // Re-fetch: inserting Expiry Offset shifts column indices for anything
  // already positioned after it, including pre-existing Months
  // Remaining/Status columns from a prior run.
  headerMap = getHeaderMap(sheet);
  const monthsRemainingColumn = ensureColumnAfter(
    sheet, headerMap, expiryOffsetColumn, CONFIG.HEADERS.MONTHS_REMAINING
  );
  const monthsRemainingCell = sheet.getRange(2, monthsRemainingColumn);
  setFormulaIfSafe(
    monthsRemainingCell, buildMonthsRemainingFormula(expiryOffsetLetter), "This Month", "Months Remaining column"
  );

  headerMap = getHeaderMap(sheet);
  const statusColumn = ensureColumnAfter(sheet, headerMap, monthsRemainingColumn, CONFIG.HEADERS.STATUS);
  const statusCell = sheet.getRange(2, statusColumn);
  setFormulaIfSafe(
    statusCell, buildStatusFormula(expiryOffsetLetter), CONFIG.STATUS_LABELS.EXPIRED, "Status column"
  );

  applyStatusFormatting(sheet, statusColumn);
}
