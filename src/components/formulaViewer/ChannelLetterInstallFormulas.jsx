import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { FormulaSection, FormulaLine } from './FormulaSection';

// Channel Letter Installation math (mirrors components/channelLetterInstall/installCalculator.js)
// Walks through:
//   1. Base minutes (per letter, by size and type)
//   2. + Thick/hollow walls additive
//   3. + Parapet additive (roof or drop)
//   4. Height — baked into the size × height-bucket × env base rates (no multiplier)
//   5. × Wall material multiplier
//   6. × Escort / badging / after-hours / set-hours multipliers
//   7. + Poor site access severity additive
//   8. + Poor electrical access severity additive
//   9. Labor cost = total hours × labor rate
//  10. + Materials cost
const SIZE_DEFAULTS = {
  flush_mount: { extra_small:[15,30,5], small:[30,60,10], medium:[50,100,15], large:[80,160,20], extra_large:[120,240,25], extra_extra_large:[170,340,30] },
  halo_lit:    { extra_small:[15,30,5], small:[30,60,10], medium:[50,100,15], large:[80,160,20], extra_large:[120,240,25], extra_extra_large:[170,340,30] },
  dimensional_lettering: { extra_small:[10,20,0], small:[20,45,0], medium:[40,80,0], large:[65,130,0], extra_large:[100,200,0], extra_extra_large:[140,280,0] },
};
const SEVERITY_DEFAULTS = { 1:3, 2:6, 3:10, 4:15, 5:20, 6:28, 7:38, 8:50, 9:65, 10:90 };

