/**
 * Duplicate Detection: warns when a batch matches an existing one by
 * Barcode+Expiry (or Product+Expiry for NO BARCODE rows). This is a warning
 * system only — it never merges, deletes, or modifies the matched existing
 * row. Kept separate from ProductService.js and InventoryService.js, which
 * own unrelated responsibilities.
 */

/**
 * Normalizes an Expiry cell value into a comparable string. Handles both
 * Date objects (if the column is date-formatted) and plain text.
 *
 * Every Expiry comparison in this file must go through this function, never
 * a raw cell value — this is also the one place a future Multi-Expiry
 * Support feature would need to change (e.g. to compare per-component or by
 * earliest date) without touching the rest of this file.
 */
function normalizeExpiryValue(value) {
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(value).trim();
}

/**
 * Formats an Expiry cell value for display in the confirmation dialog only.
 * Comparisons must always use normalizeExpiryValue() instead — this exists
 * purely for a human-readable dd-MM-yyyy presentation.
 */
function formatExpiryForDisplay(value) {
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "dd-MM-yyyy");
  }
  return String(value).trim();
}

/**
 * True if a barcode value marks its row as a NO BARCODE product.
 */
function isNoBarcodeRow(barcode) {
  return normalizeText(barcode) === normalizeText(CONFIG.NO_BARCODE_VALUE);
}

/**
 * Finds an existing row whose duplicate key matches the given row's key.
 * Uses Barcode+Expiry, or Product+Expiry when the row is a NO BARCODE
 * product. If more than one row matches, the one with the highest Batch ID
 * wins (consistent with ProductService.js). Excludes the row itself.
 * Returns null if the row's key is incomplete or no match is found.
 */
function findDuplicateBatch(sheet, headerMap, row) {
  const barcodeColumn = getColumn(headerMap, CONFIG.HEADERS.BARCODE);
  const productColumn = getColumn(headerMap, CONFIG.HEADERS.PRODUCT);
  const expiryColumn = getColumn(headerMap, CONFIG.HEADERS.EXPIRY);
  const batchIdColumn = getColumn(headerMap, CONFIG.HEADERS.BATCH_ID);

  const barcode = sheet.getRange(row, barcodeColumn).getValue();
  const keyColumn = isNoBarcodeRow(barcode) ? productColumn : barcodeColumn;

  const keyValue = String(sheet.getRange(row, keyColumn).getValue()).trim();
  const expiry = normalizeExpiryValue(sheet.getRange(row, expiryColumn).getValue());

  if (keyValue === "" || expiry === "") {
    return null;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return null;
  }

  const lastColumn = sheet.getLastColumn();
  const rows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();

  let bestRow = null;
  let bestNumber = -1;

  rows.forEach(function (candidate, index) {
    const candidateRow = index + 2;
    if (candidateRow === row) {
      return;
    }

    const candidateKeyValue = String(candidate[keyColumn - 1]).trim();
    if (candidateKeyValue === "" || candidateKeyValue !== keyValue) {
      return;
    }

    const candidateExpiry = normalizeExpiryValue(candidate[expiryColumn - 1]);
    if (candidateExpiry !== expiry) {
      return;
    }

    const number = parseBatchNumber(candidate[batchIdColumn - 1]);
    if (number === null) {
      return;
    }

    if (number > bestNumber) {
      bestNumber = number;
      bestRow = candidateRow;
    }
  });

  return bestRow;
}

/**
 * Shows the duplicate confirmation dialog. Returns true if the user chooses
 * to create the batch anyway, false to cancel. Only reads the matched row —
 * never writes to it, and never changes the active selection.
 */
function confirmDuplicateBatch(sheet, headerMap, duplicateRow) {
  const batchIdColumn = getColumn(headerMap, CONFIG.HEADERS.BATCH_ID);
  const barcodeColumn = getColumn(headerMap, CONFIG.HEADERS.BARCODE);
  const expiryColumn = getColumn(headerMap, CONFIG.HEADERS.EXPIRY);

  const existingBatchId = sheet.getRange(duplicateRow, batchIdColumn).getValue();
  const existingBarcode = sheet.getRange(duplicateRow, barcodeColumn).getValue();
  const existingExpiry = formatExpiryForDisplay(sheet.getRange(duplicateRow, expiryColumn).getValue());

  const message =
    "Duplicate batch detected.\n\n" +
    "Existing Batch ID:\n" + existingBatchId + "\n\n" +
    "Barcode:\n" + existingBarcode + "\n\n" +
    "Expiry:\n" + existingExpiry + "\n\n" +
    "This batch appears to already exist.\n" +
    "Do you want to create another batch anyway?";

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert("Duplicate Batch Detected", message, ui.ButtonSet.YES_NO);

  return response === ui.Button.YES;
}

/**
 * Reverts the edited cell back to its value before this edit.
 */
function revertEdit(e) {
  e.range.setValue(e.oldValue === undefined ? "" : e.oldValue);
}

/**
 * Entry point: checks a row for a duplicate after an edit to one of the
 * duplicate key fields, and prompts for confirmation if one is found.
 */
function checkForDuplicate(sheet, row, headerMap, e) {
  if (isRowEmpty(sheet, row, headerMap)) {
    return;
  }

  const duplicateRow = findDuplicateBatch(sheet, headerMap, row);
  if (duplicateRow === null) {
    return;
  }

  const proceed = confirmDuplicateBatch(sheet, headerMap, duplicateRow);
  if (!proceed) {
    revertEdit(e);
  }
}
