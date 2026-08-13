# Milestone 3 - Action Center: Architecture

Status: Complete. Released as v0.3.0. See `docs/MILESTONE_3.md` for the
completion summary and `docs/MILESTONE_3_TEST_PLAN.md` for final test
results.

## Goal

Give Marketing a live list of batches needing action, without Master
Inventory ever holding a second copy of that data, and without Action
Center becoming a second source of truth.

---

## 1. Fit with the existing system

Reuses, unchanged:

- `CONFIG.js` as the single place for sheet names, header names, thresholds.
- `Helpers.js`: `getHeaderMap`, `getColumn`, `ensureColumnAfter`,
  `setFormulaIfSafe`, `isRowEmpty`, `isSingleCellEdit`, `editTouchesColumn`,
  `normalizeText`/`normalizeHeader`, `isDateValue`, `getColumnLetter`.
- The Milestone 2 dependency chain (`Expiry Offset` -> `Months Remaining` /
  `Status`). Action Center reads these directly and never re-derives them.
- The `IF(range="","",range)` guarded-`ARRAYFORMULA` idiom Milestone 2 uses
  — reused here for the mirror formulas, rather than a new formula style.
- The setup-utility idiom: resolve columns by header name, build a formula
  string from the resolved column letters, write it with `setFormulaIfSafe`,
  safe to re-run.
- The `onEdit` dispatcher in `Main.js` gets one new scoped branch
  (Stock Completed), not rewritten.
- `EXPIRY_OFFSET_COLUMN_WIDTH` from `StatusEngine.js` (compress, not hide,
  for inspectability — same convention applied to Action Center's own
  `Expiry Offset` helper column).

Naming: `ARCHITECTURE.md` calls this module "Archive"; this milestone's
spec calls the concrete sheet "Completed Batches." Same concept —
"Archive" is the architectural role, "Completed Batches" is its literal
sheet name. `ArchiveService.js`, already scaffolded and empty, is the file
that gets filled in.

New: `CONFIG.HEADERS.QUANTITY` and a `Quantity` column in Master Inventory
(header-only; existing rows get a blank value until back-filled).

---

## 2. Why no reconciliation

First pass used a compacting `FILTER()`/`SORT()` spill for the display
columns, with an Apps-Script sync step to keep the editable columns aligned
to the right Batch ID as the spill's row order shifted — including from the
calendar rolling past midnight with nobody touching either sheet, since a
compacting spill's row position is not a stable proxy for batch identity.

**Simpler alternative adopted: don't compact.** Action Center has exactly
one row per Master Inventory row, permanently, via per-column mirror
formulas instead of a filtering spill:

```
=ARRAYFORMULA(IF('Master Inventory'!A2:A="","",'Master Inventory'!A2:A))
```

Row *N* in Action Center is, by construction, always row *N* in Master
Inventory. Hiding non-qualifying rows becomes a display concern, solved by
a native Sheets **Filter** (not a Filter View — a per-user feature, weaker
fit for a shared team view) on a mirrored `Expiry Offset` helper column,
condition `<= 12`.

Because rows never move or compact, the editable columns never drift —
**there is no row-alignment reconciliation step**, and this holds exactly
as designed; nothing in this file resolves "which row is this batch" by
position. What the original design got wrong is a narrower claim: it
assumed the Filter itself would recalculate live off cell values with no
script involvement. Confirmed false by testing (Section 7) — a plain
Filter does not re-check a row that stays in place while its filtered
value changes via formula recalculation, only on a fresh Filter creation
or a structural row add/remove. So a small, separate nudge
(`refreshActionCenterFilter()`) is needed on `onOpen` and on Master
Inventory `Expiry` edits — scoped only to "which rows are visible," never
touching row alignment, Batch ID resolution, or Action/Notes/Stock
Completed values. The row disappearing entirely (Stock Completed) remains
the only structural event, and is still the one thing already fully
Apps-Script-owned regardless of design.

**Canonical identifier, even so:** row alignment being *structurally*
guaranteed here is not a license to trust row numbers in the code. Every
place that resolves "which row is this batch" — in Master Inventory, in
Action Center, in the completion flow — does it by looking up **Batch ID**
fresh at the time it's needed, never by carrying a row number from an
earlier step or assuming today's alignment holds a moment later (e.g.
across a multi-row bulk edit where earlier iterations may have already
deleted rows). Row position is an implementation detail of *why* the
editable columns don't drift; Batch ID is what the code actually keys on.

