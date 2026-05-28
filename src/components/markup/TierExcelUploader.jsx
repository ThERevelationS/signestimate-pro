import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Upload, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// =============================================================================
// Smart parser for the standard "Pricing Mark-ups and GMs" workbook.
//
// The workbook has 4 sheets — we read tier mark-ups from:
//   • Sheet "Markups and GMs"  (primary — visual tier blocks, 3 tiers per row, 8 total)
//   • Sheet "CB V3 Tiers"      (fallback — simple Tier | Item | Mark-up table)
//
// "Markups and GMs" layout per tier block:
//   Row N:   col_1 "Tier X"     col_2 <tier name (free text)>
//   Row N+1: header: Item | Cost | Mark-up | GM | Retail | Profit
//   Row N+2…N+12: <category name> | 1 | <mark-up multiplier> | …
//
// Generic-template fallback (legacy):
//   Row 0: "Tier #" | "Tier Name" | <category_key 1> | <category_key 2> | …
//   Row 1+: <tier#> | <name> | <mult or %>
// =============================================================================

// Fuzzy match an Excel item label to our MarkupCategory.category_key.
const matchCategoryKey = (label, categories) => {
  if (!label) return null;
  const norm = String(label).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  // 1. Exact category_name match
  for (const c of categories) {
    if (String(c.category_name).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() === norm) return c.category_key;
  }
  // 2. Keyword heuristics matching the standard Excel labels
  const rules = [
    { keys: ['printed vinyl'], cat: 'printed_vinyls' },
    { keys: ['cut vinyl'],      cat: 'cut_vinyls' },
    { keys: ['retail store', 'menards', 'lowes'], cat: 'retail_store' },
    { keys: ['outsourced fabrication', 'sign components'], cat: 'outsourced_fab' },
    { keys: ['led message', 'led board'], cat: 'led_boards' },
    { keys: ['outsourced installation', 'contracted painting'], cat: 'outsourced_install' },
    { keys: ['outsourced professional', 'rentals'], cat: 'outsourced_services' },
    { keys: ['gemini'], cat: 'gemini' },
    { keys: ['substrate'], cat: 'substrates' },
    { keys: ['tradeshow'], cat: 'tradeshow' },
    { keys: ['inhouse labor', 'in house labor', 'install fab', 'install, fab'], cat: 'inhouse_labor' },
    { keys: ['machine time', 'laser', 'cnc'], cat: 'machine_time' },
  ];
  for (const r of rules) {
    if (r.keys.some(k => norm.includes(k))) {
      // make sure the matched category exists in our system
      if (categories.find(c => c.category_key === r.cat)) return r.cat;
    }
  }
  return null;
};

const toMult = (v) => {
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return null;
  // Mark-up values in this workbook are multipliers ABOVE 1 (e.g. 1.75 = 75% markup,
  // 3.0 = 200% markup, 0.91 = -9% which would be a loss — still treat as literal).
  // If someone enters a percent like "75" we assume %.
  return n > 5 ? 1 + n / 100 : n;
};

// Parse the "Markups and GMs" sheet — finds every "Tier X" cell and grabs the
// 11 category rows that follow.
const parseMarkupsAndGMsSheet = (rows, categories) => {
  const tiers = [];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    // Find "Tier N" anywhere in this row
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').trim();
      const tierMatch = cell.match(/^Tier\s+(\d+)$/i);
      if (!tierMatch) continue;

      const tierNum = Number(tierMatch[1]);
      const tierName = String(row[c + 1] || '').trim() || `Tier ${tierNum}`;

      // Next row is the header "Item | Cost | Mark-up | GM | Retail | Profit"
      // starting at the same column. The category column is `c`, mark-up column is `c+2`.
      const itemCol = c;
      const markupCol = c + 2;

      const markups = {};
      // Walk down until we hit a blank item row or another "Tier X"
      for (let rr = r + 2; rr < rows.length; rr++) {
        const itemLabel = String((rows[rr] || [])[itemCol] || '').trim();
        if (!itemLabel) break;
        if (/^Tier\s+\d+$/i.test(itemLabel)) break;
        if (/^item$/i.test(itemLabel)) continue; // duplicate header
        const key = matchCategoryKey(itemLabel, categories);
        if (!key) continue;
        const mult = toMult((rows[rr] || [])[markupCol]);
        if (mult !== null) markups[key] = mult;
      }

      if (Object.keys(markups).length > 0) {
        tiers.push({ tier_number: tierNum, tier_name: tierName, markups, sort_order: tierNum });
      }
    }
  }
  // Dedupe by tier_number — keep the LAST occurrence (later sheets / lower-right tiers win)
  const byNum = new Map();
  tiers.forEach(t => byNum.set(t.tier_number, t));
  return Array.from(byNum.values()).sort((a, b) => a.tier_number - b.tier_number);
};

