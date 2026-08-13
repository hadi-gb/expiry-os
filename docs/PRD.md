# ExpiryOS - Product Requirements Document (PRD)

> This document captures ExpiryOS's original product requirements and full
> long-term vision, written before implementation began. Not every item
> below has shipped — see `README.md` for current features and
> `ROADMAP.md` for what's planned next.

## Vision

ExpiryOS is a lightweight expiry operations system built for warehouse and marketing teams using Google Sheets and Google Apps Script.

Its goal is to help businesses identify expiring inventory early, coordinate marketing actions, and maintain a complete history of inventory batches while remaining fast, simple, and easy to customize.

---

## Problem

Most small and medium businesses already have inventory systems.

However, those systems usually do not provide an efficient workflow for managing product expiry dates.

Warehouse teams know what arrived.

Marketing teams know what should be promoted.

But there is no simple operational workflow connecting both teams.

ExpiryOS fills that gap.

---

## Users

### Warehouse

Responsibilities

- Receive inventory
- Scan products
- Enter expiry dates
- Create new batches

---

### Marketing

Responsibilities

- Review expiring batches
- Plan discounts
- Add Shopify tags
- Track campaigns
- Archive completed actions

---

### Managers

Responsibilities

- Monitor KPIs
- View dashboards
- Audit archived batches

---

## Goals

- Extremely fast data entry
- Minimal user training
- Formula-first architecture
- Lightweight Apps Script
- Flexible enough for different businesses

---

## Non Goals

ExpiryOS is NOT:

- A full ERP
- A warehouse management system
- A Shopify replacement
- A purchasing system

---

## Core Workflow

Warehouse

↓

Scan barcode

↓

Existing barcode?

YES

↓

Brand & Product auto-fill

↓

Enter expiry

↓

Batch created

--------------------

NO

↓

Enter Brand

↓

Enter Product

↓

System remembers product

↓

Batch created

---

Marketing

↓

Open Action Center

↓

Review urgent batches

↓

Take action

↓

Archive completed batches

---

Dashboard updates automatically.

---

## MVP Features

- Barcode recognition
- Duplicate batch detection
- Gift set support
- NO BARCODE support
- Batch IDs
- Action Center
- Archive workflow
- Dashboard

---

## Future Features

- Email reminders
- Mobile scanner
- Supplier management
- User permissions
- Reports
- Shopify integration