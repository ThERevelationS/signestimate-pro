import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Download, ClipboardCopy } from 'lucide-react';

export default function BOMTab({ items, walls, project }) {
  const [allCopied, setAllCopied] = useState(false);

  // Calculate quantities
  let totalConcreteCY = 0;
  let totalRebarFt = 0;
  let totalExcavationCY = 0;
  let totalBricks = 0;

  items.forEach(item => {
    let volumeCY = 0;
    if (item.foundation_type === 'spread_foot') {
      volumeCY = ((item.length_inches / 12) * (item.width_inches / 12) * (item.depth_inches / 12)) / 27;
    } else {
      const r = (item.diameter / 2) / 12;
      volumeCY = (Math.PI * r * r * (item.depth_inches / 12)) / 27;
    }
    volumeCY = volumeCY * (item.quantity || 1);
    totalConcreteCY += volumeCY;
    
    const excVol = volumeCY * 1.25;
    totalExcavationCY += excVol;

    if (item.include_rebar && item.foundation_type === 'spread_foot') {
      const nBarsL = Math.floor(item.width_inches / (item.rebar_spacing_width || 12)) + 1;
      const nBarsW = Math.floor(item.length_inches / (item.rebar_spacing_length || 12)) + 1;
      const totalFt = (nBarsL * (item.length_inches / 12) + nBarsW * (item.width_inches / 12)) * (item.quantity || 1);
      totalRebarFt += totalFt;
    }
  });

  walls.forEach(w => {
    totalBricks += (w.calculatedCosts?.totalBricks || 0);
  });

  const materials = [
    { name: 'Concrete', qty: totalConcreteCY.toFixed(2), unit: 'Cubic Yards (CY)' },
    { name: 'Excavation Volume', qty: totalExcavationCY.toFixed(2), unit: 'Cubic Yards (CY)' },
    { name: 'Rebar', qty: totalRebarFt.toFixed(2), unit: 'Linear Feet' },
    { name: 'Wall Units (Bricks/Blocks)', qty: totalBricks, unit: 'Units' },
  ];

  const buildTextSummary = () => {
    const lines = [];
    lines.push(`BILL OF MATERIALS`);
    lines.push(`Project: ${project.project_name}`);
    lines.push(`Client: ${project.client_name}`);
    if (project.estimate_number) lines.push(`Estimate #: ${project.estimate_number}`);
    lines.push('');
    materials.forEach(m => {
      lines.push(`${m.name}: ${m.qty} ${m.unit}`);
    });
    return lines.join('\n');
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(buildTextSummary());
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  };

  const handleExport = () => {
    const rows = [];
    rows.push(['BILL OF MATERIALS']);
    rows.push(['Project', project.project_name]);
    rows.push(['Client', project.client_name]);
    if (project.estimate_number) rows.push(['Estimate #', project.estimate_number]);
    rows.push([]);
    rows.push(['Material', 'Quantity', 'Unit']);
    
    materials.forEach(m => {
      rows.push([m.name, m.qty, m.unit]);
    });

    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.project_name || 'foundation-bom'}-BOM.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Bill of Materials</CardTitle>
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
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-4 py-2">Material</th>
                <th className="px-4 py-2 text-right">Quantity</th>
                <th className="px-4 py-2">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {materials.map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2 font-medium text-slate-800">{m.name}</td>
                  <td className="px-4 py-2 text-right">{m.qty}</td>
                  <td className="px-4 py-2 text-slate-500">{m.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}