**Cost of this simplification:** the compacting design got urgency sorting
for free from `SORT(FILTER(...))`. This design can't sort Action Center's
rows — doing so would break the row-N-means-row-N invariant. Rows stay in
Master Inventory's natural (entry) order; Milestone 2's Status
color-coding is the substitute urgency signal. Mitigated further by a
warning-only protection on columns A–H (3.1) — a soft confirmation prompt
on manual edits/sorts, not a hard block. It's warning-only rather than a
hard editor-list ACL because `onEdit` is a simple trigger, which runs with
the editing user's own permissions, not the script owner's; a hard ACL
here would make `completeBatch()`'s own row deletion in Action Center
throw for any non-owner user (found in regression review, Section 6).

**Automatic sort-by-nearest-expiry was explicitly requested and explicitly
deferred**, not overlooked: a live, formula-driven, read-only sorted
re-presentation of Action Center's own mirror data (e.g.
`SORT(FILTER('Action Center'!A2:H, 'Action Center'!H2:H<=12), 8, TRUE)`,
placed in unused columns or a separate sheet) was designed as the
lowest-risk way to add it without threatening the row-N-invariant, since
it stays entirely read-only and reads Action Center's own already-correct
output rather than reordering anything. Tracked as a roadmap item (see
`ROADMAP.md`) rather than built now, to keep this milestone's release
scope to what was already implemented and tested.

---

## 3. Architecture

### 3.1 Action Center sheet layout

| Col | Header | Source |
|---|---|---|
| A | Batch ID | mirror formula |
| B | Barcode | mirror formula |
| C | Brand | mirror formula |
| D | Product | mirror formula |
| E | Quantity | mirror formula |
| F | Months Remaining | mirror formula |
| G | Status | mirror formula |
| H | Expiry Offset | mirror formula, compressed — Filter target only |
| I | Action | plain cell, dropdown (data validation, reject invalid) |
| J | Notes | plain cell, free text |
| K | Stock Completed | plain cell, checkbox |
| L+ | (user-added business columns) | plain cells, editable |

**Action dropdown options** (`CONFIG.ACTION_OPTIONS`): `No Action Yet`,
`Discount`, `Bundle`, `Return Supplier`, `Destroy`, `Hold`.

Filter: one Sheets Filter over the full range, condition on column H,
`Expiry Offset <= 12` (`CONFIG.ACTION_CENTER_WINDOW_MONTHS`).

Protection: A–H carry a warning-only protection (confirmation prompt on
manual edit/sort, no hard editor-list ACL — see Section 2 and 6 for why);
I–L+ stay editable and unprotected.

### 3.2 Stock Completed flow

`onEdit`, scoped to Action Center, `Stock Completed` column, `TRUE`:

