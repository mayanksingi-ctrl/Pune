// ============================================================================
// Pune Dashboard - core data logic (filtering + aggregation)
// Deliberately simpler than the Gujarat version: Pune's source data has no
// Focus Account / KOP Account / RSM / Leads join, so there is no coverage,
// scheme-points, or pro-rata section here - only what the data actually has.
// ============================================================================

const YEARS = ['23-24', '24-25', '25-26', '26-27'];

function prepareRows(raw) {
  return raw.map(r => ({
    gstin: (r['BA GSTIN'] || '').toString().trim().toUpperCase(),
    baType: r['BA Type'],
    segment: (r['BA Segment'] || '(Blank)').toString().trim(),
    district: r['District'],
    cluster: r['Cluster'],
    loyalty: r['Loyalty'] || '(Blank)',
    productCategory: r['Brand MIS Group'],
    localityCategory: r['Locality Category'] || 'Not classified',
    leads: toNum(r['Leads Generated']),
    rsmTracked: r['Focus: GSTIN (revised - Final_Focus_Outlets_Pune_PCMC_Kolhapur_OEM.xlsx, GST-matched)'] === 'Yes',
    rsmQty: toNum(r['RSM: Sale Qty (Sep 26 YTD)']),
    pipelineLeads: toNum(r['Lead Pipeline: Total Leads']),
    pipelineWon: toNum(r['Lead Pipeline: Closed Won']),
    rsmPoints: toNum(r['RSM: Points Earned (Sep 26 YTD)']),
    y1: toNum(r['23-24']), y2: toNum(r['24-25']), y3: toNum(r['25-26']), y4: toNum(r['26-27']),
  }));
}

