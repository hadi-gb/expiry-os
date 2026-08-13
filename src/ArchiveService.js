/**
 * Completed Batches: the "Archive" module from ARCHITECTURE.md. Owns the
 * Stock Completed workflow — snapshotting a batch's full row into the
 * Completed Batches sheet, then removing it from Master Inventory (whole
 * row) and clearing its editable-column values from Action Center (Action
 * Center's own row is never deleted — see removeActionCenterRowData()).
 *
 * Every row this file touches is resolved by Batch ID, resolved fresh at
 * the moment it's needed — never by reusing a row number captured earlier
 * or assuming Action Center's row-N-mirrors-Master-Inventory-row-N
 * invariant holds mid-operation. That invariant is real (see
 * docs/MILESTONE_3_ARCHITECTURE.md) but this file treats it only as "why
 * alignment doesn't drift," not as something safe to key off directly.
 *
 * Write-then-delete ordering is deliberate and load-bearing: the snapshot
 * is written to Completed Batches before anything is deleted anywhere. If
 * the snapshot write throws, the batch is simply left in place in both
 * Master Inventory and Action Center — the safe failure mode. The reverse
 * order would risk losing the row entirely if the snapshot write failed
 * after deletion already happened.
 *
 * Both Master Inventory and Action Center compute several columns via a
 * single formula anchored in row 2 that spills downward (Master
 * Inventory's Earliest Expiry/Expiry Offset/Months Remaining/Status;
 * Action Center's 8 mirror columns). Deleting row 2 of either sheet
 * deletes that anchor cell's formula outright — confirmed by testing that
 * this, not just manual data edits, was actually responsible for repeated
 * "formulas went blank" incidents during Milestone 3 testing, since the
 * completed batch is regularly Master Inventory's or Action Center's
 * topmost remaining row. This file handles the two sheets differently
 * because of it: Action Center's row is never deleted at all (see
 * removeActionCenterRowData()); Master Inventory's row genuinely must be
 * deleted (it holds real per-row input data, not just derived columns), so
 * completeBatch() defensively reasserts its formulas afterward instead.
 */

// Full timestamp, not date-only, per explicit requirement.
const COMPLETED_DATE_FORMAT = "yyyy-MM-dd HH:mm:ss";

/**
 * Mirror/checkbox columns already captured directly from Master Inventory
 * (or not worth snapshotting, in Stock Completed's case) — excluded when
 * scanning Action Center's row for "extra" columns to carry into the
 * snapshot, so nothing is duplicated.
 *
 * A function, not a top-level const: see the identical note on
 * getActionCenterMirrorHeaders() in ActionCenterService.js — Apps Script
 * evaluates every file's top-level code in file order, and a top-level
 * const here referencing CONFIG.HEADERS at load time hit the exact same
 * "ReferenceError: CONFIG is not defined" this was fixed alongside.
 */
function getActionCenterSnapshotExcludedHeaders() {
  return [
    CONFIG.HEADERS.BATCH_ID,
    CONFIG.HEADERS.BARCODE,
    CONFIG.HEADERS.BRAND,
    CONFIG.HEADERS.PRODUCT,
    CONFIG.HEADERS.QUANTITY,
    CONFIG.HEADERS.MONTHS_REMAINING,
    CONFIG.HEADERS.STATUS,
    CONFIG.HEADERS.EXPIRY_OFFSET,
    CONFIG.HEADERS.STOCK_COMPLETED
  ].map(normalizeHeader);
}

/**
 * Resolves "who completed this" for the automatic Completed By field.
 * getActiveUser() is blank under some sharing configurations (e.g.
 * anyone-with-link access without domain auth); falls back to
 * getEffectiveUser(), and to an empty string rather than blocking
 * completion if both are blank.
 */
function resolveCompletedBy() {
  const activeEmail = Session.getActiveUser().getEmail();
  if (activeEmail) {
    return activeEmail;
  }
  return Session.getEffectiveUser().getEmail();
}

/**
 * Gets the Completed Batches sheet, creating it (empty, no headers yet)
 * if it doesn't exist. Header provisioning is a separate step (see
 * ensureHeaders() calls below) so this stays a pure "does it exist" check.
 */
function getOrCreateCompletedBatchesSheet(ss) {
  const existing = ss.getSheetByName(CONFIG.SHEET_NAMES.COMPLETED_BATCHES);
  if (existing) {
    return existing;
  }
  return ss.insertSheet(CONFIG.SHEET_NAMES.COMPLETED_BATCHES);
}

/**
 * Applies the full-timestamp format to every row of the Completed Date
 * column, so a plain new Date() value displays date and time rather than
 * defaulting to a date-only format.
 */
function formatCompletedDateColumn(sheet, headerMap) {
  const column = getColumn(headerMap, CONFIG.HEADERS.COMPLETED_DATE);
  const letter = getColumnLetter(sheet, column);
  sheet.getRange(letter + "2:" + letter).setNumberFormat(COMPLETED_DATE_FORMAT);
}

