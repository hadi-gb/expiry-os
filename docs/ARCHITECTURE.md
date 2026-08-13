# ExpiryOS - Architecture

> Reflects the system as built through v0.3.0 (Milestone 3). For the
> detailed, as-built design of Action Center and the Archive workflow
> specifically — including the reasoning behind every implementation
> decision — see `docs/MILESTONE_3_ARCHITECTURE.md`. This document covers
> the system as a whole.

## Overview

ExpiryOS follows a lightweight architecture built around Google Sheets, formulas, and a small amount of Google Apps Script.

The system is designed to prioritize speed, simplicity, maintainability, and flexibility over excessive automation.

---

## Design Principles

### Formula First

Whenever possible, business logic is implemented using native Google Sheets formulas.

Benefits:

- Faster performance
- Easier debugging
- Lower maintenance
- Transparent calculations

### Apps Script Second

Google Apps Script is only used where formulas cannot provide the required functionality.

Examples:

- Batch ID generation
- Product recognition and duplicate-batch prompts
- The Archive (Stock Completed) workflow
- Keeping the Action Center Filter in sync (see `docs/MILESTONE_3_ARCHITECTURE.md` Section 7)

### Single Source of Truth

Master Inventory is the only source of active inventory data.

Every active batch exists only once. Action Center never holds a second copy of that data — it mirrors Master Inventory row-for-row through per-column formulas (see `docs/MILESTONE_3_ARCHITECTURE.md` Section 2).

### Header-Driven Design

Columns are resolved dynamically by header name instead of hardcoded indexes, so the spreadsheet layout can evolve — including user-added business columns — without breaking existing functionality.

---

## System Modules

### Master Inventory — implemented

The operational database of ExpiryOS. Stores every active inventory batch.

Responsibilities:

- Receive new batches
- Barcode lookup and product recognition
- Batch ID generation
- Duplicate batch detection
- Expiry tracking (Earliest Expiry, Expiry Offset, Months Remaining, Status)

### Action Center — implemented

Gives Marketing a prioritized, always-current list of batches requiring action, without ever duplicating Master Inventory's data.

Responsibilities:

- Mirror qualifying batch data from Master Inventory (read-only)
- Show only batches within the expiry action window (12 months or less, or already expired)
- Record an Action, free-text Notes, and a Stock Completed checkbox per batch
- Support user-added business columns without any code changes

### Archive (Completed Batches) — implemented

Maintains a permanent, append-only historical record.

Responsibilities:

- Snapshot a batch's full data (Master Inventory + Action Center columns) the moment it's marked Stock Completed
- Record who completed it and exactly when
- Remove the batch from the active workflow (Master Inventory and Action Center) automatically

### Dashboard & Analytics — planned (Milestone 4)

Not yet built. Intended to give managers a real-time overview of inventory health: KPI cards, batch counts, expiry summaries, and operational metrics, computed from Master Inventory and Completed Batches. See `ROADMAP.md`.

---

## Data Flow

```
Warehouse
   │  scans barcode, enters expiry
   ▼
Master Inventory   (single source of truth for active batches)
   │  mirror formulas, per column, row-for-row
   ▼
Action Center       (filtered to the expiry action window)
   │  Stock Completed checked
   ▼
Completed Batches   (Archive — permanent snapshot)
```

Dashboard & Analytics (planned) will read from Master Inventory and Completed Batches once built, without either sheet changing shape to accommodate it.

---

## Data Model

The primary entity in ExpiryOS is the **Batch** — one row in Master Inventory. Its columns are resolved by header name (`CONFIG.HEADERS` in `src/Config.js`), never by position, so their sheet order is not fixed.

### Master Inventory (per batch, entered or derived)

| Column | Origin |
|---|---|
| Batch ID | Auto-generated, permanent |
| Barcode | Entered (or `NO BARCODE`) |
| Brand / Product | Entered, or auto-filled from a matching Barcode |
| Quantity | Entered |
| Expiry | Entered (single or multi-expiry, see `docs/MILESTONE_2_TEST_PLAN.md`) |
| Earliest Expiry | Derived — earliest date parsed from Expiry |
| Expiry Offset | Derived — whole calendar months from today to Earliest Expiry |
| Months Remaining | Derived — human-readable phrasing of Expiry Offset |
| Status | Derived — priority category (`🔴 EXPIRED` / `🔴 URGENT` / `🟠 HIGH` / `🟡 MEDIUM` / `🟢 SAFE`) |

### Action Center (adds, per qualifying batch)

| Column | Origin |
|---|---|
| Action | Editable — closed dropdown list |
| Notes | Editable — free text |
| Stock Completed | Editable — checkbox; triggers the Archive workflow |

### Completed Batches (adds, on archiving)

| Column | Origin |
|---|---|
| Completed Date | Auto-recorded — full timestamp |
| Completed By | Auto-recorded — completing user's email |

Any additional column a user adds directly to Master Inventory or Action Center (e.g. a `Campaign` column) is treated as a business column: carried through automatically by header name, with no code changes required. This is how the screenshots in `README.md` come to show columns like `Date Added` or `Batch Status` that aren't part of the core schema above.

Batch ID is the identifier every feature keys on — never a row number, since row numbers shift as batches are added, sorted, or completed.

---

## Engineering Principles

- One source of truth
- Header-based programming
- Formula-first design
- Lightweight Apps Script
- Flexible user-defined business columns
- Fast data entry
- Minimal maintenance

---

## Performance Goals

- Fast warehouse scanning
- Minimal Apps Script execution
- Formula-driven updates
- Support for large datasets (1000+ batches)

---

## Future Expansion

Planned or evaluated directions, not yet built:

- Dashboard & Analytics (Milestone 4)
- Product Definition Management (Milestone 5)
- Shopify integration
- Email notifications
- Mobile barcode scanning
- User permissions
- Supplier management
- Reporting

See `ROADMAP.md` for current sequencing.