function toNum(v) {
  if (v === null || v === undefined || v === '' || v === 'None') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

// ---------------- filtering ----------------
function matchesFilters(r, f) {
  if (f.baType !== '(All)' && r.baType !== f.baType) return false;
  if (f.segment !== '(All)' && r.segment !== f.segment) return false;
  if (f.loyalty !== '(All)' && r.loyalty !== f.loyalty) return false;
  if (f.productCategory !== '(All)' && r.productCategory !== f.productCategory) return false;
  if (f.localityCategory !== '(All)' && r.localityCategory !== f.localityCategory) return false;
  if (f.locality !== '(All)' && r.cluster !== f.locality) return false;
  if (f.focusAccount === 'Yes' && !r.rsmTracked) return false;
  if (f.focusAccount === 'No' && r.rsmTracked) return false;
  return true;
}

function applyFilters(rows, f) {
  return rows.filter(r => matchesFilters(r, f));
}

// ---------------- district table ----------------
function districtTable(rows, prorataFactor) {
  const byDistrict = new Map();
  for (const r of rows) {
    if (!byDistrict.has(r.district)) {
      byDistrict.set(r.district, {
        district: r.district, gst: new Set(),
        dcY: [new Set(), new Set(), new Set(), new Set()],
        qty: [0, 0, 0, 0],
      });
    }
    const d = byDistrict.get(r.district);
    d.gst.add(r.gstin);
    const ys = [r.y1, r.y2, r.y3, r.y4];
    ys.forEach((y, i) => { if (y !== null) { d.dcY[i].add(r.gstin); d.qty[i] += y; } });
  }
  const out = [];
  for (const d of byDistrict.values()) {
    const totalQty = d.qty.reduce((a, b) => a + b, 0);
    if (totalQty === 0) continue;
    out.push({
      district: d.district, dc: d.dcY.map(s => s.size), dcTotal: d.gst.size,
      qty: d.qty, totalQty,
      growth: [pctGrowth(d.qty[0], d.qty[1]), pctGrowth(d.qty[1], d.qty[2]),
               prorataGrowth(d.qty[2], d.qty[3], prorataFactor)],
    });
  }
  out.sort((a, b) => b.totalQty - a.totalQty);
  return out;
}

function pctGrowth(prev, cur) { return !prev ? null : (cur - prev) / prev; }

// pro-rata adjusted growth for the 25-26 -> 26-27 comparison specifically: 26-27 is a
// partial year, so comparing it against a FULL 25-26 year understates performance. Compare
// against a pro-rated slice of 25-26 instead (same days-elapsed logic as the Gujarat workbook).
function prorataGrowth(qty2526, qty2627, factor) {
  if (!qty2526) return null;
  const prorated = qty2526 * factor;
  if (!prorated) return null;
  return (qty2627 - prorated) / prorated;
}

function grandTotal(table) {
  const qty = [0, 0, 0, 0];
  table.forEach(d => d.qty.forEach((q, i) => qty[i] += q));
  return { qty, totalQty: qty.reduce((a, b) => a + b, 0) };
}

// ---------------- locality table (Pune's real granularity - 315 localities) ----------------
function localityTable(rows) {
  const byLoc = new Map();
  for (const r of rows) {
    if (!byLoc.has(r.cluster)) {
      byLoc.set(r.cluster, { locality: r.cluster, localityCategory: r.localityCategory,
                              gst: new Set(), qty: [0, 0, 0, 0] });
    }
    const d = byLoc.get(r.cluster);
    d.gst.add(r.gstin);
    const ys = [r.y1, r.y2, r.y3, r.y4];
    ys.forEach((y, i) => { if (y !== null) d.qty[i] += y; });
  }
  const out = [];
  for (const d of byLoc.values()) {
    const totalQty = d.qty.reduce((a, b) => a + b, 0);
    if (totalQty === 0) continue;
    out.push({ locality: d.locality, localityCategory: d.localityCategory,
               baCount: d.gst.size, qty: d.qty, totalQty });
  }
  out.sort((a, b) => b.totalQty - a.totalQty);
  return out;
}

// ---------------- segment summary (no Focus/KOP data exists for Pune, so no coverage/points/
// leads columns - but the driver text itself is a reference concept, not something that needs
// live data, so it's included for structural parity with the Gujarat dashboard) ----------------
const SEGMENT_DRIVERS = {
  'R1': 'Focus account coverage, scheme point achievement and lead/specification',
  'R2': 'Focus account coverage, scheme point achievement and lead/specification',
  'S1': 'Focus account coverage, scheme point achievement and lead/specification',
  'S2': 'Focus account coverage, scheme point achievement and lead/specification',
  'Kitchen': 'Focus account coverage, scheme point achievement and lead/specification',
  'Office Furniture': 'Focus account coverage and lead/specification',
  'Doors': 'Focus account coverage and lead/specification',
  'HOME FRUN.': 'Focus account coverage',
  'Turnkey Contractor': 'Focus account coverage and lead/specification',
  'COMMERCIAL PRJ.': 'Focus account coverage and lead/specification',
  'FSU CONTRACTORS': 'Focus account coverage and lead/specification',
  '(Blank)': 'Not yet segment-tagged - no driver assigned',
};

function segmentTable(rows) {
  const bySeg = new Map();
  for (const r of rows) {
    if (!bySeg.has(r.segment)) bySeg.set(r.segment, { segment: r.segment, gst: new Set(), qty: [0, 0, 0, 0],
                                                        leadsByGst: new Map(), rsmQtyByGst: new Map(),
                                                        focusGst: new Set(), pipelineByGst: new Map(), pointsByGst: new Map() });
    const d = bySeg.get(r.segment);
    d.gst.add(r.gstin);
    const ys = [r.y1, r.y2, r.y3, r.y4];
    ys.forEach((y, i) => { if (y !== null) d.qty[i] += y; });
    // a BA can appear on multiple transaction rows (different years/product lines); its lead
    // count is a per-BA figure from the source leads file, so it must be attributed once per
    // distinct GSTIN here, never summed once per row, or it would be double- or triple-counted.
    if (r.leads !== null) d.leadsByGst.set(r.gstin, r.leads);
    if (r.rsmTracked && r.rsmQty !== null) d.rsmQtyByGst.set(r.gstin, r.rsmQty);
    if (r.rsmTracked) d.focusGst.add(r.gstin);
    if (r.rsmTracked && r.pipelineLeads !== null) d.pipelineByGst.set(r.gstin, { leads: r.pipelineLeads, won: r.pipelineWon || 0 });
    if (r.rsmPoints !== null) d.pointsByGst.set(r.gstin, r.rsmPoints);
  }
  const out = [];
  for (const d of bySeg.values()) {
    const totalQty = d.qty.reduce((a, b) => a + b, 0);
    const leadsTotal = [...d.leadsByGst.values()].reduce((a, b) => a + b, 0);
    const rsmQtyTotal = [...d.rsmQtyByGst.values()].reduce((a, b) => a + b, 0);
    const pipelineLeadsTotal = [...d.pipelineByGst.values()].reduce((a, b) => a + b.leads, 0);
    const pipelineWonTotal = [...d.pipelineByGst.values()].reduce((a, b) => a + b.won, 0);
    const pointsTotal = [...d.pointsByGst.values()].reduce((a, b) => a + b, 0);
    // Focus Accounts now come from the revised Focus Accounts list (GST-matched from
    // Final_Focus_Outlets_Pune_PCMC_Kolhapur_OEM.xlsx), not the old RSM-tracking proxy - this
    // is a genuine, much larger population (665 GSTINs) than the earlier 44-account stand-in.
    // Covered = Focus Accounts and Coverage % = 100% by the same construction as before: every
    // account on this list is treated as covered by definition, not separately measured.
    const focusAccounts = d.focusGst.size;
    const coveragePct = focusAccounts > 0 ? 1 : null;
    const driver = SEGMENT_DRIVERS[d.segment] || '(no driver on file for this segment name)';
    const hasCoverageParam = /coverage/.test(driver);
    const hasPointsParam = /point/.test(driver);
    const hasLeadsParam = /lead/.test(driver);
    const leadsForAchievement = d.leadsByGst.size > 0 ? leadsTotal : null;
    const checks = [];
    if (hasCoverageParam) checks.push((coveragePct || 0) > 0);
    if (hasPointsParam) checks.push(pointsTotal > 0);
    if (hasLeadsParam) checks.push((leadsForAchievement || 0) > 0);
    const achieved = checks.length > 0 ? checks.every(c => c) : null;
    out.push({
      segment: d.segment, driver,
      baCount: d.gst.size, qty: d.qty, totalQty,
      focusAccounts: focusAccounts, covered: focusAccounts, coveragePct,
      kopAchieved: d.pointsByGst.size > 0 ? pointsTotal : null, kopTarget: null, pointsPct: null,
      leads: leadsForAchievement,
      rsmQty: d.rsmQtyByGst.size > 0 ? rsmQtyTotal : null,
      pipelineLeads: d.pipelineByGst.size > 0 ? pipelineLeadsTotal : null,
      pipelineWon: d.pipelineByGst.size > 0 ? pipelineWonTotal : null,
      hasCoverageParam, hasPointsParam, hasLeadsParam, achieved,
    });
  }
  out.sort((a, b) => b.totalQty - a.totalQty);
  return out;
}

// ---------------- developer lookup (sparse - only pulled for a few localities) ----------------
function developersFor(locality, devData) {
  if (!locality || locality === '(All)') return null;
  const match = devData.find(d => d.locality === locality);
  if (!match) return { locality, devs: [], pulled: false };
  return { locality, devs: match.devs, pulled: match.devs.length > 0 };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { prepareRows, applyFilters, districtTable, grandTotal, localityTable, segmentTable,
                      developersFor, prorataGrowth, matchesFilters };
}
