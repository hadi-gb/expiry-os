# Milestone 1 - Master Inventory Foundation: Production Test Plan

## Scope

Covers the three completed features on the `Master Inventory` sheet:

- Batch ID generation
- Product Recognition (Barcode auto-fill)
- Duplicate Detection

NO BARCODE Support and Gift Set / Multi-Expiry Support are **out of scope**
(see bottom) — NO BARCODE's duplicate-key behavior is already exercised
indirectly by the Duplicate Detection cases below, since that logic already
lives in `DuplicateDetectionService.js`.

## Prerequisites

- Latest code pushed via `clasp push`.
- `Master Inventory` sheet header row (row 1) contains at least: `Batch ID`,
  `Barcode`, `Brand`, `Product`, `Expiry`.
- Tester has edit access to the sheet.
- For concurrency cases (BID-09), two separate accounts/browser sessions.
- Clear a scratch block of rows to test in, so results are easy to isolate.

---

## Batch ID

| ID | Steps | Expected result |
|---|---|---|
| BID-01 | Enter a Barcode into a brand-new empty row. | Row gets the next sequential ID, e.g. `BAT-000001`. |
| BID-02 | Add several more rows one at a time. | IDs increment sequentially with no gaps. |
| BID-03 | Manually edit a cell in a row that already has a Batch ID (not the Batch ID cell itself). | Batch ID is unchanged. |
| BID-04 | Try typing directly into an existing Batch ID cell. | Value should not be overwritten by the script on other edits (note: this doesn't prevent a human from manually typing over it — that's a sheet permissions concern, not in scope here). |
| BID-05 | Paste 50-100 new rows at once (Barcode + other fields, no Batch ID). | All get sequential, gap-free IDs in one pass. |
| BID-06 | Note the highest existing Batch ID (e.g. `BAT-000127`), delete that row entirely, then add a new row. | Next ID continues from `BAT-000128` — the deleted number is never reused. |
| BID-07 | Edit a cell in row 1 (the header row). | No error, no ID generated. |
| BID-08 | Edit a cell on a different sheet tab. | Nothing happens. |
| BID-09 | Two testers paste rows into `Master Inventory` at roughly the same time. | No duplicate Batch IDs across both pastes (LockService). |
| BID-10 | Rename the sheet tab with different case or extra spaces (e.g. ` master inventory `), then edit a row. | Still recognized and processed — sheet name matching is case/whitespace-insensitive. |

---

## Product Recognition

| ID | Steps | Expected result |
|---|---|---|
| PR-01 | Enter a Barcode that already exists elsewhere in the sheet, on a row with blank Brand/Product. | Brand and Product auto-fill from the matching row. |
| PR-02 | Enter a Barcode that has never been seen before. | Brand/Product stay blank; manual entry is allowed. |
| PR-03 | Enter a known Barcode on a row where Brand or Product is already manually filled in. | Existing values are not overwritten. |
| PR-04 | Have two or more existing rows share the same Barcode with different Brand/Product values (simulate a correction over time), each with a different Batch ID. | New row auto-fills from whichever existing row has the **highest** Batch ID, not the physically lowest/bottommost row. |
| PR-05 | Sort the sheet by any column, then repeat PR-01. | Still resolves correctly — matching is Batch-ID-based, not row-position-based. |
| PR-06 | Enter a Barcode into a row and check the Barcode column header still resolves if you rename the header with different case/whitespace (e.g. ` barcode `). | Still works — header lookup is normalized. |
| PR-07 | Temporarily rename or delete the `Barcode`, `Brand`, or `Product` header, then edit a Barcode cell. | Throws `Missing required header: <name>` rather than silently failing (check Apps Script execution log). Restore the header afterward. |

---

## Duplicate Detection

| ID | Steps | Expected result |
|---|---|---|
| DD-01 | Create a new row with a Barcode + Expiry that matches an existing row's Barcode + Expiry exactly. | On entering Expiry, a dialog appears: "Duplicate batch detected," showing the existing Batch ID, Barcode, and Expiry (as `dd-MM-yyyy`). |
| DD-02 | Same as DD-01, but the row's Barcode is `NO BARCODE` and Product + Expiry match an existing NO BARCODE row. | Dialog appears using the Product+Expiry match. |
| DD-03 | Trigger a duplicate dialog, click **YES**. | The batch is created as entered; nothing reverts. |
| DD-04 | Trigger a duplicate dialog, click **NO**. | Only the Expiry cell you just edited is cleared/reverted to its prior value — the rest of the row (Barcode, Brand, Product, Batch ID) is untouched. |
| DD-05 | Edit the Expiry on an **existing**, already-complete row so that it now matches another row's Barcode + Expiry. | Dialog appears correctly for edits to existing rows, not just brand-new ones. |
| DD-06 | On an existing duplicate-free row, edit only the Barcode (Expiry unchanged) to a value that would now match another row. | No dialog — by design, Duplicate Detection only triggers on Expiry edits (see "Known limitations"). |
| DD-07 | Paste a range of cells that includes the Expiry column across multiple rows at once. | No dialog for any of the pasted rows — detection is single-cell-edit only. |
| DD-08 | Create a duplicate where the existing row's Expiry is stored as a real Date value, and test again where it's stored as plain text. | Both cases are detected correctly (comparison normalizes Date vs text). |
| DD-09 | Trigger a dialog and confirm the displayed Expiry format. | Shown as `dd-MM-yyyy`, regardless of the underlying cell's storage format. |
| DD-10 | After a dialog appears, check the existing (matched) row. | It is never modified, and the active cell/selection does not jump to it. |
| DD-11 | Create three or more rows that all share the same Barcode + Expiry (simulate re-entry over time with different Batch IDs). | The dialog's "Existing Batch ID" shows the one with the **highest** Batch ID. |
| DD-12 | Regression check for the fixed race condition: type a new Barcode, then immediately (within 1-2 seconds, before Brand/Product visibly finish auto-filling) type a duplicate-triggering Expiry. | Exactly **one** dialog appears, not two. |
| DD-13 | Enter Expiry on a row where Barcode is blank and not `NO BARCODE` (incomplete key). | No dialog — nothing valid to check against yet. |

---

## Known Limitations (by design, not bugs)

- **Expiry-only trigger**: editing Barcode or Product on an existing, already-complete row does not re-run duplicate detection, even if that edit creates a new duplicate. Accepted trade-off based on real warehouse workflow (barcode is a scan, rarely edited after entry).
- **Single-cell edits only**: bulk-pasting Expiry values across many rows at once skips duplicate detection for all of them.
- **Cross-format Expiry edge case**: if one row's Expiry is a Date object and a visually-identical row's Expiry is plain text in a different format, they could fail to match even though they "look" the same.
- **Barcode/NO BARCODE comparison**: barcode values compare via trim only (case-sensitive); the `NO BARCODE` sentinel itself is matched case-insensitively.
- Editing Barcode/Product/Expiry after a manual Brand/Product override elsewhere does not prompt "this batch only vs. all batches" — that's the separate, not-yet-built Product Definition Management feature.

## Out of Scope for This Test Pass

- NO BARCODE Support as a dedicated feature (its duplicate-key behavior is covered above; broader UX/validation around the `NO BARCODE` value itself is not yet built).
- Gift Set / Multi-Expiry Support (not implemented — Expiry is still treated as a single opaque value).
- Product Definition Management (design approved, not yet implemented).
