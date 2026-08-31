import React, { useState, useEffect, lazy, Suspense } from "react";
import { Settings } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calculator, Paintbrush, Zap, Router, Wrench, Info, Anchor, ClipboardCheck, Droplets, FileSpreadsheet, Layers } from "lucide-react";

// Lazy-load each formula module — the Formula Viewer used to mount all 9
// heavy calculator components on first render (one per tab) even though only
// one is ever visible. Splitting them keeps the initial bundle small and
// only pulls in the code for the tab the user actually clicks.
const CNCFormulas = lazy(() => import("@/components/formulaViewer/CNCFormulas"));
const MetalFormulas = lazy(() => import("@/components/formulaViewer/MetalFormulas"));
const ChannelLetterInstallFormulas = lazy(() => import("@/components/formulaViewer/ChannelLetterInstallFormulas"));
const LaserFormulas = lazy(() => import("@/components/formulaViewer/LaserFormulas"));
const ConcreteMasonryPolesFormulas = lazy(() => import("@/components/formulaViewer/ConcreteMasonryPolesFormulas"));
const SignMaintenanceFormulas = lazy(() => import("@/components/formulaViewer/SignMaintenanceFormulas"));
const VinylInventoryFormulas = lazy(() => import("@/components/formulaViewer/VinylInventoryFormulas"));
const VinylEstimatorFormulas = lazy(() => import("@/components/formulaViewer/VinylEstimatorFormulas"));
const MasterInventoryImporterFormulas = lazy(() => import("@/components/formulaViewer/MasterInventoryImporterFormulas"));
const AllInOneFormulas = lazy(() => import("@/components/formulaViewer/AllInOneFormulas"));

const TabFallback = () => (
  <div className="py-10 text-center text-sm text-slate-400">Loading formulas…</div>
);

// Helper function to parse imperial fractions (e.g., "1/2", "1-3/4")
const parseImperialFraction = (fractionString) => {
  if (typeof fractionString !== 'string') {
    return parseFloat(fractionString) || 0;
  }
  let totalValue = 0;
  const wholeAndFraction = fractionString.split('-');
  if (wholeAndFraction.length === 2) {
    totalValue += parseFloat(wholeAndFraction[0]);
    fractionString = wholeAndFraction[1];
  } else {
    fractionString = wholeAndFraction[0];
  }
  const parts = fractionString.split('/');
  if (parts.length === 2) {
    const numerator = parseFloat(parts[0]);
    const denominator = parseFloat(parts[1]);
    if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
      totalValue += numerator / denominator;
    }
  } else {
    totalValue += parseFloat(fractionString) || 0;
  }
  return totalValue;
};

