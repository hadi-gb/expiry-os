# Milestone 3 - Action Center: Production Test Plan

## Final Test Results Summary

- **Core workflow verified end-to-end**: setup, mirror formulas, Filter
  visibility, Action dropdown, Notes, single and bulk Stock Completed,
  business-column carryover, protection warning behavior.
- **3 real bugs found and fixed during this test pass** (all confirmed
  fixed on retest): the Filter not auto-refreshing on formula-only value
  changes (Section 7); completing a row-2 batch destroying that column's
  formula infrastructure in both Master Inventory and Action Center
  (Section 8); and, within that same fix, an initial `deleteCells()`-based
  implementation that itself did not reliably shift Action Center's
  editable columns (also Section 8, superseded by an explicit
  `getValues()`/`setValues()` shift).
- **Deferred, not skipped**: AC-24/AC-25 (non-owner-editor regression
  tests) require a second Google account not available in this test pass.
  Automatic sort-by-nearest-expiry was evaluated, explicitly requested,
  and explicitly deferred to `ROADMAP.md` rather than built in this
  milestone — see Architecture Section 2.
- See `docs/MILESTONE_3_ARCHITECTURE.md` Sections 6–8 for full regression
  write-ups.

---

## Scope

Covers `ActionCenterService.js` (mirror formulas, Filter, dropdown/checkbox
validation, column protection, `setupActionCenter()`), `ArchiveService.js`
(`completeBatch()`, `setupCompletedBatches()`), the two new `Helpers.js`
functions (`findRowByBatchId`, `ensureHeaders`), and `Main.js`'s
`handleActionCenterEdit()` dispatch. See
`docs/MILESTONE_3_ARCHITECTURE.md` for why this design has no
reconciliation step and what invariant it depends on.

## Prerequisites

- Latest code pushed via `clasp push`.
- `setupActionCenter()` run once from the Apps Script editor. This creates
  the `Action Center` tab if missing, adds `Quantity` to `Master Inventory`
  if missing, writes the 8 mirror formulas, applies the Action
  dropdown/Stock Completed checkbox, creates the Filter, and applies a
  warning-only protection to columns A–H.
- At least one test pass done as a non-owner editor (e.g. a second test
  account shared on the spreadsheet as an editor, not the owner) — this is
  what the Section 6 regression finding in
  `docs/MILESTONE_3_ARCHITECTURE.md` depends on; testing only as the sheet
  owner would not have caught it.
- `setupCompletedBatches()` run once (optional — `completeBatch()`
  provisions the sheet on first use regardless, but running it first makes
  the schema visible before any batch is completed).
- Master Inventory has a mix of scratch rows: some expired, some within 12
  months, some well beyond 12 months, isolated from real data.
- `Quantity` back-filled on at least a few scratch rows (some left blank
  to test that edge case).

---

## Quantity Column Provisioning

| ID | Steps | Expected result |
|---|---|---|
| AC-01 | Run `setupActionCenter()` on Master Inventory with no `Quantity` column | `Quantity` is inserted immediately after `Product`; existing rows show blank Quantity |
| AC-02 | Run `setupActionCenter()` again | No duplicate `Quantity` column created (idempotent) |
| AC-03 | Run `setupActionCenter()` when `Quantity` already exists elsewhere (e.g. user added it manually in a different position) | Existing column is reused as-is; not moved, not duplicated |

---

## Mirror Formulas / Row Correspondence

| ID | Steps | Expected result |
|---|---|---|
| AC-04 | Run `setupActionCenter()` on an empty/fresh `Action Center` tab | Columns A–H populated with header row + one formula each, anchored at row 2, per `ACTION_CENTER_MIRROR_HEADERS` order |
| AC-05 | Add a new row directly to Master Inventory (new batch via the normal warehouse flow) | The same row number appears in Action Center's columns A–H with matching values, without running any setup function again |
| AC-06 | Edit a value in an existing Master Inventory row (e.g. correct `Brand`) | Action Center's mirrored `Brand` for that row updates automatically |
| AC-07 | Re-run `setupActionCenter()` after manually typing a value into an Action Center A–H cell | Throws "already contains a manually entered value" and does not overwrite (via `setFormulaIfSafe`) |
| AC-08 | Insert a new column before `Product` in Master Inventory (shifting columns), then re-run `setupActionCenter()` | Mirror formulas regenerate referencing each column's *new* letter — no hardcoded reference breaks |

