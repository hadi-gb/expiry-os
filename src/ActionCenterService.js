/**
 * Action Center: a live, formula-mirrored, row-for-row view of Master
 * Inventory, filtered to batches within the expiry window, with a small
 * set of directly editable columns (Action, Notes, Stock Completed).
 *
 * Architecture (see docs/MILESTONE_3_ARCHITECTURE.md): each of the 8
 * mirror columns below is its own bare ARRAYFORMULA reading Master
 * Inventory row-for-row (never filtered, never reordered), so Action
 * Center row N is always Master Inventory row N. Because rows never move
 * or compact, Action/Notes/Stock Completed never drift out of alignment —
 * there is no ROW-ALIGNMENT reconciliation step anywhere in this file.
 *
 * Visibility (which rows the Filter shows) is a separate concern from row
 * alignment, and does need a small nudge: confirmed by testing, a native
 * Sheets Filter does NOT re-evaluate a row that stays in place while its
 * filtered value changes via formula recalculation (only on structural
 * row add/remove, or a fresh Filter creation). See
 * refreshActionCenterFilter()'s comment for what forces a recheck and
 * where it's called from.
 *
 * setupActionCenter() is a one-time, manually-run setup utility, following
 * the same idiom as setupEarliestExpiryColumn()/setupStatusColumns(): every
 * column is resolved by header name, formulas are built from the resolved
 * column letters, and setFormulaIfSafe() refuses to clobber a manually
 * entered value or an unrelated formula. Safe to run more than once.
 */

const ACTION_CENTER_PROTECTION_DESCRIPTION = "Action Center formula columns";

/**
 * The 8 read-only columns, in display order, mirrored 1:1 from Master
 * Inventory. Expiry Offset is last and not one of the 7 required display
 * columns — it exists only as the Filter's condition column.
 *
 * A function, not a top-level const: Apps Script concatenates every file
 * into one global scope and evaluates top-level statements in file order
 * (alphabetical here, so ActionCenterService.gs runs before Config.gs). A
 * top-level const array built from CONFIG.HEADERS at load time threw
 * "ReferenceError: CONFIG is not defined" for exactly that reason — caught
 * running setupCompletedBatches() for the first time. Every value here is
 * read lazily, inside a function, only once something calls it — by which
 * point every file's top-level code, including Config.js's own CONFIG
 * assignment, has already run.
 */
function getActionCenterMirrorHeaders() {
  return [
    CONFIG.HEADERS.BATCH_ID,
    CONFIG.HEADERS.BARCODE,
    CONFIG.HEADERS.BRAND,
    CONFIG.HEADERS.PRODUCT,
    CONFIG.HEADERS.QUANTITY,
    CONFIG.HEADERS.MONTHS_REMAINING,
    CONFIG.HEADERS.STATUS,
    CONFIG.HEADERS.EXPIRY_OFFSET
  ];
}

function getActionCenterAllHeaders() {
  return getActionCenterMirrorHeaders().concat([
    CONFIG.HEADERS.ACTION,
    CONFIG.HEADERS.NOTES,
    CONFIG.HEADERS.STOCK_COMPLETED
  ]);
}

/**
 * Marker substring used by setFormulaIfSafe() to recognize "our" mirror
 * formulas across re-runs. Every mirror formula references Master
 * Inventory by name, so this is shared by all of them. A function for the
 * same load-order reason as getActionCenterMirrorHeaders() above.
 */
function getMirrorFormulaMarker() {
  return "'" + CONFIG.SHEET_NAMES.BATCHES + "'!";
}

/**
 * Builds the mirror formula for one column: a bare, open-ended
 * ARRAYFORMULA reading the given Master Inventory column letter, blank for
 * blank source cells — the same IF(range="","",range) idiom Milestone 2
 * uses for Expiry Offset/Months Remaining/Status, applied here to a
 * straight passthrough instead of a calculation.
 */
function buildMirrorFormula(masterColumnLetter) {
  const range = getMirrorFormulaMarker() + masterColumnLetter + "2:" + masterColumnLetter;
  return "=ARRAYFORMULA(IF(" + range + '="", "", ' + range + "))";
}

/**
 * Ensures Master Inventory has a Quantity column, inserted immediately
 * after Product. Milestone 3 is the first feature to require Quantity, so
 * this is a prerequisite of Action Center's own setup rather than
 * something owned by an earlier milestone's files. Existing rows are left
 * with a blank Quantity until warehouse staff back-fill it.
 */
function ensureQuantityColumn(masterSheet) {
  const headerMap = getHeaderMap(masterSheet);
  if (normalizeHeader(CONFIG.HEADERS.QUANTITY) in headerMap) {
    return;
  }

  const productColumn = getColumn(headerMap, CONFIG.HEADERS.PRODUCT);
  ensureColumnAfter(masterSheet, headerMap, productColumn, CONFIG.HEADERS.QUANTITY);
}

