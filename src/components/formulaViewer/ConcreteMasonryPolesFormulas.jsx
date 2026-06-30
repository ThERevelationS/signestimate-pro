import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { FormulaSection, FormulaLine } from './FormulaSection';

// Full Concrete | Masonry | Poles formula walk-through.
// Mirrors the math in pages/NewFoundationEstimate covering:
//   • Spread Footing volume + excavation
//   • Pillar volume + excavation
//   • Rebar (length & cost) for both
//   • Forming materials + forming labor
//   • Pouring + finishing labor
//   • Pole (steel) cost + optional pole painting
//   • Brick/masonry wall (block count + mortar + labor)
//   • Optional fill material
//
// All toggles are ON by default so the viewer shows every line of math.
//
// NOTE on inventory locations (post-Master-Inventory consolidation):
//   • Concrete ready-mix suppliers (Citywide, Ernst, etc.) → Master Inventory
//     → Labor & Services with service_category = "concrete_service". Each
//     supplier row carries its full pricing matrix: 5 mix prices (3500/4000/
//     4500/5000/Fast Set), 5 admixture add-ons, 5 small-load fee brackets,
//     fuel surcharge, and below-minimum $/CY rate.
//   • Bagged concrete, rebar, forming material, wall materials, wall fill,
//     and wall caps → Master Inventory → Concrete & Stone tab.
//   • Sign poles AND raw extruded metal stock (Angle, Channel, Tube, Flat Bar,
//     Round Bar, I-Beam, H-Beam, Pipe) → Master Inventory → Extruded Metals
//     & Poles tab. Single flat list — no sub-tabs. Pole rows still persist in
//     FoundationInventory (material_type="pole") so the pole geometry +
//     paint-rate fields the estimator depends on remain intact.
//   • EXTRUDED METAL AS POLE: Each Inventory extrusion row carries an
//     `is_pole` toggle. When ON, that row is also exposed to the Concrete |
//     Masonry | Poles estimator as a usable pole. Geometry is auto-derived:
//       - pole_shape:  Tube_Square → square; Tube_Round / Pipe / Round_Bar → round; else square
//       - pole_width:  first numeric token of `size` (e.g. "4x4" → 4")
//       - pole_depth:  second numeric token (e.g. "4x6" → 6")
//       - wall thick:  parsed from `thickness_gauge` ("1/8" → 0.125)
//       - $/ft:        cost_per_unit (forced to per_foot pricing)
//       - paint rate:  falls back to Foundation Setting
//                      pole_paint_cost_per_lf + pole_paint_labor_per_lf × size multiplier
//     The synthesized pole keeps the original Inventory row id, so saved
//     estimates referencing it stay stable.
//   • LEGACY ROW CLEANUP: Old imports wrote permits, labor, trim cap, and
//     sheet/plate stock into the Inventory entity. The Extruded Metals &
//     Poles tab HIDES rows with invalid material_type/product_type and shows
//     a "Clean Up N Legacy Rows" button (admin only) that migrates them:
//       - permits / labor / fees    → LaborServiceInventory
//       - trim cap / parts / paint  → SignPartsSuppliesInventory
//       - sheet / plate / plastic   → DimensionalLetterMaterial (Substrates)
//     Originals are deleted from Inventory after a successful copy.
//   • Sheet metal, plate stock, and plastic sheet → Master Inventory →
//     Substrates tab (NOT Extruded Metals). The Excel importer enforces this
//     routing automatically — any "aluminum/steel/stainless/galvanized
//     sheet|plate" or "plastic sheet|plate" row is sent to
//     DimensionalLetterMaterial.
//   • Sign lighting, hardware, fees / permits / labor, and parts | supplies
//     each have their own dedicated Master Inventory tab + entity, and the
//     Excel importer routes them automatically (see importMappers.js).
//   • Excavation rates / forming labor rates / pouring + finishing labor
//     rates live on the Foundation Settings page.

const num = (v, fb = 0) => {
  const n = parseFloat(v);
  return isNaN(n) ? fb : n;
};

