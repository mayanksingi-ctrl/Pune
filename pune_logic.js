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
  return true;
}

function applyFilters(rows, f) {
  return rows.filter(r => matchesFilters(r, f));
}

// ---------------- district table ----------------
function districtTable(rows) {
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
      growth: [pctGrowth(d.qty[0], d.qty[1]), pctGrowth(d.qty[1], d.qty[2]), pctGrowth(d.qty[2], d.qty[3])],
    });
  }
  out.sort((a, b) => b.totalQty - a.totalQty);
  return out;
}

function pctGrowth(prev, cur) { return !prev ? null : (cur - prev) / prev; }

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

// ---------------- segment summary (no Focus/KOP data exists for Pune) ----------------
function segmentTable(rows) {
  const bySeg = new Map();
  for (const r of rows) {
    if (!bySeg.has(r.segment)) bySeg.set(r.segment, { segment: r.segment, gst: new Set(), qty: [0, 0, 0, 0] });
    const d = bySeg.get(r.segment);
    d.gst.add(r.gstin);
    const ys = [r.y1, r.y2, r.y3, r.y4];
    ys.forEach((y, i) => { if (y !== null) d.qty[i] += y; });
  }
  const out = [];
  for (const d of bySeg.values()) {
    const totalQty = d.qty.reduce((a, b) => a + b, 0);
    out.push({ segment: d.segment, baCount: d.gst.size, qty: d.qty, totalQty });
  }
  out.sort((a, b) => b.totalQty - a.totalQty);
  return out;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { prepareRows, applyFilters, districtTable, grandTotal, localityTable, segmentTable, matchesFilters };
}