/**
 * Writes/restores the 8 mirror-column formulas, resolving every column on
 * both sheets by header name — never a hardcoded position, so this stays
 * correct if either sheet's columns are reordered and setupActionCenter()
 * is re-run.
 *
 * This is also the designated recovery path for a missing row-2 anchor
 * (e.g. Action Center's row 2 was deleted outright by something, wiping
 * that column's live ARRAYFORMULA — confirmed to happen in practice, see
 * ArchiveService.js's file comment): setFormulaIfSafe() treats a cell that
 * is truly blank (no formula, no value) as safe to write, which is exactly
 * the state a destroyed anchor cell is left in, so calling this again
 * restores it. Returns how many of the 8 anchor cells were blank and got
 * restored, so setupActionCenter() can report whether it just did routine
 * upkeep or an actual recovery.
 */
function writeMirrorFormulas(masterSheet, actionCenterSheet, headerMap) {
  const masterHeaderMap = getHeaderMap(masterSheet);
  let restoredCount = 0;

  getActionCenterMirrorHeaders().forEach(function (headerName) {
    const masterColumn = getColumn(masterHeaderMap, headerName);
    const masterLetter = getColumnLetter(masterSheet, masterColumn);

    const targetColumn = getColumn(headerMap, headerName);
    const anchorCell = actionCenterSheet.getRange(2, targetColumn);
    const wasBlank = anchorCell.getFormula() === "" && anchorCell.getValue() === "";

    setFormulaIfSafe(
      anchorCell, buildMirrorFormula(masterLetter), getMirrorFormulaMarker(), headerName + " mirror column"
    );

    if (wasBlank) {
      restoredCount++;
    }
  });

  return restoredCount;
}

/**
 * Applies the Action dropdown (closed list, invalid input rejected) and
 * the Stock Completed checkbox, each as an open-ended column range (row 2
 * downward, no upper bound) so any row the mirror formulas ever grow into
 * is already covered without needing to re-run this.
 */
function applyActionCenterValidation(sheet, headerMap) {
  const actionColumn = getColumn(headerMap, CONFIG.HEADERS.ACTION);
  const actionLetter = getColumnLetter(sheet, actionColumn);
  const actionRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.ACTION_OPTIONS, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(actionLetter + "2:" + actionLetter).setDataValidation(actionRule);

  const stockCompletedColumn = getColumn(headerMap, CONFIG.HEADERS.STOCK_COMPLETED);
  const stockCompletedLetter = getColumnLetter(sheet, stockCompletedColumn);
  const checkboxRule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  sheet.getRange(stockCompletedLetter + "2:" + stockCompletedLetter).setDataValidation(checkboxRule);
}

/**
 * Creates the native Sheets Filter (not a Filter View — a Filter is shared
 * across every viewer of the tab, which is correct for a single-audience
 * sheet like this) that hides rows outside the expiry window.
 *
 * Confirmed by manual testing: a plain Filter evaluates its condition
 * against each row's CURRENT value when first created (and when rows are
 * structurally added/removed), but does NOT re-evaluate a row that stays in
 * place while its filtered cell's value changes via formula recalculation —
 * a batch crossing from 13 to 12 months stayed hidden until the filter
 * dropdown was manually opened and closed. So this function always builds
 * a fresh Filter from scratch; see refreshActionCenterFilter() below for
 * the caller that forces a recheck of already-in-place rows.
 */
function createActionCenterFilter(sheet, headerMap) {
  const expiryOffsetColumn = getColumn(headerMap, CONFIG.HEADERS.EXPIRY_OFFSET);
  const lastColumnLetter = getColumnLetter(sheet, sheet.getLastColumn());
  const range = sheet.getRange("A1:" + lastColumnLetter);

  const filter = range.createFilter();
  const criteria = SpreadsheetApp.newFilterCriteria()
    .whenNumberLessThanOrEqualTo(CONFIG.ACTION_CENTER_WINDOW_MONTHS)
    .build();
  filter.setColumnFilterCriteria(expiryOffsetColumn, criteria);
}

/**
 * Creates the Filter only if one doesn't already exist, so re-running
 * setupActionCenter() never clobbers a user's own filter state (e.g. a
 * secondary sort they've applied through the filter UI).
 */
function applyActionCenterFilter(sheet, headerMap) {
  if (sheet.getFilter()) {
    return;
  }
  createActionCenterFilter(sheet, headerMap);
}

/**
 * Forces the expiry-window Filter to recheck every row's current Expiry
 * Offset — see createActionCenterFilter()'s comment for why this is
 * necessary. Removing and recreating the Filter (rather than trying to
 * "reset" its existing criteria) is the one operation confirmed to force a
 * fresh evaluation, since that's exactly what happens — successfully —
 * every time setupActionCenter() first creates it.
 *
 * Called from two places, deliberately narrow in scope: Main.js's
 * handleMasterInventoryEdit() when an edit touches Expiry (same-session
 * changes), and onOpen() (catches a batch crossing the window purely from
 * TODAY() rolling over while the sheet was closed). Neither call touches
 * row alignment, Action/Notes/Stock Completed, or Batch ID resolution —
 * this refreshes only which rows the Filter shows, nothing about what's
 * IN any row. Safe to call even if the sheet doesn't exist yet or has no
 * Filter (no-ops).
 */
