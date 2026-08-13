# Milestone 2 - Expiry Intelligence Engine

## Goal

Transform the Expiry field into actionable inventory intelligence.

At the end of this milestone, warehouse employees should be able to:

- Enter either a single expiry or multiple expiries in one cell.
- Automatically determine the earliest expiry.
- View remaining shelf life in plain English.
- Instantly identify inventory priority using visual status indicators.

---

## Completed Features ✅

### Multi-Expiry Parsing

Supports one or many expiry dates inside the Expiry column.

Examples:

03-2027

or

Cleanser 09-2027 / Gel 12-2026 / Cream 01-2026

Features:

- Single expiry supported.
- Multiple expiries supported.
- Component labels optional.
- Colon optional.
- Flexible spacing.
- MM-YYYY and M-YYYY accepted.
- Ignores malformed components.
- Uses the earliest valid expiry.

---

### Earliest Expiry Engine

Automatically extracts the earliest expiry from every inventory batch.

Features:

- Formula-driven architecture.
- Supports bulk rows.
- Supports existing Date values.
- Independent of product type.
- Generic parsing engine.

---

### Shelf-Life Engine

Calculates remaining shelf life from the Earliest Expiry.

Displays:

- Expires This Month
- 1 Month Remaining
- 7 Months Remaining
- 4 Months Expired

Uses calendar-month calculations instead of day precision to match warehouse workflows.

---

### Status Engine

Automatically classifies inventory priority.

Status levels:

- 🔴 EXPIRED
- 🔴 URGENT
- 🟠 HIGH
- 🟡 MEDIUM
- 🟢 SAFE

Features:

- Formula-first implementation.
- Automatic updates.
- Conditional formatting.
- Visual prioritization.

---

### Sheet Formatting

Automatic setup utilities configure:

- Earliest Expiry column
- Months Remaining column
- Status column
- Conditional formatting
- Frozen header
- Consistent alignment

---

## Architecture

Milestone 2 follows the Formula First philosophy.

Data flow:

Expiry

↓

Earliest Expiry

↓

Expiry Offset

↓

Months Remaining

↓

Status

Each stage has a single responsibility.

No feature re-parses the Expiry field.

---

## Acceptance Criteria

- [x] Multiple expiries supported
- [x] Earliest expiry extracted automatically
- [x] Single-expiry products remain compatible
- [x] Human-readable shelf-life displayed
- [x] Inventory status generated automatically
- [x] Status updates without manual edits
- [x] Conditional formatting applied
- [x] Formula-first architecture maintained

---

## Deliverables

- ExpiryEngine.js
- StatusEngine.js
- SheetFormatting.js
- Automated setup utilities
- Formula-driven expiry intelligence
- Extensible architecture for future milestones

---

✅ Milestone 2 Complete