function ToggleRow({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between bg-white border rounded-md px-3 py-2">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function ConcreteMasonryPolesFormulas({ settings }) {
  const [v, setV] = useState({
    foundation_type: 'spread_foot',
    quantity: 1,

    // Spread footing dims
    length_in: 48,
    width_in: 48,
    depth_in: 36,

    // Pillar dims
    diameter_in: 24,
    pillar_depth_in: 60,

    // Costs / rates
    concrete_cost_per_cy: num(settings.concrete_cost_per_cy, 135),
    rebar_cost_per_ft: num(settings.rebar_cost_per_ft, 0.75),
    hand_dig_cost_per_cy: num(settings.hand_dig_excavation_cost_per_cy, 10),
    equipment_excavation_cost_per_cy: num(settings.equipment_excavation_cost_per_cy, 15),
    forming_material_spread: num(settings.forming_materials_cost_spread_foot, 0.5),
    forming_material_pillar: num(settings.forming_materials_cost_pillar, 0.75),
    forming_labor_rate: num(settings.forming_labor_rate, 55),
    pouring_labor_rate: num(settings.pouring_labor_rate, 60),
    finishing_labor_rate: num(settings.finishing_labor_rate, 50),
    excavation_method: 'equipment_excavation',

    // Pole — total length = height above ground + depth in ground
    pole_height_above_in: 84,
    pole_depth_in_ground_in: 36,
    pole_cost_per_ft: 25,
    pole_paint_rate_per_lf: 4,
    include_pole: true,
    include_pole_paint: true,

    // Rebar
    include_rebar: true,
    rebar_spacing_in: 12,

    // Forming / Finishing
    include_forming: true,
    include_finishing: true,

    // Wall (masonry)
    include_wall: true,
    wall_length_in: 96,
    wall_height_in: 48,
    wall_width_in: 8,
    brick_length_in: 16,
    brick_height_in: 8,
    brick_cost_each: 2.5,
    mortar_gap_in: 0.375,
    masonry_labor_per_brick_hrs: 0.05,

    // Fill
    include_fill: true,
    fill_cost_per_cy: 30,
  });

  const set = (k, val) => setV(p => ({ ...p, [k]: val }));
  const setN = (k, val) => setV(p => ({ ...p, [k]: parseFloat(val) || 0 }));

  // ---- Geometry ----
  let volumeCY = 0;
  let volFormula = '';
  let excavationVolCY = 0;
  let formingArea = 0;
  let formingFormula = '';
  let rebarTotalFt = 0;
  let rebarFormula = '';

  if (v.foundation_type === 'spread_foot') {
    const lenFt = v.length_in / 12;
    const widFt = v.width_in / 12;
    const depFt = v.depth_in / 12;
    volumeCY = (lenFt * widFt * depFt) / 27;
    volFormula = `(${lenFt.toFixed(2)}' × ${widFt.toFixed(2)}' × ${depFt.toFixed(2)}') ÷ 27 = ${volumeCY.toFixed(3)} CY`;
    excavationVolCY = volumeCY * 1.25;
    const perimFt = 2 * (lenFt + widFt);
    formingArea = perimFt * depFt;
    formingFormula = `2 × (${lenFt.toFixed(2)}' + ${widFt.toFixed(2)}') × ${depFt.toFixed(2)}' = ${formingArea.toFixed(2)} sqft`;

    if (v.include_rebar && v.rebar_spacing_in > 0) {
      // Grid: bars along length + bars along width
      const barsAlongLen = Math.floor(v.width_in / v.rebar_spacing_in) + 1;
      const barsAlongWid = Math.floor(v.length_in / v.rebar_spacing_in) + 1;
      const totalIn = barsAlongLen * v.length_in + barsAlongWid * v.width_in;
      rebarTotalFt = totalIn / 12;
      rebarFormula = `(${barsAlongLen} × ${v.length_in}" + ${barsAlongWid} × ${v.width_in}") ÷ 12 = ${rebarTotalFt.toFixed(2)} ft`;
    }
  } else {
    // Pillar (round)
    const radIn = v.diameter_in / 2;
    const radFt = radIn / 12;
    const depFt = v.pillar_depth_in / 12;
    volumeCY = (Math.PI * radFt * radFt * depFt) / 27;
    volFormula = `π × ${radFt.toFixed(3)}² × ${depFt.toFixed(2)} ÷ 27 = ${volumeCY.toFixed(3)} CY`;
    excavationVolCY = volumeCY * 1.25;
    const circumFt = (2 * Math.PI * radIn) / 12;
    formingArea = circumFt * depFt;
    formingFormula = `2π × ${radIn}" ÷ 12 × ${depFt.toFixed(2)}' = ${formingArea.toFixed(2)} sqft`;

    if (v.include_rebar) {
      // Vertical bars (4 default) + hoops every 12"
      const verticals = 4;
      const verticalFt = (v.pillar_depth_in / 12) * verticals;
      const hoops = Math.floor(v.pillar_depth_in / 12);
      const hoopFt = hoops * ((2 * Math.PI * (radIn - 2)) / 12);
      rebarTotalFt = verticalFt + hoopFt;
      rebarFormula = `${verticals} × ${(v.pillar_depth_in / 12).toFixed(2)}' + ${hoops} hoops × ${((2 * Math.PI * (radIn - 2)) / 12).toFixed(2)}' = ${rebarTotalFt.toFixed(2)} ft`;
    }
  }

  // ---- Costs ----
  const concreteCost = volumeCY * v.concrete_cost_per_cy * v.quantity;
  const rebarCost = v.include_rebar ? rebarTotalFt * v.rebar_cost_per_ft * v.quantity : 0;
  const excRate = v.excavation_method === 'hand_dig' ? v.hand_dig_cost_per_cy : v.equipment_excavation_cost_per_cy;
  const excavationCost = excavationVolCY * excRate * v.quantity;
  const formingMatRate = v.foundation_type === 'spread_foot' ? v.forming_material_spread : v.forming_material_pillar;
  const formingMatCost = v.include_forming ? formingArea * formingMatRate * v.quantity : 0;
  // Estimated labor hours: forming = 0.15 hrs/sqft, pouring = 0.5 hrs/CY, finishing = 0.4 hrs/CY
  const formingHrs = v.include_forming ? formingArea * 0.15 * v.quantity : 0;
  const formingLaborCost = formingHrs * v.forming_labor_rate;
  const pouringHrs = volumeCY * 0.5 * v.quantity;
  const pouringLaborCost = pouringHrs * v.pouring_labor_rate;
  const finishingHrs = v.include_finishing ? volumeCY * 0.4 * v.quantity : 0;
  const finishingLaborCost = finishingHrs * v.finishing_labor_rate;

  // Pole — total length = height above ground + depth in ground
  const poleTotalIn = (v.pole_height_above_in || 0) + (v.pole_depth_in_ground_in || 0);
  const poleFt = poleTotalIn / 12;
  const poleCost = v.include_pole ? poleFt * v.pole_cost_per_ft * v.quantity : 0;
  const polePaintCost = v.include_pole && v.include_pole_paint ? poleFt * v.pole_paint_rate_per_lf * v.quantity : 0;

  // Wall (masonry) — only if include_wall
  let wallTotalBricks = 0;
  let wallMaterialCost = 0;
  let wallMortarCost = 0;
  let wallLaborCost = 0;
  let wallNumCourses = 0;
  if (v.include_wall) {
    const unitLen = v.brick_length_in + v.mortar_gap_in;
    const unitHt = v.brick_height_in + v.mortar_gap_in;
    const bricksPerRow = Math.ceil(v.wall_length_in / unitLen);
    wallNumCourses = Math.ceil(v.wall_height_in / unitHt);
    wallTotalBricks = bricksPerRow * wallNumCourses;
    wallMaterialCost = wallTotalBricks * v.brick_cost_each;
    // Mortar ≈ $0.50 per brick joint
    wallMortarCost = wallTotalBricks * 0.5;
    wallLaborCost = wallTotalBricks * v.masonry_labor_per_brick_hrs * v.forming_labor_rate;
  }

  // Fill
  const fillCost = v.include_fill && v.foundation_type === 'spread_foot'
    ? excavationVolCY * 0.3 * v.fill_cost_per_cy * v.quantity
    : 0;

  const grandTotal = concreteCost + rebarCost + excavationCost + formingMatCost +
    formingLaborCost + pouringLaborCost + finishingLaborCost +
    poleCost + polePaintCost + wallMaterialCost + wallMortarCost + wallLaborCost + fillCost;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* INPUTS */}
        <div>
          <h3 className="font-semibold text-slate-900 mb-4">Demo Values (Editable)</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Foundation Type</Label>
                <Select value={v.foundation_type} onValueChange={(val) => set('foundation_type', val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spread_foot">Spread Footing</SelectItem>
                    <SelectItem value="pillar">Pillar (Round)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Quantity</Label><Input type="number" value={v.quantity} onChange={(e) => setN('quantity', e.target.value)} /></div>
            </div>

            {v.foundation_type === 'spread_foot' ? (
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Length (in)</Label><Input type="number" value={v.length_in} onChange={(e) => setN('length_in', e.target.value)} /></div>
                <div><Label>Width (in)</Label><Input type="number" value={v.width_in} onChange={(e) => setN('width_in', e.target.value)} /></div>
                <div><Label>Depth (in)</Label><Input type="number" value={v.depth_in} onChange={(e) => setN('depth_in', e.target.value)} /></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Diameter (in)</Label><Input type="number" value={v.diameter_in} onChange={(e) => setN('diameter_in', e.target.value)} /></div>
                <div><Label>Depth (in)</Label><Input type="number" value={v.pillar_depth_in} onChange={(e) => setN('pillar_depth_in', e.target.value)} /></div>
              </div>
            )}

            <div>
              <Label>Excavation Method</Label>
              <Select value={v.excavation_method} onValueChange={(val) => set('excavation_method', val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hand_dig">Hand Dig</SelectItem>
                  <SelectItem value="equipment_excavation">Equipment Excavation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-3 space-y-2">
              <h4 className="font-medium text-sm text-slate-700">Concrete & Rebar Rates</h4>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Concrete ($/CY)</Label><Input type="number" value={v.concrete_cost_per_cy} onChange={(e) => setN('concrete_cost_per_cy', e.target.value)} /></div>
                <div><Label>Rebar ($/ft)</Label><Input type="number" value={v.rebar_cost_per_ft} onChange={(e) => setN('rebar_cost_per_ft', e.target.value)} /></div>
                <div><Label>Hand Dig ($/CY)</Label><Input type="number" value={v.hand_dig_cost_per_cy} onChange={(e) => setN('hand_dig_cost_per_cy', e.target.value)} /></div>
                <div><Label>Equipment ($/CY)</Label><Input type="number" value={v.equipment_excavation_cost_per_cy} onChange={(e) => setN('equipment_excavation_cost_per_cy', e.target.value)} /></div>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <h4 className="font-medium text-sm text-slate-700">Forming / Labor Rates</h4>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Forming Spread ($/sqft)</Label><Input type="number" value={v.forming_material_spread} onChange={(e) => setN('forming_material_spread', e.target.value)} /></div>
                <div><Label>Forming Pillar ($/sqft)</Label><Input type="number" value={v.forming_material_pillar} onChange={(e) => setN('forming_material_pillar', e.target.value)} /></div>
                <div><Label>Forming Labor ($/hr)</Label><Input type="number" value={v.forming_labor_rate} onChange={(e) => setN('forming_labor_rate', e.target.value)} /></div>
                <div><Label>Pouring Labor ($/hr)</Label><Input type="number" value={v.pouring_labor_rate} onChange={(e) => setN('pouring_labor_rate', e.target.value)} /></div>
                <div><Label>Finishing Labor ($/hr)</Label><Input type="number" value={v.finishing_labor_rate} onChange={(e) => setN('finishing_labor_rate', e.target.value)} /></div>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <h4 className="font-medium text-sm text-slate-700">Pole</h4>
              <ToggleRow label="Include Pole" checked={v.include_pole} onChange={(c) => set('include_pole', c)} />
              <ToggleRow label="Include Pole Paint" checked={v.include_pole_paint} onChange={(c) => set('include_pole_paint', c)} />
              {v.include_pole && (
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Height Above Ground (in)</Label><Input type="number" value={v.pole_height_above_in} onChange={(e) => setN('pole_height_above_in', e.target.value)} /></div>
                  <div><Label>Depth in Ground (in)</Label><Input type="number" value={v.pole_depth_in_ground_in} onChange={(e) => setN('pole_depth_in_ground_in', e.target.value)} /></div>
                  <div><Label>Pole ($/ft)</Label><Input type="number" value={v.pole_cost_per_ft} onChange={(e) => setN('pole_cost_per_ft', e.target.value)} /></div>
                  <div><Label>Paint ($/LF)</Label><Input type="number" value={v.pole_paint_rate_per_lf} onChange={(e) => setN('pole_paint_rate_per_lf', e.target.value)} /></div>
                </div>
              )}
            </div>

            <div className="border-t pt-3 space-y-2">
              <h4 className="font-medium text-sm text-slate-700">Rebar / Forming / Finishing</h4>
              <ToggleRow label="Include Rebar" checked={v.include_rebar} onChange={(c) => set('include_rebar', c)} />
              {v.include_rebar && <div><Label>Rebar Spacing (in)</Label><Input type="number" value={v.rebar_spacing_in} onChange={(e) => setN('rebar_spacing_in', e.target.value)} /></div>}
              <ToggleRow label="Include Forming" checked={v.include_forming} onChange={(c) => set('include_forming', c)} />
              <ToggleRow label="Include Finishing" checked={v.include_finishing} onChange={(c) => set('include_finishing', c)} />
            </div>

            <div className="border-t pt-3 space-y-2">
              <h4 className="font-medium text-sm text-slate-700">Masonry Wall</h4>
              <ToggleRow label="Include Wall" checked={v.include_wall} onChange={(c) => set('include_wall', c)} />
              {v.include_wall && (
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Wall Length (in)</Label><Input type="number" value={v.wall_length_in} onChange={(e) => setN('wall_length_in', e.target.value)} /></div>
                  <div><Label>Wall Height (in)</Label><Input type="number" value={v.wall_height_in} onChange={(e) => setN('wall_height_in', e.target.value)} /></div>
                  <div><Label>Brick L (in)</Label><Input type="number" value={v.brick_length_in} onChange={(e) => setN('brick_length_in', e.target.value)} /></div>
                  <div><Label>Brick H (in)</Label><Input type="number" value={v.brick_height_in} onChange={(e) => setN('brick_height_in', e.target.value)} /></div>
                  <div><Label>Brick Cost ($)</Label><Input type="number" value={v.brick_cost_each} onChange={(e) => setN('brick_cost_each', e.target.value)} /></div>
                  <div><Label>Mortar Gap (in)</Label><Input type="number" value={v.mortar_gap_in} onChange={(e) => setN('mortar_gap_in', e.target.value)} /></div>
                  <div><Label>Labor (hrs/brick)</Label><Input type="number" step="0.01" value={v.masonry_labor_per_brick_hrs} onChange={(e) => setN('masonry_labor_per_brick_hrs', e.target.value)} /></div>
                </div>
              )}
            </div>

            <div className="border-t pt-3 space-y-2">
              <h4 className="font-medium text-sm text-slate-700">Fill</h4>
              <ToggleRow label="Include Fill Material" checked={v.include_fill} onChange={(c) => set('include_fill', c)} />
              {v.include_fill && <div><Label>Fill Cost ($/CY)</Label><Input type="number" value={v.fill_cost_per_cy} onChange={(e) => setN('fill_cost_per_cy', e.target.value)} /></div>}
            </div>
          </div>
        </div>

        {/* CALCULATIONS */}
        <div className="bg-slate-50 p-4 rounded-lg space-y-3">
          <h3 className="font-semibold text-slate-900 mb-2">Live Calculations</h3>

          <FormulaSection title="Step 1: Volume" color="blue">
            <FormulaLine label={`${v.foundation_type === 'spread_foot' ? 'Box volume' : 'Cylinder volume'}`} result={volFormula} highlight />
            <FormulaLine label="Excavation Vol (×1.25)" formula={`${volumeCY.toFixed(3)} × 1.25`} result={`${excavationVolCY.toFixed(3)} CY`} />
          </FormulaSection>

          <FormulaSection title="Step 2: Concrete & Excavation" color="green">
            <FormulaLine label="Concrete" formula={`${volumeCY.toFixed(3)} × $${v.concrete_cost_per_cy} × ${v.quantity}`} result={`$${concreteCost.toFixed(2)}`} highlight />
            <FormulaLine label={`Excavation (${v.excavation_method})`} formula={`${excavationVolCY.toFixed(3)} × $${excRate} × ${v.quantity}`} result={`$${excavationCost.toFixed(2)}`} highlight />
          </FormulaSection>

          {v.include_rebar && (
            <FormulaSection title="Step 3: Rebar" color="amber">
              <FormulaLine label="Total length" result={rebarFormula} />
              <FormulaLine label="Cost" formula={`${rebarTotalFt.toFixed(2)} × $${v.rebar_cost_per_ft} × ${v.quantity}`} result={`$${rebarCost.toFixed(2)}`} highlight />
            </FormulaSection>
          )}

          {v.include_forming && (
            <FormulaSection title="Step 4: Forming" color="purple">
              <FormulaLine label="Forming Area" result={formingFormula} />
              <FormulaLine label="Material Cost" formula={`${formingArea.toFixed(2)} × $${formingMatRate} × ${v.quantity}`} result={`$${formingMatCost.toFixed(2)}`} />
              <FormulaLine label="Labor (0.15 hrs/sqft)" formula={`${formingHrs.toFixed(2)} × $${v.forming_labor_rate}`} result={`$${formingLaborCost.toFixed(2)}`} highlight />
            </FormulaSection>
          )}

          <FormulaSection title="Step 5: Pouring Labor" color="purple">
            <FormulaLine label="Pouring (0.5 hrs/CY)" formula={`${pouringHrs.toFixed(2)} × $${v.pouring_labor_rate}`} result={`$${pouringLaborCost.toFixed(2)}`} highlight />
          </FormulaSection>

          {v.include_finishing && (
            <FormulaSection title="Step 6: Finishing Labor" color="purple">
              <FormulaLine label="Finishing (0.4 hrs/CY)" formula={`${finishingHrs.toFixed(2)} × $${v.finishing_labor_rate}`} result={`$${finishingLaborCost.toFixed(2)}`} highlight />
            </FormulaSection>
          )}

          {v.include_pole && (
            <FormulaSection title="Step 7: Pole" color="indigo">
              <FormulaLine label="Total Pole Length" formula={`(${v.pole_height_above_in}" above + ${v.pole_depth_in_ground_in}" in ground) ÷ 12`} result={`${poleFt.toFixed(2)} ft`} highlight />
              <FormulaLine label="(Depth in ground EXTENDS the pole — it is added to the above-ground height)" />
              <FormulaLine label="Pole Cost" formula={`${poleFt.toFixed(2)} × $${v.pole_cost_per_ft} × ${v.quantity}`} result={`$${poleCost.toFixed(2)}`} highlight />
              {v.include_pole_paint && (
                <FormulaLine label="Paint" formula={`${poleFt.toFixed(2)} × $${v.pole_paint_rate_per_lf} × ${v.quantity}`} result={`$${polePaintCost.toFixed(2)}`} highlight />
              )}
            </FormulaSection>
          )}

          {v.include_wall && (
            <FormulaSection title="Step 8: Masonry Wall" color="teal">
              <FormulaLine label="Courses" result={`${wallNumCourses}`} />
              <FormulaLine label="Total Bricks" result={`${wallTotalBricks}`} />
              <FormulaLine label="Brick Material" formula={`${wallTotalBricks} × $${v.brick_cost_each}`} result={`$${wallMaterialCost.toFixed(2)}`} />
              <FormulaLine label="Mortar" formula={`${wallTotalBricks} × $0.50`} result={`$${wallMortarCost.toFixed(2)}`} />
              <FormulaLine label="Labor" formula={`${wallTotalBricks} × ${v.masonry_labor_per_brick_hrs} × $${v.forming_labor_rate}`} result={`$${wallLaborCost.toFixed(2)}`} highlight />
            </FormulaSection>
          )}

          {v.include_fill && v.foundation_type === 'spread_foot' && (
            <FormulaSection title="Step 9: Fill" color="rose">
              <FormulaLine label="Fill Volume (30% of exc)" formula={`${excavationVolCY.toFixed(3)} × 0.3`} result={`${(excavationVolCY * 0.3).toFixed(3)} CY`} />
              <FormulaLine label="Fill Cost" formula={`${(excavationVolCY * 0.3).toFixed(3)} × $${v.fill_cost_per_cy} × ${v.quantity}`} result={`$${fillCost.toFixed(2)}`} highlight />
            </FormulaSection>
          )}

          <div className="bg-slate-800 text-white p-3 rounded">
            <h4 className="font-medium mb-2">Final Total</h4>
            <div className="flex justify-between text-sm"><span>Concrete:</span><span>${concreteCost.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span>Excavation:</span><span>${excavationCost.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span>Rebar:</span><span>${rebarCost.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span>Forming (M+L):</span><span>${(formingMatCost + formingLaborCost).toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span>Pouring + Finishing:</span><span>${(pouringLaborCost + finishingLaborCost).toFixed(2)}</span></div>
            {v.include_pole && <div className="flex justify-between text-sm"><span>Pole + Paint:</span><span>${(poleCost + polePaintCost).toFixed(2)}</span></div>}
            {v.include_wall && <div className="flex justify-between text-sm"><span>Wall:</span><span>${(wallMaterialCost + wallMortarCost + wallLaborCost).toFixed(2)}</span></div>}
            {v.include_fill && <div className="flex justify-between text-sm"><span>Fill:</span><span>${fillCost.toFixed(2)}</span></div>}
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
              <h4 className="font-medium text-slate-800">Concrete & Rebar</h4>
              <p>Concrete: ${num(settings.concrete_cost_per_cy, 135).toFixed(2)}/CY</p>
              <p>Rebar: ${num(settings.rebar_cost_per_ft, 0.75).toFixed(2)}/ft</p>
              <p>Hand Dig: ${num(settings.hand_dig_excavation_cost_per_cy, 10).toFixed(2)}/CY</p>
              <p>Equipment Exc: ${num(settings.equipment_excavation_cost_per_cy, 15).toFixed(2)}/CY</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-slate-800">Forming</h4>
              <p>Spread Foot Forming: ${num(settings.forming_materials_cost_spread_foot, 0.5).toFixed(2)}/sqft</p>
              <p>Pillar Forming: ${num(settings.forming_materials_cost_pillar, 0.75).toFixed(2)}/sqft</p>
              <p>Min Excavation: {num(settings.min_excavation_time_hours, 1).toFixed(2)} hrs</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-slate-800">Labor Rates</h4>
              <p>Forming: ${num(settings.forming_labor_rate, 55).toFixed(2)}/hr</p>
              <p>Pouring: ${num(settings.pouring_labor_rate, 60).toFixed(2)}/hr</p>
              <p>Finishing: ${num(settings.finishing_labor_rate, 50).toFixed(2)}/hr</p>
              <p>Hand Dig Labor: ${num(settings.hand_dig_labor_rate, 45).toFixed(2)}/hr</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}