// Parse the "CB V3 Tiers" sheet — simple Tier | Item | Mark-up table, with the
// item label only appearing on the first row of each tier-group.
const parseCBV3Sheet = (rows, categories) => {
  if (rows.length < 2) return [];
  const header = (rows[0] || []).map(h => String(h || '').toLowerCase().trim());
  const tierIdx   = header.findIndex(h => /^tier$/.test(h));
  const itemIdx   = header.findIndex(h => /^item$/.test(h));
  const markupIdx = header.findIndex(h => /mark.?up/.test(h));
  if (tierIdx === -1 || markupIdx === -1) return [];

  const byTier = new Map();
  let currentItemKey = null;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const tierCell = String(row[tierIdx] || '').trim();
    const itemCell = itemIdx >= 0 ? String(row[itemIdx] || '').trim() : '';
    if (itemCell) {
      const k = matchCategoryKey(itemCell, categories);
      if (k) currentItemKey = k;
    }
    const m = tierCell.match(/Tier\s+(\d+)/i);
    if (!m || !currentItemKey) continue;
    const tierNum = Number(m[1]);
    const mult = toMult(row[markupIdx]);
    if (mult === null) continue;
    const existing = byTier.get(tierNum) || { tier_number: tierNum, tier_name: `Tier ${tierNum}`, markups: {}, sort_order: tierNum };
    existing.markups[currentItemKey] = mult;
    byTier.set(tierNum, existing);
  }
  return Array.from(byTier.values()).sort((a, b) => a.tier_number - b.tier_number);
};

// Legacy template parser (Tier # | Tier Name | <keys...>)
const parseLegacyTemplate = (rows, categories) => {
  if (rows.length < 2) return [];
  const header = rows[0].map(h => String(h).trim());
  const tierNumIdx = header.findIndex(h => /tier\s*#|tier\s*number/i.test(h));
  const tierNameIdx = header.findIndex(h => /tier\s*name/i.test(h));
  if (tierNumIdx === -1 || tierNameIdx === -1) return [];
  const categoryKeys = categories.map(c => c.category_key);
  const colToKey = {};
  header.forEach((h, idx) => {
    if (idx === tierNumIdx || idx === tierNameIdx) return;
    const key = String(h).trim();
    if (categoryKeys.includes(key)) colToKey[idx] = key;
  });

  const tiers = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const tierNum = Number(row[tierNumIdx]);
    const tierName = String(row[tierNameIdx] || '').trim();
    if (!tierNum || !tierName) continue;
    const markups = {};
    for (const [colIdx, key] of Object.entries(colToKey)) {
      const mult = toMult(row[colIdx]);
      if (mult !== null) markups[key] = mult;
    }
    tiers.push({ tier_number: tierNum, tier_name: tierName, markups, sort_order: tierNum });
  }
  return tiers;
};

// Merge parser results — preserve tier name from "Markups and GMs" sheet (richer
// description text), but fill in any missing mark-ups from "CB V3 Tiers".
const mergeTiers = (primary, secondary) => {
  const byNum = new Map();
  primary.forEach(t => byNum.set(t.tier_number, { ...t, markups: { ...t.markups } }));
  secondary.forEach(t => {
    const existing = byNum.get(t.tier_number);
    if (!existing) { byNum.set(t.tier_number, { ...t, markups: { ...t.markups } }); return; }
    Object.entries(t.markups).forEach(([k, v]) => {
      if (existing.markups[k] === undefined) existing.markups[k] = v;
    });
  });
  return Array.from(byNum.values()).sort((a, b) => a.tier_number - b.tier_number);
};

export default function TierExcelUploader({ categories, onImport }) {
  const inputRef = useRef(null);
  const [parsing, setParsing] = useState(false);
  const { toast } = useToast();

  const handleDownloadTemplate = () => {
    const header = ['Tier #', 'Tier Name', ...categories.map(c => c.category_key)];
    const subheader = ['', '(category labels:)', ...categories.map(c => c.category_name)];
    const sample = [1, 'General Public', ...categories.map(() => 1.5)];
    const ws = XLSX.utils.aoa_to_sheet([header, subheader, sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tier Markups');
    XLSX.writeFile(wb, 'tier_markups_template.xlsx');
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);

      const readSheet = (name) => {
        const ws = wb.Sheets[name];
        if (!ws) return null;
        return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      };

      // Find sheets by name (case-insensitive fuzzy)
      const findSheet = (re) => wb.SheetNames.find(n => re.test(n));
      const mgName  = findSheet(/markups?\s*(and|&)\s*gms?/i);
      const cbName  = findSheet(/cb\s*v\s*3|cb_?v3|corebridge/i);

      let primary = [];
      let secondary = [];
      let source = 'unknown';

      if (mgName) {
        primary = parseMarkupsAndGMsSheet(readSheet(mgName), categories);
        source = `"${mgName}"`;
      }
      if (cbName) {
        secondary = parseCBV3Sheet(readSheet(cbName), categories);
        if (!mgName) source = `"${cbName}"`;
        else source += ` + "${cbName}"`;
      }

      let tiers = mergeTiers(primary, secondary);

      // Fallback to legacy template if nothing recognized
      if (tiers.length === 0) {
        const first = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(first, { header: 1, defval: '' });
        tiers = parseLegacyTemplate(rows, categories);
        source = `"${wb.SheetNames[0]}" (legacy template)`;
      }

      if (tiers.length === 0) {
        throw new Error('Could not find any tier mark-ups. Expected a sheet named "Markups and GMs" or "CB V3 Tiers".');
      }

      await onImport(tiers);

      const catCount = tiers.reduce((sum, t) => sum + Object.keys(t.markups).length, 0);
      toast({
        title: 'Import complete',
        description: `Loaded ${tiers.length} tiers (${catCount} mark-ups) from ${source}.`,
      });
    } catch (err) {
      console.error('Excel import error:', err);
      toast({ title: 'Import failed', description: err.message, variant: 'destructive' });
    } finally {
      setParsing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
        <Download className="w-4 h-4 mr-1.5" /> Download Template
      </Button>
      <Button size="sm" onClick={() => inputRef.current?.click()} disabled={parsing}>
        <Upload className="w-4 h-4 mr-1.5" /> {parsing ? 'Parsing…' : 'Upload Excel'}
      </Button>
    </div>
  );
}