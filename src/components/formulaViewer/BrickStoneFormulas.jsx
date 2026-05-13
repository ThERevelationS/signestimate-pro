import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormulaSection, FormulaLine } from './FormulaSection';

// Brick / Stone wall math:
//   wall_area_sqft  = (wall_length_in × wall_height_in) ÷ 144
//   brick_face_sqft = ((brick_length + mortar_gap) × (brick_height + mortar_gap)) ÷ 144
//   brick_count     = ceil(wall_area / brick_face)
//   mortar_volume   = wall_area × mortar_gap × wall_width   (simplified)
//   material_cost   = brick_count × cost_per_brick
//   mortar_cost     = mortar_volume_cuft × cost_per_cuft
//   labor_hours     = brick_count × minutes_per_brick ÷ 60
//   labor_cost      = labor_hours × labor_rate
export default function BrickStoneFormulas({ settings }) {
  const [v, setV] = useState({
    wall_length_inches: 144,
    wall_height_inches: 48,
    wall_width_inches: 8,
    brick_length_inches: 8,
    brick_height_inches: 4,
    mortar_gap_inches: 0.375,
    cost_per_brick: 1.85,
    mortar_cost_per_cuft: 8.00,
    minutes_per_brick: parseFloat(settings.brick_stone_minutes_per_brick) || 1.5,
    labor_rate: parseFloat(settings.brick_stone_labor_rate) || 55,
  });
  const set = (k, val) => setV(p => ({ ...p, [k]: parseFloat(val) || 0 }));

  const wallAreaSqft = (v.wall_length_inches * v.wall_height_inches) / 144;
  const brickFaceSqft = ((v.brick_length_inches + v.mortar_gap_inches) * (v.brick_height_inches + v.mortar_gap_inches)) / 144;
  const brickCount = brickFaceSqft > 0 ? Math.ceil(wallAreaSqft / brickFaceSqft) : 0;
  const mortarVolumeCuft = (wallAreaSqft * v.mortar_gap_inches * v.wall_width_inches) / 144;
  const materialCost = brickCount * v.cost_per_brick;
  const mortarCost = mortarVolumeCuft * v.mortar_cost_per_cuft;
  const laborHours = (brickCount * v.minutes_per_brick) / 60;
  const laborCost = laborHours * v.labor_rate;
  const totalCost = materialCost + mortarCost + laborCost;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h3 className="font-semibold text-slate-900 mb-4">Demo Values (Editable)</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Wall L (in)</Label><Input type="number" value={v.wall_length_inches} onChange={(e) => set('wall_length_inches', e.target.value)} /></div>
            <div><Label>Wall H (in)</Label><Input type="number" value={v.wall_height_inches} onChange={(e) => set('wall_height_inches', e.target.value)} /></div>
            <div><Label>Wall W (in)</Label><Input type="number" value={v.wall_width_inches} onChange={(e) => set('wall_width_inches', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Brick L (in)</Label><Input type="number" step="0.25" value={v.brick_length_inches} onChange={(e) => set('brick_length_inches', e.target.value)} /></div>
            <div><Label>Brick H (in)</Label><Input type="number" step="0.25" value={v.brick_height_inches} onChange={(e) => set('brick_height_inches', e.target.value)} /></div>
            <div><Label>Mortar Gap (in)</Label><Input type="number" step="0.125" value={v.mortar_gap_inches} onChange={(e) => set('mortar_gap_inches', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Cost / Brick ($)</Label><Input type="number" step="0.05" value={v.cost_per_brick} onChange={(e) => set('cost_per_brick', e.target.value)} /></div>
            <div><Label>Mortar ($/cuft)</Label><Input type="number" step="0.25" value={v.mortar_cost_per_cuft} onChange={(e) => set('mortar_cost_per_cuft', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Min / Brick</Label><Input type="number" step="0.1" value={v.minutes_per_brick} onChange={(e) => set('minutes_per_brick', e.target.value)} /></div>
            <div><Label>Labor Rate ($/hr)</Label><Input type="number" value={v.labor_rate} onChange={(e) => set('labor_rate', e.target.value)} /></div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-lg space-y-3">
        <h3 className="font-semibold text-slate-900">Live Calculations</h3>

        <FormulaSection title="1. Geometry" color="blue">
          <FormulaLine label="Wall area" formula={`(${v.wall_length_inches}" × ${v.wall_height_inches}") ÷ 144`} result={`${wallAreaSqft.toFixed(2)} sq ft`} />
          <FormulaLine label="Brick face (incl. mortar)" formula={`((${v.brick_length_inches} + ${v.mortar_gap_inches}) × (${v.brick_height_inches} + ${v.mortar_gap_inches})) ÷ 144`} result={`${brickFaceSqft.toFixed(4)} sq ft`} />
          <FormulaLine label="Brick count" formula={`⌈${wallAreaSqft.toFixed(2)} ÷ ${brickFaceSqft.toFixed(4)}⌉`} result={`${brickCount} bricks`} highlight />
          <FormulaLine label="Mortar volume" formula={`${wallAreaSqft.toFixed(2)} × ${v.mortar_gap_inches}" × ${v.wall_width_inches}" ÷ 144`} result={`${mortarVolumeCuft.toFixed(3)} cu ft`} />
        </FormulaSection>

        <FormulaSection title="2. Material Costs" color="amber">
          <FormulaLine label="Bricks" formula={`${brickCount} × $${v.cost_per_brick}`} result={`$${materialCost.toFixed(2)}`} highlight />
          <FormulaLine label="Mortar" formula={`${mortarVolumeCuft.toFixed(3)} × $${v.mortar_cost_per_cuft}/cuft`} result={`$${mortarCost.toFixed(2)}`} highlight />
        </FormulaSection>

        <FormulaSection title="3. Labor" color="green">
          <FormulaLine label="Hours" formula={`${brickCount} × ${v.minutes_per_brick} min ÷ 60`} result={`${laborHours.toFixed(2)} hrs`} highlight />
          <FormulaLine label="Cost" formula={`${laborHours.toFixed(2)} × $${v.labor_rate}/hr`} result={`$${laborCost.toFixed(2)}`} highlight />
        </FormulaSection>

        <div className="bg-slate-800 text-white p-3 rounded">
          <h4 className="font-medium mb-2">Final Total</h4>
          <div className="flex justify-between text-sm"><span>Bricks:</span><span>${materialCost.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span>Mortar:</span><span>${mortarCost.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span>Labor:</span><span>${laborCost.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-lg border-t border-slate-600 pt-2 mt-2">
            <span>TOTAL:</span><span>${totalCost.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}