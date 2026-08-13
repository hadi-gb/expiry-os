# Milestone 1 - Master Inventory Foundation

## Goal

Build the core Master Inventory workflow for receiving inventory batches.

At the end of this milestone, warehouse employees should be able to:

- Create inventory batches quickly.
- Automatically recognize existing products.
- Generate permanent Batch IDs.
- Prevent duplicate inventory records.
- Support products without barcodes.

---

## Completed Features ✅

### Batch ID

- Automatic Batch ID generation.
- Permanent unique identifier.
- Never changes after creation.
- Supports multi-row paste.
- Safe for concurrent warehouse users using LockService.

---

### Product Recognition

- Existing barcode automatically fills:
  - Brand
  - Product
- Uses the highest Batch ID as the source of truth.
- Independent of sheet sorting.
- Unknown barcodes allow manual product creation.

---

### Duplicate Detection

Warns the user when an inventory batch already exists.

Duplicate rule:

- Barcode + Expiry
- Product + Expiry when Barcode = NO BARCODE

Allow the user to:

- Keep the edit and create the batch anyway.
- Cancel and restore the previous value.

Scoped to Expiry edits only, matching the warehouse workflow (barcode is a
scan, rarely changed after entry; Expiry is the final step when receiving
inventory).

---

## Acceptance Criteria

### Completed

- [x] Warehouse can scan existing products.
- [x] Brand auto-fills.
- [x] Product auto-fills.
- [x] Batch ID generated automatically.
- [x] Product recognition works after sheet sorting.
- [x] Duplicate warning appears.
- [x] NO BARCODE products supported.

---

## Deliverables

- Master Inventory workflow.
- Formula-first implementation.
- Lightweight Apps Script.
- Modular architecture.
- Extensible foundation for future milestones.

---
✅ Milestone 1 Complete

Release:
v0.1.0

Next:
Milestone 2 – Expiry Intelligence Engine