const coverageFactors = ["1/8", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8", "1", "1-1/8", "1-1/4", "1-3/8", "1-1/2", "1-5/8", "1-3/4", "1-7/8", "2"];

export default function FormulaViewer() {
  const [selectedModule, setSelectedModule] = useState("painting");
  const [settings, setSettings] = useState({});
  const [demoValues, setDemoValues] = useState({
    // Paint demo values - comprehensive
    length: 24,
    width: 12,
    thickness: "1/2",
    quantity: 2,
    paint_colors: 3,
    paint_sides: "both_sides",
    item_type: "panel",
    paint_mask_sqft: 4,
    coverage_factor: "1",
    labor_rate: 60,
    base_supplies_cost: 50, // Added base_supplies_cost
    paint_supplies_per_sqft: 1.25,
    letter_size: "normal",
    edge_complexity_multiplier: 1.0,
    
    // Laser demo values
    cut_length: 48,
    cut_speed: 20,
    engrave_area: 12,
    engrave_speed: 5,
    machine_rate: 100,
    handling_percentage: 15,
    laser_labor_rate: 45,
    
    // Foundation demo values
    length_inches: 48,
    width_inches: 48,
    depth_inches: 36,
    quantity_foundation: 1,
    main_labor_rate: 60,
    excavation_time_per_cy: 2.0,
    forming_cost_per_sqft: 2.50,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const allSettings = await Settings.list();
      const settingsObj = {};
      allSettings.forEach(s => { settingsObj[s.setting_name] = s.setting_value; });
      setSettings(settingsObj);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    setIsLoading(false);
  };

  const updateDemoValue = (key, value) => {
    setDemoValues(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };
  
  const updateDemoValueString = (key, value) => {
    setDemoValues(prev => ({...prev, [key]: value}));
  };

  const handleCoverageFactorChange = (factorStr) => {
    const factor = parseImperialFraction(factorStr);
    let faceArea = 0;

    if (demoValues.item_type === 'panel' || demoValues.item_type === 'complex_shapes') {
      faceArea = (demoValues.length * demoValues.width) / 144;
    } else if (demoValues.item_type === 'lettering') {
      const letterHeight = demoValues.width;
      const numLetters = demoValues.length;
      faceArea = (Math.pow(letterHeight, 2) * 0.8 * numLetters) / 144;
    }

    const calculatedMaskSqFt = faceArea * factor;
    
    setDemoValues(prev => ({
      ...prev,
      coverage_factor: factorStr,
      paint_mask_sqft: calculatedMaskSqFt
    }));
  };

  const getCostPerGallon = (cost, unit) => {
    const unitFactors = { oz: 128, pint: 8, quart: 4, liter: 3.78541, gallon: 1 };
    const parsedCost = parseFloat(cost);
    if (isNaN(parsedCost) || !unit || !unitFactors[unit]) return 0;
    return parsedCost * unitFactors[unit]; // Convert cost of 'unit' to cost per gallon
  };

  const renderPaintingFormulas = () => {
    // Get all settings with defaults (ensure parsing to float where needed)
    const paintCostPerGallon = getCostPerGallon(settings.paint_cost_per_unit || 25, settings.paint_unit || 'gallon');
    const hardenerCostPerGallon = getCostPerGallon(settings.hardener_cost_per_unit || 15, settings.hardener_unit || 'gallon');
    const reducerCostPerGallon = getCostPerGallon(settings.reducer_cost_per_unit || 12, settings.reducer_unit || 'gallon');
    
    const paintMixRatio = parseFloat(settings.paint_mix_ratio || 3);
    const hardenerMixRatio = parseFloat(settings.hardener_mix_ratio || 1);
    const reducerMixRatio = parseFloat(settings.reducer_mix_ratio || 1);
    const totalRatio = paintMixRatio + hardenerMixRatio + reducerMixRatio;
    
    const costOfMix = totalRatio > 0 ?
      (paintCostPerGallon / totalRatio) * paintMixRatio +
      (hardenerCostPerGallon / totalRatio) * hardenerMixRatio +
      (reducerCostPerGallon / totalRatio) * reducerMixRatio : 0;

    const coverageSqFtPerGallon = parseFloat(settings.mixed_paint_coverage_sqft_per_gallon || 350);
    const liquidPaintRate = coverageSqFtPerGallon > 0 ? costOfMix / coverageSqFtPerGallon : 0;
    
    // Calculate paintable area
    const perimFactor = parseFloat(settings.letter_perimeter_factor || 3.5);
    let paintableSqFt = 0;
    const itemThicknessDecimal = parseImperialFraction(demoValues.thickness);

    if (demoValues.item_type === 'panel') {
      const faceArea = (demoValues.length * demoValues.width) / 144;
      paintableSqFt = demoValues.paint_sides === 'both_sides' ? faceArea * 2 : faceArea;
    } else if (demoValues.item_type === 'lettering') {
      const letterHeight = demoValues.width;
      const numLetters = demoValues.length;
      const faceArea = (Math.pow(letterHeight, 2) * 0.8 * numLetters) / 144; // Assuming 0.8 as average letter face area factor
      const perimeterInches = letterHeight * perimFactor * numLetters;
      const edgeArea = (perimeterInches * itemThicknessDecimal) / 144;
      paintableSqFt = demoValues.paint_sides === 'both_sides' ? (faceArea * 2) + edgeArea : faceArea + edgeArea;
    } else if (demoValues.item_type === 'complex_shapes') {
      const faceArea = (demoValues.length * demoValues.width) / 144;
      const perimeterInches = 2 * (demoValues.length + demoValues.width);
      const edgeArea = (perimeterInches * itemThicknessDecimal * demoValues.edge_complexity_multiplier) / 144;
      paintableSqFt = demoValues.paint_sides === 'both_sides' ? (faceArea * 2) + edgeArea : faceArea + edgeArea;
    }

    // Cost calculations
    const numColors = demoValues.paint_colors;
    const paintMaskMaterialRate = parseFloat(settings.paint_mask_rate_per_sqft || 0.75);
    const paintMaskMachineRate = parseFloat(settings.paint_mask_machine_cutting_rate_per_sqft || 0.10); // New setting
    // Masking is applied for each additional color (numColors - 1)
    const paintMaskCost = numColors > 1 ? (demoValues.paint_mask_sqft * (paintMaskMaterialRate + paintMaskMachineRate) * (numColors - 1)) * demoValues.quantity : 0;
    
    const wasteMultiplier = parseFloat(settings.paint_waste_multiplier || 1.25);
    const liquidPaintCost = paintableSqFt * liquidPaintRate * wasteMultiplier * numColors;
    const paintApplicationSuppliesCost = paintableSqFt * demoValues.paint_supplies_per_sqft * numColors; // Renamed for clarity
    const itemLiquidAndSuppliesCost = liquidPaintCost + paintApplicationSuppliesCost;
    
    // Total including flat base supplies
    const totalLiquidAndSuppliesCost = (itemLiquidAndSuppliesCost * demoValues.quantity) + demoValues.base_supplies_cost;

    // Labor calculations
    const baseHoursPerSqFt = parseFloat(settings.base_labor_hours_per_sqft || 0.5);
    const complexityMap = {
      extra_small: 'complex',
      small: 'complex',
      normal: 'moderate',
      medium: 'moderate',
      large: 'moderate', // Changed large to moderate for better example
      extra_large: 'simple',
    };
    const itemComplexity = demoValues.item_type === 'lettering' ? complexityMap[demoValues.letter_size] : 'moderate';
    
    const complexityMultipliers = {
      simple: parseFloat(settings.simple_complexity_multiplier || 0.7),
      moderate: parseFloat(settings.moderate_complexity_multiplier || 1.0),
      complex: parseFloat(settings.complex_complexity_multiplier || 1.5)
    };
    const paintMultipliers = {
      one_side: parseFloat(settings.one_side_paint_multiplier || 0.8),
      both_sides: parseFloat(settings.both_sides_paint_multiplier || 1.0)
    };
    const additionalColorMultiplier = parseFloat(settings.additional_color_multiplier || 0.3);
    
    let basePaintHours = paintableSqFt * baseHoursPerSqFt * complexityMultipliers[itemComplexity] * paintMultipliers[demoValues.paint_sides]; // Renamed
    if (numColors > 1) {
      basePaintHours *= (1 + (numColors - 1) * additionalColorMultiplier);
    }
    
    const maskAppLaborRate = parseFloat(settings.paint_mask_application_labor_rate_per_sqft || 0.25); // New setting
    const maskCutLaborRate = parseFloat(settings.paint_mask_cutting_labor_rate_per_sqft || 0.15); // New setting
    // Assuming paintMaskLaborRate is a cost/sqft, so to get hours, divide by labor_rate ($/hr)
    const maskLaborHours = numColors > 1 ? ((demoValues.paint_mask_sqft * (maskAppLaborRate + maskCutLaborRate) * (numColors - 1)) / demoValues.labor_rate) : 0;
    
    const itemLaborHours = (basePaintHours + maskLaborHours) * demoValues.quantity; // New intermediate step
    
    const mixingHours = parseFloat(settings.paint_mixing_labor_hours || 0); // New setting
    const setupHours = parseFloat(settings.setup_time_labor_hours || 0); // New setting
    const fixedLaborHours = mixingHours + setupHours;

    const totalLaborHours = itemLaborHours + fixedLaborHours; // Adjusted total labor hours
    const laborCost = totalLaborHours * demoValues.labor_rate;

    const minLaborHours = parseFloat(settings.min_labor_hours || 0);
    const minPaintCost = parseFloat(settings.min_paint_cost || 0);

    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-slate-900 mb-4">Demo Values (Editable)</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Length (in)</Label><Input type="number" value={demoValues.length} onChange={(e) => updateDemoValue('length', e.target.value)} /></div>
                <div><Label>Height (in)</Label><Input type="number" value={demoValues.width} onChange={(e) => updateDemoValue('width', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Thickness</Label><Input value={demoValues.thickness} onChange={(e) => updateDemoValueString('thickness', e.target.value)} placeholder='e.g., 1/2' /></div>
                <div><Label>Quantity</Label><Input type="number" value={demoValues.quantity} onChange={(e) => updateDemoValue('quantity', e.target.value)} /></div>
                <div><Label>Paint Colors</Label><Input type="number" value={demoValues.paint_colors} onChange={(e) => updateDemoValue('paint_colors', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Item Type</Label><Select value={demoValues.item_type} onValueChange={(value) => updateDemoValueString('item_type', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="panel">Panel</SelectItem><SelectItem value="lettering">Lettering</SelectItem><SelectItem value="complex_shapes">Complex Shapes</SelectItem></SelectContent></Select></div>
                <div><Label>Paint Sides</Label><Select value={demoValues.paint_sides} onValueChange={(value) => updateDemoValueString('paint_sides', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="one_side">One Side</SelectItem><SelectItem value="both_sides">Both Sides</SelectItem></SelectContent></Select></div>
              </div>
              {demoValues.item_type === 'lettering' && (
                <div><Label>Letter Size</Label><Select value={demoValues.letter_size} onValueChange={(value) => updateDemoValueString('letter_size', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="extra_small">Extra Small</SelectItem><SelectItem value="small">Small</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="large">Large</SelectItem><SelectItem value="extra_large">Extra Large</SelectItem></SelectContent></Select></div>
              )}
              {demoValues.item_type === 'complex_shapes' && (
                <div><Label>Edge Complexity Multiplier</Label><Input type="number" step="0.1" value={demoValues.edge_complexity_multiplier} onChange={(e) => updateDemoValue('edge_complexity_multiplier', e.target.value)} /></div>
              )}
              <div><Label>Base Supplies Cost (per job)</Label><Input type="number" step="1" value={demoValues.base_supplies_cost} onChange={(e) => updateDemoValue('base_supplies_cost', e.target.value)} /></div>
              
              {/* Paint Mask Sections - Multiple for each color */}
              {numColors > 1 && (
                <div className="border-t pt-3 space-y-3">
                  <h4 className="font-medium text-slate-800">Paint Mask Application Values</h4>
                  {Array.from({length: numColors - 1}, (_, i) => (
                    <div key={i} className="bg-purple-50 p-3 rounded-lg">
                      <h5 className="font-medium text-purple-800 mb-2">Color {i + 2} Mask (Additional Mask)</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label>Paint Mask (sqft)</Label><Input type="number" step="0.25" value={demoValues.paint_mask_sqft} onChange={(e) => updateDemoValue('paint_mask_sqft', e.target.value)} /></div>
                        <div><Label>Coverage Factor</Label><Select value={demoValues.coverage_factor} onValueChange={handleCoverageFactorChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{coverageFactors.map(factor => <SelectItem key={factor} value={factor}>{factor}</SelectItem>)}</SelectContent></Select></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-lg">
            <h3 className="font-semibold text-slate-900 mb-4">Live Calculations</h3>
            <div className="space-y-4 text-sm">
              
              {/* Paintable Area Calculation */}
              <div className="bg-white p-3 rounded border">
                <h4 className="font-medium text-slate-800 mb-2">Paintable Area Calculation</h4>
                {demoValues.item_type === 'panel' && (
                  <div className="space-y-1 text-xs">
                    <p>Face Area: ({demoValues.length}" × {demoValues.width}") ÷ 144 = {((demoValues.length * demoValues.width) / 144).toFixed(3)} sq ft</p>
                    <p>Paintable Area: {((demoValues.length * demoValues.width) / 144).toFixed(3)} sq ft × {demoValues.paint_sides === 'both_sides' ? '2' : '1'} = {paintableSqFt.toFixed(3)} sq ft</p>
                  </div>
                )}
                {demoValues.item_type === 'lettering' && (
                  <div className="space-y-1 text-xs">
                    <p>Letter Height: {demoValues.width}"</p>
                    <p>Number of Letters: {demoValues.length}</p>
                    <p>Face Area: ({demoValues.width}² × 0.8 × {demoValues.length}) ÷ 144 = {((Math.pow(demoValues.width, 2) * 0.8 * demoValues.length) / 144).toFixed(3)} sq ft</p>
                    <p>Perimeter (Letters): {demoValues.width}" × {perimFactor} (factor) × {demoValues.length} = {(demoValues.width * perimFactor * demoValues.length).toFixed(1)}"</p>
                    <p>Edge Area: {(demoValues.width * perimFactor * demoValues.length).toFixed(1)}" × {itemThicknessDecimal.toFixed(3)}" (thickness) ÷ 144 = {((demoValues.width * perimFactor * demoValues.length * itemThicknessDecimal) / 144).toFixed(3)} sq ft</p>
                    <p>Total Paintable: ({((Math.pow(demoValues.width, 2) * 0.8 * demoValues.length) / 144).toFixed(3)} sq ft × {demoValues.paint_sides === 'both_sides' ? '2' : '1'}) + {((demoValues.width * perimFactor * demoValues.length * itemThicknessDecimal) / 144).toFixed(3)} sq ft = {paintableSqFt.toFixed(3)} sq ft</p>
                  </div>
                )}
                {demoValues.item_type === 'complex_shapes' && (
                  <div className="space-y-1 text-xs">
                    <p>Face Area: ({demoValues.length}" × {demoValues.width}") ÷ 144 = {((demoValues.length * demoValues.width) / 144).toFixed(3)} sq ft</p>
                    <p>Perimeter: 2 × ({demoValues.length}" + {demoValues.width}") = {(2 * (demoValues.length + demoValues.width)).toFixed(1)}"</p>
                    <p>Edge Area: {(2 * (demoValues.length + demoValues.width)).toFixed(1)}" × {itemThicknessDecimal.toFixed(3)}" (thickness) × {demoValues.edge_complexity_multiplier} (multiplier) ÷ 144 = {((2 * (demoValues.length + demoValues.width) * itemThicknessDecimal * demoValues.edge_complexity_multiplier) / 144).toFixed(3)} sq ft</p>
                    <p>Total Paintable: ({((demoValues.length * demoValues.width) / 144).toFixed(3)} sq ft × {demoValues.paint_sides === 'both_sides' ? '2' : '1'}) + {((2 * (demoValues.length + demoValues.width) * itemThicknessDecimal * demoValues.edge_complexity_multiplier) / 144).toFixed(3)} sq ft = {paintableSqFt.toFixed(3)} sq ft</p>
                  </div>
                )}
              </div>

              {/* Liquid Paint Rate Calculation */}
              <div className="bg-white p-3 rounded border">
                <h4 className="font-medium text-slate-800 mb-2">Liquid Paint Rate</h4>
                <div className="space-y-1 text-xs">
                  <p>Paint Cost/Gallon: ${paintCostPerGallon.toFixed(2)}</p>
                  <p>Hardener Cost/Gallon: ${hardenerCostPerGallon.toFixed(2)}</p>
                  <p>Reducer Cost/Gallon: ${reducerCostPerGallon.toFixed(2)}</p>
                  <p>Mix Ratio: {paintMixRatio}:{hardenerMixRatio}:{reducerMixRatio}</p>
                  <p>Cost of Mixed Gallon: (${paintCostPerGallon.toFixed(2)}/{totalRatio.toFixed(1)})×{paintMixRatio} + (${hardenerCostPerGallon.toFixed(2)}/{totalRatio.toFixed(1)})×{hardenerMixRatio} + (${reducerCostPerGallon.toFixed(2)}/{totalRatio.toFixed(1)})×{reducerMixRatio} = ${costOfMix.toFixed(4)}</p>
                  <p>Coverage: {coverageSqFtPerGallon} sq ft/gallon</p>
                  <p className="font-medium text-blue-600">Liquid Paint Rate: ${costOfMix.toFixed(4)} ÷ {coverageSqFtPerGallon} = ${liquidPaintRate.toFixed(4)}/sq ft</p>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="space-y-2">
                <div className="bg-purple-50 p-3 rounded border border-purple-200">
                  <h4 className="font-medium text-purple-800 mb-2">Paint Mask Cost</h4>
                  <div className="space-y-1 text-xs text-purple-700">
                    <p>Colors requiring mask: {Math.max(0, numColors - 1)}</p>
                    <p>Mask sq ft: {demoValues.paint_mask_sqft.toFixed(2)}</p>
                    <p>Mask Material Rate: ${paintMaskMaterialRate.toFixed(2)}/sq ft</p>
                    <p>Mask Machine Rate: ${paintMaskMachineRate.toFixed(2)}/sq ft</p>
                    <p>Total Rate (Material + Machine): ${(paintMaskMaterialRate + paintMaskMachineRate).toFixed(2)}/sq ft</p>
                    <p>Calculation: {demoValues.paint_mask_sqft.toFixed(2)} × ${ (paintMaskMaterialRate + paintMaskMachineRate).toFixed(2)} × {Math.max(0, numColors - 1)} × {demoValues.quantity} = <span className="font-bold">${paintMaskCost.toFixed(2)}</span></p>
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">Liquid Paint & Supplies Cost</h4>
                  <div className="space-y-1 text-xs text-blue-700">
                    <p>Liquid Paint (per item): {paintableSqFt.toFixed(3)} (paintable sqft) × ${liquidPaintRate.toFixed(4)} (rate) × {wasteMultiplier} (waste) × {numColors} (colors) = ${liquidPaintCost.toFixed(2)}</p>
                    <p>Paint Application Supplies (per item): {paintableSqFt.toFixed(3)} (paintable sqft) × ${demoValues.paint_supplies_per_sqft} (rate) × {numColors} (colors) = ${paintApplicationSuppliesCost.toFixed(2)}</p>
                    <p>Per Item Total: ${liquidPaintCost.toFixed(2)} + ${paintApplicationSuppliesCost.toFixed(2)} = ${(itemLiquidAndSuppliesCost).toFixed(2)}</p>
                    <p>Items Total: ${(itemLiquidAndSuppliesCost).toFixed(2)} (per item) × {demoValues.quantity} (qty) = ${(itemLiquidAndSuppliesCost * demoValues.quantity).toFixed(2)}</p>
                    <p>Base Supplies (per job): ${demoValues.base_supplies_cost.toFixed(2)}</p>
                    <p>Total Liquid & Supplies: ${(itemLiquidAndSuppliesCost * demoValues.quantity).toFixed(2)} + ${demoValues.base_supplies_cost.toFixed(2)} = <span className="font-bold">${totalLiquidAndSuppliesCost.toFixed(2)}</span></p>
                  </div>
                </div>

                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2">Labor Cost</h4>
                  <div className="space-y-1 text-xs text-green-700">
                    <p>Base Paint Hours (per item): {paintableSqFt.toFixed(3)} (paintable sqft) × {baseHoursPerSqFt} × {complexityMultipliers[itemComplexity]} × {paintMultipliers[demoValues.paint_sides]} × {(1 + (numColors > 1 ? (numColors - 1) * additionalColorMultiplier : 0)).toFixed(3)} = {basePaintHours.toFixed(3)} hrs</p>
                    <p>Mask Labor (Cutting + App per item): {numColors > 1 ? `${demoValues.paint_mask_sqft.toFixed(2)} (mask sqft) × ($${maskAppLaborRate.toFixed(2)} + $${maskCutLaborRate.toFixed(2)}) (cost/sqft) × ${numColors - 1} (colors) ÷ $${demoValues.labor_rate} (labor rate) = ${maskLaborHours.toFixed(3)} hrs` : '0 hrs'}</p>
                    <p>Total Item Labor: ({basePaintHours.toFixed(3)} (base) + {maskLaborHours.toFixed(3)} (mask)) × {demoValues.quantity} (qty) = {itemLaborHours.toFixed(3)} hrs</p>
                    <p>Fixed Labor (Mixing + Setup per job): {mixingHours.toFixed(2)} (mixing) + {setupHours.toFixed(2)} (setup) = {fixedLaborHours.toFixed(2)} hrs</p>
                    <p>Total Labor Hours: {itemLaborHours.toFixed(3)} (item) + {fixedLaborHours.toFixed(2)} (fixed) = {totalLaborHours.toFixed(2)} hrs</p>
                    <p>Labor cost: {totalLaborHours.toFixed(2)} (total hrs) × ${demoValues.labor_rate} (labor rate) = <span className="font-bold">${laborCost.toFixed(2)}</span></p>
                  </div>
                </div>
              </div>

              {/* Minimums Applied */}
              {((totalLaborHours * demoValues.labor_rate) < (minLaborHours * demoValues.labor_rate) && (minLaborHours > 0)) || ((totalLiquidAndSuppliesCost < minPaintCost) && (minPaintCost > 0)) ? (
                <div className="bg-amber-50 p-3 rounded border border-amber-200">
                  <h4 className="font-medium text-amber-800 mb-2">Minimums Applied <Info className="inline-block w-4 h-4 text-amber-600 ml-1" /></h4>
                  <div className="space-y-1 text-xs text-amber-700">
                    {(totalLaborHours * demoValues.labor_rate) < (minLaborHours * demoValues.labor_rate) && (minLaborHours > 0) && <p>Labor minimum applied: {minLaborHours} hrs × ${demoValues.labor_rate} = ${(minLaborHours * demoValues.labor_rate).toFixed(2)}</p>}
                    {(totalLiquidAndSuppliesCost < minPaintCost) && (minPaintCost > 0) && <p>Paint minimum applied: ${minPaintCost.toFixed(2)}</p>}
                  </div>
                </div>
              ) : null}

              {/* Final Totals */}
              <div className="bg-slate-800 text-white p-3 rounded">
                <h4 className="font-medium mb-2">Final Totals</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Paint Mask:</span><span>${paintMaskCost.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Liquid Paint & Supplies:</span><span>${Math.max(totalLiquidAndSuppliesCost, minPaintCost).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Labor:</span><span>${Math.max(laborCost, minLaborHours * demoValues.labor_rate).toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-lg border-t border-slate-600 pt-2">
                    <span>TOTAL:</span>
                    <span>${(paintMaskCost + Math.max(totalLiquidAndSuppliesCost, minPaintCost) + Math.max(laborCost, minLaborHours * demoValues.labor_rate)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* All Settings Display */}
        <div className="mt-8">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Current Settings (From Database)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 text-xs">
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-800">Paint & Materials</h4>
                  <p>Paint Cost: ${parseFloat(settings.paint_cost_per_unit || 25).toFixed(2)}/{settings.paint_unit || 'gallon'}</p>
                  <p>Hardener Cost: ${parseFloat(settings.hardener_cost_per_unit || 15).toFixed(2)}/{settings.hardener_unit || 'gallon'}</p>
                  <p>Reducer Cost: ${parseFloat(settings.reducer_cost_per_unit || 12).toFixed(2)}/{settings.reducer_unit || 'gallon'}</p>
                  <p>Mix Ratio: {settings.paint_mix_ratio || 3}:{settings.hardener_mix_ratio || 1}:{settings.reducer_mix_ratio || 1}</p>
                  <p>Coverage: {settings.mixed_paint_coverage_sqft_per_gallon || 350} sq ft/gal</p>
                  <p>Waste Multiplier: {parseFloat(settings.paint_waste_multiplier || 1.25).toFixed(2)}×</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-800">Labor & Rates</h4>
                  <p>Base Labor: {parseFloat(settings.base_labor_hours_per_sqft || 0.5).toFixed(2)} hrs/sq ft</p>
                  <p>Paint Mixing Labor: {parseFloat(settings.paint_mixing_labor_hours || 0).toFixed(2)} hrs</p>
                  <p>Setup Labor: {parseFloat(settings.setup_time_labor_hours || 0).toFixed(2)} hrs</p>
                  <p>Simple Complexity: {parseFloat(settings.simple_complexity_multiplier || 0.7).toFixed(2)}×</p>
                  <p>Moderate Complexity: {parseFloat(settings.moderate_complexity_multiplier || 1.0).toFixed(2)}×</p>
                  <p>Complex Complexity: {parseFloat(settings.complex_complexity_multiplier || 1.5).toFixed(2)}×</p>
                  <p>One Side Paint: {parseFloat(settings.one_side_paint_multiplier || 0.8).toFixed(2)}×</p>
                  <p>Both Sides Paint: {parseFloat(settings.both_sides_paint_multiplier || 1.0).toFixed(2)}×</p>
                  <p>Additional Color: {parseFloat(settings.additional_color_multiplier || 0.3).toFixed(2)}×</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-800">Mask & Minimums</h4>
                  <p>Paint Mask Material Rate: ${parseFloat(settings.paint_mask_rate_per_sqft || 0.75).toFixed(2)}/sq ft</p>
                  <p>Paint Mask Cutting Labor Rate: ${parseFloat(settings.paint_mask_cutting_labor_rate_per_sqft || 0.15).toFixed(2)}/sq ft</p>
                  <p>Paint Mask Machine Rate: ${parseFloat(settings.paint_mask_machine_cutting_rate_per_sqft || 0.10).toFixed(2)}/sq ft</p>
                  <p>Paint Mask Application Labor: ${parseFloat(settings.paint_mask_application_labor_rate_per_sqft || 0.25).toFixed(2)}/sq ft</p>
                  <p>Letter Perimeter Factor: {parseFloat(settings.letter_perimeter_factor || 3.5).toFixed(2)}×</p>
                  <p>Min Labor Hours: {parseFloat(settings.min_labor_hours || 0).toFixed(2)} hrs</p>
                  <p>Min Paint Cost: ${parseFloat(settings.min_paint_cost || 0).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  if (isLoading) return <div className="p-8">Loading formulas...</div>;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Calculator className="w-8 h-8" />
            Formula Viewer
          </h1>
          <p className="text-slate-600">Comprehensive view of all calculations with every number and formula step</p>
        </div>

        <Tabs value={selectedModule} onValueChange={setSelectedModule} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-11 mb-4 h-auto">
            <TabsTrigger value="painting" className="flex items-center gap-1.5 text-xs md:text-sm py-2"><Paintbrush className="w-4 h-4" /> Painting</TabsTrigger>
            <TabsTrigger value="laser" className="flex items-center gap-1.5 text-xs md:text-sm py-2"><Zap className="w-4 h-4" /> Laser</TabsTrigger>
            <TabsTrigger value="cnc" className="flex items-center gap-1.5 text-xs md:text-sm py-2"><Router className="w-4 h-4" /> CNC</TabsTrigger>
            <TabsTrigger value="metal" className="flex items-center gap-1.5 text-xs md:text-sm py-2"><Wrench className="w-4 h-4" /> Metal Fab</TabsTrigger>
            <TabsTrigger value="channel_letter" className="flex items-center gap-1.5 text-xs md:text-sm py-2"><Wrench className="w-4 h-4" /> Channel & Dimensional</TabsTrigger>
            <TabsTrigger value="concrete_masonry_poles" className="flex items-center gap-1.5 text-xs md:text-sm py-2"><Anchor className="w-4 h-4" /> Concrete | Masonry | Poles</TabsTrigger>
            <TabsTrigger value="sign_maintenance" className="flex items-center gap-1.5 text-xs md:text-sm py-2"><ClipboardCheck className="w-4 h-4" /> Sign Maintenance</TabsTrigger>
            <TabsTrigger value="vinyl" className="flex items-center gap-1.5 text-xs md:text-sm py-2"><Droplets className="w-4 h-4" /> Vinyl Inv</TabsTrigger>
            <TabsTrigger value="vinyl_estimator" className="flex items-center gap-1.5 text-xs md:text-sm py-2"><Droplets className="w-4 h-4" /> Vinyl Est</TabsTrigger>
            <TabsTrigger value="importer" className="flex items-center gap-1.5 text-xs md:text-sm py-2"><FileSpreadsheet className="w-4 h-4" /> Importer</TabsTrigger>
            <TabsTrigger value="all_in_one" className="flex items-center gap-1.5 text-xs md:text-sm py-2"><Layers className="w-4 h-4" /> All-In-One</TabsTrigger>
          </TabsList>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="pt-6">
              {/*
                Only mount the body of the currently-selected tab. Radix
                <TabsContent> normally renders for every value (even hidden
                ones with `hidden`), which forced every formula component to
                execute on first paint. Gating by `selectedModule` means the
                tab the user actually clicked is the only one that runs.
              */}
              <Suspense fallback={<TabFallback />}>
                {selectedModule === "painting" && (
                  <TabsContent value="painting" className="mt-0" forceMount>{renderPaintingFormulas()}</TabsContent>
                )}
                {selectedModule === "laser" && (
                  <TabsContent value="laser" className="mt-0" forceMount><LaserFormulas settings={settings} /></TabsContent>
                )}
                {selectedModule === "cnc" && (
                  <TabsContent value="cnc" className="mt-0" forceMount><CNCFormulas settings={settings} /></TabsContent>
                )}
                {selectedModule === "metal" && (
                  <TabsContent value="metal" className="mt-0" forceMount><MetalFormulas settings={settings} /></TabsContent>
                )}
                {selectedModule === "channel_letter" && (
                  <TabsContent value="channel_letter" className="mt-0" forceMount><ChannelLetterInstallFormulas settings={settings} /></TabsContent>
                )}
                {selectedModule === "concrete_masonry_poles" && (
                  <TabsContent value="concrete_masonry_poles" className="mt-0" forceMount><ConcreteMasonryPolesFormulas settings={settings} /></TabsContent>
                )}
                {selectedModule === "sign_maintenance" && (
                  <TabsContent value="sign_maintenance" className="mt-0" forceMount><SignMaintenanceFormulas settings={settings} /></TabsContent>
                )}
                {selectedModule === "vinyl" && (
                  <TabsContent value="vinyl" className="mt-0" forceMount><VinylInventoryFormulas /></TabsContent>
                )}
                {selectedModule === "vinyl_estimator" && (
                  <TabsContent value="vinyl_estimator" className="mt-0" forceMount><VinylEstimatorFormulas /></TabsContent>
                )}
                {selectedModule === "importer" && (
                  <TabsContent value="importer" className="mt-0" forceMount><MasterInventoryImporterFormulas /></TabsContent>
                )}
                {selectedModule === "all_in_one" && (
                  <TabsContent value="all_in_one" className="mt-0" forceMount><AllInOneFormulas /></TabsContent>
                )}
              </Suspense>
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </div>
  );
}