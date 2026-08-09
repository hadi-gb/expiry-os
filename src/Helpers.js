/**
 * Reusable helpers shared across services. No sheet-specific business logic here.
 */

/**
 * Normalizes text for comparison purposes (trims whitespace, lowercases).
 */
function normalizeText(value) {
  return String(value).trim().toLowerCase();
}

/**
 * Normalizes a header name for lookup purposes, so "Batch ID", " batch id ",
 * and "BATCH ID" all resolve to the same column.
 */
function normalizeHeader(header) {
  return normalizeText(header);
}

/**
 * True if a sheet's name matches the expected name, ignoring case and
 * leading/trailing whitespace differences.
 */
function isSameSheetName(sheet, expectedName) {
  return normalizeText(sheet.getName()) === normalizeText(expectedName);
}

/**
 * Maps header names (row 1) to their 1-based column index, so callers never
 * hardcode column numbers. Keys are normalized so lookups are resilient to
 * accidental capitalization or extra whitespace in the sheet's header row.
 */
function getHeaderMap(sheet) {
  const lastColumn = sheet.getLastColumn();
  const headerRow = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const headerMap = {};

  headerRow.forEach(function (header, index) {
    const normalized = normalizeHeader(header);
    if (normalized !== "") {
      headerMap[normalized] = index + 1;
    }
  });

  return headerMap;
}

/**
 * Resolves a header name to its column index in a headerMap produced by
 * getHeaderMap, normalizing the lookup the same way the map was built.
 * Throws if the header is not present, instead of returning undefined.
 */
function getColumn(headerMap, headerName) {
  const normalized = normalizeHeader(headerName);
  if (!(normalized in headerMap)) {
    throw new Error("Missing required header: " + headerName);
  }
  return headerMap[normalized];
}

/**
 * True if a cell value is a real Date object, as opposed to text or a number.
 */
function isDateValue(value) {
  return Object.prototype.toString.call(value) === "[object Date]";
}

/**
 * True if an edited range is exactly one cell.
 */
function isSingleCellEdit(range) {
  return range.getNumRows() === 1 && range.getNumColumns() === 1;
}

/**
 * True if a header's column falls within the range of columns touched by an
 * edit. Lets onEdit scope logic to a specific column regardless of whether
 * the edit was a single cell or a multi-column paste.
 */
function editTouchesColumn(range, headerMap, headerName) {
  const column = getColumn(headerMap, headerName);
  const startColumn = range.getColumn();
  const endColumn = startColumn + range.getNumColumns() - 1;
  return column >= startColumn && column <= endColumn;
}

/**
 * True if every mapped column in the given row is blank.
 */
function isRowEmpty(sheet, row, headerMap) {
  const columns = Object.keys(headerMap).map(function (header) {
    return headerMap[header];
  });
  const lastColumn = Math.max.apply(null, columns);
  const values = sheet.getRange(row, 1, 1, lastColumn).getValues()[0];

  return values.every(function (value) {
    return value === "" || value === null;
  });
}

/**
 * Formats a batch number into its permanent Batch ID string, e.g. 128 -> "BAT-000128".
 */
function formatBatchId(number) {
  const padded = String(number).padStart(CONFIG.BATCH_ID_PAD_LENGTH, "0");
  return CONFIG.BATCH_ID_PREFIX + padded;
}

/**
 * Parses the numeric portion of a Batch ID, e.g. "BAT-000127" -> 127.
 * Returns null if the value isn't a well-formed Batch ID.
 */
function parseBatchNumber(batchId) {
  const id = String(batchId).trim();
  if (id.indexOf(CONFIG.BATCH_ID_PREFIX) !== 0) {
    return null;
  }

  const number = parseInt(id.slice(CONFIG.BATCH_ID_PREFIX.length), 10);
  return isNaN(number) ? null : number;
}

/**
 * Returns a column's spreadsheet letter (e.g. "E"), reusing Sheets' own A1
 * notation rather than reimplementing column-number-to-letter conversion.
 */
function getColumnLetter(sheet, column) {
  return sheet.getRange(1, column).getA1Notation().replace(/\d+$/, "");
}

/**
 * Resolves a column by header name, inserting it immediately after
 * afterColumn (with the given header text) if it doesn't already exist.
 * Returns the column's index either way. Used by one-time setup utilities
 * so they never hardcode a column position.
 */
function ensureColumnAfter(sheet, headerMap, afterColumn, headerName) {
  const column = headerMap[normalizeHeader(headerName)];
  if (column) {
    return column;
  }

  const newColumn = afterColumn + 1;
  sheet.insertColumnAfter(afterColumn);
  sheet.getRange(1, newColumn).setValue(headerName);
  return newColumn;
}

/**
 * Writes a formula into a cell, but refuses to overwrite it if it already
 * holds a manually entered value, or a formula that doesn't look like ours
 * (detected via a marker substring expected to appear only in formulas this
 * project generates). Throws instead of silently clobbering existing data —
 * shared by every setup utility that writes a formula into an anchor cell,
 * so they all get the same overwrite protection.
 */
function setFormulaIfSafe(cell, formula, formulaMarker, label) {
  const existingFormula = cell.getFormula();
  const isOwnFormula = existingFormula.indexOf(formulaMarker) !== -1;

  if (existingFormula === "" && cell.getValue() !== "") {
    throw new Error(
      label + " (row " + cell.getRow() + ") already contains a manually entered value. " +
      "Refusing to overwrite it — clear the cell first if you want the formula regenerated."
    );
  }

  if (existingFormula !== "" && !isOwnFormula) {
    throw new Error(
      label + " (row " + cell.getRow() + ") already contains a different formula. " +
      "Refusing to overwrite it — clear the cell first if you want the formula regenerated."
    );
  }

  cell.setFormula(formula);
}
