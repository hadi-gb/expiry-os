/**
 * General sheet presentation setup — freezing and column alignment. Spans
 * columns owned by several other files (Batch ID, Product, Earliest Expiry,
 * Months Remaining, Status), so it lives here rather than in any single
 * feature's file. Purely cosmetic: no business logic, no formulas.
 *
 * setupSheetFormatting() is manually run once (from the Apps Script editor).
 * Resolves every column by header name, never a hardcoded position, and is
 * safe to run more than once.
 */
function setupSheetFormatting() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.BATCHES);
  const headerMap = getHeaderMap(sheet);
  const numDataRows = sheet.getMaxRows() - 1;

  sheet.setFrozenRows(1);

  const centerAlignedHeaders = [
    CONFIG.HEADERS.BATCH_ID,
    CONFIG.HEADERS.EARLIEST_EXPIRY,
    CONFIG.HEADERS.MONTHS_REMAINING,
    CONFIG.HEADERS.STATUS
  ];

  centerAlignedHeaders.forEach(function (headerName) {
    const column = getColumn(headerMap, headerName);
    sheet.getRange(2, column, numDataRows, 1).setHorizontalAlignment("center");
  });

  const productColumn = getColumn(headerMap, CONFIG.HEADERS.PRODUCT);
  sheet.getRange(2, productColumn, numDataRows, 1).setHorizontalAlignment("left");
}
