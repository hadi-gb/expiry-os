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

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const headerMap = getHeaderMap(sheet);
    let nextNumber = getNextBatchNumber(sheet, headerMap);

    for (let row = firstDataRow; row <= editEndRow; row++) {
      nextNumber = ensureBatchId(sheet, row, headerMap, nextNumber);
    }
  } finally {
    lock.releaseLock();
  }
}
