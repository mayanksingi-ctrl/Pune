# Gujarat District Summary — web dashboard

Same architecture as the Pune dashboard, built for Gujarat's richer data —
Gujarat's Detailed Sheet has the Focus Accounts / KOP-Q2 / RSM Review /
leads extract all joined in, so this dashboard shows the full process-input
compliance table with real numbers, not N/A.

## What's inside

- `index.html` — the dashboard page
- `gujarat_logic.js` — the calculation engine (filtering, aggregation),
  kept separate so it can be tested independently of the browser
- `Gujarat_Summary_Data.xlsx` — the data source. **Edit this directly**
  (the "Detailed Sheet" tab) and refresh the browser — no rebuild step.
- `Gujarat_Hotspot_Map.html` — the interactive Gujarat hotspot map,
  embedded inline
- `gujarat_developers.json` — developer-by-locality lookup, extracted from
  the Developers tab in the xlsx

## Running it

Same rule as the Pune package: **double-clicking `index.html` will not
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

- **Filters:** Zone, BA Type, BA Segment, Loyalty, Focus Account, KOP
  Account, Locality Category, Locality, Focus Coverage — the same nine
  filters as the Excel version. Locality is a single-select dropdown that
  narrows to whichever Locality Category is picked, matching the decision
  made earlier in this project to simplify away from a checkbox-based
  multi-select.
- **FY26-27 pro-rata comparison** — same mechanism as the Excel workbook.
  The 25-26 → 26-27 growth column compares 26-27's actual figure against a
  pro-rated slice of 25-26 (assuming even monthly spread) rather than the
  full year, since 26-27 is still a partial year. Edit the "data captured
  through" date to match your actual cutoff; recalculates live.
- **Revenue by District** — all 29 districts, with growth% columns shown as
  a genuine heat-map background gradient (red → amber → green).
- **Focus account dependence** and **KOP account dependence** — the same
  live diagnostic blocks as the Excel Summary sheet, year by year.
- **BA Segment process-input compliance** — Focus Accounts, Covered,
  Coverage %, Scheme Points Achieved/Target/%, and Leads, computed live
  from the real Focus/KOP-Q2/RSM/leads join in the Detailed Sheet.
- **Developers by locality** — always visible, shows what's been pulled so
  far (currently 2 of 688 localities: Vesu, Adajan) plus locality-specific
  detail when you pick one in the filter bar.
- **Map** — the existing interactive Gujarat hotspot map, needs an internet
  connection for its street tiles.

## Verified against established ground truth before publishing

Every figure below was independently re-derived from the raw Detailed
Sheet data and matched exactly against the numbers already established and
verified in the Excel version of this project:

- Grand Total: 1,041,399
- South Zone Grand Total: 478,375 (tested live via the Zone filter)
- R1 segment: 500 Focus Accounts, 13 Covered, 2,439 of 9,000 scheme points,
  19 leads
- Focus account dependence shares: 78.4% / 85.7% / 88.6% / 87.1%
  (23-24 through 26-27)
- KOP account dependence shares: 7.5% / 10.2% / 18.1% / 15.5%
- Pro-rata growth math cross-checked against the Excel workbook's own
  pro-rata block

## Updating the data

Edit `Gujarat_Summary_Data.xlsx`'s "Detailed Sheet" tab directly (or the
"Developers" tab for the developer lookup), save, refresh the browser.
If you rename a column, update the matching field name near the top of
`gujarat_logic.js`.

## Known limitation

Only the "Detailed Sheet" and "Developers" tabs are read directly. The RSM
reconciliation sheets, KOP-Q2 sheet, and Focus Accounts sheet are not
re-joined live in the browser — their results are already folded into
Detailed Sheet's `KOP:`, `Focus:`, and `RSM:` columns from earlier work on
this project, so editing those columns directly is the way to update that
information here.