export default function ChannelLetterInstallFormulas({ settings }) {
  const [v, setV] = useState({
    installation_type: 'flush_mount',
    qty_letters: 10,
    letter_size: 'medium',
    installation_height_feet: 14,
    raceway_length_feet: 0,
    wall_material: 'eifs',
    // All site/condition toggles default ON so the viewer shows every step.
    thick_hollow_walls: true,
    parapet: true,
    parapet_electrical_routing: 'roof',
    escort_required: true,
    badging_checkin: true,
    after_hours_weekend: true,
    set_hours_installation: true,
    poor_site_access: true,
    poor_site_access_severity: 3,
    poor_electrical_access: true,
    poor_electrical_severity: 3,
    materials_cost: 250,
    labor_rate: parseFloat(settings.install_labor_rate) || 65,

    // ---- Letters Purchase inputs (everything the Letters tab calculates) ----
    letter_type: 'channel_flush_mounted',
    letters_qty: 10,
    letters_size_value: 24,            // vertical inches (channel) / sqft (logo) / ft (raceway)
    letters_unit_cost: 9.03,           // per-inch flush default
    letters_delivery_fee: 90,
    letters_design_fee: 150,
    letters_install_supplies_fee: 100,
    letters_permitting_fee: 750,
    letters_other_fee: 0,
    letters_markup_percent: 86.2,
  });
  const set = (k, val) => setV(p => ({ ...p, [k]: val }));
  const setNum = (k, val) => setV(p => ({ ...p, [k]: parseFloat(val) || 0 }));

  // ---- Step 1: base minutes per letter ----
  const defs = SIZE_DEFAULTS[v.installation_type]?.[v.letter_size] || [50, 100, 15];
  const drill = defs[0], prep = defs[1], elec = defs[2];
  const minPerLetter = drill + prep + elec;

  let stepHours = 0;
  let log = [];

  if (v.installation_type === 'raceway') {
    const basePerFt = parseFloat(settings.install_raceway_base_minutes_per_foot) || 30;
    const extraPerFt = parseFloat(settings.install_raceway_extra_minutes_per_foot) || 0;
    const racewayMinPerFt = basePerFt + extraPerFt;
    const mountingMin = parseFloat(settings.install_raceway_letter_mounting_rate) || 18;
    const hookupMin = parseFloat(settings.install_raceway_electrical_hookup_minutes) || 30;
    const totalMin = v.raceway_length_feet * racewayMinPerFt + v.qty_letters * mountingMin + hookupMin;
    stepHours = totalMin / 60;
    log.push({ label: 'Raceway minutes', formula: `${v.raceway_length_feet}ft × ${racewayMinPerFt} + ${v.qty_letters} × ${mountingMin} + ${hookupMin}`, result: `${totalMin.toFixed(1)} min` });
    log.push({ label: 'Base hours', result: `${stepHours.toFixed(3)} hrs` });
  } else {
    const baseMin = v.qty_letters * minPerLetter;
    stepHours = baseMin / 60;
    log.push({ label: `Per-letter min (${v.installation_type}/${v.letter_size})`, formula: `${drill} drill + ${prep} prep + ${elec} elec`, result: `${minPerLetter} min/letter` });
    log.push({ label: 'Base hours', formula: `${v.qty_letters} × ${minPerLetter} ÷ 60`, result: `${stepHours.toFixed(3)} hrs` });
  }

  const baseHoursBeforeMods = stepHours;

  // ---- Step 2: thick / hollow walls additive ----
  let thickAdd = 0;
  if (v.thick_hollow_walls) {
    const perLetterMin = parseFloat(settings.install_thick_walls_extra_per_letter) || 8;
    const perRacewayMin = parseFloat(settings.install_thick_walls_extra_per_raceway) || 30;
    thickAdd = (v.qty_letters * perLetterMin) / 60;
    if (v.installation_type === 'raceway') thickAdd += perRacewayMin / 60;
    stepHours += thickAdd;
  }

  // ---- Step 3: parapet additive ----
  let parapetAdd = 0;
  if (v.parapet) {
    const routing = v.parapet_electrical_routing === 'drop' ? 'drop' : 'roof';
    const perLetterMin = parseFloat(settings[routing === 'drop' ? 'install_parapet_drop_extra_per_letter' : 'install_parapet_roof_extra_per_letter']) || (routing === 'drop' ? 18 : 10);
    const perRacewayMin = parseFloat(settings[routing === 'drop' ? 'install_parapet_drop_extra_per_raceway' : 'install_parapet_roof_extra_per_raceway']) || (routing === 'drop' ? 65 : 40);
    parapetAdd = (v.qty_letters * perLetterMin) / 60;
    if (v.installation_type === 'raceway') parapetAdd += perRacewayMin / 60;
    stepHours += parapetAdd;
  }

  // ---- Step 4: height — NO multiplier ----
  // Install height is baked into the per-size base rates (size × height bucket ×
  // interior/exterior), exactly like the live calculator. No extra multiplier.

  // ---- Step 5: wall material multiplier ----
  const wallKey = `install_wall_material_${v.wall_material}_multiplier`;
  const wallMult = parseFloat(settings[wallKey]) || 1.0;
  const beforeWall = stepHours;
  stepHours *= wallMult;

  // ---- Step 6: site condition multipliers ----
  const escortMult = v.escort_required ? (parseFloat(settings.install_escort_multiplier) || 1.15) : 1;
  const badgingMult = v.badging_checkin ? (parseFloat(settings.install_badging_multiplier) || 1.1) : 1;
  const afterMult = v.after_hours_weekend ? (parseFloat(settings.install_after_hours_multiplier) || 1.5) : 1;
  const setHoursMult = v.set_hours_installation ? (parseFloat(settings.install_set_hours_multiplier) || 1.15) : 1;
  const combinedSiteMult = escortMult * badgingMult * afterMult * setHoursMult;
  const beforeSite = stepHours;
  stepHours *= combinedSiteMult;

  // ---- Step 7: poor site access additive ----
  let siteAccessAdd = 0;
  if (v.poor_site_access) {
    const level = Math.max(1, Math.min(10, v.poor_site_access_severity));
    const bonus = parseFloat(settings[`install_site_access_level_${level}`]) || SEVERITY_DEFAULTS[level];
    siteAccessAdd = (v.qty_letters * bonus) / 60;
    stepHours += siteAccessAdd;
  }

  // ---- Step 8: poor electrical additive (not for raceway/dimensional) ----
  let elecAdd = 0;
  if (v.poor_electrical_access && v.installation_type !== 'raceway' && v.installation_type !== 'dimensional_lettering') {
    const level = Math.max(1, Math.min(10, v.poor_electrical_severity));
    const bonus = parseFloat(settings[`install_poor_electrical_level_${level}`]) || SEVERITY_DEFAULTS[level];
    elecAdd = (v.qty_letters * bonus) / 60;
    stepHours += elecAdd;
  }

  const totalHours = stepHours;
  const laborCost = totalHours * v.labor_rate;
  const installTotalCost = laborCost + v.materials_cost;

  // ============================================================
  // LETTERS PURCHASE MATH (mirrors components/channelLetterInstall/lettersCalculator.js)
  // ============================================================
  const lettersBaseTotal = v.letters_unit_cost * v.letters_size_value * v.letters_qty;
  // Delivery / Shipping is excluded when the product is dimensional (fabricated in-house)
  const deliveryApplies = v.letter_type !== 'dimensional_letters';
  const lettersSubtotal =
    lettersBaseTotal +
    (deliveryApplies ? v.letters_delivery_fee : 0) +
    v.letters_design_fee +
    v.letters_install_supplies_fee +
    v.letters_permitting_fee +
    v.letters_other_fee;
  const lettersMarkupAmount = lettersSubtotal * (v.letters_markup_percent / 100);
  const lettersTotal = lettersSubtotal + lettersMarkupAmount;

  // Grand total = letters + install
  const totalCost = installTotalCost + lettersTotal;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div>
        <h3 className="font-semibold text-slate-900 mb-4">Demo Values (Editable)</h3>
        <div className="space-y-3">

          {/* ---------- Letters Purchase inputs ---------- */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
            <h4 className="font-medium text-sm text-purple-900">Letters Purchase</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Letter Type</Label>
                <Select value={v.letter_type} onValueChange={(val) => set('letter_type', val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="raceway">Raceway (per ft)</SelectItem>
                    <SelectItem value="channel_raceway_mounted">Raceway Mounted (per in)</SelectItem>
                    <SelectItem value="channel_flush_mounted">Flush Mounted (per in)</SelectItem>
                    <SelectItem value="channel_halo_lit">Halo-Lit (per in)</SelectItem>
                    <SelectItem value="capsule_logo_pillbox">Capsule/Logo (per sqft)</SelectItem>
                    <SelectItem value="dimensional_letters">Dimensional (per sqft)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Qty</Label>
                <Input type="number" value={v.letters_qty} onChange={(e) => setNum('letters_qty', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Size Value</Label>
                <Input type="number" value={v.letters_size_value} onChange={(e) => setNum('letters_size_value', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Unit Cost ($)</Label>
                <Input type="number" step="0.01" value={v.letters_unit_cost} onChange={(e) => setNum('letters_unit_cost', e.target.value)} />
              </div>
              <div><Label className="text-xs">Delivery Fee</Label><Input type="number" value={v.letters_delivery_fee} onChange={(e) => setNum('letters_delivery_fee', e.target.value)} /></div>
              <div><Label className="text-xs">Design Fee</Label><Input type="number" value={v.letters_design_fee} onChange={(e) => setNum('letters_design_fee', e.target.value)} /></div>
              <div><Label className="text-xs">Install Supplies</Label><Input type="number" value={v.letters_install_supplies_fee} onChange={(e) => setNum('letters_install_supplies_fee', e.target.value)} /></div>
              <div><Label className="text-xs">Permitting</Label><Input type="number" value={v.letters_permitting_fee} onChange={(e) => setNum('letters_permitting_fee', e.target.value)} /></div>
              <div><Label className="text-xs">Other</Label><Input type="number" value={v.letters_other_fee} onChange={(e) => setNum('letters_other_fee', e.target.value)} /></div>
              <div><Label className="text-xs">Markup %</Label><Input type="number" step="0.1" value={v.letters_markup_percent} onChange={(e) => setNum('letters_markup_percent', e.target.value)} /></div>
            </div>
          </div>

          <h4 className="font-medium text-sm text-slate-700 pt-2">Installation</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Installation Type</Label>
              <Select value={v.installation_type} onValueChange={(val) => set('installation_type', val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flush_mount">Flush Mount</SelectItem>
                  <SelectItem value="halo_lit">Halo-Lit</SelectItem>
                  <SelectItem value="raceway">Raceway</SelectItem>
                  <SelectItem value="dimensional_lettering">Dimensional Lettering</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Letter Size</Label>
              <Select value={v.letter_size} onValueChange={(val) => set('letter_size', val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="extra_small">XS</SelectItem>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                  <SelectItem value="extra_large">XL</SelectItem>
                  <SelectItem value="extra_extra_large">XXL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Qty Letters</Label><Input type="number" value={v.qty_letters} onChange={(e) => setNum('qty_letters', e.target.value)} /></div>
            <div><Label>Install Height (ft)</Label><Input type="number" value={v.installation_height_feet} onChange={(e) => setNum('installation_height_feet', e.target.value)} /></div>
          </div>
          {v.installation_type === 'raceway' && (
            <div><Label>Raceway Length (ft)</Label><Input type="number" value={v.raceway_length_feet} onChange={(e) => setNum('raceway_length_feet', e.target.value)} /></div>
          )}
          <div>
            <Label>Wall Material</Label>
            <Select value={v.wall_material} onValueChange={(val) => set('wall_material', val)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="eifs">EIFS</SelectItem>
                <SelectItem value="stucco">Stucco</SelectItem>
                <SelectItem value="brick">Brick</SelectItem>
                <SelectItem value="block">Block</SelectItem>
                <SelectItem value="metal">Metal</SelectItem>
                <SelectItem value="wood">Wood</SelectItem>
                <SelectItem value="concrete">Concrete</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Labor Rate ($/hr)</Label><Input type="number" value={v.labor_rate} onChange={(e) => setNum('labor_rate', e.target.value)} /></div>
            <div><Label>Materials Cost ($)</Label><Input type="number" value={v.materials_cost} onChange={(e) => setNum('materials_cost', e.target.value)} /></div>
          </div>

          <div className="border-t pt-3 space-y-2">
            <h4 className="font-medium text-sm text-slate-700">Site Conditions</h4>
            <ToggleRow label="Thick / Hollow Walls" checked={v.thick_hollow_walls} onChange={(c) => set('thick_hollow_walls', c)} />
            <ToggleRow label="Parapet" checked={v.parapet} onChange={(c) => set('parapet', c)} />
            {v.parapet && (
              <div className="pl-4">
                <Label className="text-xs">Parapet Electrical Routing</Label>
                <Select value={v.parapet_electrical_routing} onValueChange={(val) => set('parapet_electrical_routing', val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="roof">Roof Run (easier)</SelectItem>
                    <SelectItem value="drop">Drop Down (harder)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <ToggleRow label="Escort Required" checked={v.escort_required} onChange={(c) => set('escort_required', c)} />
            <ToggleRow label="Badging / Check-in" checked={v.badging_checkin} onChange={(c) => set('badging_checkin', c)} />
            <ToggleRow label="After Hours / Weekend" checked={v.after_hours_weekend} onChange={(c) => set('after_hours_weekend', c)} />
            <ToggleRow label="Set Hours Installation" checked={v.set_hours_installation} onChange={(c) => set('set_hours_installation', c)} />
            <ToggleRow label="Poor Site Access" checked={v.poor_site_access} onChange={(c) => set('poor_site_access', c)} />
            {v.poor_site_access && (
              <div className="pl-4"><Label className="text-xs">Severity (1-10)</Label><Input type="number" min="1" max="10" value={v.poor_site_access_severity} onChange={(e) => setNum('poor_site_access_severity', e.target.value)} /></div>
            )}
            <ToggleRow label="Poor Electrical Access" checked={v.poor_electrical_access} onChange={(c) => set('poor_electrical_access', c)} />
            {v.poor_electrical_access && (
              <div className="pl-4"><Label className="text-xs">Severity (1-10)</Label><Input type="number" min="1" max="10" value={v.poor_electrical_severity} onChange={(e) => setNum('poor_electrical_severity', e.target.value)} /></div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-lg space-y-3 overflow-y-auto">
        <h3 className="font-semibold text-slate-900">Live Calculations (Step-by-Step)</h3>

        {/* ---------- Letters Purchase math ---------- */}
        <FormulaSection title="Letters Purchase — Base Cost" color="purple">
          <FormulaLine label={`Type: ${v.letter_type}`} />
          <FormulaLine label="Base" formula={`$${v.letters_unit_cost} × ${v.letters_size_value} × ${v.letters_qty}`} result={`$${lettersBaseTotal.toFixed(2)}`} highlight />
        </FormulaSection>

        <FormulaSection title="Letters Purchase — Fees" color="purple">
          {deliveryApplies
            ? <FormulaLine label="Delivery" result={`$${v.letters_delivery_fee.toFixed(2)}`} />
            : <FormulaLine label="Delivery" result="excluded — dimensional letters are fabricated in-house" />}
          <FormulaLine label="Design" result={`$${v.letters_design_fee.toFixed(2)}`} />
          <FormulaLine label="Install Supplies" result={`$${v.letters_install_supplies_fee.toFixed(2)}`} />
          <FormulaLine label="Permitting" result={`$${v.letters_permitting_fee.toFixed(2)}`} />
          <FormulaLine label="Other" result={`$${v.letters_other_fee.toFixed(2)}`} />
          <FormulaLine label="Subtotal" result={`$${lettersSubtotal.toFixed(2)}`} highlight />
        </FormulaSection>

        <FormulaSection title="Letters Purchase — Markup" color="purple">
          <FormulaLine label={`× (1 + ${v.letters_markup_percent}%)`} formula={`$${lettersSubtotal.toFixed(2)} × ${(1 + v.letters_markup_percent / 100).toFixed(3)}`} result={`$${lettersTotal.toFixed(2)}`} highlight />
        </FormulaSection>

        <div className="border-t-2 border-slate-300 pt-2">
          <h4 className="font-semibold text-slate-900 mb-1">Installation Math</h4>
        </div>

        <FormulaSection title="Step 1: Base Hours" color="blue">
          {log.map((l, i) => <FormulaLine key={i} {...l} />)}
          <FormulaLine label="Base hours" result={`${baseHoursBeforeMods.toFixed(3)} hrs`} highlight />
        </FormulaSection>

        {v.thick_hollow_walls && (
          <FormulaSection title="Step 2: + Thick/Hollow Walls" color="amber">
            <FormulaLine label="Additive hours" result={`+${thickAdd.toFixed(3)} hrs`} highlight />
          </FormulaSection>
        )}

        {v.parapet && (
          <FormulaSection title="Step 3: + Parapet" color="amber">
            <FormulaLine label={`Routing: ${v.parapet_electrical_routing}`} result={`+${parapetAdd.toFixed(3)} hrs`} highlight />
          </FormulaSection>
        )}

        <FormulaSection title="Step 4: Height — Baked Into Base Rates" color="purple">
          <FormulaLine label={`Height ${v.installation_height_feet} ft`} result="no multiplier — the size × height-bucket × interior/exterior rate already includes it" />
        </FormulaSection>

        <FormulaSection title="Step 5: × Wall Material" color="purple">
          <FormulaLine label={`Wall: ${v.wall_material}`} formula={`${beforeWall.toFixed(3)} × ${wallMult}`} result={`${(beforeWall * wallMult).toFixed(3)} hrs`} highlight />
        </FormulaSection>

        {(v.escort_required || v.badging_checkin || v.after_hours_weekend || v.set_hours_installation) && (
          <FormulaSection title="Step 6: × Site Multipliers" color="purple">
            {v.escort_required && <FormulaLine label="Escort" result={`× ${escortMult}`} />}
            {v.badging_checkin && <FormulaLine label="Badging" result={`× ${badgingMult}`} />}
            {v.after_hours_weekend && <FormulaLine label="After Hours" result={`× ${afterMult}`} />}
            {v.set_hours_installation && <FormulaLine label="Set Hours" result={`× ${setHoursMult}`} />}
            <FormulaLine label="Combined" formula={`${beforeSite.toFixed(3)} × ${combinedSiteMult.toFixed(3)}`} result={`${(beforeSite * combinedSiteMult).toFixed(3)} hrs`} highlight />
          </FormulaSection>
        )}

        {v.poor_site_access && (
          <FormulaSection title="Step 7: + Poor Site Access" color="rose">
            <FormulaLine label={`Severity ${v.poor_site_access_severity}`} result={`+${siteAccessAdd.toFixed(3)} hrs`} highlight />
          </FormulaSection>
        )}

        {v.poor_electrical_access && v.installation_type !== 'raceway' && v.installation_type !== 'dimensional_lettering' && (
          <FormulaSection title="Step 8: + Poor Electrical" color="rose">
            <FormulaLine label={`Severity ${v.poor_electrical_severity}`} result={`+${elecAdd.toFixed(3)} hrs`} highlight />
          </FormulaSection>
        )}

        <FormulaSection title="Final Hours & Cost" color="green">
          <FormulaLine label="Total Hours" result={`${totalHours.toFixed(3)} hrs`} highlight />
          <FormulaLine label="Labor Cost" formula={`${totalHours.toFixed(3)} × $${v.labor_rate}/hr`} result={`$${laborCost.toFixed(2)}`} highlight />
          <FormulaLine label="Materials Cost" result={`$${v.materials_cost.toFixed(2)}`} />
          <FormulaLine label="Install Total" result={`$${installTotalCost.toFixed(2)}`} highlight />
        </FormulaSection>

        <div className="bg-sky-50 border border-sky-200 rounded p-3 text-xs space-y-1 text-sky-900">
          <h4 className="font-bold mb-1">Crew & Equipment Logic (UPDATED)</h4>
          <p><b>Labor vs. Personnel:</b> when a crew is assigned on Crew &amp; Equipment, the
            personnel rows price the SAME calculated hours (split across the crew at role rates),
            so crew cost REPLACES the flat-rate Install Labor in the subtotal — labor is never
            double-counted.</p>
          <p><b>Crew size suggestion:</b> 3 people when max install height ≥ 40 ft OR 30+ total
            letters; otherwise 2 (Crew Lead + Installer). Crew hours = total labor hours ÷ crew size.</p>
          <p><b>Equipment auto-select:</b> a boom flagged "default for height range" wins; otherwise
            the smallest lift whose max height ≥ install height + its safety margin (default 2 ft).
            A transport vehicle (owned preferred) is added unless the lift is a boom truck.</p>
          <p className="font-mono bg-white border border-sky-200 rounded px-2 py-1">
            on-site clock hours = labor hours ÷ crew size<br/>
            rental duration: per-hour = ⌈clock hrs⌉ · per-day = ⌈clock hrs ÷ 8⌉ · per-week = ⌈days ÷ 5⌉<br/>
            boom idle hours default = ⌈clock hrs⌉
          </p>
          <p><b>Dimensional + Backer:</b> installs at the dimensional-lettering per-size rates
            (no electrical time, no poor-electrical bonus).</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs space-y-1 text-amber-900">
          <h4 className="font-bold mb-1">Equipment Fuel Costs (NEW)</h4>
          <p>Equipment marked as a fuel-consuming type (Boom Lift, Boom Truck, Scissor Lift,
            Truck, Car, Van, Flatbed) now carries fuel data on the inventory record itself,
            regardless of Owned vs Rented:</p>
          <p className="font-mono bg-white border border-amber-200 rounded px-2 py-1">
            driving_fuel_cost = (route_miles ÷ mpg) × $/gal_by_fuel_type<br/>
            idle_fuel_cost    = idle_hours × idle_running_cost_per_hour
          </p>
          <p>These two add ON TOP of any rental rate (per day/week/month) or the owned flat
            rate. The unified Equipment form (Master Inventory) now collects MPG, Fuel Type,
            and Idle Cost on a single panel — used by both Channel Letter and Foundation
            estimators.</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-1 text-slate-800">
          <h4 className="font-bold mb-1">Master Equipment Form (NEW)</h4>
          <p>Equipment is now created/edited from <b>Master Inventory → Equipment</b>. The form:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Replaces the old "Storage" dropdown with a <b>"Supports Attachments?"</b> toggle.</li>
            <li>Shows <b>Ownership</b> right under Name (Rented vs Owned).</li>
            <li>Hides the Pricing Mode selector for Owned items, and always exposes Per Day / Per Week / Per Month for Rented items.</li>
            <li>Hides the Rental Company field on Owned items.</li>
            <li>Capitalizes all equipment-type labels.</li>
            <li>Adds the Fuel Costs panel above for vehicle / boom types.</li>
          </ul>
        </div>

        <div className="bg-slate-800 text-white p-3 rounded">
          <h4 className="font-medium mb-2">Final Total (Letters + Install)</h4>
          <div className="flex justify-between text-sm"><span>Letters Total:</span><span>${lettersTotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span>Install Labor:</span><span>${laborCost.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span>Install Materials:</span><span>${v.materials_cost.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-lg border-t border-slate-600 pt-2 mt-2">
            <span>TOTAL:</span><span>${totalCost.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between bg-white border rounded-md px-3 py-2">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}