# ExpiryOS Roadmap

## Vision

Build a lightweight, formula-first inventory expiry management system for businesses that don't use a full ERP.

---

## Milestones

### ✅ Milestone 1 — Master Inventory Foundation

- Batch ID generation
- Product recognition
- Duplicate detection
- NO BARCODE support

Status: Complete

---

### ✅ Milestone 2 — Expiry Intelligence Engine

- Multi-expiry parsing
- Earliest Expiry engine
- Months Remaining
- Status Engine
- Conditional formatting

Status: Complete

---

### ✅ Milestone 3 — Action Center

- Automatically generated, formula-driven Action Center view
- Editable Action / Notes / Stock Completed columns
- Archive completed batches (Completed Batches sheet), with automatic
  Completed Date and Completed By
- Automatic removal from Master Inventory on completion
- Support for user-added business columns

Status: Complete

Deferred to a future milestone:

- Automatic sort-by-nearest-expiry in Action Center. Evaluated during
  Milestone 3 (see `docs/MILESTONE_3_ARCHITECTURE.md` Section 2); a
  read-only, formula-driven sorted re-presentation of Action Center's own
  data was designed as the lowest-risk approach, but building it was
  deferred to keep Milestone 3's release scope to what's implemented and
  tested. Status color-coding is the interim urgency signal.

---

### ⏳ Milestone 4 — Dashboard & Analytics

Planned:

- KPI dashboard
- Expiry summaries
- Charts
- Brand statistics
- Inventory health

---

### ⏳ Milestone 5 — Product Definition Management

Planned:

- Central product catalog
- Product editing
- Batch inheritance
- Product synchronization