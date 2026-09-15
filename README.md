# Pune City Summary — web dashboard

Same approach as the Gujarat dashboard, scoped to Pune only. This is
deliberately a **simpler** dashboard than Gujarat's — Pune's source data was
never joined to Focus Accounts, KOP-Q2, RSM Review, or the leads extract, so
there is no coverage / scheme-points / pro-rata section here. What's below
reflects exactly what exists in the Pune data, nothing invented to match
Gujarat's feature list.

## What's inside

- `index.html` — the dashboard page
- `pune_logic.js` — the calculation engine (filtering, aggregation), kept
  separate so it can be tested independently, same as Gujarat's
- `Pune_Summary_Data.xlsx` — the data source. **Edit this directly** (the
  "Detailed Sheet-Pune" tab) and refresh the browser — no rebuild needed.
- `Pune_Hotspot_Map_v2.html` — the interactive Pune hotspot map, embedded inline.

## Running it

Same rule as the Gujarat package: **double-clicking `index.html` will not
work.** Browsers block local file reads for security. Serve the folder with
a one-line local server:

**Python:**
```
cd path/to/this/folder
python3 -m http.server 8000
```
Then open **http://localhost:8000**.

**Node.js:**
```
npx serve .
```

**VS Code:** right-click `index.html` → "Open with Live Server".

## What's shown

- **Filters:** BA Type, BA Segment, Loyalty, Product Category, Locality
  Category, Locality — matching the six filters on the original Pune Summary
  sheet. There is no Zone filter, since Pune's data is scoped to a single
  zone ("Pune City") already.
- **Revenue by District** — Pune's data only has two districts (Pune,
  Lonavala), so this table is small; it's kept for structural parity with
  the Gujarat version.
- **Top localities** — the more useful granularity for Pune, since almost
  everything sits in "Pune" district. Shows the top 25 by sale quantity,
  each tagged with its Locality Category (Hotspot High/Medium value, Area of
  Interest, Not classified).
- **BA Segment process-input reference** — segment, BA count, total qty,
  *plus* a Sales Driver reference column (same framework as Gujarat's: Focus
  account coverage, scheme point achievement, lead/specification), adapted
  to Pune's own segment names. This is descriptive reference text only, not
  a computed metric — same as how Gujarat's own Sales Driver column was
  always a fixed list, not filter-driven. No Coverage %, Scheme Points, or
  Leads columns, for the reason below.
- **Developers** — appears once you pick a specific Locality in the filter
  bar. Real data from the Developers tab in Pune_Summary_Data.xlsx, but very
  sparse: only 4 of 315 localities have been pulled so far (Wakad, Katraj,
  Ambegaon, Hinjewadi). Everything else correctly shows "not pulled yet"
  rather than inventing data.
- **Map** — the existing interactive Pune hotspot map. This had a genuine
  bug (a JavaScript syntax error in its legend code, left over from an
  earlier edit) that silently broke the *entire* map, not just the legend —
  fixed and verified with `node --check` before this package was built.

## What's deliberately NOT here, and why

Gujarat's dashboard has a Focus Account / KOP Account compliance section
(coverage %, scheme points, leads-per-segment) and live Focus/KOP dependence
diagnostics. **The process-input table now has the identical column
structure as Gujarat's** (Focus Accounts, Covered, Coverage %, Scheme Points
Achieved, Scheme Points Target, Scheme Points %, Leads) — but every one of
those columns shows N/A for Pune, because the underlying source data was
never collected for Pune: no Focus Accounts list, no KOP-Q2 target sheet,
no RSM Review extract, no leads file.

One thing worth flagging explicitly: **a file called
`Main-Pune_Branch_Summary.xlsx` does contain sheets named "Focus Accounts"
and "KOP-Q2-Gujarat"**, which looks at first glance like exactly what's
missing. On inspection, though, those sheets are an exact, unedited copy of
Gujarat's own data — identical GSTINs, identical account names, identical
KOP point targets, row for row. It's a leftover template artifact, not
Pune-specific data, so it is deliberately not used here — using it would
mean mislabeling Gujarat's real focus accounts as if they were Pune's,
which is worse than showing nothing.

If genuine Pune-equivalent versions of any of those four source files exist
somewhere, send them and this table will compute real numbers instead of
N/A, exactly the way it does for Gujarat.

## Verified against known figures before publishing

- Grand Total: 2,495,953 (matches the figure established when this project
  first built the Pune summary)
- Distinct BAs: 2,987
- Segment totals sum exactly to the Grand Total
- Filtering by segment (R1) and by locality (Wakad) both tested and matched
  independently-computed values
- Developer lookup tested against both a "pulled" locality (Wakad, Ambegaon)
  and an "unpulled" one (Kalewadi) — both render correctly

## Updating the data

Edit `Pune_Summary_Data.xlsx`'s "Detailed Sheet-Pune" tab directly, save,
refresh the browser. If you rename a column, update the matching field name
near the top of `pune_logic.js`.
