import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, Download, ClipboardCopy } from 'lucide-react';

// Individual clickable cost value with tooltip
function CopyValue({ label, value, className = '' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <span
      onClick={handleCopy}
      title="Click to copy to clipboard"
      className={`relative group cursor-pointer inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-amber-50 hover:text-amber-800 ${className}`}
    >
      {label && <span className="text-slate-400">{label}</span>}
      <span className="font-medium">{value}</span>
      <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {copied ? '✓ Copied!' : 'Click to copy'}
      </span>
      {copied
        ? <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
        : <Copy className="w-3 h-3 text-slate-300 group-hover:text-amber-500 flex-shrink-0" />
      }
    </span>
  );
}

export default function SummaryTab({ items, walls, totals, calcItemCost, project }) {
  const polesTotal = totals.polesTotal || 0;
  const [allCopied, setAllCopied] = useState(false);

  const buildTextSummary = () => {
    const lines = [];
    lines.push(`FOUNDATION ESTIMATE SUMMARY`);
    lines.push(`Project: ${project.project_name}`);
    lines.push(`Client: ${project.client_name}`);
    if (project.estimate_number) lines.push(`Estimate #: ${project.estimate_number}`);
    lines.push('');
    lines.push('── FOUNDATION ITEMS ──');
    items.forEach((item, idx) => {
      const c = calcItemCost(item);
      const label = `Foundation #${idx + 1}${item.description ? ` — ${item.description}` : ''}`;
      lines.push(`${label}: $${c.total.toFixed(2)}`);
      lines.push(`  Concrete: $${c.concreteCost.toFixed(2)}  |  Rebar: $${c.rebarCost.toFixed(2)}  |  Forming: $${c.formingCost.toFixed(2)}  |  Finishing: $${c.finishingCost.toFixed(2)}  |  Excavation: $${c.excavationCost.toFixed(2)}`);
    });
    lines.push(`Foundation & Excavation Total: $${totals.itemsTotal.toFixed(2)}`);
    if (walls.length > 0) {
      lines.push('');
      lines.push('── WALLS ──');
      walls.forEach((w, i) => {
        lines.push(`Wall #${i + 1}: ${w.name || 'Untitled'} — $${(w.calculatedCosts?.totalCost || 0).toFixed(2)}`);
      });
      lines.push(`Walls Total: $${totals.wallTotal.toFixed(2)}`);
    }
    lines.push('');
    if (polesTotal > 0) {
      lines.push('');
      lines.push(`Poles Total: $${polesTotal.toFixed(2)}`);
    }
    if (totals.equipmentTotal > 0) {
      lines.push('');
      lines.push(`Equipment Total: $${totals.equipmentTotal.toFixed(2)}`);
    }
    lines.push(`GRAND TOTAL: $${totals.grand.toFixed(2)}`);
    return lines.join('\n');
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(buildTextSummary());
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  };

  const handleExport = () => {
    const rows = [];
    rows.push(['Foundation Estimate Summary']);
    rows.push(['Project', project.project_name]);
    rows.push(['Client', project.client_name]);
    if (project.estimate_number) rows.push(['Estimate #', project.estimate_number]);
    rows.push([]);
    rows.push(['Item', 'Total', 'Concrete', 'Rebar', 'Forming', 'Finishing', 'Excavation']);
    items.forEach((item, idx) => {
      const c = calcItemCost(item);
      const label = `Foundation #${idx + 1}${item.description ? ` — ${item.description}` : ''}`;
      rows.push([label, c.total.toFixed(2), c.concreteCost.toFixed(2), c.rebarCost.toFixed(2), c.formingCost.toFixed(2), c.finishingCost.toFixed(2), c.excavationCost.toFixed(2)]);
    });
    rows.push(['Foundation & Excavation Total', totals.itemsTotal.toFixed(2)]);
    if (walls.length > 0) {
      rows.push([]);
      rows.push(['Wall', 'Total Cost', 'Material', 'Mortar', 'Labor', '', '']);
      walls.forEach((w, i) => {
        const cc = w.calculatedCosts;
        rows.push([
          `Wall #${i + 1}: ${w.name || 'Untitled'}`,
          (cc?.totalCost || 0).toFixed(2),
          (cc?.materialCost || 0).toFixed(2),
          (cc?.mortarCost || 0).toFixed(2),
          (cc?.laborCost || 0).toFixed(2),
        ]);
      });
      rows.push(['Walls Total', totals.wallTotal.toFixed(2)]);
    }
    if (totals.equipmentTotal > 0) {
      rows.push([]);
      rows.push(['Equipment Total', totals.equipmentTotal.toFixed(2)]);
    }
    rows.push([]);
    rows.push(['GRAND TOTAL', totals.grand.toFixed(2)]);

    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.project_name || 'foundation-estimate'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Cost Summary</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleCopyAll} className="gap-1.5">
              {allCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
              {allCopied ? 'Copied!' : 'Copy All'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1">Click any cost value to copy it to clipboard.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, idx) => {
          const c = calcItemCost(item);
          return (
            <div key={item._id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div className="flex justify-between items-center text-sm font-semibold text-slate-700 mb-2">
                <span>Foundation #{idx + 1}{item.description ? ` — ${item.description}` : ''}</span>
                <CopyValue value={`$${c.total.toFixed(2)}`} className="text-sm font-semibold" />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                <CopyValue label="Concrete:" value={`$${c.concreteCost.toFixed(2)}`} />
                <CopyValue label="Rebar:" value={`$${c.rebarCost.toFixed(2)}`} />
                <CopyValue label="Forming:" value={`$${c.formingCost.toFixed(2)}`} />
                <CopyValue label="Finishing:" value={`$${c.finishingCost.toFixed(2)}`} />
                <CopyValue label="Excavation:" value={`$${c.excavationCost.toFixed(2)}`} />
              </div>
            </div>
          );
        })}

        <div className="flex justify-between py-2 border-t border-b font-semibold text-slate-700">
          <span>Foundation & Excavation Total</span>
          <CopyValue value={`$${totals.itemsTotal.toFixed(2)}`} className="font-semibold" />
        </div>

        {walls.map((w, i) => (
          <div key={w._id} className="flex justify-between py-1 text-sm text-slate-600">
            <span>Wall #{i + 1}: {w.name || 'Untitled'}</span>
            <CopyValue value={`$${(w.calculatedCosts?.totalCost || 0).toFixed(2)}`} />
          </div>
        ))}

        {walls.length > 0 && (
          <div className="flex justify-between py-2 border-b font-semibold text-slate-700">
            <span>Walls Total</span>
            <CopyValue value={`$${totals.wallTotal.toFixed(2)}`} className="font-semibold" />
          </div>
        )}

        {polesTotal > 0 && (
          <div className="flex justify-between py-2 border-b font-semibold text-slate-700">
            <span>Poles Total</span>
            <CopyValue value={`$${polesTotal.toFixed(2)}`} className="font-semibold" />
          </div>
        )}

        {totals.equipmentTotal > 0 && (
          <div className="flex justify-between py-2 border-b font-semibold text-slate-700">
            <span>Equipment Total</span>
            <CopyValue value={`$${totals.equipmentTotal.toFixed(2)}`} className="font-semibold" />
          </div>
        )}

        <div className="flex justify-between items-center py-3 bg-amber-50 rounded-lg px-3 mt-2">
          <span className="text-lg font-bold text-slate-900">Grand Total</span>
          <CopyValue value={`$${totals.grand.toFixed(2)}`} className="text-lg font-bold text-amber-700" />
        </div>
      </CardContent>
    </Card>
  );
}