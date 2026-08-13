/**
 * Simple trigger entry point. Keep this file limited to wiring — no business logic.
 */

/**
 * Nudges Action Center's Filter to recheck every row's current Expiry
 * Offset on open — covers a batch crossing the expiry window purely from
 * TODAY() rolling over while the sheet was closed, which a plain Filter
 * does not pick up on its own (see refreshActionCenterFilter()'s comment
 * in ActionCenterService.js). Does not touch row alignment or any
 * Action/Notes/Stock Completed value.
 */
function onOpen() {
  refreshActionCenterFilter();
}

function onEdit(e) {
  const sheet = e.range.getSheet();

  if (isSameSheetName(sheet, CONFIG.SHEET_NAMES.BATCHES)) {
    handleMasterInventoryEdit(e, sheet);
    return;
  }

  if (isSameSheetName(sheet, CONFIG.SHEET_NAMES.ACTION_CENTER)) {
    handleActionCenterEdit(e, sheet);
  }
}

/**
 * Batch ID assignment, product recognition, and duplicate detection for
 * Master Inventory edits. Unchanged from Milestone 1/2 — only extracted
 * into a named function so onEdit can dispatch by sheet.
 */
function handleMasterInventoryEdit(e, sheet) {
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

  // An Expiry edit can change which batches belong in Action Center's
  // window; nudge its Filter to recheck (see refreshActionCenterFilter()'s
  // comment in ActionCenterService.js for why this is needed at all).
  if (editTouchesColumn(e.range, headerMap, CONFIG.HEADERS.EXPIRY)) {
    refreshActionCenterFilter();
  }
}

/**
 * Stock Completed handling for Action Center edits (see
 * docs/MILESTONE_3_ARCHITECTURE.md). Reads every completed Batch ID out of
 * the edited range up front, before any row is deleted, so a multi-row
 * paste is processed as a list of Batch IDs rather than a list of row
 * numbers that could shift mid-loop as completeBatch() deletes rows.
 */
function handleActionCenterEdit(e, sheet) {
  const headerMap = getHeaderMap(sheet);
  if (!editTouchesColumn(e.range, headerMap, CONFIG.HEADERS.STOCK_COMPLETED)) {
    return;
  }

  const editStartRow = Math.max(e.range.getRow(), 2); // never touch the header row
  const editEndRow = e.range.getRow() + e.range.getNumRows() - 1;
  if (editStartRow > editEndRow) {
    return;
  }

  const batchIdColumn = getColumn(headerMap, CONFIG.HEADERS.BATCH_ID);
  const stockCompletedColumn = getColumn(headerMap, CONFIG.HEADERS.STOCK_COMPLETED);
  const numRows = editEndRow - editStartRow + 1;

  const batchIds = sheet.getRange(editStartRow, batchIdColumn, numRows, 1).getValues();
  const completedFlags = sheet.getRange(editStartRow, stockCompletedColumn, numRows, 1).getValues();

  const batchIdsToComplete = [];
  for (let i = 0; i < numRows; i++) {
    const batchId = String(batchIds[i][0]).trim();
    if (completedFlags[i][0] === true && batchId !== "") {
      batchIdsToComplete.push(batchId);
    }
  }

  if (batchIdsToComplete.length === 0) {
    return;
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    batchIdsToComplete.forEach(completeBatch);
  } finally {
    lock.releaseLock();
  }
}
