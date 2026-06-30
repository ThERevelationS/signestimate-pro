import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, Download, ClipboardCopy } from 'lucide-react';
import { getConcreteMixes, getConcreteAdmixtures, getSmallLoadFee, getFuelSurcharge } from '@/pages/NewFoundationEstimate';
import { base44 } from '@/api/base44Client';

// Small button that copies a combined block of text — used to grab a group of line items
function CopyGroupButton({ lines, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    const text = (lines || []).filter(Boolean).join(' | ');
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      title="Copy combined description for this group"
      className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded px-1.5 py-0.5 transition"
    >
      {copied
        ? <Check className="w-3 h-3 text-green-500" />
        : <Copy className="w-3 h-3" />
      }
      <span>{copied ? 'Copied!' : label}</span>
    </button>
  );
}

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

function CostRow({ 
  label, 
  unit, 
  defaultRate, 
  customRate, 
  onRateChange, 
  calculatedTotal, 
  readOnly = false,
  qtyLabel,
  defaultQty,
  customQty,
  onQtyChange,
  qtyUnit,
  detailText
}) {
  const [detailCopied, setDetailCopied] = useState(false);

  const copyDetail = () => {
    const text = detailText || `${label}: $${calculatedTotal.toFixed(2)}`;
    navigator.clipboard.writeText(text);
    setDetailCopied(true);
    setTimeout(() => setDetailCopied(false), 1500);
  };

  return (
    <div className="flex flex-col py-1.5 border-b border-slate-100 last:border-0 gap-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex flex-col text-sm text-slate-700 min-w-[120px]">
          <span>{label}</span>
          {qtyLabel ? <span className="text-[10px] text-slate-500">{qtyLabel}</span> : null}
        </div>
        <div className="flex items-center gap-3 ml-auto flex-wrap justify-end">
          {onQtyChange && !readOnly ? (
            <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded border border-slate-200">
              <Input
                type="number"
                className="w-16 h-6 px-1 py-0 text-xs text-right border-none shadow-none focus-visible:ring-0 bg-transparent"
                value={customQty !== null && customQty !== undefined ? customQty : (defaultQty || 0)}
                onChange={e => onQtyChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                step="any"
                min="0"
              />
              {qtyUnit ? <span className="text-xs text-slate-500 font-medium whitespace-nowrap">{qtyUnit}</span> : null}
            </div>
          ) : null}
          {!readOnly && onRateChange ? (
            <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">$</span>
              <Input
                type="number"
                className="w-16 h-6 px-1 py-0 text-xs text-right border-none shadow-none focus-visible:ring-0 bg-transparent"
                value={customRate !== null && customRate !== undefined ? customRate : (defaultRate || 0)}
                onChange={e => onRateChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                step="any"
                min="0"
              />
              {unit ? <span className="text-xs text-slate-500 font-medium whitespace-nowrap">/ {unit}</span> : null}
            </div>
          ) : null}
          <div className="w-20 text-right">
            <CopyValue value={`$${calculatedTotal.toFixed(2)}`} className="justify-end" />
          </div>
        </div>
      </div>
      {detailText ? (
        <div className="flex items-start gap-1.5 pl-2 mt-0.5 group/detail">
          <p className="text-[11px] text-slate-500 italic leading-snug flex-1 whitespace-pre-line">{detailText}</p>
          <button
            onClick={copyDetail}
            title="Copy line details"
            className="opacity-50 group-hover/detail:opacity-100 hover:bg-amber-50 rounded p-0.5 transition flex-shrink-0"
          >
            {detailCopied
              ? <Check className="w-3 h-3 text-green-500" />
              : <Copy className="w-3 h-3 text-slate-400 hover:text-amber-500" />
            }
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function SummaryTab({ items, walls, totals, calcItemCost, project, polesData = [], selectedEquipmentList = [], inventory = [], onUpdateItem, onUpdateWall, onUpdatePole, onUpdateEquipment, settings = {} }) {
  const polesTotal = totals.polesTotal || 0;
  const [allCopied, setAllCopied] = useState(false);
  // Only show the delivered "Concrete Service" card when an item actually uses a
  // concrete_service supplier. Bagged-concrete-only projects have no truck delivery.
  const hasConcreteService = items.some(item => {
    const inv = inventory.find(i => i.id === item.selected_concrete_id);
    return inv && inv.material_type === 'concrete_service';
  });
  // Markup is intentionally NOT shown here — all customer-facing markups live on the Customer Pricing tab.

  const allAttachments = inventory.filter(i => i.material_type === 'attachment');
  const allSubAttachments = inventory.filter(i => i.material_type === 'sub_attachment');
  
  const getEquipmentEntryCost = (entry) => {
    const eq = inventory.find(i => i.id === entry.equipment_id);
    if (!eq) return 0;
    
    const rentalPeriod = entry.rental_period || 'day';
    const rentalDuration = entry.rental_duration || 1;
    const durationOverride = entry.custom_qty !== undefined && entry.custom_qty !== null ? entry.custom_qty : rentalDuration;
    
    const getRentalCost = (item, rateOverride) => {
      if (rateOverride !== undefined && rateOverride !== null) return rateOverride * durationOverride;
      if (rentalPeriod === 'day') return (item.cost_per_day || 0) * durationOverride;
      if (rentalPeriod === 'week') return (item.cost_per_week || 0) * durationOverride;
      if (rentalPeriod === 'month') return (item.cost_per_month || 0) * durationOverride;
      return 0;
    };
    
    let entryTotal = getRentalCost(eq, entry.custom_rate);
    const deliveryCharge = entry.custom_delivery_charge !== undefined && entry.custom_delivery_charge !== null ? entry.custom_delivery_charge : (eq.pickup_delivery_cost || 0);
    
    if (entry.include_delivery) entryTotal += deliveryCharge;
    
    if (entry.attachment_counts) {
      Object.entries(entry.attachment_counts).forEach(([id, qty]) => {
        const a = allAttachments.find(att => att.id === id);
        if (a) entryTotal += getRentalCost(a) * qty;
      });
    } else if (entry.attachment_ids) {
      entry.attachment_ids.forEach(id => {
        const a = allAttachments.find(att => att.id === id);
        if (a) entryTotal += getRentalCost(a);
      });
    }
    
    if (entry.sub_attachment_counts) {
      Object.entries(entry.sub_attachment_counts).forEach(([id, qty]) => {
        const s = allSubAttachments.find(sub => sub.id === id);
        if (s) entryTotal += getRentalCost(s) * qty;
      });
    }
    
    return entryTotal;
  };

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
      if (c.total === 0) return;
      const label = `Foundation #${idx + 1}${item.description ? ` — ${item.description}` : ''}`;
      lines.push(`${label}: $${c.total.toFixed(2)}`);
      const matParts = [];
      if (item.include_rebar && c.rebarCost > 0) matParts.push(`Rebar: $${c.rebarCost.toFixed(2)}`);
      if (item.include_forming && c.formingCost > 0) matParts.push(`Forming: $${c.formingCost.toFixed(2)}`);
      if (matParts.length > 0) lines.push(`  Materials: ${matParts.join('  |  ')}`);
      const laborParts = [];
      if (c.pouringCost > 0) laborParts.push(`Pouring: $${c.pouringCost.toFixed(2)}`);
      if (item.include_finishing && c.finishingCost > 0) laborParts.push(`Finishing: $${c.finishingCost.toFixed(2)}`);
      if (c.excavationCost > 0) laborParts.push(`Excavation: $${c.excavationCost.toFixed(2)}`);
      if (laborParts.length > 0) lines.push(`  Labor: ${laborParts.join('  |  ')}`);
    });
    lines.push(`Foundation Labor/Excavation Total: $${(totals.itemsTotal - totals.concreteTotal).toFixed(2)}`);
    lines.push('');
    const firstConcreteItem = items.filter(item => {
        const inv = inventory.find(i => i.id === item.selected_concrete_id);
        return !inv || inv.material_type === 'concrete_service';
    }).find(i => inventory.find(inv => inv.id === i.selected_concrete_id)?.material_type === 'concrete_service');
    const firstConcreteInv = firstConcreteItem ? inventory.find(inv => inv.id === firstConcreteItem.selected_concrete_id) : null;
    const availableMixes = getConcreteMixes(firstConcreteInv);
    const availableAdmixes = getConcreteAdmixtures(firstConcreteInv);
    const mix = availableMixes.find(m => m.id === project.project_concrete_type) || availableMixes.find(m => m.id === '4000_ae');
    const selectedAdmixes = availableAdmixes.filter(a => (project.project_concrete_admixtures || []).includes(a.id));

    lines.push('── CONCRETE SERVICE (PROJECT TOTAL) ──');
    lines.push(`Total Volume: ${totals.totalConcreteYards.toFixed(2)} YD (Rounded to ${totals.roundedYards.toFixed(2)} YD for pricing)`);
    lines.push(`Material Rate: $${totals.ratePerYard.toFixed(2)} / YD`);
    lines.push(`  Base Mix (${mix?.name}): $${(mix?.price || 0).toFixed(2)}/YD`);
    selectedAdmixes.forEach(a => lines.push(`  + ${a.name}: $${a.price.toFixed(2)}/YD`));
    
    totals.trucksList.forEach((t, i) => {
      const billed = t.roundedYards ? t.roundedYards.toFixed(2) : t.yards.toFixed(2);
      lines.push(`  Truck ${i+1} (${t.yards.toFixed(2)} YD actual, billed ${billed} YD): $${t.cost.toFixed(2)} (Incl. $${t.smallOrderFee.toFixed(2)} Small Load Fee & $${t.fuelFee.toFixed(2)} Fuel/Delivery)`);
    });
    if (totals.additionalStopsCost > 0) {
      lines.push(`Additional Sign Locations (${totals.newSignLocationsCount} stops): $${totals.additionalStopsCost.toFixed(2)}`);
    }
    lines.push(`Concrete Total: $${totals.concreteTotal.toFixed(2)}`);
    lines.push('');
    if (walls.length > 0) {
      lines.push('');
      lines.push('── WALLS ──');
      walls.forEach((w, i) => {
        const cc = w.calculatedCosts;
        lines.push(`Wall #${i + 1}: ${w.name || 'Untitled'} — $${(cc?.totalCost || 0).toFixed(2)}`);
        if (cc) {
           lines.push(`  Outer Material: $${(cc.materialCost || 0).toFixed(2)}  |  Outer Mortar: $${(cc.mortarCost || 0).toFixed(2)}  |  Outer Labor: $${(cc.laborCost || 0).toFixed(2)}`);
           if (w.includeInternalWall) {
              lines.push(`  Internal Material: $${(cc.internalMaterialCost || 0).toFixed(2)}  |  Internal Mortar: $${(cc.internalMortarCost || 0).toFixed(2)}  |  Internal Labor: $${(cc.internalLaborCost || 0).toFixed(2)}`);
           }
        }
      });
      lines.push(`Walls Total: $${totals.wallTotal.toFixed(2)}`);
    }
    if (polesTotal > 0) {
      lines.push('');
      lines.push('── POLES ──');
      polesData.forEach((p, i) => {
          const inv = inventory.find(inv => inv.id === p.pole_id);
          let cost = 0;
          // Total pole length = height above ground + depth in ground.
          const totalPoleInches = (p.height_inches || 0) + (p.y_offset_inches || 0);
          if (inv) {
             if (inv.pole_pricing_mode === 'stock_price') {
                 const stockLen = (inv.pole_stock_length_ft || 20) * 12;
                 const pieces = Math.ceil(totalPoleInches / stockLen);
                 const rate = typeof p.custom_cost_per_unit === 'number' ? p.custom_cost_per_unit : (inv.pole_stock_price || 0);
                 cost = pieces * rate;
             } else {
                 const rate = typeof p.custom_cost_per_unit === 'number' ? p.custom_cost_per_unit : (inv.cost_per_unit || 0);
                 cost = (totalPoleInches / 12) * rate;
             }
          }
          lines.push(`Pole #${i + 1} (${p.height_inches}" above ground + ${p.y_offset_inches || 0}" buried = ${totalPoleInches}" total): $${cost.toFixed(2)}`);
      });
      lines.push(`Poles Total: $${polesTotal.toFixed(2)}`);
    }
    if (totals.equipmentTotal > 0) {
      lines.push('');
      lines.push('── EQUIPMENT ──');
      selectedEquipmentList.forEach((entry, i) => {
          const eq = inventory.find(inv => inv.id === entry.equipment_id);
          if (eq) {
              const cost = getEquipmentEntryCost(entry);
              lines.push(`${eq.material_name} (${entry.rental_duration} ${entry.rental_period}s): $${cost.toFixed(2)}`);
          }
      });
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
    rows.push(['Item', 'Total', 'Rebar', 'Forming', 'Pouring', 'Finishing', 'Excavation']);
    items.forEach((item, idx) => {
      const c = calcItemCost(item);
      const label = `Foundation #${idx + 1}${item.description ? ` — ${item.description}` : ''}`;
      rows.push([label, c.total.toFixed(2), c.rebarCost.toFixed(2), c.formingCost.toFixed(2), c.pouringCost.toFixed(2), c.finishingCost.toFixed(2), c.excavationCost.toFixed(2)]);
    });
    rows.push(['Foundation Labor/Excavation Total', (totals.itemsTotal - totals.concreteTotal).toFixed(2)]);
    
    const firstConcreteItem = items.filter(item => {
        const inv = inventory.find(i => i.id === item.selected_concrete_id);
        return !inv || inv.material_type === 'concrete_service';
    }).find(i => inventory.find(inv => inv.id === i.selected_concrete_id)?.material_type === 'concrete_service');
    const firstConcreteInv = firstConcreteItem ? inventory.find(inv => inv.id === firstConcreteItem.selected_concrete_id) : null;
    const availableMixes = getConcreteMixes(firstConcreteInv);
    const availableAdmixes = getConcreteAdmixtures(firstConcreteInv);
    const mix = availableMixes.find(m => m.id === project.project_concrete_type) || availableMixes.find(m => m.id === '4000_ae');
    const selectedAdmixes = availableAdmixes.filter(a => (project.project_concrete_admixtures || []).includes(a.id));

    rows.push([]);
    rows.push(['Concrete Service', 'Cost']);
    rows.push([`Total Volume: ${totals.totalConcreteYards.toFixed(2)} YD (Rounded to ${totals.roundedYards.toFixed(2)} YD)`, totals.concreteTotal.toFixed(2)]);
    rows.push([`Base Mix: ${mix?.name}`, mix?.price.toFixed(2)]);
    selectedAdmixes.forEach(a => rows.push([`+ Admix: ${a.name}`, a.price.toFixed(2)]));

    if (walls.length > 0) {
      rows.push([]);
      rows.push(['Wall', 'Total Cost', 'Material', 'Mortar', 'Labor', 'Internal Material', 'Internal Mortar', 'Internal Labor']);
      walls.forEach((w, i) => {
        const cc = w.calculatedCosts;
        rows.push([
          `Wall #${i + 1}: ${w.name || 'Untitled'}`,
          (cc?.totalCost || 0).toFixed(2),
          (cc?.materialCost || 0).toFixed(2),
          (cc?.mortarCost || 0).toFixed(2),
          (cc?.laborCost || 0).toFixed(2),
          w.includeInternalWall ? (cc?.internalMaterialCost || 0).toFixed(2) : '-',
          w.includeInternalWall ? (cc?.internalMortarCost || 0).toFixed(2) : '-',
          w.includeInternalWall ? (cc?.internalLaborCost || 0).toFixed(2) : '-'
        ]);
      });
      rows.push(['Walls Total', totals.wallTotal.toFixed(2)]);
    }
    if (polesTotal > 0) {
      rows.push([]);
      rows.push(['Pole', 'Total Length (in)', 'Cost']);
      polesData.forEach((p, i) => {
          const inv = inventory.find(inv => inv.id === p.pole_id);
          let cost = 0;
          // Total pole length = height above ground + depth in ground.
          const totalPoleInches = (p.height_inches || 0) + (p.y_offset_inches || 0);
          if (inv) {
             if (inv.pole_pricing_mode === 'stock_price') {
                 const stockLen = (inv.pole_stock_length_ft || 20) * 12;
                 const pieces = Math.ceil(totalPoleInches / stockLen);
                 const rate = typeof p.custom_cost_per_unit === 'number' ? p.custom_cost_per_unit : (inv.pole_stock_price || 0);
                 cost = pieces * rate;
             } else {
                 const rate = typeof p.custom_cost_per_unit === 'number' ? p.custom_cost_per_unit : (inv.cost_per_unit || 0);
                 cost = (totalPoleInches / 12) * rate;
             }
          }
          rows.push([`Pole #${i + 1}`, totalPoleInches, cost.toFixed(2)]);
      });
      rows.push(['Poles Total', totals.polesTotal.toFixed(2)]);
    }
    if (totals.equipmentTotal > 0) {
      rows.push([]);
      rows.push(['Equipment', 'Duration', 'Cost']);
      selectedEquipmentList.forEach((entry, i) => {
          const eq = inventory.find(inv => inv.id === entry.equipment_id);
          if (eq) {
              const cost = getEquipmentEntryCost(entry);
              rows.push([eq.material_name, `${entry.rental_duration} ${entry.rental_period}s`, cost.toFixed(2)]);
          }
      });
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
        <p className="text-xs text-slate-400 mt-1">Click any cost value to copy it to clipboard. See the <span className="font-semibold">Customer Pricing</span> tab for tier markups.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasConcreteService && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm mb-4">
            <div className="flex justify-between items-center text-base font-bold text-blue-900 mb-3 border-b border-blue-200 pb-2">
                <span>Concrete Service (Project Total)</span>
                <CopyValue value={`$${totals.concreteTotal.toFixed(2)}`} className="text-base font-bold text-blue-900" />
            </div>
            <div className="flex flex-col gap-1">
                <div className="flex justify-between text-sm text-blue-800 font-medium pb-1">
                    <span>Total Volume: {totals.totalConcreteYards.toFixed(2)} YD (Rounded: {totals.roundedYards.toFixed(2)} YD)</span>
                    <span>Rate: ${totals.ratePerYard.toFixed(2)} / YD</span>
                </div>
                
                {/* Mix and Admixtures Breakdown */}
                {(() => {
                  const firstConcreteItem = items.filter(item => {
                      const inv = inventory.find(i => i.id === item.selected_concrete_id);
                      return !inv || inv.material_type === 'concrete_service';
                  }).find(i => inventory.find(inv => inv.id === i.selected_concrete_id)?.material_type === 'concrete_service');
                  const firstConcreteInv = firstConcreteItem ? inventory.find(inv => inv.id === firstConcreteItem.selected_concrete_id) : null;
                  const availableMixes = getConcreteMixes(firstConcreteInv);
                  const availableAdmixes = getConcreteAdmixtures(firstConcreteInv);
                  
                  const mix = availableMixes.find(m => m.id === project.project_concrete_type) || availableMixes.find(m => m.id === '4000_ae');
                  const selectedAdmixes = availableAdmixes.filter(a => (project.project_concrete_admixtures || []).includes(a.id));
                  
                  return (
                    <div className="pl-4 py-2 my-1 border-l-2 border-blue-200 bg-blue-100/30 rounded-r-md">
                      <p className="text-xs font-bold text-blue-800 uppercase mb-1 tracking-wider">Rate Breakdown</p>
                      <div className="flex justify-between text-xs text-blue-700/90 py-0.5">
                        <span>Base Mix ({mix?.name || 'Unknown'})</span>
                        <span className="font-medium">${(mix?.price || 0).toFixed(2)} / YD</span>
                      </div>
                      {selectedAdmixes.map(admix => (
                        <div key={admix.id} className="flex justify-between text-xs text-blue-700/90 py-0.5">
                          <span>+ {admix.name}</span>
                          <span className="font-medium">${admix.price.toFixed(2)} / YD</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                
                {totals.trucksList.map((t, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between py-1 border-t border-blue-100/50">
                        <div className="flex flex-col text-xs text-blue-700/80">
                            <span className="font-semibold">Truck #{idx + 1} — {t.yards.toFixed(2)} YD actual{t.roundedYards && t.roundedYards !== t.yards ? ` (billed as ${t.roundedYards.toFixed(2)} YD)` : ''}</span>
                            <span>
                              {t.roundedYards ? `${t.roundedYards.toFixed(2)}` : t.yards.toFixed(2)} YD × ${totals.ratePerYard.toFixed(2)}
                              {t.smallOrderFee > 0 ? ` + $${t.smallOrderFee.toFixed(2)} Small Load Fee` : ''}
                              {t.fuelFee > 0 ? ` + $${t.fuelFee.toFixed(2)} Fuel/Delivery` : ''}
                            </span>
                        </div>
                        <span className="font-medium text-sm text-blue-800">${t.cost.toFixed(2)}</span>
                    </div>
                ))}
                {totals.additionalStopsCost > 0 && (
                    <div className="flex justify-between py-1 border-t border-blue-100 text-xs text-blue-700/80 mt-1">
                        <span className="font-semibold">Additional Sign Locations ({totals.newSignLocationsCount} Stop{totals.newSignLocationsCount !== 1 ? 's' : ''})</span>
                        <span className="font-medium text-sm text-blue-800">${totals.additionalStopsCost.toFixed(2)}</span>
                    </div>
                )}
            </div>
        </div>
        )}

        {items.map((item, idx) => {
          const c = calcItemCost(item);
          const selectedRebar = inventory.find(r => r.material_type === 'rebar' && r.rebar_size === (item.foundation_type === 'spread_foot' ? item.rebar_size : item.pillar_rebar_size));
          const defaultRebarCost = selectedRebar?.cost_per_unit || 0;
          
          const selectedForming = inventory.find(i => i.id === item.selected_forming_id);

          const hasBaggedConcrete = c.concreteCost > 0;
          const hasRebar = item.include_rebar && c.rebarCost > 0;
          const hasForming = item.include_forming && c.formingCost > 0;
          const hasPouring = c.pouringCost > 0;
          const hasFinishing = item.include_finishing && c.finishingCost > 0;
          const hasExcavation = c.excavationCost > 0;

          const hasAnyMaterial = hasBaggedConcrete || hasRebar || hasForming;
          const hasAnyLabor = hasPouring || hasFinishing || hasExcavation;

          if (!hasBaggedConcrete && !hasRebar && !hasForming && !hasPouring && !hasFinishing && !hasExcavation) return null;

          // Build descriptive text for foundation
          const dimsText = item.foundation_type === 'spread_foot'
            ? `${item.length_inches}" L × ${item.width_inches}" W × ${item.depth_inches}" D`
            : `${item.diameter}" Ø × ${item.depth_inches}" D`;
          const foundationDetail = `${item.quantity || 1}× ${item.foundation_type === 'spread_foot' ? 'Spread Foot' : 'Pillar'} (${dimsText}) | Volume: ${(c.baseVolumeCY || 0).toFixed(2)} CY`;

          return (
            <div key={item._id} className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
              <div className="flex justify-between items-center text-base font-bold text-slate-800 mb-1 border-b border-slate-200 pb-2">
                <span>Foundation #{idx + 1}{item.description ? ` — ${item.description}` : ''}</span>
                <CopyValue value={`$${c.total.toFixed(2)}`} className="text-base font-bold text-slate-800" />
              </div>
              <p className="text-[11px] text-slate-500 italic mb-3">{foundationDetail}</p>

              {hasAnyMaterial && (() => {
                const matLines = [];
                if (hasBaggedConcrete) matLines.push(`Concrete: ${c.concreteBags || 0} bags × $${(c.concreteRate || 0).toFixed(2)}/bag = $${c.concreteCost.toFixed(2)} (${c.volumeCY.toFixed(2)} CY total volume)`);
                if (hasRebar) matLines.push(`Rebar — ${c.selectedRebarName || ''}: ${c.rebarFt.toFixed(2)} ft × $${(c.rebarRate || 0).toFixed(2)}/ft (incl. labor) = $${c.rebarCost.toFixed(2)}${item.foundation_type === 'spread_foot' ? ` | Spacing: ${item.rebar_spacing_length}"×${item.rebar_spacing_width}", ${item.rebar_layers || 1} layer(s)` : ` | ${item.pillar_vertical_rebar_count || 4} verticals, ${item.pillar_rebar_layers || 1} hoop(s)`}`);
                if (hasForming) matLines.push(`Forming — ${c.selectedFormingName || ''}: ${c.formingQty || c.baseFormingQty} pcs × $${(selectedForming?.cost_per_unit || 0).toFixed(2)}/pc + labor = $${c.formingCost.toFixed(2)}`);
                return (
                <div className="flex flex-col gap-1 mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Materials</div>
                    <CopyGroupButton lines={matLines} label="Copy Materials" />
                  </div>
                  {hasBaggedConcrete && (
                    <CostRow 
                      label={`Concrete ${c.concreteBags ? `(${c.concreteBags} bags)` : ''}`} 
                      unit="bag"
                      defaultRate={c.concreteRate}
                      customRate={item.custom_concrete_cost_per_cy}
                      onRateChange={(val) => onUpdateItem && onUpdateItem(idx, { custom_concrete_cost_per_cy: val })}
                      defaultQty={c.baseBags || 0}
                      customQty={item.custom_concrete_qty}
                      onQtyChange={(val) => onUpdateItem && onUpdateItem(idx, { custom_concrete_qty: val })}
                      qtyUnit="bags"
                      calculatedTotal={c.concreteCost}
                      detailText={`${c.concreteBags || 0} bags × $${(c.concreteRate || 0).toFixed(2)}/bag = $${c.concreteCost.toFixed(2)} (${c.volumeCY.toFixed(2)} CY total volume)`}
                    />
                  )}
                  {hasRebar && (
                    <CostRow 
                      label="Rebar" 
                      qtyLabel={c.selectedRebarName}
                      unit="ft" 
                      defaultRate={defaultRebarCost} 
                      customRate={item.custom_rebar_cost_per_ft} 
                      onRateChange={(val) => onUpdateItem && onUpdateItem(idx, { custom_rebar_cost_per_ft: val })}
                      defaultQty={Number(c.baseRebarFt.toFixed(2))}
                      customQty={item.custom_rebar_qty}
                      onQtyChange={(val) => onUpdateItem && onUpdateItem(idx, { custom_rebar_qty: val })}
                      qtyUnit="ft"
                      calculatedTotal={c.rebarCost} 
                      detailText={`${c.selectedRebarName || 'Rebar'} — ${c.rebarFt.toFixed(2)} ft × $${(c.rebarRate || 0).toFixed(2)}/ft (incl. labor) = $${c.rebarCost.toFixed(2)}${item.foundation_type === 'spread_foot' ? ` | Spacing: ${item.rebar_spacing_length}"×${item.rebar_spacing_width}", ${item.rebar_layers || 1} layer(s)` : ` | ${item.pillar_vertical_rebar_count || 4} verticals, ${item.pillar_rebar_layers || 1} hoop(s)`}`}
                    />
                  )}
                  {hasForming && (
                    <CostRow 
                      label="Forming" 
                      qtyLabel={c.selectedFormingName}
                      unit="pcs"
                      defaultRate={selectedForming?.cost_per_unit || 0}
                      customRate={item.custom_forming_rate}
                      onRateChange={(val) => onUpdateItem && onUpdateItem(idx, { custom_forming_rate: val })}
                      defaultQty={c.baseFormingQty}
                      customQty={item.custom_forming_qty}
                      onQtyChange={(val) => onUpdateItem && onUpdateItem(idx, { custom_forming_qty: val })}
                      qtyUnit="pcs"
                      calculatedTotal={c.formingCost} 
                      detailText={`${c.selectedFormingName || 'Forming'} — ${c.formingQty || c.baseFormingQty} pcs × $${(selectedForming?.cost_per_unit || 0).toFixed(2)}/pc + labor = $${c.formingCost.toFixed(2)}`}
                    />
                  )}
                </div>
                );
              })()}

              {hasAnyLabor && (() => {
                const laborLines = [];
                if (hasPouring) laborLines.push(`Pouring labor for ${c.volumeCY.toFixed(2)} CY = $${c.pouringCost.toFixed(2)}`);
                if (hasFinishing) laborLines.push(`Finishing: ${(c.finishingHours || 0).toFixed(2)} hrs × $${(c.finishingRate || 0).toFixed(2)}/hr = $${c.finishingCost.toFixed(2)} (top surface finishing)`);
                if (hasExcavation) laborLines.push(`${item.excavation_method === 'equipment_excavation' ? 'Equipment' : 'Hand-dig'} excavation: ${(c.excavationHours || 0).toFixed(2)} hrs × $${(c.excavationRate || 0).toFixed(2)}/hr = $${c.excavationCost.toFixed(2)} (${(c.volumeCY * 1.25).toFixed(2)} CY excavated)`);
                return (
                <div className="flex flex-col gap-1">
                  <div className={`flex items-center justify-between mb-1 ${hasAnyMaterial ? 'border-t border-slate-200 pt-2' : ''}`}>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Labor</div>
                    <CopyGroupButton lines={laborLines} label="Copy Labor" />
                  </div>
                  {hasPouring && (
                    <CostRow 
                      label="Pouring" 
                      unit="hr"
                      defaultRate={60}
                      calculatedTotal={c.pouringCost} 
                      detailText={`Pouring labor for ${c.volumeCY.toFixed(2)} CY = $${c.pouringCost.toFixed(2)}`}
                    />
                  )}
                  {hasFinishing && (
                    <CostRow 
                      label="Finishing" 
                      unit="hr"
                      defaultRate={60}
                      customRate={item.custom_finishing_rate}
                      onRateChange={(val) => onUpdateItem && onUpdateItem(idx, { custom_finishing_rate: val })}
                      defaultQty={Number(c.baseFinishingHours.toFixed(2))}
                      customQty={item.custom_finishing_hours}
                      onQtyChange={(val) => onUpdateItem && onUpdateItem(idx, { custom_finishing_hours: val })}
                      qtyUnit="h"
                      calculatedTotal={c.finishingCost} 
                      detailText={`${(c.finishingHours || 0).toFixed(2)} hrs × $${(c.finishingRate || 0).toFixed(2)}/hr = $${c.finishingCost.toFixed(2)} (top surface finishing)`}
                    />
                  )}
                  {hasExcavation && (
                    <CostRow 
                      label="Excavation" 
                      unit="hr"
                      defaultRate={60}
                      customRate={item.custom_excavation_rate}
                      onRateChange={(val) => onUpdateItem && onUpdateItem(idx, { custom_excavation_rate: val })}
                      defaultQty={Number(c.baseExcavationHours.toFixed(2))}
                      customQty={item.custom_excavation_hours}
                      onQtyChange={(val) => onUpdateItem && onUpdateItem(idx, { custom_excavation_hours: val })}
                      qtyUnit="h"
                      calculatedTotal={c.excavationCost} 
                      detailText={`${item.excavation_method === 'equipment_excavation' ? 'Equipment' : 'Hand-dig'} excavation: ${(c.excavationHours || 0).toFixed(2)} hrs × $${(c.excavationRate || 0).toFixed(2)}/hr = $${c.excavationCost.toFixed(2)} (${(c.volumeCY * 1.25).toFixed(2)} CY excavated)`}
                    />
                  )}
                </div>
                );
              })()}
            </div>
          );
        })}

        {selectedEquipmentList.length > 0 && (
          <div className="mt-4 mb-2">
            <h4 className="text-base font-bold text-slate-800 mb-2">Equipment</h4>
            <div className="space-y-3">
              {selectedEquipmentList.map((entry, i) => {
                const eq = inventory.find(inv => inv.id === entry.equipment_id);
                if (!eq) return null;
                const cost = getEquipmentEntryCost(entry);
                const period = entry.rental_period || 'day';
                
                const baseRate = period === 'day' ? eq.cost_per_day : period === 'week' ? eq.cost_per_week : eq.cost_per_month;
                const rate = entry.custom_rate !== undefined && entry.custom_rate !== null ? entry.custom_rate : (baseRate || 0);
                
                const baseQty = entry.rental_duration || 1;
                const qty = entry.custom_qty !== undefined && entry.custom_qty !== null ? entry.custom_qty : baseQty;
                
                const deliveryCharge = entry.custom_delivery_charge !== undefined && entry.custom_delivery_charge !== null ? entry.custom_delivery_charge : (eq.pickup_delivery_cost || 0);

                // Build attachments / sub-attachments breakdown for the description
                const attLines = [];
                if (entry.attachment_counts) {
                  Object.entries(entry.attachment_counts).forEach(([id, qtyA]) => {
                    if (!qtyA) return;
                    const a = allAttachments.find(att => att.id === id);
                    if (a) {
                      const aRate = period === 'day' ? a.cost_per_day : period === 'week' ? a.cost_per_week : a.cost_per_month;
                      attLines.push(`    • ${qtyA}× ${a.material_name} ($${((aRate || 0) * qty).toFixed(2)})`);
                    }
                  });
                }
                const subAttLines = [];
                if (entry.sub_attachment_counts) {
                  Object.entries(entry.sub_attachment_counts).forEach(([id, qtyS]) => {
                    if (!qtyS) return;
                    const s = allSubAttachments.find(sub => sub.id === id);
                    if (s) {
                      const sRate = period === 'day' ? s.cost_per_day : period === 'week' ? s.cost_per_week : s.cost_per_month;
                      subAttLines.push(`    • ${qtyS}× ${s.material_name} ($${((sRate || 0) * qty).toFixed(2)})`);
                    }
                  });
                }
                const detailParts = [
                  `${eq.material_name}: ${qty} ${period}(s) × $${rate.toFixed(2)}/${period} = $${(rate * qty).toFixed(2)}${eq.rental_company ? `  |  Vendor: ${eq.rental_company}` : ''}`
                ];
                if (attLines.length > 0) {
                  detailParts.push('');
                  detailParts.push('Attachments:');
                  detailParts.push(...attLines);
                }
                if (subAttLines.length > 0) {
                  detailParts.push('');
                  detailParts.push('Sub-Attachments:');
                  detailParts.push(...subAttLines);
                }
                const detailText = detailParts.join('\n');

                return (
                  <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 shadow-sm flex flex-col gap-1">
                    <CostRow 
                      label={`${eq.material_name} Rental`} 
                      unit={period}
                      defaultRate={baseRate || 0}
                      customRate={entry.custom_rate}
                      onRateChange={(val) => onUpdateEquipment && onUpdateEquipment(i, { custom_rate: val })}
                      defaultQty={baseQty}
                      customQty={entry.custom_qty}
                      onQtyChange={(val) => onUpdateEquipment && onUpdateEquipment(i, { custom_qty: val })}
                      qtyUnit={`${period}s`}
                      calculatedTotal={rate * qty}
                      detailText={detailText}
                    />
                    {entry.include_delivery && (
                       <CostRow 
                         label="Delivery Charge"
                         defaultRate={eq.pickup_delivery_cost || 0}
                         customRate={entry.custom_delivery_charge}
                         onRateChange={(val) => onUpdateEquipment && onUpdateEquipment(i, { custom_delivery_charge: val })}
                         calculatedTotal={deliveryCharge}
                         detailText={`Pickup/delivery flat fee = $${deliveryCharge.toFixed(2)}`}
                       />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between py-2 border-b border-slate-200 font-semibold text-slate-700 mt-2">
              <span>Equipment Total</span>
              <CopyValue value={`$${totals.equipmentTotal.toFixed(2)}`} className="font-semibold" />
            </div>
          </div>
        )}

        <div className="flex justify-between py-2 border-t border-b font-semibold text-slate-700 mt-4">
          <span>Foundation & Excavation Total</span>
          <CopyValue value={`$${totals.itemsTotal.toFixed(2)}`} className="font-semibold" />
        </div>

        {walls.length > 0 && walls.some(w => w.calculatedCosts?.totalCost > 0) && <h4 className="text-base font-bold text-slate-800 mt-6 mb-2">Walls</h4>}
        {walls.map((w, idx) => {
          const cc = w.calculatedCosts;
          const mat = w.selectedMaterial;
          const intMat = w.selectedInternalMaterial;
          
          return (
            <div key={w._id} className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
              <div className="flex justify-between items-center text-base font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2">
                <span>Wall #{idx + 1}: {w.name || 'Untitled'}</span>
                <CopyValue value={`$${(cc?.totalCost || 0).toFixed(2)}`} className="text-base font-bold text-slate-800" />
              </div>
              
              {cc && (() => {
                const outerLines = [
                  `${mat?.material_name || 'Material'}: ${cc.totalBricks} units × $${(mat?.cost_per_unit || 0).toFixed(2)} = $${(cc.materialCost || 0).toFixed(2)}${cc.numCourses ? ` | ${cc.numCourses} courses, ${(cc.totalLinearInches / 12).toFixed(1)} LF` : ''}`,
                  `${cc.mortarBags || 0} bags of mortar mix = $${(cc.mortarCost || 0).toFixed(2)} (${(w.mortarGapInches || 0.375)}" gap)`,
                  `Masonry labor: ${(cc.laborHours || 0).toFixed(1)} hrs to lay ${cc.totalBricks} units = $${(cc.laborCost || 0).toFixed(2)}`,
                ];
                const internalLines = w.includeInternalWall ? [
                  `${intMat?.material_name || 'Internal material'}: ${cc.internalTotalBricks} units × $${(intMat?.cost_per_unit || 0).toFixed(2)} = $${(cc.internalMaterialCost || 0).toFixed(2)}`,
                  `${cc.internalMortarBags || 0} bags of mortar = $${(cc.internalMortarCost || 0).toFixed(2)}`,
                  `Internal masonry: ${(cc.internalLaborHours || 0).toFixed(1)} hrs to lay ${cc.internalTotalBricks} units = $${(cc.internalLaborCost || 0).toFixed(2)}`,
                ] : [];
                return (
                <div className="flex flex-col gap-1 mb-4">
                  <div className="flex items-center justify-between mb-1 mt-1">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Outer Wall</div>
                    <CopyGroupButton lines={outerLines} label="Copy Outer Wall" />
                  </div>
                  <div className="mb-2">
                    <span className="text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                      Units: {cc.totalBricks}
                    </span>
                  </div>
                  <CostRow 
                    label="Outer Material" 
                    qtyLabel={mat?.material_name || ''}
                    unit="unit"
                    defaultRate={mat?.cost_per_unit || 0}
                    customRate={mat?.custom_cost_per_unit}
                    onRateChange={(val) => onUpdateWall && onUpdateWall(idx, { selectedMaterial: { ...mat, custom_cost_per_unit: val }})}
                    defaultQty={cc.totalBricks}
                    customQty={mat?.custom_outer_material_qty}
                    onQtyChange={(val) => onUpdateWall && onUpdateWall(idx, { selectedMaterial: { ...mat, custom_outer_material_qty: val }})}
                    qtyUnit="units"
                    calculatedTotal={cc.materialCost || 0}
                    detailText={`${mat?.material_name || 'Material'}: ${cc.totalBricks} units × $${(mat?.cost_per_unit || 0).toFixed(2)} = $${(cc.materialCost || 0).toFixed(2)}${cc.numCourses ? ` | ${cc.numCourses} courses, ${(cc.totalLinearInches / 12).toFixed(1)} LF` : ''}`}
                  />
                  <CostRow 
                    label="Outer Mortar" 
                    unit="bag"
                    defaultRate={10}
                    customRate={mat?.custom_outer_mortar_rate}
                    onRateChange={(val) => onUpdateWall && onUpdateWall(idx, { selectedMaterial: { ...mat, custom_outer_mortar_rate: val }})}
                    defaultQty={cc.mortarBags || 0}
                    customQty={mat?.custom_outer_mortar_qty}
                    onQtyChange={(val) => onUpdateWall && onUpdateWall(idx, { selectedMaterial: { ...mat, custom_outer_mortar_qty: val }})}
                    qtyUnit="bags"
                    calculatedTotal={cc.mortarCost || 0} 
                    detailText={`${cc.mortarBags || 0} bags of mortar mix = $${(cc.mortarCost || 0).toFixed(2)} (${(w.mortarGapInches || 0.375)}" gap)`}
                  />
                  <CostRow 
                    label={`Outer Labor (${cc.laborHours?.toFixed(1)}h)`} 
                    qtyLabel="Outsourced Labor"
                    unit="sqft"
                    defaultRate={45}
                    customRate={mat?.custom_outer_labor_rate}
                    onRateChange={(val) => onUpdateWall && onUpdateWall(idx, { selectedMaterial: { ...mat, custom_outer_labor_rate: val }})}
                    calculatedTotal={cc.laborCost || 0} 
                    detailText={`Masonry labor: ${(cc.laborHours || 0).toFixed(1)} hrs to lay ${cc.totalBricks} units = $${(cc.laborCost || 0).toFixed(2)}`}
                  />
                  
                  {w.includeInternalWall && (
                    <>
                      <div className="flex items-center justify-between mb-1 mt-4 border-t border-slate-200 pt-3">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Internal Wall</div>
                        <CopyGroupButton lines={internalLines} label="Copy Internal Wall" />
                      </div>
                      <div className="mb-2">
                        <span className="text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                          Units: {cc.internalTotalBricks}
                        </span>
                      </div>
                      <CostRow 
                        label="Internal Material" 
                        qtyLabel={intMat?.material_name || ''}
                        unit="unit"
                        defaultRate={intMat?.cost_per_unit || 0}
                        customRate={w.custom_internal_material_cost_per_unit}
                        onRateChange={(val) => onUpdateWall && onUpdateWall(idx, { custom_internal_material_cost_per_unit: val })}
                        defaultQty={cc.internalTotalBricks}
                        customQty={w.custom_internal_material_qty}
                        onQtyChange={(val) => onUpdateWall && onUpdateWall(idx, { custom_internal_material_qty: val })}
                        qtyUnit="units"
                        calculatedTotal={cc.internalMaterialCost || 0}
                        detailText={`${intMat?.material_name || 'Internal material'}: ${cc.internalTotalBricks} units × $${(intMat?.cost_per_unit || 0).toFixed(2)} = $${(cc.internalMaterialCost || 0).toFixed(2)}`}
                      />
                      <CostRow 
                        label="Internal Mortar" 
                        unit="bag"
                        defaultRate={10} 
                        customRate={w.custom_internal_mortar_rate}
                        onRateChange={(val) => onUpdateWall && onUpdateWall(idx, { custom_internal_mortar_rate: val })}
                        defaultQty={cc.internalMortarBags || 0}
                        customQty={w.custom_internal_mortar_qty}
                        onQtyChange={(val) => onUpdateWall && onUpdateWall(idx, { custom_internal_mortar_qty: val })}
                        qtyUnit="bags"
                        calculatedTotal={cc.internalMortarCost || 0} 
                        detailText={`${cc.internalMortarBags || 0} bags of mortar = $${(cc.internalMortarCost || 0).toFixed(2)}`}
                      />
                      <CostRow 
                        label={`Internal Labor (${cc.internalLaborHours?.toFixed(1)}h)`} 
                        qtyLabel="Outsourced Labor"
                        unit="sqft"
                        defaultRate={45} 
                        customRate={w.custom_internal_labor_rate}
                        onRateChange={(val) => onUpdateWall && onUpdateWall(idx, { custom_internal_labor_rate: val })}
                        calculatedTotal={cc.internalLaborCost || 0} 
                        detailText={`Internal masonry: ${(cc.internalLaborHours || 0).toFixed(1)} hrs to lay ${cc.internalTotalBricks} units = $${(cc.internalLaborCost || 0).toFixed(2)}`}
                      />
                    </>
                  )}
                </div>
                );
              })()}
            </div>
          );
        })}

        {walls.length > 0 && totals.wallTotal > 0 && (
          <div className="flex justify-between py-2 border-b font-semibold text-slate-700">
            <span>Walls Total</span>
            <CopyValue value={`$${totals.wallTotal.toFixed(2)}`} className="font-semibold" />
          </div>
        )}

        {polesData.length > 0 && (
          <div className="mt-6">
            <h4 className="text-base font-bold text-slate-800 mb-2">Poles</h4>
            <div className="space-y-3">
              {polesData.map((p, i) => {
                const inv = inventory.find(inv => inv.id === p.pole_id);
                let cost = 0;
                let defaultRate = 0;
                let unitLabel = '';
                let baseQty = 0;
                
                // Total pole length = height above ground + depth in ground.
                const totalPoleInches = (p.height_inches || 0) + (p.y_offset_inches || 0);
                if (inv) {
                   if (inv.pole_pricing_mode === 'stock_price') {
                       const stockLen = (inv.pole_stock_length_ft || 20) * 12;
                       baseQty = Math.ceil(totalPoleInches / stockLen);
                       defaultRate = inv.pole_stock_price || 0;
                       unitLabel = 'piece';
                       
                       const pieces = typeof p.custom_qty === 'number' ? p.custom_qty : baseQty;
                       const rate = typeof p.custom_cost_per_unit === 'number' ? p.custom_cost_per_unit : defaultRate;
                       cost = pieces * rate;
                   } else {
                       baseQty = totalPoleInches / 12;
                       defaultRate = inv.cost_per_unit || 0;
                       unitLabel = 'ft';
                       
                       const ft = typeof p.custom_qty === 'number' ? p.custom_qty : baseQty;
                       const rate = typeof p.custom_cost_per_unit === 'number' ? p.custom_cost_per_unit : defaultRate;
                       cost = ft * rate;
                   }
                }

                // Painting cost
                let paintingCost = 0;
                if (p.include_pole_painting && inv) {
                    const heightFt = totalPoleInches / 12;
                    const paintCostPerLf = parseFloat(settings['pole_paint_cost_per_lf'] || 3.50);
                    const paintLaborPerLf = parseFloat(settings['pole_paint_labor_per_lf'] || 2.50);
                    const w = inv.pole_width_inches || 6;
                    let sizeMult = 1.0;
                    if (w >= 12) sizeMult = parseFloat(settings['pole_paint_size_multiplier_12in'] || 2.0);
                    else if (w >= 10) sizeMult = parseFloat(settings['pole_paint_size_multiplier_10in'] || 1.75);
                    else if (w >= 8) sizeMult = parseFloat(settings['pole_paint_size_multiplier_8in'] || 1.5);
                    else if (w >= 6) sizeMult = parseFloat(settings['pole_paint_size_multiplier_6in'] || 1.25);
                    else sizeMult = parseFloat(settings['pole_paint_size_multiplier_4in'] || 1.0);
                    paintingCost = heightFt * (paintCostPerLf + paintLaborPerLf) * sizeMult;
                }

                const poleQtyDisplay = typeof p.custom_qty === 'number' ? p.custom_qty : Number(baseQty.toFixed(2));
                const poleRateDisplay = typeof p.custom_cost_per_unit === 'number' ? p.custom_cost_per_unit : defaultRate;
                const poleSizeDesc = inv?.pole_shape === 'round'
                  ? `${inv?.pole_width_inches || '?'}" Ø round`
                  : `${inv?.pole_width_inches || '?'}"×${inv?.pole_depth_inches || inv?.pole_width_inches || '?'}" square`;

                return (
                  <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 shadow-sm flex flex-col gap-1">
                    <CostRow 
                      label={`Pole #${i + 1} (${p.height_inches}" height)`} 
                      qtyLabel={inv?.material_name || ''}
                      unit={unitLabel}
                      defaultRate={defaultRate}
                      customRate={p.custom_cost_per_unit}
                      onRateChange={(val) => onUpdatePole && onUpdatePole(i, { custom_cost_per_unit: val })}
                      defaultQty={Number(baseQty.toFixed(2))}
                      customQty={p.custom_qty}
                      onQtyChange={(val) => onUpdatePole && onUpdatePole(i, { custom_qty: val })}
                      qtyUnit={unitLabel === 'piece' ? 'pcs' : 'ft'}
                      calculatedTotal={cost}
                      detailText={`${inv?.material_name || 'Pole'} (${poleSizeDesc}) — ${poleQtyDisplay} ${unitLabel === 'piece' ? 'piece(s)' : 'ft'} × $${poleRateDisplay.toFixed(2)} = $${cost.toFixed(2)} | ${(p.height_inches / 12).toFixed(1)} ft tall, ${(p.y_offset_inches || 0)}" buried`}
                    />
                    {p.include_pole_painting && (
                      <CostRow 
                        label="Pole Painting"
                        qtyLabel={`${(totalPoleInches / 12).toFixed(1)} LF × size multiplier`}
                        readOnly
                        calculatedTotal={paintingCost}
                        detailText={`Painting (paint + labor) for ${(totalPoleInches / 12).toFixed(1)} LF, ${inv?.pole_width_inches || 6}" pole = $${paintingCost.toFixed(2)}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between py-2 border-b font-semibold text-slate-700 mt-2">
              <span>Poles Total</span>
              <CopyValue value={`$${polesTotal.toFixed(2)}`} className="font-semibold" />
            </div>
          </div>
        )}



        <div className="flex justify-between items-center py-3 bg-amber-50 rounded-lg px-3 mt-2">
          <span className="text-lg font-bold text-slate-900">Grand Total</span>
          <CopyValue value={`$${(totals.grand || 0).toFixed(2)}`} className="text-lg font-bold text-amber-700" />
        </div>
      </CardContent>
    </Card>
  );
}