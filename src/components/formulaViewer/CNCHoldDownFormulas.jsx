import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FormulaSection, FormulaLine } from './FormulaSection';
import { evaluateHoldDown, WORKHOLDING_OPTIONS, HOLD_DOWN_MATERIALS } from '@/components/cnc/holdDownCalculator';

// Hold-Down Advisor logic (mirrors components/cnc/holdDownCalculator):
//   risk score = footprint (+1..3) + detail vs cutter (+2..3) + loose pieces (+2)
//              + thin stock (+1) + force proxy (cutter × depth × material) (+1..2)
//              + workholding modifier (−2..+3)
//   risk: ≤2 normal · 3–5 elevated · ≥6 high → enhanced plan
//   tab thickness = clamp(thickness × 0.4, 0.04", 0.12")
//   tab width     = clamp(cutter × 1.5, 0.1875", 0.5")
//   tabs/part     = clamp(⌈perimeter ÷ (high? 4" : 6")⌉, 2–3, 8); spacing = perimeter ÷ tabs
//   onion skin    = per-material (0.02"–0.04"); final pass at 50–60% feed, conventional milling
export default function CNCHoldDownFormulas() {
  const [v, setV] = useState({
    item_type: 'lettering',
    material_type: 'Acrylic',
    material_thickness: '1/2',
    letter_height: 3,
    length: 24,
    width: 12,
    carve_area_sqin: 20,
    carve_depth: 0.25,
    cutter_diameter_in: 0.25,
    smallest_detail_in: 0.3,
    workholding_method: 'vacuum_full',
    creates_loose_pieces: true,
  });
  const set = (k, val) => setV(p => ({ ...p, [k]: val }));

  const result = evaluateHoldDown(v);
  const riskColors = { normal: 'bg-green-100 text-green-800', elevated: 'bg-amber-100 text-amber-800', high: 'bg-red-100 text-red-800' };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h3 className="font-semibold text-slate-900 mb-4">Demo Values (Editable)</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Item Type</Label>
              <Select value={v.item_type} onValueChange={(val) => set('item_type', val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="panel">Panel Cut</SelectItem>
                  <SelectItem value="lettering">Lettering</SelectItem>
                  <SelectItem value="3d_carving">3D Carving</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Material</Label>
              <Select value={v.material_type} onValueChange={(val) => set('material_type', val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(HOLD_DOWN_MATERIALS).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Thickness (e.g. 1/2)</Label><Input value={v.material_thickness} onChange={(e) => set('material_thickness', e.target.value)} /></div>
            <div><Label>Cutter Diameter (in)</Label><Input type="number" step="0.0625" value={v.cutter_diameter_in} onChange={(e) => set('cutter_diameter_in', parseFloat(e.target.value) || 0)} /></div>
          </div>
          {v.item_type === 'panel' && (
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Length (in)</Label><Input type="number" value={v.length} onChange={(e) => set('length', parseFloat(e.target.value) || 0)} /></div>
              <div><Label>Width (in)</Label><Input type="number" value={v.width} onChange={(e) => set('width', parseFloat(e.target.value) || 0)} /></div>
            </div>
          )}
          {v.item_type === 'lettering' && (
            <div><Label>Letter Height (in)</Label><Input type="number" value={v.letter_height} onChange={(e) => set('letter_height', parseFloat(e.target.value) || 0)} /></div>
          )}
          {v.item_type === '3d_carving' && (
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Carve Area (in²)</Label><Input type="number" value={v.carve_area_sqin} onChange={(e) => set('carve_area_sqin', parseFloat(e.target.value) || 0)} /></div>
              <div><Label>Carve Depth (in)</Label><Input type="number" step="0.125" value={v.carve_depth} onChange={(e) => set('carve_depth', parseFloat(e.target.value) || 0)} /></div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Smallest Detail (in)</Label><Input type="number" step="0.0625" value={v.smallest_detail_in} onChange={(e) => set('smallest_detail_in', parseFloat(e.target.value) || 0)} /></div>
            <div>
              <Label>Workholding</Label>
              <Select value={v.workholding_method} onValueChange={(val) => set('workholding_method', val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WORKHOLDING_OPTIONS.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-lg space-y-3">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          Live Recommendation
          {!result.missing.length && <Badge className={riskColors[result.riskLevel]}>{result.riskLevel} risk (score {result.riskScore})</Badge>}
        </h3>

        {result.missing.length > 0 ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
            Missing inputs: {result.missing.join(', ')}
          </div>
        ) : (
          <>
            <FormulaSection title={`Strategy: ${result.strategy === 'enhanced' ? 'ENHANCED hold-down' : 'NORMAL hold-down'}`} color={result.strategy === 'enhanced' ? 'amber' : 'green'}>
              {result.plan.items.map((line, i) => (
                <FormulaLine key={i} label={line.label} result={line.value} />
              ))}
            </FormulaSection>
            <FormulaSection title="Risk Factors" color="blue">
              {result.reasons.map((r, i) => (
                <FormulaLine key={i} label={`Factor ${i + 1}`} result={r} />
              ))}
            </FormulaSection>
          </>
        )}
      </div>
    </div>
  );
}