/**
 * Reads Action Center's row for a batch (if it still has one) and returns
 * every header/value pair beyond the fixed mirror/Stock-Completed columns
 * — this is Action, Notes, and any user-added business columns, in
 * whatever order they appear on the sheet. Header-name based, not
 * position based, so it naturally supports ARCHITECTURE.md's "business
 * columns added by users are intentionally supported without modifying
 * the application."
 */
function collectActionCenterExtras(actionCenterSheet, actionRow) {
  if (actionRow === null) {
    return { headers: [CONFIG.HEADERS.ACTION, CONFIG.HEADERS.NOTES], values: ["", ""] };
  }

  const lastColumn = actionCenterSheet.getLastColumn();
  const headers = actionCenterSheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const values = actionCenterSheet.getRange(actionRow, 1, 1, lastColumn).getValues()[0];

  const extraHeaders = [];
  const extraValues = [];

  headers.forEach(function (header, index) {
    const normalized = normalizeHeader(header);
    if (normalized === "" || getActionCenterSnapshotExcludedHeaders().indexOf(normalized) !== -1) {
      return;
    }
    extraHeaders.push(header);
    extraValues.push(values[index]);
  });

  return { headers: extraHeaders, values: extraValues };
}

/**
 * Writes one snapshot row into Completed Batches: every Master Inventory
 * column (as a plain value — the row is about to stop existing, so this
 * must be an immutable point-in-time record, not a formula), every extra
 * Action Center column (Action, Notes, business columns), and the two
 * automatically recorded columns, Completed Date and Completed By. Grows
 * the sheet's header row on demand for any column not seen before.
 */
function snapshotToCompletedBatches(ss, masterSheet, masterRow, actionCenterSheet, actionRow) {
  const completedSheet = getOrCreateCompletedBatchesSheet(ss);

  const masterLastColumn = masterSheet.getLastColumn();
  const masterHeaders = masterSheet.getRange(1, 1, 1, masterLastColumn).getValues()[0];
  const masterValues = masterSheet.getRange(masterRow, 1, 1, masterLastColumn).getValues()[0];

  const extras = collectActionCenterExtras(actionCenterSheet, actionRow);

  const allHeaders = masterHeaders.concat(
    extras.headers, [CONFIG.HEADERS.COMPLETED_DATE, CONFIG.HEADERS.COMPLETED_BY]
  );
  const allValues = masterValues.concat(
    extras.values, [new Date(), resolveCompletedBy()]
  );

  const headerMap = ensureHeaders(completedSheet, allHeaders);
  formatCompletedDateColumn(completedSheet, headerMap);

  const targetRow = completedSheet.getLastRow() + 1;
  allHeaders.forEach(function (header, index) {
    if (String(header).trim() === "") {
      return;
    }
    const column = getColumn(headerMap, header);
    const cell = completedSheet.getRange(targetRow, column);

    // A plain number written into a cell that has never held a value before
    // can pick up a stray date format on this sheet (observed: Expiry
    // Offset value 4 displaying as "1/3/1900") — force plain-number display
    // for numeric, non-Date values so the snapshot shows the same integer
    // Master Inventory does, not a spreadsheet-serial-date misread of it.
    if (typeof allValues[index] === "number") {
      cell.setNumberFormat("0");
    }

    cell.setValue(allValues[index]);
  });
}

/**
 * Removes one row's editable-column values (Action, Notes, Stock Completed,
 * and any business columns beyond) from Action Center, shifting everything
 * below up within those columns only — never touches columns A:H. Action
 * Center's mirror columns are each one ARRAYFORMULA anchored in a single
 * row-2 cell; deleting the whole row (Sheet.deleteRow()) would delete that
 * anchor cell outright whenever the completed batch happens to be Action
 * Center's topmost remaining row, destroying the formula for the entire
 * column, not just that row's value — confirmed by testing to be the real
 * cause behind Action Center's mirror columns repeatedly going blank
 * during Milestone 3 testing. Scoping the delete to Action onward avoids
 * the anchor cell entirely, regardless of which row is completed.
 *
 * A:H don't need any action here — they update on their own once Master
 * Inventory's row is gone (the mirror formula's own live recalculation).
 * This function does the equivalent shift for the columns that don't
 * self-update (I:K and beyond), keeping the two in lockstep: after this
 * call, row N's A:H (now showing whatever previously occupied Master
 * Inventory's new row N) and row N's I:K (now containing whatever was
 * previously one row below) both refer to the same batch, exactly as they
 * did before the completed batch was removed.
 *
 * Implemented as an explicit read-shift-write-clear using getValues() /
 * setValues(), not Range.deleteCells() — confirmed by testing that
 * deleteCells() was not reliably shifting this range's contents in
 * practice (a completed batch's Action/Notes stayed in place and became
 * misattributed to whichever batch the mirror formulas next shifted into
 * that row). getValues()/setValues() are unambiguous, and still just two
 * bulk API calls regardless of how many rows are involved.
 */
