// ============================================================================
// Gujarat Dashboard - core data logic (filtering + aggregation)
// This module is deliberately dependency-free plain JS so it can be tested
// with plain Node.js before being embedded in the browser-facing HTML.
// ============================================================================

const YEARS = ['23-24', '24-25', '25-26', '26-27'];
const SEG_MERGE = { 'PMC': 'Project/Contractor', 'Project': 'Project/Contractor', 'Contractor': 'Project/Contractor' };

function prepareRows(raw) {
  return raw
    .map(r => {
      const seg = (r['BA Segment'] || '(Blank)').toString().trim();
      return {
        gstin: (r['BA GSTIN'] || '').toString().trim().toUpperCase(),
        baType: r['BA Type'],
        segment: SEG_MERGE[seg] || seg,
        zone: r['Zone'],
        cluster: r['Cluster'],
        district: r['District'],
        loyalty: r['Loyalty'] || '(Blank)',
        localityCategory: r['Locality Category'] || 'Not classified',
        y1: toNum(r['23-24']), y2: toNum(r['24-25']), y3: toNum(r['25-26']), y4: toNum(r['26-27']),
        isFocus: r['Focus: Unique Account ID'] != null && r['Focus: Unique Account ID'] !== '',
        isKop: r['KOP: SO'] != null && r['KOP: SO'] !== '',
        kopAchieved: toNum(r['KOP: Achieved Points']),
        kopSlab1: toNum(r['KOP: Slab 1 Points Trgt']),
        rsmSaleQty: r['RSM: Sale Qty (Aug 26 YTD)'],
        leadsGenerated: toNum(r['Leads: Generated (from Data_of_Leads_Gujarat)']),
      };
    })
    .filter(r => r.segment !== 'End User');
}

function toNum(v) {
  if (v === null || v === undefined || v === '' || v === 'None') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function focusCoverage(r) {
  if (!r.isFocus) return 'n/a';
  return (r.rsmSaleQty != null && r.rsmSaleQty !== '' && r.rsmSaleQty !== 'None') ? 'Yes' : 'No';
}

// ---------------- filtering ----------------
function matchesFilters(r, f) {
  if (f.zone !== '(All)' && r.zone !== f.zone) return false;
  if (f.baType !== '(All)' && r.baType !== f.baType) return false;
  if (f.segment !== '(All)' && r.segment !== f.segment) return false;
  if (f.loyalty !== '(All)' && r.loyalty !== f.loyalty) return false;
  if (f.focusAccount !== '(All)') {
    const want = f.focusAccount === 'Yes';
    if (r.isFocus !== want) return false;
  }
  if (f.kopAccount !== '(All)') {
    const want = f.kopAccount === 'Yes';
    if (r.isKop !== want) return false;
  }
  if (f.localityCategory !== '(All)' && r.localityCategory !== f.localityCategory) return false;
  if (f.selectedLocalities && f.selectedLocalities.length > 0) {
    if (!f.selectedLocalities.includes(r.cluster)) return false;
  }
  if (f.focusCoverage !== '(All)' && focusCoverage(r) !== f.focusCoverage) return false;
  return true;
}

function applyFilters(rows, f) {
  return rows.filter(r => matchesFilters(r, f));
}

// ---------------- district (revenue) table ----------------
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
    ys.forEach((y, i) => {
      if (y !== null) { d.dcY[i].add(r.gstin); d.qty[i] += y; }
    });
  }
  const out = [];
  for (const d of byDistrict.values()) {
    const totalQty = d.qty.reduce((a, b) => a + b, 0);
    if (totalQty === 0) continue;
    out.push({
      district: d.district,
      dc: d.dcY.map(s => s.size),
      dcTotal: d.gst.size,
      qty: d.qty,
      totalQty,
      growth: [pctGrowth(d.qty[0], d.qty[1]), pctGrowth(d.qty[1], d.qty[2]),
               prorataGrowth(d.qty[2], d.qty[3], prorataFactor)],
    });
  }
  out.sort((a, b) => b.totalQty - a.totalQty);
  return out;
}

