import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, Download, ClipboardCopy } from 'lucide-react';
import { getConcreteMixes, getConcreteAdmixtures } from '@/pages/NewFoundationEstimate';

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
  qtyUnit
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-1.5 border-b border-slate-100 last:border-0 gap-2">
      <div className="flex flex-col text-sm text-slate-700 min-w-[120px]">
        <span>{label}</span>
        {qtyLabel && <span className="text-[10px] text-slate-500">{qtyLabel}</span>}
      </div>
      <div className="flex items-center gap-3 ml-auto flex-wrap justify-end">
        {onQtyChange && !readOnly && (
          <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded border border-slate-200">
            <Input 
              type="number" 
              className="w-16 h-6 px-1 py-0 text-xs text-right border-none shadow-none focus-visible:ring-0 bg-transparent" 
              value={customQty !== null && customQty !== undefined ? customQty : (defaultQty || 0)} 
              onChange={e => onQtyChange(e.target.value === '' ? null : parseFloat(e.target.value))}
              step="any"
              min="0"
            />
            {qtyUnit && <span className="text-xs text-slate-500 font-medium whitespace-nowrap">{qtyUnit}</span>}
          </div>
        )}
        {!readOnly && onRateChange && (
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
            {unit && <span className="text-xs text-slate-500 font-medium whitespace-nowrap">/ {unit}</span>}
          </div>
        )}
        <div className="w-20 text-right">
          <CopyValue value={`$${calculatedTotal.toFixed(2)}`} className="justify-end" />
        </div>
      </div>
    </div>
  );
}

