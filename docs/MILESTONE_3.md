# Milestone 3 - Action Center

## Goal

Give Marketing a live, automatically-generated list of batches needing
action — without Master Inventory ever holding a second copy of that data,
and without Action Center becoming a second source of truth.

At the end of this milestone, Marketing should be able to:

- Open Action Center and see every batch at 12 months remaining or less
  (or already expired), automatically, with zero manual filtering.
- Record an Action (from a fixed list), free-text Notes, and mark a batch
  Stock Completed, directly in Action Center.
- Check a box to archive a batch: it's snapshotted permanently to
  Completed Batches (with who completed it and exactly when) and removed
  from the active workflow, automatically.

---

# Completed Features ✅

## Action Center

- Automatically generated, row-for-row mirror of Master Inventory (Batch
  ID, Barcode, Brand, Product, Quantity, Months Remaining, Status), via
  per-column formulas — never a second copy of the data.
- Automatic visibility filtering to batches at 12 months remaining or
  less, or already expired, via a native Sheets Filter.
- Editable Action (closed dropdown list), Notes (free text), and Stock
  Completed (checkbox) columns, safely coexisting with the read-only
  mirror columns.
- Supports user-added business columns (e.g. a `Campaign` column) without
  any code changes, per the project's existing "business columns"
  principle.
- Formula columns protected against accidental hand-editing or sorting
  (warning prompt, not a hard block).

---

## Completed Batches (Archive)

- Checking Stock Completed snapshots the batch's full data — every Master
  Inventory column, plus Action/Notes/business columns — into a permanent,
  append-only Completed Batches sheet.
- Automatically records who completed the batch and the full completion
  timestamp (date and time).
- Removes the batch from Master Inventory and from Action Center's active
  workflow, automatically, with no manual cleanup.
- Schema grows on demand: a new Master Inventory or Action Center column
  introduced later is picked up automatically, by header name.

---

## Reliability work (found and fixed during this milestone's test pass)

Not originally scoped features, but load-bearing fixes without which the
milestone would not be safe to release:

- A native Sheets Filter does not auto-refresh when the value it's
  filtering on changes via formula recalculation (only on structural row
  changes or fresh creation) — Action Center's Filter is now explicitly
  nudged on sheet open and on relevant Master Inventory edits.
- Completing a batch could destroy the live formula infrastructure in
  Master Inventory and/or Action Center outright, not just remove data,
  whenever the completed batch happened to occupy row 2 — fixed by never
  deleting Action Center's row at all (only its editable columns, shifted
  explicitly) and by defensively reasserting Master Inventory's formulas
  after every row deletion.
- A protection policy that would have broken the entire completion
  workflow for any user other than the spreadsheet owner, found in
  regression review before it reached real use.

Full write-ups: `docs/MILESTONE_3_ARCHITECTURE.md` Sections 6–8.

---

# Acceptance Criteria

## Completed

- [x] Action Center is automatically generated from Master Inventory.
- [x] Only batches at ≤12 months remaining or expired are shown.
- [x] Batch ID, Barcode, Brand, Product, Quantity, Months Remaining,
      Status are displayed.
- [x] Action, Notes, Stock Completed are directly editable.
- [x] Checking Stock Completed snapshots to Completed Batches with
      Completed Date (full timestamp) and Completed By recorded
      automatically.
- [x] The completed batch is removed from Master Inventory.
- [x] Action Center reflects the change automatically — no manual refresh.
- [x] Formula-first where practical; Apps Script only where formulas
      structurally cannot do the job (the completion workflow itself, and
      the Filter/formula-recovery nudges).
- [x] Business columns added by users are supported without code changes,
      in both Action Center and Completed Batches.

## Explicitly deferred (see Roadmap)

- [ ] Automatic sort-by-nearest-expiry in Action Center — evaluated,
      requested, and deliberately deferred to keep this milestone's
      release scope to what's implemented and tested. Status
      color-coding is the interim urgency signal.
- [ ] Non-owner-editor regression tests (AC-24/AC-25 in the test plan) —
      require a second Google account not available in this test pass.

---

# Deliverables

- `ActionCenterService.js`
- `ArchiveService.js`
- Two new `Helpers.js` functions: `findRowByBatchId`, `ensureHeaders`
- `Main.js` extended with the Action Center `onEdit` branch and `onOpen`
- `docs/MILESTONE_3_ARCHITECTURE.md`
- `docs/MILESTONE_3_TEST_PLAN.md`
- This document

---

✅ Milestone 3 Complete

Release:
v0.3.0

Next:
Milestone 4 – Dashboard & Analytics
