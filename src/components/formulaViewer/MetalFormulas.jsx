import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormulaSection, FormulaLine } from './FormulaSection';

// Metal Fabrication math (mirrors MetalProject):
//   material_cost  = (material_length_ft) × (cost_per_unit) × quantity   [or per_piece/per_pound/sqft]
//   fab_cost       = fabrication_hours × fabrication_rate × quantity
//   weld_cost      = welding_hours × welding_rate × quantity
//   finish_cost    = finishing_hours × finishing_rate × quantity
//   supplies_cost  = (material_cost + labor_cost) × supplies_percent
//   total          = material + fab + weld + finish + supplies
export default function MetalFormulas({ settings }) {
  const [v, setV] = useState({
    quantity: 1,
    material_length_ft: 12,
    material_cost_per_ft: 8.50,
    fabrication_hours: 1.5,
    welding_hours: 0.75,
    finishing_hours: 1.0,
    fabrication_rate: parseFloat(settings.metal_fabrication_rate) || 65,
    welding_rate: parseFloat(settings.metal_welding_rate) || 75,
    finishing_rate: parseFloat(settings.metal_finishing_rate) || 55,
    supplies_percent: parseFloat(settings.metal_supplies_percent) || 8,
  });
  const set = (k, val) => setV(p => ({ ...p, [k]: parseFloat(val) || 0 }));

  const materialCost = v.material_length_ft * v.material_cost_per_ft * v.quantity;
  const fabCost = v.fabrication_hours * v.fabrication_rate * v.quantity;
  const weldCost = v.welding_hours * v.welding_rate * v.quantity;
  const finishCost = v.finishing_hours * v.finishing_rate * v.quantity;
  const laborTotal = fabCost + weldCost + finishCost;
  const suppliesCost = (materialCost + laborTotal) * (v.supplies_percent / 100);
  const total = materialCost + laborTotal + suppliesCost;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h3 className="font-semibold text-slate-900 mb-4">Demo Values (Editable)</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Quantity</Label><Input type="number" value={v.quantity} onChange={(e) => set('quantity', e.target.value)} /></div>
            <div><Label>Material Length (ft)</Label><Input type="number" value={v.material_length_ft} onChange={(e) => set('material_length_ft', e.target.value)} /></div>
          </div>
          <div><Label>Material Cost ($/ft)</Label><Input type="number" step="0.01" value={v.material_cost_per_ft} onChange={(e) => set('material_cost_per_ft', e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Fab Hours</Label><Input type="number" step="0.25" value={v.fabrication_hours} onChange={(e) => set('fabrication_hours', e.target.value)} /></div>
            <div><Label>Weld Hours</Label><Input type="number" step="0.25" value={v.welding_hours} onChange={(e) => set('welding_hours', e.target.value)} /></div>
            <div><Label>Finish Hours</Label><Input type="number" step="0.25" value={v.finishing_hours} onChange={(e) => set('finishing_hours', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Fab Rate ($/hr)</Label><Input type="number" value={v.fabrication_rate} onChange={(e) => set('fabrication_rate', e.target.value)} /></div>
            <div><Label>Weld Rate ($/hr)</Label><Input type="number" value={v.welding_rate} onChange={(e) => set('welding_rate', e.target.value)} /></div>
            <div><Label>Finish Rate ($/hr)</Label><Input type="number" value={v.finishing_rate} onChange={(e) => set('finishing_rate', e.target.value)} /></div>
          </div>
          <div><Label>Supplies % (of material + labor)</Label><Input type="number" step="0.5" value={v.supplies_percent} onChange={(e) => set('supplies_percent', e.target.value)} /></div>
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-lg space-y-3">
        <h3 className="font-semibold text-slate-900">Live Calculations</h3>

        <FormulaSection title="1. Material Cost" color="blue">
          <FormulaLine label="Material" formula={`${v.material_length_ft} ft × $${v.material_cost_per_ft}/ft × ${v.quantity} qty`} result={`$${materialCost.toFixed(2)}`} highlight />
        </FormulaSection>

        <FormulaSection title="2. Labor Costs" color="green">
          <FormulaLine label="Fabrication" formula={`${v.fabrication_hours} hrs × $${v.fabrication_rate}/hr × ${v.quantity}`} result={`$${fabCost.toFixed(2)}`} />
          <FormulaLine label="Welding" formula={`${v.welding_hours} hrs × $${v.welding_rate}/hr × ${v.quantity}`} result={`$${weldCost.toFixed(2)}`} />
          <FormulaLine label="Finishing" formula={`${v.finishing_hours} hrs × $${v.finishing_rate}/hr × ${v.quantity}`} result={`$${finishCost.toFixed(2)}`} />
          <FormulaLine label="Total Labor" formula={`$${fabCost.toFixed(2)} + $${weldCost.toFixed(2)} + $${finishCost.toFixed(2)}`} result={`$${laborTotal.toFixed(2)}`} highlight />
        </FormulaSection>

        <FormulaSection title="3. Supplies (Consumables)" color="amber">
          <FormulaLine label="Supplies" formula={`($${materialCost.toFixed(2)} + $${laborTotal.toFixed(2)}) × ${v.supplies_percent}%`} result={`$${suppliesCost.toFixed(2)}`} highlight />
        </FormulaSection>

        <div className="bg-slate-800 text-white p-3 rounded">
          <h4 className="font-medium mb-2">Final Total</h4>
          <div className="flex justify-between text-sm"><span>Material:</span><span>${materialCost.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span>Labor:</span><span>${laborTotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span>Supplies:</span><span>${suppliesCost.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-lg border-t border-slate-600 pt-2 mt-2">
            <span>TOTAL:</span><span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}