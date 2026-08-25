import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormulaSection, FormulaLine } from './FormulaSection';
import CNCHoldDownFormulas from './CNCHoldDownFormulas';

// CNC math (mirrors NewCNCEstimate / CNCProject calculations):
//   machine_time_hours = (cut_length / cut_speed_ipm + carve_area / carve_speed) / 60
//   setup_time_hours   = machine_time_hours * setup_time_percentage / 100  (+ optional fixed_setup_hours)
//   machine_cost       = machine_time_hours * machine_rate_per_hour
//   labor_cost         = setup_time_hours   * labor_rate
//   total              = (machine_cost + labor_cost) * quantity
export default function CNCFormulas({ settings }) {
  const [v, setV] = useState({
    item_type: 'panel',
    length: 24,
    width: 12,
    quantity: 1,
    total_cut_length_inches: 144,
    cut_speed_ipm: parseFloat(settings.cnc_default_cut_speed) || 50,
    carve_area_sqin: 0,
    carve_depth: 0.25,
    carve_speed_sqipm: parseFloat(settings.cnc_default_carve_speed) || 10,
    machine_rate_per_hour: parseFloat(settings.cnc_machine_rate_per_hour) || 75,
    labor_rate: parseFloat(settings.cnc_labor_rate) || 45,
    setup_time_percentage: parseFloat(settings.cnc_setup_time_percentage) || 20,
    fixed_setup_hours: parseFloat(settings.cnc_fixed_setup_hours) || 0,
  });
  const set = (k, val) => setV(p => ({ ...p, [k]: parseFloat(val) || 0 }));
  const setStr = (k, val) => setV(p => ({ ...p, [k]: val }));

  const cutMin = v.cut_speed_ipm > 0 ? v.total_cut_length_inches / v.cut_speed_ipm : 0;
  const carveMin = v.carve_speed_sqipm > 0 ? v.carve_area_sqin / v.carve_speed_sqipm : 0;
  const machineMin = cutMin + carveMin;
  const machineHrs = machineMin / 60;
  const setupHrs = (machineHrs * v.setup_time_percentage / 100) + v.fixed_setup_hours;
  const machineCost = machineHrs * v.machine_rate_per_hour;
  const laborCost = setupHrs * v.labor_rate;
  const itemTotal = machineCost + laborCost;
  const projectTotal = itemTotal * v.quantity;

  return (
    <div className="space-y-8">
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h3 className="font-semibold text-slate-900 mb-4">Demo Values (Editable)</h3>
        <div className="space-y-3">
          <div>
            <Label>Item Type</Label>
            <Select value={v.item_type} onValueChange={(val) => setStr('item_type', val)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="panel">Panel Cut</SelectItem>
                <SelectItem value="lettering">Lettering</SelectItem>
                <SelectItem value="3d_carving">3D Carving</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Length (in)</Label><Input type="number" value={v.length} onChange={(e) => set('length', e.target.value)} /></div>
            <div><Label>Width (in)</Label><Input type="number" value={v.width} onChange={(e) => set('width', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Total Cut Length (in)</Label><Input type="number" value={v.total_cut_length_inches} onChange={(e) => set('total_cut_length_inches', e.target.value)} /></div>
            <div><Label>Cut Speed (IPM)</Label><Input type="number" value={v.cut_speed_ipm} onChange={(e) => set('cut_speed_ipm', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Carve Area (sq in)</Label><Input type="number" value={v.carve_area_sqin} onChange={(e) => set('carve_area_sqin', e.target.value)} /></div>
            <div><Label>Carve Speed (sq in/min)</Label><Input type="number" value={v.carve_speed_sqipm} onChange={(e) => set('carve_speed_sqipm', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Machine Rate ($/hr)</Label><Input type="number" value={v.machine_rate_per_hour} onChange={(e) => set('machine_rate_per_hour', e.target.value)} /></div>
            <div><Label>Labor Rate ($/hr)</Label><Input type="number" value={v.labor_rate} onChange={(e) => set('labor_rate', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Setup %</Label><Input type="number" value={v.setup_time_percentage} onChange={(e) => set('setup_time_percentage', e.target.value)} /></div>
            <div><Label>Fixed Setup (hrs)</Label><Input type="number" step="0.1" value={v.fixed_setup_hours} onChange={(e) => set('fixed_setup_hours', e.target.value)} /></div>
            <div><Label>Quantity</Label><Input type="number" value={v.quantity} onChange={(e) => set('quantity', e.target.value)} /></div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-lg space-y-3">
        <h3 className="font-semibold text-slate-900">Live Calculations</h3>

        <FormulaSection title="1. Machine Time" color="blue">
          <FormulaLine label="Cut Time" formula={`${v.total_cut_length_inches}" ÷ ${v.cut_speed_ipm} IPM`} result={`${cutMin.toFixed(3)} min`} />
          <FormulaLine label="Carve Time" formula={`${v.carve_area_sqin} sqin ÷ ${v.carve_speed_sqipm} sqin/min`} result={`${carveMin.toFixed(3)} min`} />
          <FormulaLine label="Total Machine Time" formula={`${cutMin.toFixed(2)} + ${carveMin.toFixed(2)}`} result={`${machineMin.toFixed(3)} min`} />
          <FormulaLine label="Machine Hours" formula={`${machineMin.toFixed(3)} ÷ 60`} result={`${machineHrs.toFixed(4)} hrs`} highlight />
        </FormulaSection>

        <FormulaSection title="2. Setup / Labor Time" color="green">
          <FormulaLine label="Variable Setup" formula={`${machineHrs.toFixed(4)} × ${v.setup_time_percentage}%`} result={`${(machineHrs * v.setup_time_percentage / 100).toFixed(4)} hrs`} />
          <FormulaLine label="Fixed Setup" result={`${v.fixed_setup_hours.toFixed(2)} hrs`} />
          <FormulaLine label="Total Labor Hours" formula={`${(machineHrs * v.setup_time_percentage / 100).toFixed(4)} + ${v.fixed_setup_hours.toFixed(2)}`} result={`${setupHrs.toFixed(4)} hrs`} highlight />
        </FormulaSection>

        <FormulaSection title="3. Cost Breakdown" color="amber">
          <FormulaLine label="Machine Cost" formula={`${machineHrs.toFixed(4)} hrs × $${v.machine_rate_per_hour}/hr`} result={`$${machineCost.toFixed(2)}`} />
          <FormulaLine label="Labor Cost" formula={`${setupHrs.toFixed(4)} hrs × $${v.labor_rate}/hr`} result={`$${laborCost.toFixed(2)}`} />
          <FormulaLine label="Per-Item Total" formula={`$${machineCost.toFixed(2)} + $${laborCost.toFixed(2)}`} result={`$${itemTotal.toFixed(2)}`} />
        </FormulaSection>

        <div className="bg-slate-800 text-white p-3 rounded">
          <h4 className="font-medium mb-2">Final Total</h4>
          <div className="flex justify-between text-sm"><span>Per Item:</span><span>${itemTotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span>Quantity:</span><span>× {v.quantity}</span></div>
          <div className="flex justify-between font-bold text-lg border-t border-slate-600 pt-2 mt-2">
            <span>TOTAL:</span><span>${projectTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>

    <div>
      <h3 className="font-semibold text-slate-900 mb-1">Hold-Down Advisor (advisory only — no cost impact)</h3>
      <p className="text-xs text-slate-500 mb-4">
        Risk score = footprint + detail-vs-cutter + loose pieces + thin stock + cutting-force proxy + workholding modifier.
        Score ≤2 = normal, 3–5 = elevated, ≥6 = high. Elevated/high (or manual flag) triggers the enhanced plan:
        tab width = cutter × 1.5 (0.1875"–0.5"), tab thickness = stock × 0.4 (0.04"–0.12"),
        tabs = ⌈perimeter ÷ 4–6"⌉, plus material-specific onion skin and a slowed conventional final pass.
        Geometry too small to tab falls back to adhesive + onion skin.
      </p>
      <CNCHoldDownFormulas />
    </div>
    </div>
  );
}