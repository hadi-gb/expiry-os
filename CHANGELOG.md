# Changelog

All notable changes to ExpiryOS will be documented in this file.

The format is based on Keep a Changelog and follows Semantic Versioning.

---

## [0.3.0] - 2026-08-13

### Added

- Action Center: automatically generated, row-for-row mirror of Master
  Inventory, filtered to batches at 12 months remaining or less (or
  expired)
- Action Center editable columns: Action (dropdown), Notes (free text),
  Stock Completed (checkbox)
- Completed Batches (Archive): permanent snapshot on Stock Completed, with
  automatic Completed Date (full timestamp) and Completed By
- Support for user-added business columns in both Action Center and
  Completed Batches, carried through automatically by header name
- `ActionCenterService.js`, `ArchiveService.js`
- `findRowByBatchId()` and `ensureHeaders()` in `Helpers.js`
- `onOpen()` trigger
- Milestone 3 documentation, architecture doc, and production test plan

### Changed

- `Main.js`'s `onEdit` dispatcher extended with an Action Center branch
  (Master Inventory's existing behavior unchanged, extracted into its own
  function)
- Master Inventory gained a `Quantity` column (required for Action
  Center's display)

### Fixed

- `CONFIG` referenced before it was defined, due to Apps Script's file
  load order (top-level constants converted to functions)
- Crash creating a sheet's header map on a brand-new, completely empty
  sheet
- A hard editor-list protection on Action Center's formula columns broke
  the completion workflow for any non-owner user, since `onEdit` runs as a
  simple trigger under the editing user's own permissions — switched to a
  warning-only protection
- `Expiry Offset` silently inheriting a date number format since
  Milestone 2, corrupting numeric values written to Completed Batches —
  fixed at the source in `StatusEngine.js`
- A native Sheets Filter does not auto-refresh when the value it filters
  on changes via formula recalculation — added an explicit refresh on
  `onOpen` and on relevant Master Inventory edits
- Completing a batch occupying row 2 of Master Inventory or Action Center
  could destroy that sheet's live formula infrastructure outright, not
  just remove data — Action Center's row is no longer deleted at all
  (only its editable columns, explicitly shifted); Master Inventory's
  formulas are defensively reasserted after every row deletion
- An initial `Range.deleteCells()`-based implementation of the above did
  not reliably shift Action Center's editable columns in practice,
  causing a completed batch's Action/Notes to become misattributed to the
  next batch — replaced with an explicit `getValues()`/`setValues()` shift

---

## [0.2.0] - 2026-08-09

### Added

- Multi-expiry parsing engine
- Earliest Expiry column
- Human-readable Months Remaining
- Inventory Status Engine
- Automatic conditional formatting
- Sheet formatting utilities
- StatusEngine.js
- SheetFormatting.js
- Generic expiry parser supporting:
  - Single expiry
  - Multiple expiries
  - Optional labels
  - Optional colons
  - Flexible spacing
- Automated setup utilities for Expiry and Status columns
- Milestone 2 documentation
- Milestone 2 production test plan

### Changed

- Expiry workflow now supports multiple expiry dates in a single inventory batch.
- Shelf life is displayed in plain English instead of numeric values.
- Status now updates automatically from the calculated earliest expiry.
- Setup utilities were refactored to use shared helper functions.

### Fixed

- Earliest expiry correctly identifies the minimum expiry across multiple products.
- Improved parsing of free-text expiry entries.
- Correct handling of single-digit month input (e.g. `1-2026`).
- Fixed array custom-function behavior for range inputs.
- Corrected month comparison logic so products remain valid throughout their expiry month.

---

[0.3.0]: https://github.com/hadi-gb/expiry-os/tree/v0.3.0
[0.2.0]: https://github.com/hadi-gb/expiry-os/tree/v0.2.0
[0.1.0]: https://github.com/hadi-gb/expiry-os/tree/v0.1.0

---

## [0.1.0] - 2026-08-08

### Added

- Automatic Batch ID generation
- Product recognition by barcode
- Duplicate detection
- NO BARCODE support
- LockService concurrency protection
- Formula-first inventory architecture
- Modular Apps Script structure
- Production test plan for Milestone 1
- Master Inventory Foundation documentation

### Changed

- Product lookup now uses the highest Batch ID as the source of truth.
- Header lookup is fully dynamic and independent of column order.

### Fixed

- Multi-row Batch ID generation
- Duplicate detection race condition
- Header normalization issues
- Sheet sorting compatibility