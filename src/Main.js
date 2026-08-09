/**
 * Simple trigger entry point. Keep this file limited to wiring — no business logic.
 */
function onEdit(e) {
  const sheet = e.range.getSheet();
  if (!isSameSheetName(sheet, CONFIG.SHEET_NAMES.BATCHES)) {
    return;
  }

  const editStartRow = e.range.getRow();
  const editEndRow = editStartRow + e.range.getNumRows() - 1;
  const firstDataRow = Math.max(editStartRow, 2); // never touch the header row

  if (firstDataRow > editEndRow) {
    return;
  }

  const headerMap = getHeaderMap(sheet);

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    let nextNumber = getNextBatchNumber(sheet, headerMap);
    for (let row = firstDataRow; row <= editEndRow; row++) {
      nextNumber = ensureBatchId(sheet, row, headerMap, nextNumber);
    }

    if (editTouchesColumn(e.range, headerMap, CONFIG.HEADERS.BARCODE)) {
      for (let row = firstDataRow; row <= editEndRow; row++) {
        recognizeProduct(sheet, row, headerMap);
      }
    }
  } finally {
    lock.releaseLock();
  }

  // Runs outside the lock: the confirmation dialog blocks on human input,
  // and holding the lock during that would stall other concurrent edits.
  // Scoped to Expiry only — Barcode is almost always a scan that's rarely
  // changed afterwards, and Expiry is the final step of receiving inventory,
  // so this is the one point where the row's duplicate key is genuinely settled.
  if (isSingleCellEdit(e.range) && editTouchesColumn(e.range, headerMap, CONFIG.HEADERS.EXPIRY)) {
    checkForDuplicate(sheet, firstDataRow, headerMap, e);
  }
}
