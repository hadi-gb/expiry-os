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
