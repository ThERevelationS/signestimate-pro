import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Upload, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Expected sheet format:
// Row 1: header — "Tier #" | "Tier Name" | <category_key 1> | <category_key 2> | ...
// Row 2+: tier rows. Markup cells are multipliers (1.5 = 50% markup) or percentages (50 = 50% -> 1.5).

const PCT_TO_MULT = (v) => {
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return null;
  // If user enters >5, assume it's a % (e.g. 50 => 1.5). Otherwise it's a multiplier (1.5).
  return n > 5 ? 1 + n / 100 : n;
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
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (rows.length < 2) throw new Error('Spreadsheet has no tier rows');

      const header = rows[0].map(h => String(h).trim());
      const tierNumIdx = header.findIndex(h => /tier\s*#|tier\s*number/i.test(h));
      const tierNameIdx = header.findIndex(h => /tier\s*name/i.test(h));
      if (tierNumIdx === -1 || tierNameIdx === -1) {
        throw new Error('Header must include "Tier #" and "Tier Name" columns');
      }

      // Map header columns to category_keys
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
        if (!tierNum || !tierName) continue; // skip header/blank rows

        const markups = {};
        for (const [colIdx, key] of Object.entries(colToKey)) {
          const mult = PCT_TO_MULT(row[colIdx]);
          if (mult !== null) markups[key] = mult;
        }
        tiers.push({ tier_number: tierNum, tier_name: tierName, markups, sort_order: tierNum });
      }

      if (tiers.length === 0) throw new Error('No valid tier rows found');

      await onImport(tiers);
      toast({ title: 'Import complete', description: `Loaded ${tiers.length} tiers from spreadsheet.` });
    } catch (err) {
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