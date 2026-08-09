/**
 * Batch ID generation logic for the Batches sheet.
 */

/**
 * Scans the existing Batch ID column and returns the next available number.
 * Deleted rows are naturally ignored since only values present in the sheet are read.
 */
function getNextBatchNumber(sheet, headerMap) {
  const column = getColumn(headerMap, CONFIG.HEADERS.BATCH_ID);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return 1;
  }

  const existingIds = sheet.getRange(2, column, lastRow - 1, 1).getValues();
  let maxNumber = 0;

  existingIds.forEach(function (rowValues) {
    const id = rowValues[0];
    if (typeof id === "string" && id.indexOf(CONFIG.BATCH_ID_PREFIX) === 0) {
      const number = parseInt(id.slice(CONFIG.BATCH_ID_PREFIX.length), 10);
      if (!isNaN(number) && number > maxNumber) {
        maxNumber = number;
      }
    }
  });

  return maxNumber + 1;
}

/**
 * Assigns a Batch ID to a single row if it needs one.
 *
 * Never overwrites an existing Batch ID and never assigns one to an empty row.
 * Returns the next number to use, so callers can process a multi-row paste
 * sequentially without rescanning the sheet for every row.
 */
function ensureBatchId(sheet, row, headerMap, nextNumber) {
  const column = getColumn(headerMap, CONFIG.HEADERS.BATCH_ID);
  const cell = sheet.getRange(row, column);

  if (cell.getValue() !== "") {
    return nextNumber;
  }

  if (isRowEmpty(sheet, row, headerMap)) {
    return nextNumber;
  }

  cell.setValue(formatBatchId(nextNumber));
  return nextNumber + 1;
}