function pctGrowth(prev, cur) {
  if (!prev) return null;
  return (cur - prev) / prev;
}

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

// ---------------- segment compliance table ----------------
const SEGMENT_DRIVERS = {
  'Architect': 'Focus account coverage, Emeraldz point achievement and leads',
  'Builder': 'Focus account coverage and lead/specification',
  'Carpenter': 'Focus account coverage, Humrahi scheme points achievement and lead/specification',
  'Company': 'Focus account coverage and lead/specification',
  'Door': 'Focus account coverage and lead/specification',
  'Home Furniture': 'Focus account coverage',
  'Kitchen': 'Focus account coverage, scheme point achievement and lead/specification',
  'Office Furniture': 'Focus account coverage and lead/specification',
  'Project/Contractor': 'Focus account coverage, Humrahi scheme points achievement and lead/specification',
  'R1': 'Focus account coverage, scheme point achievement and lead/specification',
  'R2': 'Focus account coverage, scheme point achievement and lead/specification',
  'S1': 'Focus account coverage, scheme point achievement and lead/specification',
  'S2': 'Focus account coverage, scheme point achievement and lead/specification',
};

function segmentTable(rows) {
  const out = [];
  for (const [segment, driver] of Object.entries(SEGMENT_DRIVERS)) {
    const segRows = rows.filter(r => r.segment === segment);
    const focusRows = segRows.filter(r => r.isFocus && [r.y1, r.y2, r.y3, r.y4].some(y => y !== null));
    const focusAccountsSet = new Set(focusRows.map(r => r.gstin));
    const coveredSet = new Set(focusRows.filter(r => focusCoverage(r) === 'Yes').map(r => r.gstin));
    let kopAchieved = 0, kopTarget = 0;
    if (/scheme point achievement/.test(driver) && !/Humrahi/.test(driver)) {
      const seen = new Set();
      for (const r of segRows) {
        if (r.isKop && !seen.has(r.gstin)) {
          seen.add(r.gstin);
          kopAchieved += r.kopAchieved || 0;
          kopTarget += r.kopSlab1 || 0;
        }
      }
    }
    let leads = 0, leadAccts = 0;
    if (/lead/.test(driver)) {
      const seen = new Set();
      for (const r of segRows) {
        if (r.leadsGenerated && !seen.has(r.gstin)) {
          seen.add(r.gstin);
          leads += r.leadsGenerated;
          leadAccts++;
        }
      }
    }
    out.push({
      segment, driver,
      focusAccounts: focusAccountsSet.size,
      covered: coveredSet.size,
      coveragePct: focusAccountsSet.size ? coveredSet.size / focusAccountsSet.size : null,
      kopAchieved, kopTarget,
      pointsPct: kopTarget ? kopAchieved / kopTarget : null,
      leads, leadAccts,
    });
  }
  return out;
}

// ---------------- dependence blocks (Focus / KOP) ----------------
function dependenceBlock(rows, flagField) {
  const byYear = [0, 1, 2, 3].map(() => ({ flagged: 0, other: 0 }));
  for (const r of rows) {
    const ys = [r.y1, r.y2, r.y3, r.y4];
    ys.forEach((y, i) => {
      if (y === null) return;
      if (r[flagField]) byYear[i].flagged += y; else byYear[i].other += y;
    });
  }
  return byYear.map(b => ({ flagged: b.flagged, other: b.other, total: b.flagged + b.other,
                             share: (b.flagged + b.other) ? b.flagged / (b.flagged + b.other) : null }));
}

// ---------------- developer lookup (sparse - only pulled for a couple localities) ----------------
function developersFor(locality, devData) {
  if (!locality || locality === '(All)') return null;
  const match = devData.find(d => d.locality === locality);
  if (!match) return { locality, devs: [], pulled: false };
  return { locality, devs: match.devs, pulled: match.devs.length > 0 };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { prepareRows, applyFilters, districtTable, grandTotal, segmentTable,
                      dependenceBlock, focusCoverage, prorataGrowth, developersFor, matchesFilters };
}
