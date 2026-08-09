/**
 * Expiry Intelligence Engine.
 *
 * Reads an Expiry cell's value and determines the single earliest expiry
 * date it represents. An Expiry cell holds one or more components separated
 * by "/", each optionally preceded by arbitrary free text (e.g.
 * "Body Lotion:03-2026 / Cleanser 250ml 09-2027") — no delimiter is required
 * between the label and the date, and the label itself is never inspected.
 * A plain single date with no label is just the one-component case of the
 * same format — there is no special case for it and no assumption about
 * what a label means; this engine only extracts dates and picks the
 * earliest.
 *
 * Only MM-YYYY is a supported per-component date format (standardized
 * throughout ExpiryOS). A real Date object (e.g. a date-formatted single
 * Expiry cell) is also accepted directly.
 *
 * All parsing logic lives here as plain functions, reusable by any future
 * Apps Script feature (Status, Priority, Dashboard, Sorting, Alerts) without
 * going through a spreadsheet formula. EXPIRY_EARLIEST() below is a thin
 * @customfunction wrapper for use directly in the sheet.
 *
 * setupEarliestExpiryColumn() is a one-time, manually-run setup utility —
 * run it once (from the Apps Script editor) to create the Earliest Expiry
 * column and its formula. It resolves the Expiry column by header name, the
 * same as every other feature in this project, so it never hardcodes a
 * column reference and stays correct if columns are reordered later.
 */

/**
 * Splits a raw Expiry text value into trimmed, non-empty components.
 */
function splitExpiryComponents(text) {
  return text.split("/")
    .map(function (part) { return part.trim(); })
    .filter(function (part) { return part !== ""; });
}

/**
 * Parses a single component's date into a Date representing the first of
 * that month. No delimiter (colon or otherwise) is required between a free
 * text label and the date — the label is arbitrary and is ignored entirely.
 * The month may be written with one or two digits (e.g. "1-2026" or
 * "01-2026" both mean January 2026). This finds every such pattern anywhere
 * in the component and returns the last one that has a valid month (1-12),
 * so "Body Lotion:03-2026", "Body Lotion : 03-2026", "Body Lotion 03-2026",
 * "Body Lotion 3-2026", and "03-2026"/"3-2026" all resolve identically.
 * Returns null if the component contains no valid date pattern.
 */
function parseExpiryComponentDate(component) {
  const matches = component.match(/\d{1,2}-\d{4}/g) || [];

  for (let i = matches.length - 1; i >= 0; i--) {
    const parts = matches[i].split("-");
    const month = parseInt(parts[0], 10);
    const year = parseInt(parts[1], 10);

    if (month >= 1 && month <= 12) {
      return new Date(year, month - 1, 1);
    }
  }

  return null;
}

/**
 * Determines the single earliest expiry date represented by an Expiry
 * cell's raw value. Accepts a real Date directly (single-expiry rows
 * already stored as dates), or text containing one or more MM-YYYY
 * components. Returns null if nothing valid can be parsed.
 */
function getEarliestExpiry(value) {
  if (isDateValue(value)) {
    return value;
  }

  const text = String(value).trim();
  if (text === "") {
    return null;
  }

  const dates = splitExpiryComponents(text)
    .map(parseExpiryComponentDate)
    .filter(function (date) { return date !== null; });

  if (dates.length === 0) {
    return null;
  }

  return new Date(Math.min.apply(null, dates.map(function (date) { return date.getTime(); })));
}

/**
 * Applies getEarliestExpiry() to either a single value or a 2D array of
 * values. Apps Script passes a 2D array (not one call per cell) when a
 * custom function receives a multi-cell range, whether called directly
 * (e.g. EXPIRY_EARLIEST(D2:D100)) or through ARRAYFORMULA — so this maps
 * over the array shape, calling getEarliestExpiry() per cell, without
 * duplicating any of its parsing logic.
 */
function getEarliestExpiryForInput(value) {
  if (Array.isArray(value)) {
    return value.map(function (row) {
      return row.map(getEarliestExpiry);
    });
  }

  return getEarliestExpiry(value);
}

/**
 * Spreadsheet-callable wrapper. Kept thin on purpose — all real logic lives
 * in getEarliestExpiry() (and the shape-handling in
 * getEarliestExpiryForInput()) so other Apps Script code can call either
 * directly without depending on this being used as a formula.
 *
 * @customfunction
 */
function EXPIRY_EARLIEST(value) {
  return getEarliestExpiryForInput(value);
}

/**
 * One-time setup: creates the Earliest Expiry column immediately after
 * Expiry (if it doesn't already exist) and (re)writes its formula, built
 * from the Expiry column's current position — never a hardcoded reference.
 * Safe to run more than once.
 *
 * The formula is a bare EXPIRY_EARLIEST(range) call, deliberately not
 * wrapped in ARRAYFORMULA/IF: nesting a custom function inside IF inside
 * ARRAYFORMULA doesn't reliably propagate the custom function's array
 * output back through Sheets, which was confirmed to leave the column blank
 * in testing. A bare range call spills its own array output directly, and
 * getEarliestExpiry() already returns null (rendered as blank) for empty
 * cells, so no IF guard is needed.
 *
 * Overwrite protection (refusing to touch a cell that already holds a
 * manual value or an unrelated formula) is shared via setFormulaIfSafe() in
 * Helpers.js — the same protection setupStatusColumns() uses.
 */
function setupEarliestExpiryColumn() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.BATCHES);
  const headerMap = getHeaderMap(sheet);

  const expiryColumn = getColumn(headerMap, CONFIG.HEADERS.EXPIRY);
  const earliestExpiryColumn = ensureColumnAfter(sheet, headerMap, expiryColumn, CONFIG.HEADERS.EARLIEST_EXPIRY);

  const expiryLetter = getColumnLetter(sheet, expiryColumn);
  const formula = "=EXPIRY_EARLIEST(" + expiryLetter + "2:" + expiryLetter + ")";

  const anchorCell = sheet.getRange(2, earliestExpiryColumn);
  setFormulaIfSafe(anchorCell, formula, "EXPIRY_EARLIEST(", "Earliest Expiry column");
}