1. Collect the Batch ID of every row in the edited range whose
   `Stock Completed` cell is `TRUE` (read once, before anything is
   deleted — a multi-row paste is handled as a list of Batch IDs, not a
   list of row numbers, precisely so an earlier deletion in the same batch
   can't shift a later row number out from under the loop).
2. For each Batch ID, independently:
   a. Resolve its Master Inventory row fresh, by Batch ID. If not found
      (already completed elsewhere), skip.
   b. Resolve its Action Center row fresh, by Batch ID (not assumed from
      the edit event's row).
   c. **Write the snapshot to `Completed Batches` first**: every Master
      Inventory column as a plain value, plus every Action Center column
      beyond the fixed mirror/Stock-Completed set (`Action`, `Notes`, and
      any business columns) by header name, plus `Completed Date`
      (`new Date()`, formatted `yyyy-MM-dd HH:mm:ss` — full timestamp, not
      date-only) and `Completed By`
      (`Session.getActiveUser().getEmail()`, falling back to
      `Session.getEffectiveUser().getEmail()`). New headers not yet
      present in Completed Batches are appended automatically.
   d. **Only after that write succeeds**, delete the row from Master
      Inventory, then defensively re-run `setupEarliestExpiryColumn()` and
      `setupStatusColumns()` (idempotent, cheap — see Section 8).
   e. Clear that batch's `Action`/`Notes`/`Stock Completed`/business-column
      values from Action Center and shift every row below them up by one
      within those columns only — Action Center's own row is **never**
      deleted (see Section 8).

Step (c) before (d), always. If the snapshot write throws, the batch stays
in both sheets — the safe failure mode. Wrapped in the same `LockService`
pattern `Main.js` already uses.

### 3.3 Completed Batches sheet

All Master Inventory columns (as values) + `Action` + `Notes` + any ad-hoc
Action Center business columns + `Completed Date` (full timestamp) +
`Completed By`. Append-only, schema grows on demand, never read back by any
formula elsewhere.

---

## 4. Data flow

```
Master Inventory (source of truth)
  │  mirror formulas, per column, 1:1 by row
  ▼
Action Center — Batch ID..Expiry Offset (mirror, read-only)
  │  native Filter (Expiry Offset <= 12)
  │  refreshActionCenterFilter() nudges it on onOpen / Expiry edits —
  │  visibility-only, no row alignment or data touched
  ▼
Visible rows + Action (dropdown) / Notes / Stock Completed (plain cells)
  │  Stock Completed → TRUE, resolved by Batch ID throughout
  ▼
Completed Batches — immutable snapshot, full timestamp
  │
  ▼
Master Inventory row deleted (by Batch ID)
  │  Earliest Expiry/Expiry Offset/Months Remaining/Status defensively
  │  reasserted immediately after (Section 8) — cheap, idempotent no-op
  │  unless the deleted row was row 2, in which case this restores them
  ▼
Action Center's own row is never deleted — its editable columns
(Action/Notes/Stock Completed/business columns) for that batch are cleared
and everything below shifted up by one, within those columns only (Section
8); A:H update on their own via the mirror formula's live recalculation
  ▼
Action Center reflects the change automatically
```

---

## 5. Edge cases

- **Batch crosses the 12-month line with the sheet closed.** Confirmed by
  testing that the Filter does *not* re-evaluate on its own here (Section
  7) — `onOpen()` calls `refreshActionCenterFilter()`, which forces a
  recheck the moment the sheet is next opened.
- **Row with no valid Expiry.** Never shown; blank doesn't satisfy `<= 12`.
- **Historical rows have blank `Quantity`.** Shown with an empty cell.
- **`Completed By` blank** in some sharing configurations. Left blank
  rather than blocking completion.
- **Stock Completed checked for a Batch ID no longer in Master Inventory.**
  No-ops rather than throwing.
- **Bulk paste of `TRUE` across many rows.** Handled as an independent
  Batch-ID-keyed operation per row (3.2 step 1), immune to row-number
  drift caused by earlier completions in the same paste.
- **A batch re-qualifies after being manually corrected out of the
  window.** Its old Action/Notes are still in its row and reappear as-is.
- **Someone manually sorts or inserts/deletes a row directly in Action
  Center.** Discouraged by a warning-only protection on columns A–H
  (deliberately not a hard block — see Section 6) — a confirmation prompt,
  not a guarantee. `completeBatch()` remains the only code path meant to
  delete a row here.
- **Urgency ordering.** Not available as row order; Status color-coding is
  the substitute signal.
- **Large dataset (1000+ batches).** Mirror formulas and a full-column
  Filter are cheap at this scale; no ongoing Apps Script execution needed
  to keep the display current.
- **Concurrent completions.** Same `LockService` pattern as `Main.js`.

---

## 6. Regression finding: protection vs. simple-trigger permissions

Found during post-implementation regression review, before any real
completion had been run against a shared spreadsheet.

The original `protectActionCenterFormulaColumns()` used a hard editor-list
ACL (`removeEditors` + `setDomainEdit(false)`) on columns A–H. `onEdit` is
a *simple* trigger (no `ScriptApp.newTrigger(...)` installable trigger
exists anywhere in this project) — simple triggers run with the
authorization of whoever made the edit, not the script owner. Deleting a
row necessarily touches every cell in it, including protected ones, so
`completeBatch()`'s `actionCenterSheet.deleteRow(actionRow)` was executing
under the *editing user's own* permissions against a range that same user
had just been denied edit access to.

For any user other than the sheet owner, every completion would: write the
snapshot to Completed Batches (succeeds — no protection there), delete the
row from Master Inventory (succeeds — no protection there), then throw on
deleting the row from Action Center. Net effect: the batch is correctly
gone from Master Inventory and correctly recorded in Completed Batches,
but its Action Center row is orphaned — exactly the A:H/H:J misalignment
the whole mirror-formula design exists to avoid, caused by the safeguard
meant to protect it. In a multi-row completion the uncaught exception also
aborted every batch queued after the failing one, leaving their `Stock
Completed` checkboxes `TRUE` but unprocessed.

Fixed by switching to `setWarningOnly(true)`: a warning-only protection
shows a confirmation prompt on manual UI edits/sorts but places no ACL on
the range at all, so it never restricts Apps Script's own writes
regardless of which user triggered the script. This trades a hard
guarantee against manual A–H edits for a soft one, in exchange for
`completeBatch()` actually working for every user, which is the correct
trade given the hard version broke the feature's core workflow
deterministically rather than in some rare edge case.

Two lower-severity, non-deterministic risks were also identified and left
as documented residual risk rather than fixed, since neither has a general
solution within Apps Script's execution model:

- A failure partway through `snapshotToCompletedBatches()`'s per-cell
  write loop (after `ensureHeaders()` succeeds) would leave a stray,
  partially-filled row in Completed Batches — but still correctly blocks
  the Master Inventory deletion, so the live batch is never lost.
- A hard execution interruption (Apps Script timeout, platform-level kill)
  landing between the Master Inventory and Action Center `deleteRow()`
  calls would produce the same orphaned-row state even without the
  permission bug. Apps Script has no cross-sheet transaction primitive;
  this is an inherent limit of the platform, not something addressable in
  this codebase.

  (This specific `deleteRow()`-on-Action-Center call no longer exists —
  see Section 8. This residual risk is now specific to the ordering of
  Master Inventory's `deleteRow()` and its own formula reassertion, on a
  much smaller scale: an interruption landing in that narrow window would
  leave Master Inventory's formulas missing until the next manual
  `setupEarliestExpiryColumn()`/`setupStatusColumns()` run or the next
  completion.)

---

## 7. Regression finding: Filter does not auto-refresh on formula-only value changes

Found during manual testing, after implementation: editing a Master
Inventory row's `Expiry` so its `Status` changed from `SAFE` to `HIGH`
(offset dropping from 13 to 4) did not make the row appear in Action
Center — not immediately, and not after reloading the page.

The original design (Section 2, as first written) claimed a plain Sheets
Filter "recalculates live off cell values... with no script involvement."
Empirically false: a Filter evaluates its condition against each row's
current value when the Filter is *created*, and again whenever rows are
*structurally* added or removed (confirmed correct — this is exactly why
completions correctly shrink the visible set). It does **not** re-evaluate
a row that stays in place while its filtered cell's value changes purely
via formula recalculation. Manually opening and closing the Filter's
column dropdown in the UI — with no change made — was enough to make the
row appear, confirming the value itself was already correct; only the
Filter's cached result was stale.

Fixed with `refreshActionCenterFilter()` (`ActionCenterService.js`):
removes the existing Filter and recreates it from scratch, which forces a
fresh evaluation (the same mechanism that already works correctly at
initial `setupActionCenter()` time). Wired to two triggers:

- `onOpen()` (`Main.js`) — catches a batch crossing the window purely from
  `TODAY()` rolling over while the sheet was closed, the scenario the
  original design assumed needed no trigger at all.
- `handleMasterInventoryEdit()` (`Main.js`), scoped to edits touching
  `Expiry` — catches a same-session correction immediately.

Both calls are visibility-only: neither touches row alignment, Batch ID
resolution, or Action/Notes/Stock Completed values, so this doesn't
reopen the "no reconciliation" property Section 2 establishes for row
alignment — it only concerns which rows the Filter currently shows.

---

## 8. Regression finding: completing a batch could destroy formula infrastructure, not just data

The most serious finding from Milestone 3 testing, found only once actual
completions were run against a spreadsheet with more than a handful of
rows, and once the completed batch happened to be the topmost row.

**Mechanism.** Neither Master Inventory's `Earliest Expiry`/`Expiry
Offset`/`Months Remaining`/`Status` columns nor Action Center's 8 mirror
columns are one formula per row. Each is a *single* `ARRAYFORMULA` (or, for
`Earliest Expiry`, a bare `EXPIRY_EARLIEST()` custom-function call) living
in exactly one anchor cell in row 2, spilling its output downward. Rows
below only ever display *spilled output* — they hold no formula object of
their own. The original completion flow called `Sheet.deleteRow()` on both
Master Inventory and Action Center. Whenever the completed batch happened
to occupy row 2 — which happens regularly, since completions remove
whichever batch a user is acting on, not necessarily the bottommost one —
that call deleted the anchor cell itself, deleting the formula for the
*entire column*, not just that row's value. Nothing "promotes" into row 2
to take over, because row 3 (now shifting into row 2's position) never had
an independent formula to begin with. Every row in that column goes blank.
This, not (only) manual data-clearing during testing, was the actual cause
behind repeated "formulas went blank" incidents throughout Milestone 3
testing.

**Evaluated and rejected: eliminating the row-2 dependency structurally.**
`Expiry Offset`/`Months Remaining`/`Status` are pure native formulas and
could in principle be converted to independent per-row formulas (seeded
into each row via the existing `onEdit` per-row loop when a batch first
gets its Batch ID), which Sheets natively re-points correctly on row
deletion — no anchor, no fragility. `Earliest Expiry` cannot: it's backed
by the custom function `EXPIRY_EARLIEST()`, deliberately called once with
a bulk range rather than per-row specifically for performance (custom
functions carry real per-invocation overhead; converting 1000+ rows to
independent per-row custom-function calls risks regressing the "1000+
batches" performance goal). Since `Expiry Offset` reads `Earliest Expiry`,
the row-2 dependency can't be fully eliminated regardless of what happens
to the other three columns, and converting only those three would mean
rewriting tested, working Milestone 2 code for a marginal reduction in
what's already a cheap, safe fallback. Not pursued.

**Fix — two parts, handled differently per sheet:**

1. **Action Center: never delete its row at all.** `completeBatch()` now
   calls `removeActionCenterRowData()` (`ArchiveService.js`), which clears
   only the editable columns (`Action` onward) for the completed batch's
   row and shifts every row below up *within those columns only* — columns
   A–H are never touched, so the row-2 anchor is permanently safe
   regardless of which batch is completed. A:H don't need any action here;
   they already update on their own via the mirror formula's live
   recalculation once Master Inventory's row is gone. This function's
   first implementation used `Range.deleteCells(Dimension.ROWS)`; that was
   confirmed by testing to *not* reliably shift this range's contents in
   practice (a completed batch's `Action`/`Notes` stayed in place and
   became misattributed to whichever batch the mirror formulas next
   shifted into that row — a deterministic data-alignment bug, not the
   formula-destruction bug this section otherwise describes). Replaced
   with an explicit `getValues()`/`setValues()`/`clearContent()` shift,
   which has no ambiguity about shift semantics and is still only a
   handful of bulk API calls regardless of row count.
2. **Master Inventory: reassert its formulas defensively after every row
   deletion**, since its row genuinely must be deleted (it holds real
   per-row input data, not just derived columns, so there's no equivalent
   "only shift some columns" option). `completeBatch()` now calls
   `setupEarliestExpiryColumn()` and `setupStatusColumns()` immediately
   after `masterSheet.deleteRow()`. Both are already idempotent —
   `setFormulaIfSafe()` no-ops when the formula is already correctly in
   place — so calling them unconditionally, rather than only when row 2
   was the row removed, is simpler and just as safe.

**Recovery tooling.** Because `setFormulaIfSafe()` already treats a truly
blank anchor cell as safe to (re)write, `setupActionCenter()` was already,
incidentally, a valid recovery function for a destroyed Action Center
anchor — but there was no way to confirm a run had actually taken effect
short of a separate diagnostic script, which mattered in practice: a UI
timing issue in the Apps Script editor's function-selector dropdown meant
"Run" sometimes silently ran a different, previously-selected function
instead, with no error to indicate it. `writeMirrorFormulas()` now reports
how many of the 8 anchor cells were found blank and restored, and
`setupActionCenter()` surfaces that count via `Spreadsheet.toast()` —
visible immediately in the spreadsheet itself, so confirming a recovery
run actually worked no longer requires checking the Apps Script execution
log or a separate diagnostic pass.
