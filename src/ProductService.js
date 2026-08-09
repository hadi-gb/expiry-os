/**
 * Product recognition logic (Barcode -> Brand/Product auto-fill).
 * Kept separate from InventoryService.js, which owns Batch ID generation only.
 */

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
 * Finds the row containing a given barcode whose Batch ID number is the
 * highest among all matches, so the latest valid batch defines the product
 * regardless of physical row order (e.g. after sorting). Rows with a blank
 * Brand or Product, or an unparseable Batch ID, are ignored as candidates.
 * Excludes excludeRow from the search.
 *
 * Reused by recognizeProduct() for auto-fill. A future feature that detects
 * a manual Brand/Product edit on an existing barcode (offering "this batch
 * only" vs "all batches") would use this same lookup to locate the other
 * rows sharing that barcode.
 */
function findMatchingRow(sheet, headerMap, barcode, excludeRow) {
  const barcodeColumn = getColumn(headerMap, CONFIG.HEADERS.BARCODE);
  const brandColumn = getColumn(headerMap, CONFIG.HEADERS.BRAND);
  const productColumn = getColumn(headerMap, CONFIG.HEADERS.PRODUCT);
  const batchIdColumn = getColumn(headerMap, CONFIG.HEADERS.BATCH_ID);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return null;
  }

  const lastColumn = sheet.getLastColumn();
  const rows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  const target = String(barcode).trim();

  let bestRow = null;
  let bestNumber = -1;

  rows.forEach(function (rowValues, index) {
    const row = index + 2;
    if (row === excludeRow) {
      return;
    }

    const rowBarcode = String(rowValues[barcodeColumn - 1]).trim();
    if (rowBarcode === "" || rowBarcode !== target) {
      return;
    }

    const brand = rowValues[brandColumn - 1];
    const product = rowValues[productColumn - 1];
    if (brand === "" || product === "") {
      return;
    }

    const number = parseBatchNumber(rowValues[batchIdColumn - 1]);
    if (number === null) {
      return;
    }

    if (number > bestNumber) {
      bestNumber = number;
      bestRow = row;
    }
  });

  return bestRow;
}

/**
 * Copies a single column's value from sourceRow to targetRow, only if the
 * target cell is currently empty and the source has a value to offer.
 */
function copyIfEmpty(sheet, targetRow, sourceRow, column) {
  const targetCell = sheet.getRange(targetRow, column);
  if (targetCell.getValue() !== "") {
    return;
  }

  const sourceValue = sheet.getRange(sourceRow, column).getValue();
  if (sourceValue === "") {
    return;
  }

  targetCell.setValue(sourceValue);
}

/**
 * Auto-fills Brand and Product for a row from the matching barcode row with
 * the highest Batch ID elsewhere in the sheet. Only fills cells that are
 * currently empty and never overwrites user-entered values. Does nothing if
 * the barcode is blank or unknown.
 */
function recognizeProduct(sheet, row, headerMap) {
  const barcodeColumn = getColumn(headerMap, CONFIG.HEADERS.BARCODE);
  const barcode = sheet.getRange(row, barcodeColumn).getValue();

  if (String(barcode).trim() === "") {
    return;
  }

  const matchRow = findMatchingRow(sheet, headerMap, barcode, row);
  if (matchRow === null) {
    return;
  }

  copyIfEmpty(sheet, row, matchRow, getColumn(headerMap, CONFIG.HEADERS.BRAND));
  copyIfEmpty(sheet, row, matchRow, getColumn(headerMap, CONFIG.HEADERS.PRODUCT));
}
