# Milestone 2 - Expiry Intelligence Engine: Production Test Plan

## Scope

Covers `ExpiryEngine.js`: the `EXPIRY_EARLIEST()` custom function, its
underlying parsing logic (`getEarliestExpiry`, `parseExpiryComponentDate`,
`splitExpiryComponents`), and the `setupEarliestExpiryColumn()` setup
utility. This engine is deliberately generic — it has no concept of "gift
sets," only components with arbitrary free-text labels and dates.

## Prerequisites

- Latest code pushed via `clasp push`.
- `Master Inventory` has an `Earliest Expiry` column immediately after
  `Expiry`, created via `setupEarliestExpiryColumn()`, containing:
  `=EXPIRY_EARLIEST(<Expiry column>2:<Expiry column>)`.
- A few scratch rows to enter test values into, isolated from real data.
- Only `MM-YYYY` (1 or 2 digit month, 4 digit year) is a supported
  per-component date format — not full dates, not other separators.

---

## Date Format Parsing

| ID | Input | Expected earliest expiry |
|---|---|---|
| EE-01 | `1-2026` | January 2026 (`1/1/2026`) |
| EE-02 | `01-2026` | January 2026 — identical result to EE-01 |
| EE-03 | `9-2027` | September 2027 |
| EE-04 | `09-2027` | September 2027 — identical result to EE-03 |
| EE-05 | `12-2027` | December 2027 |

---

## Free-Text Labels (no required delimiter except `/`)

| ID | Input | Expected earliest expiry |
|---|---|---|
| EE-06 | `cream 1-2026` | January 2026 — label with no delimiter at all |
| EE-07 | `cream:1-2026` | January 2026 — label with colon, no spaces |
| EE-08 | `cream : 1-2026` | January 2026 — label with colon and surrounding spaces |
| EE-09 | `Vitamin C Serum 30ml 03-2027` | March 2027 — multi-word label containing a number (`30ml`) that must NOT be mistaken for a date |

EE-06, EE-07, EE-08 must all resolve to the exact same date — the label is never inspected, only ignored.

---

## Multi-Component ("Gift Set") Handling

| ID | Input | Expected earliest expiry |
|---|---|---|
| EE-10 | `Body Lotion:03-2026 / Cleanser 250ml:09-2027 / Moisturizer SPF30:10-2026` | March 2026 (earliest is the **first** component) |
| EE-11 | `gel:09-2027 / cream:01-2026 / lotion:12-2026` | January 2026 (earliest is in the **middle**) |
| EE-12 | `cleanser: 1-2029 / gel: 12-2026 / cream 1-2026` | January 2026 (earliest is the **last** component — this is the exact case that exposed the single-digit month bug; confirms it stays fixed) |
| EE-13 | `01-2025 / 03-2026` (mixed single- and double-digit months across components) | January 2025 — both formats parsed and compared correctly against each other |

---

## Invalid / Malformed Input

| ID | Input | Expected earliest expiry |
|---|---|---|
| EE-14 | `13-2026` (month out of range) | Blank/null — invalid month is rejected, not silently treated as valid |
| EE-15 | `cream:13-2026 / gel:05-2026` | May 2026 — an invalid component is skipped, valid components are still used |
| EE-16 | Completely empty cell | Blank/null, no error |
| EE-17 | `just some text, no date` | Blank/null |
| EE-18 | `cream: / gel:05-2026` (empty/malformed component) | May 2026 — malformed component ignored, doesn't break the whole cell |
| EE-19 | Trailing separator: `gel:05-2026 / ` | May 2026 — trailing empty component after `/` is tolerated |
| EE-20 | Decoy numeric pattern with invalid month before a real date: `SKU 45-9999 Body Lotion 03-2026` | March 2026 — `45-9999`'s month (45) is invalid and skipped in favor of the real date (documents current tolerance; see Known Limitations for the inverse risk) |

---

## Single-Expiry Regression (pre-Milestone-2 rows)

| ID | Input | Expected earliest expiry |
|---|---|---|
| EE-21 | A cell already storing a real `Date` object (date-formatted column, as most Milestone 1 rows have) | Returns that same date directly, unchanged |
| EE-22 | A plain single date with no label and no `/`: `03-2027` | March 2027 — the one-component case of the same general logic, no special-casing needed |

---

## Custom Function Behavior

| ID | Steps | Expected result |
|---|---|---|
| EE-23 | In any cell: `=EXPIRY_EARLIEST("03-2026")` (literal string) | Returns `3/1/2026` |
| EE-24 | In any cell: `=EXPIRY_EARLIEST(D11)` where D11 is a populated Expiry cell | Returns the correct earliest date for that cell |
| EE-25 | In the Earliest Expiry column's row 2: `=EXPIRY_EARLIEST(D2:D)` (bare range, no `ARRAYFORMULA`, no `IF`) | Spills correctly down the whole column, one result per row, blanks for blank Expiry cells |
| EE-26 | Try `=ARRAYFORMULA(IF(D2:D="", "", EXPIRY_EARLIEST(D2:D)))` | **Expected to leave the column blank** — this combination is confirmed broken (custom function output doesn't propagate through `IF` inside `ARRAYFORMULA`) and is intentionally not the supported pattern; see Known Limitations |

---

## Setup Utility (`setupEarliestExpiryColumn`)

| ID | Steps | Expected result |
|---|---|---|
| EE-27 | Run on a sheet with no `Earliest Expiry` column yet | Column is created immediately after `Expiry`, headed `Earliest Expiry`, with the correct formula in row 2 |
| EE-28 | Run it again immediately after EE-27 | No duplicate column created; formula in row 2 is simply rewritten (idempotent) |
| EE-29 | Manually type a value (e.g. `test`) into row 2 of Earliest Expiry, then re-run the setup function | Throws a clear error ("already contains a manually entered value") and does **not** overwrite the cell |
| EE-30 | Manually put an unrelated formula (e.g. `=TODAY()`) into row 2, then re-run | Throws a clear error ("already contains a different formula") and does not overwrite |
| EE-31 | Insert a new column before `Expiry` (shifting its position), then re-run the setup function | Formula regenerates referencing the Expiry column's *new* letter — no hardcoded reference breaks |

---

## Known Limitations (by design, not bugs)

- **`ARRAYFORMULA(IF(..., EXPIRY_EARLIEST(...)))` is unsupported.** Only a bare `=EXPIRY_EARLIEST(range)` call is guaranteed to work; this is what `setupEarliestExpiryColumn()` generates.
- **No delimiter required between a label and its date** means a product name that coincidentally contains a valid-looking `M(M)-YYYY` pattern (e.g. a SKU like `05-2099`) could be misread as a date. There's no way to distinguish this from a real date once the colon requirement is removed — accepted trade-off for warehouse data-entry speed.
- **Only `MM-YYYY`/`M-YYYY` is supported** — no other date formats, no full dates within composite text (a `Date`-typed single-expiry cell is the one exception, handled directly).
- **Duplicate Detection is unaffected by this milestone** — it still does exact-string comparison on the raw Expiry cell, not the parsed earliest date, per the earlier explicit decision to keep Multi-Expiry logic out of that feature.

## Out of Scope for This Test Pass

- Status, Priority, Dashboard, Sorting, and Alerts features (not yet built — they will consume the Earliest Expiry column once implemented).
- Any change to Duplicate Detection's matching behavior.
