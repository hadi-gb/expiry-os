# Changelog

All notable changes to ExpiryOS will be documented in this file.

The format is based on Keep a Changelog and follows Semantic Versioning.

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