function removeActionCenterRowData(actionCenterSheet, actionHeaderMap, actionRow) {
  const firstEditableColumn = getColumn(actionHeaderMap, CONFIG.HEADERS.ACTION);
  const lastColumn = actionCenterSheet.getLastColumn();
  const numColumns = lastColumn - firstEditableColumn + 1;
  const lastRow = actionCenterSheet.getLastRow();

  if (actionRow < lastRow) {
    const below = actionCenterSheet.getRange(actionRow + 1, firstEditableColumn, lastRow - actionRow, numColumns);
    const values = below.getValues();
    actionCenterSheet.getRange(actionRow, firstEditableColumn, values.length, numColumns).setValues(values);
  }

  actionCenterSheet.getRange(lastRow, firstEditableColumn, 1, numColumns).clearContent();
}

/**
 * Completes one batch, identified by Batch ID: snapshots it into Completed
 * Batches, removes its row from Master Inventory, and clears its
 * editable-column values from Action Center (see
 * removeActionCenterRowData() — Action Center's own row is never
 * deleted). Master Inventory's row and Action Center's row are each
 * resolved by Batch ID once, at the top, before either mutation — safe to
 * call repeatedly for a list of Batch IDs from a single bulk edit, since
 * each call re-resolves both independently rather than trusting a row
 * number from a previous completeBatch() call. No-ops (skips, doesn't
 * throw) if the batch is no longer in Master Inventory, e.g. already
 * completed by a concurrent edit.
 *
 * Deliberately does NOT re-resolve actionRow after masterSheet.deleteRow():
 * Action Center's mirror formulas depend on Master Inventory, so once that
 * row is gone, Action Center's own formula output shifts (whenever it
 * recalculates) while the physical row's plain Action/Notes/Stock
 * Completed values do not move. A fresh lookup at that point would read
 * either stale pre-recalculation data or, once recalculated, no longer
 * find this Batch ID at all — either way the wrong thing to key off. The
 * row found before any mutation is the one physical row whose I:K values
 * belong to this batch, unaffected by what Master Inventory's deletion
 * does to that row's mirrored A:H content, so it's what gets cleared here.
 */
function completeBatch(batchId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.BATCHES);
  const actionCenterSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.ACTION_CENTER);

  const masterHeaderMap = getHeaderMap(masterSheet);
  const masterRow = findRowByBatchId(masterSheet, masterHeaderMap, batchId);
  if (masterRow === null) {
    return;
  }

  const actionHeaderMap = getHeaderMap(actionCenterSheet);
  const actionRow = findRowByBatchId(actionCenterSheet, actionHeaderMap, batchId);

  snapshotToCompletedBatches(ss, masterSheet, masterRow, actionCenterSheet, actionRow);

  masterSheet.deleteRow(masterRow);

  // Defensive: Master Inventory's Earliest Expiry/Expiry Offset/Months
  // Remaining/Status formulas are the same single-anchor-in-row-2 pattern
  // as Action Center's mirrors (see removeActionCenterRowData()'s
  // comment). If the row just deleted was row 2, its formula anchors went
  // with it. Both setup functions are idempotent — setFormulaIfSafe()
  // no-ops when the formula is already correctly in place — and cheap, so
  // reasserting them unconditionally, rather than only when row 2 was the
  // one removed, is simpler and just as safe. (Evaluated and rejected:
  // eliminating this dependency structurally by converting these columns
  // to per-row formulas — see docs/MILESTONE_3_ARCHITECTURE.md Section 8.)
  setupEarliestExpiryColumn();
  setupStatusColumns();

  if (actionRow !== null) {
    removeActionCenterRowData(actionCenterSheet, actionHeaderMap, actionRow);
  }
}

/**
 * One-time setup: creates the Completed Batches sheet if missing and
 * provisions its header row from Master Inventory's current columns plus
 * Action, Notes, Completed Date, and Completed By, so the sheet's
 * structure is visible before the first batch is ever completed.
 * completeBatch() also provisions headers on demand at runtime, so running
 * this first is a convenience, not a requirement. Safe to re-run.
 */
function setupCompletedBatches() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.BATCHES);
  const completedSheet = getOrCreateCompletedBatchesSheet(ss);

  const masterHeaders = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
  const allHeaders = masterHeaders.concat([
    CONFIG.HEADERS.ACTION,
    CONFIG.HEADERS.NOTES,
    CONFIG.HEADERS.COMPLETED_DATE,
    CONFIG.HEADERS.COMPLETED_BY
  ]);

  const headerMap = ensureHeaders(completedSheet, allHeaders);
  formatCompletedDateColumn(completedSheet, headerMap);
  completedSheet.setFrozenRows(1);
}
