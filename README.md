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

## Checking you're on the current build

The bottom-right of the page header shows a small "build" date/letter (e.g.
"build 2026-09-15-c"). If a fix described in this README doesn't seem to
be there, check that marker first — a hard refresh (Ctrl/Cmd+Shift+R) or
clearing the browser cache for localhost will usually resolve it, since
this is otherwise identical to a previous build with the same file names.

## Fixed since first published

The growth% heat map coloring had a bug: it scaled colors relative to
whichever min/max happened to be in the current filtered view, so if every
visible district had negative growth, the "least negative" one could still
render green. Fixed to anchor the color scale at a true 0% — negative
values now always render somewhere in the red-to-amber range, never green.

Also: the Locality dropdown didn't narrow when you picked a Locality
Category — it always showed the full list of ~315 localities regardless.
Fixed to rebuild its options against the selected category (and reset to
"(All)" if your previous pick isn't valid in the new category). Confirmed:
"Hotspot - High value" now correctly narrows to just Wakad.

## Verified against known figures before publishing

- Grand Total: 2,495,953 (matches the figure established when this project
  first built the Pune summary)
- Distinct BAs: 2,987
- Segment totals sum exactly to the Grand Total
- Filtering by segment (R1) and by locality (Wakad) both tested and matched
  independently-computed values
- Developer lookup tested against both a "pulled" locality (Wakad, Ambegaon)
  and an "unpulled" one (Kalewadi) — both render correctly
- Fixed a leftover bug in the map file: its initial view was centred on
  Gujarat's coordinates (22.3, 72.7), not Pune's — corrected to Pune's own
  coordinates (18.52, 73.85)
- The growth% columns in the Revenue table use a genuine heat-map background
  gradient, matching the Excel convention

## Pro-rata growth (25-26 \u2192 26-27), same fix applied to the Gujarat workbook

FY26-27 is a partial year, so comparing it directly against a full FY25-26
year understates performance. The dashboard now has an editable "FY26-27
data captured through" date; the 25-26 \u2192 26-27 growth column compares
26-27's actual figure against a pro-rated slice of 25-26 (assuming even
monthly spread) rather than the full year. Tested: with the default 20-Aug-2026
date, Pune's raw (unadjusted) degrowth of -70.0% becomes a pro-rata-adjusted
-23.0% \u2014 a materially different, more honest read of performance.
Changing the date recalculates live.

## Leads data added (from Pune_Leads_working_copy.xlsx)

The uploaded leads file has three sheets. Only one could be reliably joined
to specific BAs:

- **"Supplier wise Leads of Humrahi"** is keyed by GSTIN — joined directly
  against BA GSTIN in Detailed Sheet-Pune. 90 of the sheet's 111 GSTINs
  matched an actual Pune BA (the rest presumably belong to other
  branches/cities); those 90 BAs' lead counts are now in Detailed Sheet-Pune
  as new "Leads Generated" / "Leads Source" columns, and the segment table's
  Leads column shows real numbers for the first time (288 total across the
  90 matched BAs).
- **"Humrahi Leads as peraccountUser"** and **"Emeraldz Lead as per contact
  Mb"** are keyed by Salesforce Account ID and mostly list individual
  contacts (architects, interior designers) rather than BAs directly. Name
  matching against BA Name found only ~4% overlap even after normalizing
  for case and punctuation — not reliable enough to attribute to specific
  BAs without an Account ID → BA GSTIN crosswalk, which doesn't exist for
  Pune. These two sheets are not joined in. If a crosswalk exists, send it
  and these ~850 additional contact-based leads can be added the same way.

A technical note worth knowing: 90 distinct GSTINs appear on 444 separate
rows in Detailed Sheet-Pune (a BA can have one row per year/product line).
The lead count is attributed once per distinct BA GSTIN, not once per row,
so it can't be double- or quadruple-counted by summing the column directly
in Excel — the dashboard's own aggregation handles this correctly, but a
manual SUM() over the raw column would overstate the total.

## Sales Officer performance added (from Proejct_Review_Data___West_II.xlsx)

A new section shows Sales Officer / Branch performance for Pune — 26 SOs,
filtered from the West II upload's 43 rows to Branch = Pune. Static
reference, not filter-driven (visit/pipeline targets aren't something that
logically filters by BA Segment or Locality). Columns: All Accounts, Total
Visits, Visit Ach% (the file's own PJP-based metric), Focus Accounts, Focus
Visits, Focus Ach%, and Sep'26 Target/Achievement/Ach% (the last calculated
here as Achievement ÷ Target). Sorted by Sep'26 Ach% descending, same
heat-map treatment as the rest of the dashboard.

Gujarat's equivalent section derives a Zone for each SO by matching their
name to an Account Manager in the Focus Accounts sheet. That's not possible
here — Pune has no Focus Accounts / Account Manager sheet to derive a Zone
from — so this section has no geographic breakdown. Noted directly on the
card so it isn't mistaken for an oversight.

## RSM Tracked / RSM Qty added (from RSM_Review_Master___West_II.xlsx)

New "RSM Tracked" and "RSM Qty (Sep 26 YTD)" columns in the segment table —
44 of Pune's 2,987 BAs appear in this extract, matched by GSTIN (99.95% GST
fill rate in the source file). Sale Qty totals sum exactly to 138,719 across
those 44 accounts.

**This is genuinely different from Gujarat's Focus Coverage, not just a
renamed version of it — worth understanding why.** Gujarat's Focus Coverage
answers "of the accounts we already designated as Focus targets, how many
are actually billing?" — it requires a Focus Accounts list to know who was
targeted in the first place. Pune has no such list, so there's no way to
know which accounts were ever meant to be a focus. "RSM Tracked" only
answers "which accounts happen to appear in RSM's own extract?" — it says
nothing about whether they were targeted or not. A high RSM Tracked count
doesn't mean good focus coverage; it just means those accounts showed up
in this particular dataset.

One more caveat worth flagging: the source file labels its current-period
data "FY25~26", which is confirmed (via an exact match on a known Gujarat
account) to actually correspond to this project's 26-27 year — a labeling
quirk in the source RSM system, not an error. That calibration is assumed
to hold for this Pune/West II file too, since it's the same source system,
but wasn't independently re-verified with the same precision for Pune
specifically (no equivalent exact-match test case was available).

## Focus Accounts / Covered / Coverage % now populated (by instruction)

By explicit instruction, the 44 Pune BAs appearing in RSM_Review_Master
(West II, GSTIN-matched) are now treated as this dashboard's default Focus
Accounts list. Focus Accounts, Covered, and Coverage % show real numbers
for the first time — 44 total, matching the count established when this
data was first added.

Worth understanding precisely what this means: since inclusion in the RSM
extract requires actual confirmed billing, **Covered always equals Focus
Accounts, and Coverage % is 100% for every segment with any Focus
Accounts** — this is a direct, mechanical consequence of the definition
("focus" and "covered" are the same 44 accounts by construction), not a
separately measured result the way Gujarat's Coverage % is (where Focus
Accounts and billing coverage come from two independent sources and can
genuinely differ). Scheme Points columns remain N/A — there's still no
KOP-Q2-style target file for Pune to compute those from.

## Updating the data

Edit `Pune_Summary_Data.xlsx`'s "Detailed Sheet-Pune" tab directly, save,
refresh the browser. If you rename a column, update the matching field name
near the top of `pune_logic.js`.