function refreshActionCenterFilter() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.ACTION_CENTER);
  if (!sheet) {
    return;
  }

  const existingFilter = sheet.getFilter();
  if (existingFilter) {
    existingFilter.remove();
  }

  const headerMap = getHeaderMap(sheet);
  if (!(normalizeHeader(CONFIG.HEADERS.EXPIRY_OFFSET) in headerMap)) {
    return;
  }
  createActionCenterFilter(sheet, headerMap);
}

/**
 * Warns against hand-editing or sorting the mirror columns (Batch ID
 * through Expiry Offset), which would break the row-N-means-row-N
 * correspondence with Master Inventory that the rest of this file depends
 * on. Action, Notes, Stock Completed, and any business columns to their
 * right are left untouched. Skips re-adding protection if this function
 * already applied it.
 *
 * Deliberately warning-only (setWarningOnly(true)), not a hard editor-list
 * ACL: onEdit() is a simple trigger, which runs with the permissions of
 * whoever made the edit, not the script owner. This was originally forced
 * by completeBatch()'s row deletion, which used to delete Action Center's
 * whole row — necessarily touching these protected cells — and would throw
 * under a hard ACL for any non-owner user. completeBatch() no longer
 * deletes Action Center rows at all (see removeActionCenterRowData() in
 * ArchiveService.js, which only ever touches the unprotected editable
 * columns), so that specific conflict no longer applies — but warning-only
 * is kept anyway as the general-purpose safeguard: it still discourages
 * accidental hand-edits/sorts of the formula columns without risking a
 * hard-ACL/simple-trigger conflict for any future code that touches this
 * range under a non-owner user's edit context.
 */
function protectActionCenterFormulaColumns(sheet, headerMap) {
  const alreadyProtected = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE)
    .some(function (protection) {
      return protection.getDescription() === ACTION_CENTER_PROTECTION_DESCRIPTION;
    });
  if (alreadyProtected) {
    return;
  }

  const lastMirrorColumn = getColumn(headerMap, CONFIG.HEADERS.EXPIRY_OFFSET);
  const lastMirrorColumnLetter = getColumnLetter(sheet, lastMirrorColumn);
  const range = sheet.getRange("A1:" + lastMirrorColumnLetter);

  range.protect()
    .setDescription(ACTION_CENTER_PROTECTION_DESCRIPTION)
    .setWarningOnly(true);
}

/**
 * One-time setup: creates the Action Center sheet if missing, ensures
 * Master Inventory has a Quantity column, writes/restores the 8 mirror
 * formulas, applies the Action dropdown and Stock Completed checkbox,
 * creates the expiry-window Filter, protects the formula columns, and
 * compresses the Expiry Offset helper column. Manually run once from the
 * Apps Script editor; safe to re-run.
 *
 * Also the designated recovery entry point if Action Center's row-2
 * mirror formulas are ever found missing (see writeMirrorFormulas()'s
 * comment) — never touches Action, Notes, Stock Completed, business
 * columns, or an already-existing Filter/protection, so it's safe to run
 * against a partially-broken sheet without losing anything still intact.
 * Ends with a spreadsheet toast reporting exactly what happened, since
 * confirming a run actually took effect (as opposed to the Apps Script
 * editor having silently run a different function — a real failure mode
 * hit during Milestone 3 testing) shouldn't require a separate diagnostic
 * pass.
 */
function setupActionCenter() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.BATCHES);

  ensureQuantityColumn(masterSheet);

  let actionCenterSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.ACTION_CENTER);
  if (!actionCenterSheet) {
    actionCenterSheet = ss.insertSheet(CONFIG.SHEET_NAMES.ACTION_CENTER);
  }

  const headerMap = ensureHeaders(actionCenterSheet, getActionCenterAllHeaders());

  const restoredCount = writeMirrorFormulas(masterSheet, actionCenterSheet, headerMap);
  applyActionCenterValidation(actionCenterSheet, headerMap);
  applyActionCenterFilter(actionCenterSheet, headerMap);
  protectActionCenterFormulaColumns(actionCenterSheet, headerMap);

  const expiryOffsetColumn = getColumn(headerMap, CONFIG.HEADERS.EXPIRY_OFFSET);
  actionCenterSheet.setColumnWidth(expiryOffsetColumn, EXPIRY_OFFSET_COLUMN_WIDTH);
  actionCenterSheet.setFrozenRows(1);

  const mirrorHeaderCount = getActionCenterMirrorHeaders().length;
  let message;
  if (restoredCount > 0) {
    // A missing anchor almost always means the Filter's cached result is
    // stale too (see refreshActionCenterFilter()'s comment) — force a
    // recheck as part of the same recovery, rather than leaving a second
    // manual step. Only done here, not on every routine re-run, so a
    // working setup never has its Filter (and any customization on it)
    // clobbered for no reason.
    refreshActionCenterFilter();
    message = "Action Center: restored " + restoredCount + " of " + mirrorHeaderCount +
      " mirror formula(s) and refreshed the Filter.";
  } else {
    message = "Action Center: all " + mirrorHeaderCount + " mirror formulas already present. Nothing to restore.";
  }
  ss.toast(message, "setupActionCenter", 10);
}