---

## Filter / Visibility Window

| ID | Steps | Expected result |
|---|---|---|
| AC-09 | Batch with `Expiry Offset` = 13 (13 months remaining) | Row present in the mirror (A–H populated) but hidden by the Filter |
| AC-10 | Batch with `Expiry Offset` = 12 exactly | Row visible (boundary is inclusive, `<= 12`) |
| AC-11 | Batch with `Expiry Offset` negative (expired) | Row visible |
| AC-12 | Batch with blank `Expiry` (no valid date parsed) | Row not visible (blank `Expiry Offset` doesn't satisfy `<= 12`) |
| AC-13 | Correct a Master Inventory row's `Expiry` so its offset crosses from 13 to 12 | **VERIFIED, corrected expectation** (see `docs/MILESTONE_3_ARCHITECTURE.md` Section 7): a plain Filter does not auto-recheck a value that changed via formula recalculation. Row becomes visible via `handleMasterInventoryEdit()`'s `refreshActionCenterFilter()` call (same session) or the next `onOpen()` (sheet reopened) — not instantaneously with zero trigger involvement as originally assumed. |
| AC-14 | Re-run `setupActionCenter()` when a Filter already exists | Existing Filter is left untouched (not recreated), per `applyActionCenterFilter`'s guard |
| AC-26 | Open the Filter dropdown on any column in Action Center and click OK with no change | **VERIFIED.** Forces the same re-evaluation `refreshActionCenterFilter()` does — confirms the Filter's cached result, not the underlying value, was stale |
| AC-27 | Reload the spreadsheet after an `Expiry` edit made while it was open elsewhere | **VERIFIED.** `onOpen()` calls `refreshActionCenterFilter()`; previously-hidden-but-now-qualifying rows appear without touching the Filter manually |

---

## Action Dropdown / Notes / Stock Completed Controls

| ID | Steps | Expected result |
|---|---|---|
| AC-15 | Click the Action cell for a visible row | Dropdown shows exactly: `No Action Yet`, `Discount`, `Bundle`, `Return Supplier`, `Destroy`, `Hold` |
| AC-16 | Attempt to type a value not in the list into an Action cell | Rejected (input invalid; `setAllowInvalid(false)`) |
| AC-17 | Type free text into a Notes cell | Accepted as-is, no validation |
| AC-18 | Click the Stock Completed checkbox cell | Renders as a checkbox, toggles `TRUE`/`FALSE` |
| AC-19 | Type into a new row that later appears from Master Inventory growth (beyond the row count present when `setupActionCenter()` was first run) | Dropdown and checkbox validation are already present (open-ended column ranges, no re-run needed) |

---

## Stock Completed Flow — Single Batch

| ID | Steps | Expected result |
|---|---|---|
| CB-01 | Set Action = `Discount`, Notes = `test note`, check Stock Completed for one visible batch | A new row appears in `Completed Batches` with every Master Inventory column's value, `Action` = `Discount`, `Notes` = `test note` |
| CB-02 | Inspect `Completed Date` on the new Completed Batches row | Contains both date and time (format `yyyy-MM-dd HH:mm:ss`), not date-only |
| CB-03 | Inspect `Completed By` on the new row | Contains the acting user's email (or blank — see CB-11) |
| CB-04 | Check Master Inventory after completion | The batch's row is gone entirely; `Earliest Expiry`/`Expiry Offset`/`Months Remaining`/`Status` still show live, correct formula output for every remaining row (see CB-18 below for the specific row-2 case) |
| CB-05 | Check Action Center after completion | **Corrected expectation**: Action Center's row itself is never deleted (see `docs/MILESTONE_3_ARCHITECTURE.md` Section 8). The completed batch's row now mirrors (via A:H) whichever batch shifted into that position in Master Inventory, and its `Action`/`Notes`/`Stock Completed` (I:K) now hold whatever was in the row below — not the completed batch's leftover values and not blank-by-coincidence |
| CB-06 | Check rows below the completed batch's former position, in both Master Inventory and Action Center | Shift up by one row; Action Center's Action/Notes for those rows still match the correct batch (row-correspondence invariant intact) |

---

## Stock Completed Flow — Bulk / Concurrency

| ID | Steps | Expected result |
|---|---|---|
| CB-07 | Paste `TRUE` into Stock Completed for 3 visible rows in one paste operation | All 3 batches are snapshotted to Completed Batches and removed from both sheets — none skipped, none double-processed |
| CB-08 | Same as CB-07, but the 3 rows are not contiguous (e.g. rows 2, 5, 9 via a non-contiguous multi-selection paste, if supported) or span the full pasted range including some `FALSE`/unchanged cells | Only the rows that end up `TRUE` are completed; others untouched |
| CB-09 | Check a Batch ID for a row already completed by a concurrent edit (simulate by calling `completeBatch()` twice for the same Batch ID) | Second call no-ops (batch not found in Master Inventory), does not throw |
| CB-10 | Two near-simultaneous completions (manual test: two users/two browser tabs checking different rows close together) | `LockService` serializes them; both complete correctly, no partial/interleaved writes |

---

## Row-2 Anchor Formula Destruction (see Architecture Section 8)

The most severe finding of the Milestone 3 test pass. All items below are
**VERIFIED FIXED** as of the final implementation, after two rounds of
fixes (see history in `docs/MILESTONE_3_ARCHITECTURE.md` Section 8).

| ID | Steps | Expected result |
|---|---|---|
| CB-18 | Complete the batch currently occupying Master Inventory's row 2 (the topmost remaining batch) | **VERIFIED.** Master Inventory's `Earliest Expiry`/`Expiry Offset`/`Months Remaining`/`Status` formulas remain intact and correctly computing for all remaining rows — `completeBatch()`'s defensive `setupEarliestExpiryColumn()`/`setupStatusColumns()` calls reattach them if row 2 was the one removed |
| CB-19 | Complete the batch currently occupying Action Center's row 2 | **VERIFIED.** Action Center's row-2 mirror formulas (columns A–H) remain intact for all 8 columns — `removeActionCenterRowData()` never touches those columns regardless of which row is completed |
| CB-20 | Complete a batch, then inspect the `Action`/`Notes`/`Stock Completed` values of the row that batch used to occupy | **VERIFIED (after fix).** Values now correctly match whichever batch shifted into that row from below — not the completed batch's stale values. The first implementation (`Range.deleteCells()`) failed this specific check: the completed batch's `Action`/`Notes` stayed in place and became misattributed to the next batch, and its `Stock Completed` checkbox stayed visibly checked even after a page reload. Replaced with an explicit `getValues()`/`setValues()`/`clearContent()` shift, confirmed correct on retest |
| CB-21 | Run `setupActionCenter()` against a sheet with deliberately blanked row-2 formulas (e.g. after row-2 destruction from CB-18/19 prior to the fix, or any other cause) | **VERIFIED.** A spreadsheet toast reports exactly how many of the 8 formulas were found blank and restored (or confirms none were missing), so a recovery run's effect is visible immediately without a separate diagnostic pass |

---

## Business Columns / Schema Growth

| ID | Steps | Expected result |
|---|---|---|
| CB-11 | Add a manual business column to Action Center (e.g. `Campaign`) beyond Stock Completed, fill it for a batch, then complete that batch | **VERIFIED.** `Completed Batches` gained a `Campaign` column automatically (via `ensureHeaders`) and the value was carried over |
| CB-12 | Complete a batch when Master Inventory has gained a column since `Completed Batches` was first set up (e.g. `Quantity` added later) | `Completed Batches` gains the new column automatically; earlier completed rows show blank for it |

---

## Protection

Protection is warning-only (`setWarningOnly(true)`), not a hard editor-list
ACL — see `docs/MILESTONE_3_ARCHITECTURE.md` Section 6 for why a hard ACL
was tried first and reverted after regression review found it broke
`completeBatch()` for non-owner users.

| ID | Steps | Expected result |
|---|---|---|
| AC-20 | As a non-owner editor, attempt to edit a cell in columns A–H of Action Center | **VERIFIED** (observed live, via an accidental multi-cell edit during testing). A protection warning ("Heads up!... Edit anyway?") is shown; the edit can still be confirmed (or cancelled) — not a hard block |
| AC-21 | As a non-owner editor, attempt "Data > Sort sheet" on Action Center | Same warning-then-allow behavior as AC-20. Not separately exercised as a dedicated test — inferred from AC-20's confirmed mechanism (same protection object covers both edit and sort attempts) |
| AC-22 | As a non-owner editor, edit Action/Notes/Stock Completed (I–K) | Allowed, no warning (outside the protected range) |
| AC-23 | Re-run `setupActionCenter()` when protection already applied | No duplicate protection added (`protectActionCenterFormulaColumns`'s description-based guard) |
| AC-24 | **DEFERRED.** Regression test for the Section 6 finding: as a non-owner editor (not the spreadsheet owner), check Stock Completed for a batch | Requires a second Google account shared as a non-owner editor — not available in this test pass. Explicitly deferred rather than skipped; the underlying fix (`setWarningOnly`) is verified by code review and by AC-20's live observation of warning-only behavior, but not by an actual non-owner completion |
| AC-25 | **DEFERRED**, same reason as AC-24 | Bulk completion (3+ batches) as a non-owner editor |

---

## Edge Cases

| ID | Steps | Expected result |
|---|---|---|
| CB-13 | Complete a batch with blank Action and blank Notes | Snapshot succeeds with blank values for those columns; not required fields |
| CB-14 | Complete a batch whose Quantity was never back-filled (blank) | Snapshot succeeds with a blank Quantity value |
| CB-15 | Simulate `Session.getActiveUser().getEmail()` returning empty (e.g. anyone-with-link sharing without domain auth) | Falls back to `Session.getEffectiveUser().getEmail()`; if also blank, `Completed By` is blank and completion still succeeds |
| CB-16 | Manually edit a Master Inventory row's `Expiry` to push a previously-actioned batch out of the window, then edit it back so it re-qualifies | Its previous Action/Notes reappear as-is (rows never moved, values were never touched) |
| CB-17 | Force the Completed Batches write to fail mid-operation (e.g. temporarily rename `Completed Batches` sheet to trigger an error path) | Batch remains in both Master Inventory and Action Center — nothing partially deleted |

---

## Known Limitations (by design, not bugs)

- **No urgency sorting.** Action Center rows follow Master Inventory's
  natural (entry) order, not soonest-to-expire order — sorting would break
  the row-N-means-row-N invariant with Master Inventory. Status
  color-coding (Milestone 2) is the substitute urgency signal.
- **Protection is warning-only by design, not a hard guarantee.** Any
  editor — not just the owner — can dismiss the warning and edit or sort
  columns A–H anyway. This is a deliberate trade-off (see
  `docs/MILESTONE_3_ARCHITECTURE.md` Section 6): a hard ACL was tried
  first and reverted because it broke `completeBatch()` for non-owner
  users, since `onEdit` runs as a simple trigger under the editing user's
  own permissions.
- **Row-correspondence invariant depends on nobody manually
  inserting/deleting rows directly in Action Center.** `completeBatch()` is
  the only code path meant to do so — no longer enforced by a hard block,
  only by the warning.
- **No cross-sheet transaction.** Action Center's row is no longer deleted
  at all (see Architecture Section 8), so the original "orphaned Action
  Center row" risk from an interrupted `deleteRow()`/`deleteRow()` pair no
  longer applies. A narrower version remains: a hard execution
  interruption (Apps Script timeout, platform-level failure) landing
  between Master Inventory's `deleteRow()` and its defensive
  `setupEarliestExpiryColumn()`/`setupStatusColumns()` reassertion would
  leave Master Inventory's formulas missing until the next manual
  setup run or the next completion. Not addressable within Apps Script's
  execution model; accepted as residual risk, rarer than the fixed
  deterministic case since it requires a genuine mid-execution failure.
- **Partial snapshot write.** A failure partway through
  `snapshotToCompletedBatches()`'s per-cell write loop (after headers are
  already provisioned) could leave a stray, partially-filled row in
  Completed Batches. Does not risk the live batch — the Master Inventory
  deletion only happens after the snapshot function returns without
  throwing.
- **Filter is warning-adjacent for staleness, not just protection.**
  `refreshActionCenterFilter()` covers `onOpen` and Master Inventory
  `Expiry` edits — the two realistic ways a batch's qualification changes.
  A batch crossing the window from some other cause (e.g. editing
  `Quantity` doesn't affect qualification, so this doesn't apply there,
  but any future column added to the qualification logic would need the
  same trigger coverage extended to it).

## Out of Scope for This Test Pass

- Dashboard/KPI features (Milestone 4).
- Any change to Milestone 1/2 behavior (Batch ID generation, product
  recognition, duplicate detection, Expiry parsing, Status Engine) — all
  unchanged; `Main.js`'s Master Inventory branch is a direct extraction,
  not a rewrite.
