import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { FormulaSection, FormulaLine } from './FormulaSection';

// Full-fat Laser formula viewer, modeled after the Paint section.
// Walks through every input → cut time → engrave time → handling →
// machine $ + labor $ + setup, and prints the underlying settings.
//
// Mirrors the math in pages/NewLaserEstimate so what you see here is
// what actually gets calculated when you save an estimate.

const num = (v, fb = 0) => {
  const n = parseFloat(v);
  return isNaN(n) ? fb : n;
};

export default function LaserFormulas({ settings }) {
  const [v, setV] = useState({
    item_type: 'panel',
    material_type: 'Acrylic',
    quantity: 2,
    length: 24,
    width: 12,
    letter_height: 6,
    num_letters: 8,
    engrave_area_sqin: 24,

    cut_speed_ipm: num(settings.laser_default_cut_speed_ipm, 20),
    engrave_speed_sqipm: num(settings.laser_default_engrave_speed_sqipm, 5),

    machine_rate_per_hour: num(settings.laser_machine_rate_per_hour, 100),
    labor_rate: num(settings.laser_labor_rate, 75),
    engraving_machine_rate_per_hour: num(settings.engraving_machine_rate_per_hour, 80),
    engraving_labor_rate: num(settings.engraving_labor_rate, 40),

    parameter_handling_time_percentage: num(settings.parameter_handling_time_percentage, 15),
    engraving_handling_time_percentage: num(settings.engraving_handling_time_percentage, 20),
    fixed_setup_hours: num(settings.laser_fixed_setup_hours, 0),
    fixed_material_setup_cost: num(settings.laser_fixed_material_setup_cost, 0),
  });

  const set = (k, val) => setV(p => ({ ...p, [k]: val }));
  const setN = (k, val) => setV(p => ({ ...p, [k]: parseFloat(val) || 0 }));

  // ---- Step 1: cut length (depends on item type) ----
  let cutLengthIn = 0;
  let cutLengthFormula = '';
  if (v.item_type === 'panel') {
    cutLengthIn = 2 * (v.length + v.width);
    cutLengthFormula = `2 × (${v.length} + ${v.width}) = ${cutLengthIn.toFixed(2)} in`;
  } else if (v.item_type === 'lettering') {
    // ~ letter perimeter ≈ 3.5 × height per letter (matches paint perimeter factor)
    const perimPerLetter = 3.5 * v.letter_height;
    cutLengthIn = perimPerLetter * v.num_letters;
    cutLengthFormula = `(3.5 × ${v.letter_height}) × ${v.num_letters} = ${cutLengthIn.toFixed(2)} in`;
  } else if (v.item_type === 'engraving') {
    cutLengthIn = 0;
    cutLengthFormula = `(engrave-only — no cut)`;
  } else if (v.item_type === 'engrave_and_cut') {
    cutLengthIn = 2 * (v.length + v.width);
    cutLengthFormula = `2 × (${v.length} + ${v.width}) = ${cutLengthIn.toFixed(2)} in`;
  }

  // ---- Step 2: engrave area ----
  let engraveSqIn = 0;
  let engraveFormula = '';
  if (v.item_type === 'engraving' || v.item_type === 'engrave_and_cut') {
    engraveSqIn = v.engrave_area_sqin;
    engraveFormula = `${engraveSqIn} sqin (input)`;
  }

  // ---- Step 3: time math ----
  const cutMinutes = v.cut_speed_ipm > 0 ? cutLengthIn / v.cut_speed_ipm : 0;
  const engraveMinutes = v.engrave_speed_sqipm > 0 ? engraveSqIn / v.engrave_speed_sqipm : 0;
  const machineMinutes = cutMinutes + engraveMinutes;
  const machineHours = machineMinutes / 60;

  // Handling % depends on whether engraving is involved
  const handlingPct =
    v.item_type === 'engraving' || v.item_type === 'engrave_and_cut'
      ? v.engraving_handling_time_percentage
      : v.parameter_handling_time_percentage;
  const handlingHours = machineHours * (handlingPct / 100);

  // Machine + labor rates depend on engraving vs cutting
  const machineRate =
    v.item_type === 'engraving' || v.item_type === 'engrave_and_cut'
      ? v.engraving_machine_rate_per_hour
      : v.machine_rate_per_hour;
  const laborRate =
    v.item_type === 'engraving' || v.item_type === 'engrave_and_cut'
      ? v.engraving_labor_rate
      : v.labor_rate;

  // ---- Step 4: costs (per item, then × quantity) ----
  const perItemMachineCost = machineHours * machineRate;
  const perItemLaborCost = handlingHours * laborRate;
  const totalMachineCost = perItemMachineCost * v.quantity;
  const totalLaborCost = perItemLaborCost * v.quantity;

  // ---- Step 5: fixed project setup ----
  const fixedSetupLaborCost = v.fixed_setup_hours * laborRate;
  const fixedMaterialCost = v.fixed_material_setup_cost;

  const grandTotal = totalMachineCost + totalLaborCost + fixedSetupLaborCost + fixedMaterialCost;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* INPUTS */}
        <div>
          <h3 className="font-semibold text-slate-900 mb-4">Demo Values (Editable)</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Item Type</Label>
                <Select value={v.item_type} onValueChange={(val) => set('item_type', val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="panel">Panel (cut only)</SelectItem>
                    <SelectItem value="lettering">Lettering (cut)</SelectItem>
                    <SelectItem value="engraving">Engraving (only)</SelectItem>
                    <SelectItem value="engrave_and_cut">Engrave + Cut</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Material</Label>
                <Select value={v.material_type} onValueChange={(val) => set('material_type', val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Acrylic">Acrylic</SelectItem>
                    <SelectItem value="Wood">Wood</SelectItem>
                    <SelectItem value="Leather">Leather</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div><Label>Quantity</Label><Input type="number" value={v.quantity} onChange={(e) => setN('quantity', e.target.value)} /></div>
              {(v.item_type === 'panel' || v.item_type === 'engrave_and_cut') && (
                <>
                  <div><Label>Length (in)</Label><Input type="number" value={v.length} onChange={(e) => setN('length', e.target.value)} /></div>
                  <div><Label>Width (in)</Label><Input type="number" value={v.width} onChange={(e) => setN('width', e.target.value)} /></div>
                </>
              )}
              {v.item_type === 'lettering' && (
                <>
                  <div><Label>Letter Height (in)</Label><Input type="number" value={v.letter_height} onChange={(e) => setN('letter_height', e.target.value)} /></div>
                  <div><Label># Letters</Label><Input type="number" value={v.num_letters} onChange={(e) => setN('num_letters', e.target.value)} /></div>
                </>
              )}
              {(v.item_type === 'engraving' || v.item_type === 'engrave_and_cut') && (
                <div className="col-span-2"><Label>Engrave Area (sqin)</Label><Input type="number" value={v.engrave_area_sqin} onChange={(e) => setN('engrave_area_sqin', e.target.value)} /></div>
              )}
            </div>

            <div className="border-t pt-3 space-y-2">
              <h4 className="font-medium text-sm text-slate-700">Speeds</h4>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Cut Speed (in/min)</Label><Input type="number" value={v.cut_speed_ipm} onChange={(e) => setN('cut_speed_ipm', e.target.value)} /></div>
                <div><Label>Engrave Speed (sqin/min)</Label><Input type="number" value={v.engrave_speed_sqipm} onChange={(e) => setN('engrave_speed_sqipm', e.target.value)} /></div>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <h4 className="font-medium text-sm text-slate-700">Rates</h4>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Cutting Machine ($/hr)</Label><Input type="number" value={v.machine_rate_per_hour} onChange={(e) => setN('machine_rate_per_hour', e.target.value)} /></div>
                <div><Label>Cutting Labor ($/hr)</Label><Input type="number" value={v.labor_rate} onChange={(e) => setN('labor_rate', e.target.value)} /></div>
                <div><Label>Engraving Machine ($/hr)</Label><Input type="number" value={v.engraving_machine_rate_per_hour} onChange={(e) => setN('engraving_machine_rate_per_hour', e.target.value)} /></div>
                <div><Label>Engraving Labor ($/hr)</Label><Input type="number" value={v.engraving_labor_rate} onChange={(e) => setN('engraving_labor_rate', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Cut Handling %</Label><Input type="number" value={v.parameter_handling_time_percentage} onChange={(e) => setN('parameter_handling_time_percentage', e.target.value)} /></div>
                <div><Label>Engrave Handling %</Label><Input type="number" value={v.engraving_handling_time_percentage} onChange={(e) => setN('engraving_handling_time_percentage', e.target.value)} /></div>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <h4 className="font-medium text-sm text-slate-700">Project-Level Fixed</h4>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Setup Hours</Label><Input type="number" value={v.fixed_setup_hours} onChange={(e) => setN('fixed_setup_hours', e.target.value)} /></div>
                <div><Label>Material Setup ($)</Label><Input type="number" value={v.fixed_material_setup_cost} onChange={(e) => setN('fixed_material_setup_cost', e.target.value)} /></div>
              </div>
            </div>
          </div>
        </div>

        {/* CALCULATIONS */}
        <div className="bg-slate-50 p-4 rounded-lg space-y-3">
          <h3 className="font-semibold text-slate-900 mb-2">Live Calculations</h3>

          <FormulaSection title="Step 1: Cut Length" color="blue">
            <FormulaLine label={`Item: ${v.item_type}`} result={cutLengthFormula} highlight />
          </FormulaSection>

          {(v.item_type === 'engraving' || v.item_type === 'engrave_and_cut') && (
            <FormulaSection title="Step 2: Engrave Area" color="blue">
              <FormulaLine label="Area" result={engraveFormula} highlight />
            </FormulaSection>
          )}

          <FormulaSection title="Step 3: Machine Time" color="purple">
            <FormulaLine label="Cut Time" formula={`${cutLengthIn.toFixed(2)} ÷ ${v.cut_speed_ipm}`} result={`${cutMinutes.toFixed(2)} min`} />
            <FormulaLine label="Engrave Time" formula={`${engraveSqIn.toFixed(2)} ÷ ${v.engrave_speed_sqipm}`} result={`${engraveMinutes.toFixed(2)} min`} />
            <FormulaLine label="Total Machine" formula={`${cutMinutes.toFixed(2)} + ${engraveMinutes.toFixed(2)}`} result={`${machineMinutes.toFixed(2)} min`} />
            <FormulaLine label="Machine Hours" formula={`${machineMinutes.toFixed(2)} ÷ 60`} result={`${machineHours.toFixed(4)} hrs`} highlight />
          </FormulaSection>

          <FormulaSection title="Step 4: Handling Time" color="purple">
            <FormulaLine label={`Handling % (${v.item_type})`} result={`${handlingPct}%`} />
            <FormulaLine label="Handling Hours" formula={`${machineHours.toFixed(4)} × ${handlingPct}%`} result={`${handlingHours.toFixed(4)} hrs`} highlight />
          </FormulaSection>

          <FormulaSection title="Step 5: Per-Item Costs" color="green">
            <FormulaLine label="Machine Cost" formula={`${machineHours.toFixed(4)} × $${machineRate}`} result={`$${perItemMachineCost.toFixed(2)}`} />
            <FormulaLine label="Labor Cost" formula={`${handlingHours.toFixed(4)} × $${laborRate}`} result={`$${perItemLaborCost.toFixed(2)}`} />
          </FormulaSection>

          <FormulaSection title="Step 6: × Quantity" color="green">
            <FormulaLine label="Machine Total" formula={`$${perItemMachineCost.toFixed(2)} × ${v.quantity}`} result={`$${totalMachineCost.toFixed(2)}`} highlight />
            <FormulaLine label="Labor Total" formula={`$${perItemLaborCost.toFixed(2)} × ${v.quantity}`} result={`$${totalLaborCost.toFixed(2)}`} highlight />
          </FormulaSection>

          {(v.fixed_setup_hours > 0 || v.fixed_material_setup_cost > 0) && (
            <FormulaSection title="Step 7: + Project Fixed" color="amber">
              <FormulaLine label="Setup Labor" formula={`${v.fixed_setup_hours} × $${laborRate}`} result={`$${fixedSetupLaborCost.toFixed(2)}`} />
              <FormulaLine label="Material Setup" result={`$${fixedMaterialCost.toFixed(2)}`} />
            </FormulaSection>
          )}

          <div className="bg-slate-800 text-white p-3 rounded">
            <h4 className="font-medium mb-2">Final Total</h4>
            <div className="flex justify-between text-sm"><span>Machine:</span><span>${totalMachineCost.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span>Labor:</span><span>${(totalLaborCost + fixedSetupLaborCost).toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span>Material Setup:</span><span>${fixedMaterialCost.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-lg border-t border-slate-600 pt-2 mt-2">
              <span>TOTAL:</span><span>${grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CURRENT SETTINGS DUMP */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" /> Current Settings (From Database)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-2">
              <h4 className="font-medium text-slate-800">Cutting Rates</h4>
              <p>Machine Rate: ${num(settings.laser_machine_rate_per_hour, 100).toFixed(2)}/hr</p>
              <p>Labor Rate: ${num(settings.laser_labor_rate, 75).toFixed(2)}/hr</p>
              <p>Handling %: {num(settings.parameter_handling_time_percentage, 15)}%</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-slate-800">Engraving Rates</h4>
              <p>Machine Rate: ${num(settings.engraving_machine_rate_per_hour, 80).toFixed(2)}/hr</p>
              <p>Labor Rate: ${num(settings.engraving_labor_rate, 40).toFixed(2)}/hr</p>
              <p>Handling %: {num(settings.engraving_handling_time_percentage, 20)}%</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-slate-800">Defaults & Setup</h4>
              <p>Cut Speed: {num(settings.laser_default_cut_speed_ipm, 20)} in/min</p>
              <p>Engrave Speed: {num(settings.laser_default_engrave_speed_sqipm, 5)} sqin/min</p>
              <p>Fixed Setup: {num(settings.laser_fixed_setup_hours, 0)} hrs</p>
              <p>Material Setup: ${num(settings.laser_fixed_material_setup_cost, 0).toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}