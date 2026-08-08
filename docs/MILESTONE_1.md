# Milestone 1 - Master Inventory Foundation

## Goal

Build the core workflow for receiving inventory batches.

At the end of this milestone, warehouse employees should be able to create new inventory batches quickly while preventing duplicate records.

---

# Features

## Batch ID

- Automatic generation
- Permanent identifier
- Never changes

---

## Barcode Recognition

- Existing barcode automatically fills:
  - Brand
  - Product

- Unknown barcode allows manual entry.

---

## Duplicate Detection

Warn the user when:

Barcode + Expiry already exists.

Allow the user to:

- Open existing batch
- Create new batch anyway

---

## NO BARCODE Support

Allow products without barcodes.

Duplicate detection uses:

Product + Expiry

instead of Barcode.

---

## Gift Set Support

Support multiple expiries.

Example

Cleanser:09-2027 | SPF:12-2027 | Serum:04-2028

The earliest expiry determines priority.

---

# Acceptance Criteria

- Warehouse can scan existing products.
- Brand auto-fills.
- Product auto-fills.
- Batch ID generated automatically.
- Duplicate warning appears.
- NO BARCODE products supported.
- Gift sets supported.

---

# Deliverables

- Master Inventory workflow
- Formula-first implementation
- Lightweight Apps Script