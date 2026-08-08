# ExpiryOS - Architecture

## Overview

ExpiryOS follows a lightweight architecture built around Google Sheets, formulas, and a small amount of Google Apps Script.

The system is designed to prioritize speed, simplicity, maintainability, and flexibility over excessive automation.

---

# Design Principles

## Formula First

Whenever possible, business logic should be implemented using native Google Sheets formulas.

Benefits:

- Faster performance
- Easier debugging
- Lower maintenance
- Transparent calculations

---

## Apps Script Second

Google Apps Script is only used where formulas cannot provide the required functionality.

Examples:

- Archive workflow
- Duplicate batch prompts
- Batch ID generation (if required)
- Automation
- Navigation

---

## Single Source of Truth

Master Inventory is the only source of inventory data.

Every active inventory batch exists only once.

Other sheets reference Master Inventory instead of maintaining duplicate copies.

---

# System Modules

## Dashboard

Purpose

Provide managers with a real-time overview of inventory health.

Contains:

- KPI cards
- Batch counts
- Expiry summaries
- Operational metrics

---

## Master Inventory

Purpose

Store every active inventory batch.

Responsibilities

- Receive new batches
- Barcode lookup
- Product lookup
- Batch creation
- Expiry tracking

This sheet represents the operational database of ExpiryOS.

---

## Action Center

Purpose

Provide Marketing with a prioritized list of batches requiring action.

Responsibilities

- View expiring batches
- Record actions taken
- Add business-specific columns
- Archive completed work

Business columns added by users are intentionally supported without modifying the application.

---

## Archive

Purpose

Maintain historical records.

Archived batches are removed from operational workflows while preserving every column of business information for auditing and reporting.

---

# Data Flow

Warehouse

↓

Master Inventory

↓

Action Center

↓

Archive

↓

Dashboard updates automatically

---

# Data Model

The primary entity within ExpiryOS is the Batch.

Each batch contains:

- Batch ID
- Barcode
- Brand
- Product
- Expiry
- Quantity (optional)
- Date Added

Batch ID acts as the primary identifier throughout the system.

---

# Engineering Principles

- One source of truth
- Header-based programming
- Formula-first design
- Lightweight Apps Script
- Flexible user-defined business columns
- Fast data entry
- Minimal maintenance

---

# Performance Goals

- Fast warehouse scanning
- Minimal Apps Script execution
- Formula-driven updates
- Support for large datasets (1000+ batches)

---

# Future Expansion

The architecture supports future modules including:

- Shopify integration
- Email notifications
- Mobile barcode scanning
- User permissions
- Supplier management
- Reporting