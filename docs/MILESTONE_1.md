# Milestone 1 - Master Inventory Foundation

## Goal

Build the core Master Inventory workflow for receiving inventory batches.

At the end of this milestone, warehouse employees should be able to:

- Create inventory batches quickly.
- Automatically recognize existing products.
- Generate permanent Batch IDs.
- Prevent duplicate inventory records.
- Support products without barcodes.
- Support gift sets with multiple expiry dates.

---

# Completed Features ✅

## Batch ID

- Automatic Batch ID generation.
- Permanent unique identifier.
- Never changes after creation.
- Supports multi-row paste.
- Safe for concurrent warehouse users using LockService.

---

## Product Recognition

- Existing barcode automatically fills:
  - Brand
  - Product
- Uses the highest Batch ID as the source of truth.
- Independent of sheet sorting.
- Unknown barcodes allow manual product creation.

---

# Remaining Features

## Duplicate Detection

Warn the user when an inventory batch already exists.

Duplicate rule:

- Barcode + Expiry

Allow the user to:

- Open existing batch.
- Create a new batch anyway.

---

## NO BARCODE Support

Allow products without barcodes.

When Barcode =

NO BARCODE

Duplicate detection should instead use:

- Product + Expiry

---

## Gift Set Support

Support products containing multiple expiry dates.

Example:

Cleanser : 09-2027
SPF : 12-2027
Serum : 04-2028

The earliest expiry determines the batch priority.

---

# Acceptance Criteria

## Completed

- [x] Warehouse can scan existing products.
- [x] Brand auto-fills.
- [x] Product auto-fills.
- [x] Batch ID generated automatically.
- [x] Product recognition works after sheet sorting.

## Remaining

- [ ] Duplicate warning appears.
- [ ] NO BARCODE products supported.
- [ ] Gift sets supported.
- [ ] Milestone 1 fully completed.

---

# Deliverables

- Master Inventory workflow.
- Formula-first implementation.
- Lightweight Apps Script.
- Modular architecture.
- Extensible foundation for future milestones.

---

# Progress

Milestone 1 Progress

- [x] Batch ID
- [x] Product Recognition
- [ ] Duplicate Detection
- [ ] NO BARCODE Support
- [ ] Gift Set Support