export default function SummaryTab({ items, walls, totals, calcItemCost, project, polesData = [], selectedEquipmentList = [], inventory = [], onUpdateItem, onUpdateWall, onUpdatePole, onUpdateEquipment }) {
  const polesTotal = totals.polesTotal || 0;
  const [allCopied, setAllCopied] = useState(false);

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
      const label = `Foundation #${idx + 1}${item.description ? ` — ${item.description}` : ''}`;
      lines.push(`${label}: $${c.total.toFixed(2)}`);
      lines.push(`  Rebar: $${c.rebarCost.toFixed(2)}  |  Forming: $${c.formingCost.toFixed(2)}  |  Pouring: $${c.pouringCost.toFixed(2)}  |  Finishing: $${c.finishingCost.toFixed(2)}  |  Excavation: $${c.excavationCost.toFixed(2)}`);
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
      lines.push(`  Truck ${i+1} (${t.yards.toFixed(2)} YD): $${t.cost.toFixed(2)} (Incl. $${t.smallOrderFee} Small Order Fee & $${t.fuelFee} Fuel)`);
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
          if (inv) {
             if (inv.pole_pricing_mode === 'stock_price') {
                 const stockLen = (inv.pole_stock_length_ft || 20) * 12;
                 const pieces = Math.ceil(p.height_inches / stockLen);
                 const rate = typeof p.custom_cost_per_unit === 'number' ? p.custom_cost_per_unit : (inv.pole_stock_price || 0);
                 cost = pieces * rate;
             } else {
                 const rate = typeof p.custom_cost_per_unit === 'number' ? p.custom_cost_per_unit : (inv.cost_per_unit || 0);
                 cost = (p.height_inches / 12) * rate;
             }
          }
          lines.push(`Pole #${i + 1} (${p.height_inches}" height): $${cost.toFixed(2)}`);
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
      rows.push(['Pole', 'Height (in)', 'Cost']);
      polesData.forEach((p, i) => {
          const inv = inventory.find(inv => inv.id === p.pole_id);
          let cost = 0;
          if (inv) {
             if (inv.pole_pricing_mode === 'stock_price') {
                 const stockLen = (inv.pole_stock_length_ft || 20) * 12;
                 const pieces = Math.ceil(p.height_inches / stockLen);
                 const rate = typeof p.custom_cost_per_unit === 'number' ? p.custom_cost_per_unit : (inv.pole_stock_price || 0);
                 cost = pieces * rate;
             } else {
                 const rate = typeof p.custom_cost_per_unit === 'number' ? p.custom_cost_per_unit : (inv.cost_per_unit || 0);
                 cost = (p.height_inches / 12) * rate;
             }
          }
          rows.push([`Pole #${i + 1}`, p.height_inches, cost.toFixed(2)]);
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
        <p className="text-xs text-slate-400 mt-1">Click any cost value to copy it to clipboard.</p>
      </CardHeader>
      <CardContent className="space-y-3">
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
                            <span className="font-semibold">Truck #{idx + 1} ({t.yards.toFixed(2)} YD)</span>
                            <span>{t.smallOrderFee > 0 ? `Includes $${t.smallOrderFee} Small Order Fee + $${t.fuelFee} Fuel Fee` : `Includes $${t.fuelFee} Fuel Fee`}</span>
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

        {items.map((item, idx) => {
          const c = calcItemCost(item);
          const selectedRebar = inventory.find(r => r.material_type === 'rebar' && r.rebar_size === (item.foundation_type === 'spread_foot' ? item.rebar_size : item.pillar_rebar_size));
          const defaultRebarCost = selectedRebar?.cost_per_unit || 0;
          
          const selectedForming = inventory.find(i => i.id === item.selected_forming_id);

          return (
            <div key={item._id} className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
              <div className="flex justify-between items-center text-base font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2">
                <span>Foundation #{idx + 1}{item.description ? ` — ${item.description}` : ''}</span>
                <CopyValue value={`$${c.total.toFixed(2)}`} className="text-base font-bold text-slate-800" />
              </div>
              <div className="flex flex-col gap-1">
                {c.concreteCost > 0 && (
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
                  />
                )}
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
                />
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
                />
                <CostRow 
                  label="Pouring" 
                  unit="hr"
                  defaultRate={60} // default labor rate fallback
                  calculatedTotal={c.pouringCost} 
                />
                <CostRow 
                  label="Finishing" 
                  unit="hr"
                  defaultRate={60} // default labor rate fallback
                  customRate={item.custom_finishing_rate}
                  onRateChange={(val) => onUpdateItem && onUpdateItem(idx, { custom_finishing_rate: val })}
                  defaultQty={Number(c.baseFinishingHours.toFixed(2))}
                  customQty={item.custom_finishing_hours}
                  onQtyChange={(val) => onUpdateItem && onUpdateItem(idx, { custom_finishing_hours: val })}
                  qtyUnit="h"
                  calculatedTotal={c.finishingCost} 
                />
                <CostRow 
                  label="Excavation" 
                  unit="hr"
                  defaultRate={60} // default labor rate fallback
                  customRate={item.custom_excavation_rate}
                  onRateChange={(val) => onUpdateItem && onUpdateItem(idx, { custom_excavation_rate: val })}
                  defaultQty={Number(c.baseExcavationHours.toFixed(2))}
                  customQty={item.custom_excavation_hours}
                  onQtyChange={(val) => onUpdateItem && onUpdateItem(idx, { custom_excavation_hours: val })}
                  qtyUnit="h"
                  calculatedTotal={c.excavationCost} 
                />
              </div>
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
                    />
                    {entry.include_delivery && (
                       <CostRow 
                         label="Delivery Charge"
                         defaultRate={eq.pickup_delivery_cost || 0}
                         customRate={entry.custom_delivery_charge}
                         onRateChange={(val) => onUpdateEquipment && onUpdateEquipment(i, { custom_delivery_charge: val })}
                         calculatedTotal={deliveryCharge}
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

        {walls.length > 0 && <h4 className="text-base font-bold text-slate-800 mt-6 mb-2">Walls</h4>}
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
              
              {cc && (
                <div className="flex flex-col gap-1 mb-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 mt-1">Outer Wall</div>
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
                  />
                  <CostRow 
                    label="Outer Mortar" 
                    unit="bag"
                    defaultRate={10} // default setting fallback
                    customRate={mat?.custom_outer_mortar_rate}
                    onRateChange={(val) => onUpdateWall && onUpdateWall(idx, { selectedMaterial: { ...mat, custom_outer_mortar_rate: val }})}
                    defaultQty={cc.mortarBags || 0}
                    customQty={mat?.custom_outer_mortar_qty}
                    onQtyChange={(val) => onUpdateWall && onUpdateWall(idx, { selectedMaterial: { ...mat, custom_outer_mortar_qty: val }})}
                    qtyUnit="bags"
                    calculatedTotal={cc.mortarCost || 0} 
                  />
                  <CostRow 
                    label={`Outer Labor (${cc.laborHours?.toFixed(1)}h)`} 
                    qtyLabel="Outsourced Labor"
                    unit="sqft"
                    defaultRate={45} // default
                    customRate={mat?.custom_outer_labor_rate}
                    onRateChange={(val) => onUpdateWall && onUpdateWall(idx, { selectedMaterial: { ...mat, custom_outer_labor_rate: val }})}
                    calculatedTotal={cc.laborCost || 0} 
                  />
                  
                  {w.includeInternalWall && (
                    <>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 mt-4 border-t border-slate-200 pt-3">Internal Wall</div>
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
                      />
                      <CostRow 
                        label={`Internal Labor (${cc.internalLaborHours?.toFixed(1)}h)`} 
                        qtyLabel="Outsourced Labor"
                        unit="sqft"
                        defaultRate={45} 
                        customRate={w.custom_internal_labor_rate}
                        onRateChange={(val) => onUpdateWall && onUpdateWall(idx, { custom_internal_labor_rate: val })}
                        calculatedTotal={cc.internalLaborCost || 0} 
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {walls.length > 0 && (
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
                
                if (inv) {
                   if (inv.pole_pricing_mode === 'stock_price') {
                       const stockLen = (inv.pole_stock_length_ft || 20) * 12;
                       baseQty = Math.ceil(p.height_inches / stockLen);
                       defaultRate = inv.pole_stock_price || 0;
                       unitLabel = 'piece';
                       
                       const pieces = typeof p.custom_qty === 'number' ? p.custom_qty : baseQty;
                       const rate = typeof p.custom_cost_per_unit === 'number' ? p.custom_cost_per_unit : defaultRate;
                       cost = pieces * rate;
                   } else {
                       baseQty = p.height_inches / 12;
                       defaultRate = inv.cost_per_unit || 0;
                       unitLabel = 'ft';
                       
                       const ft = typeof p.custom_qty === 'number' ? p.custom_qty : baseQty;
                       const rate = typeof p.custom_cost_per_unit === 'number' ? p.custom_cost_per_unit : defaultRate;
                       cost = ft * rate;
                   }
                }
                return (
                  <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 shadow-sm flex flex-col">
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
                    />
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
          <CopyValue value={`$${totals.grand.toFixed(2)}`} className="text-lg font-bold text-amber-700" />
        </div>
      </CardContent>
    </Card>
  );
}