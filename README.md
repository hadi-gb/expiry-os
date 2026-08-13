# ExpiryOS

A lightweight, formula-first inventory expiry management system built with **Google Sheets** and **Google Apps Script**.

ExpiryOS helps warehouses and small businesses manage inventory batches, monitor product expiry dates, and prioritize stock before it expires—without requiring the complexity or cost of a traditional ERP system.

Inspired by real warehouse operations, ExpiryOS focuses on solving a common operational challenge: **making expiry management simple, reliable, and scalable using tools businesses already have.**

---

# Why ExpiryOS?

Many small and medium-sized businesses rely on spreadsheets to manage inventory but lack an efficient way to track product expiry dates across multiple batches.

ExpiryOS was designed to bridge that gap by combining the flexibility of Google Sheets with the automation capabilities of Google Apps Script.

The project emphasizes:

- Formula-first design
- Modular architecture
- Maintainable code
- Real-world warehouse workflows
- Performance over unnecessary complexity

---

# Features

## 📦 Master Inventory Foundation

- Automatic Batch ID generation
- Barcode-based Product Recognition
- Duplicate Batch Detection
- NO BARCODE product support
- LockService concurrency protection
- Dynamic header resolution
- Multi-row paste support

---

## 📅 Expiry Intelligence Engine

- Single and Multi-Expiry support
- Automatic Earliest Expiry extraction
- Human-readable shelf-life calculations

Examples:

```
16 Months Remaining
1 Month Remaining
Expires This Month
5 Months Expired
```

- Automatic inventory prioritization

```
🔴 EXPIRED
🔴 URGENT
🟠 HIGH
🟡 MEDIUM
🟢 SAFE
```

- Automatic conditional formatting
- Formula-first expiry intelligence

---

## 📋 Action Center

- Automatically generated, formula-driven view of batches at 12 months
  remaining or less (or already expired) — never a second copy of Master
  Inventory's data
- Editable Action (dropdown), Notes (free text), and Stock Completed
  (checkbox) columns
- Checking Stock Completed archives the batch to a permanent Completed
  Batches sheet, with Completed Date (full timestamp) and Completed By
  recorded automatically, and removes it from Master Inventory
- Supports user-added business columns without any code changes

---

# Architecture

ExpiryOS follows a modular architecture where each component has a single responsibility.

```
Master Inventory
        │
        ▼
     Expiry
        │
        ▼
Earliest Expiry
        │
        ▼
  Expiry Offset
      ├──────────────┐
      ▼              ▼
Months Remaining   Status
```

Business logic is calculated once and reused throughout the system. Downstream features never recalculate or duplicate expiry logic, making the project easier to maintain and extend.

---

# Technology Stack

- Google Sheets
- Google Apps Script
- JavaScript (ES6)
- Git
- GitHub
- clasp
- Visual Studio Code

---

# Project Structure

```text
ExpiryOS/
│
├── src/
│   ├── Config.js
│   ├── Helpers.js
│   ├── Main.js
│   ├── ProductService.js
│   ├── DuplicateDetectionService.js
│   ├── ExpiryEngine.js
│   ├── StatusEngine.js
│   ├── SheetFormatting.js
│   ├── ActionCenterService.js
│   └── ArchiveService.js
│
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── MILESTONE_1.md
│   ├── MILESTONE_1_TEST_PLAN.md
│   ├── MILESTONE_2.md
│   ├── MILESTONE_2_TEST_PLAN.md
│   ├── MILESTONE_3.md
│   ├── MILESTONE_3_ARCHITECTURE.md
│   ├── MILESTONE_3_TEST_PLAN.md
│
├── CHANGELOG.md
├── ROADMAP.md
├── LICENSE
└── README.md
```

---

# Current Progress

| Milestone | Status |
|-----------|--------|
| ✅ Master Inventory Foundation | Complete |
| ✅ Expiry Intelligence Engine | Complete |
| ✅ Action Center | Complete |
| 🚧 Dashboard & Analytics | Planned |
| 🚧 Product Definition Management | Planned |

For upcoming features, see **ROADMAP.md**.

---

# Documentation

Project documentation is available in the **docs/** directory.

- Product Requirements Document (PRD)
- Architecture
- Milestones
- Production Test Plans

---

# Design Principles

### Formula First

Whenever Google Sheets formulas provide a clean and maintainable solution, formulas are preferred over Apps Script.

### Apps Script Only Where It Adds Value

Apps Script is used only for workflows that cannot be implemented cleanly with native spreadsheet functionality.

### Modular Architecture

Each module has a single responsibility, allowing features to evolve independently without introducing unnecessary coupling.

### Header-Driven Design

Columns are resolved dynamically by header name instead of hardcoded indexes, allowing the spreadsheet layout to evolve without breaking existing functionality.

---

# Installation

1. Clone the repository.

```bash
git clone <repository-url>
```

2. Install clasp.

```bash
npm install -g @google/clasp
```

3. Authenticate.

```bash
clasp login
```

4. Push the Apps Script project.

```bash
clasp push
```

5. Run the setup utilities from the Apps Script editor.

```javascript
setupEarliestExpiryColumn();
setupStatusColumns();
setupSheetFormatting();
setupActionCenter();
setupCompletedBatches();
```

---

# Testing

Each completed milestone includes a dedicated production test plan.

- `docs/MILESTONE_1_TEST_PLAN.md`
- `docs/MILESTONE_2_TEST_PLAN.md`
- `docs/MILESTONE_3_TEST_PLAN.md`

---

# Versioning

ExpiryOS follows **Semantic Versioning**.

Current release:

**v0.3.0**

See **CHANGELOG.md** for a complete release history.

---

# Roadmap

The next planned milestones include:

- Dashboard & Analytics
- Product Definition Management
- Automatic sort-by-nearest-expiry in Action Center (deferred from
  Milestone 3 — see `docs/MILESTONE_3_ARCHITECTURE.md`)

See **ROADMAP.md** for the complete development roadmap.

---

# License

This project is licensed under the **MIT License**.