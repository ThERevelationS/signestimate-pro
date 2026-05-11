import React, { useState, useEffect, useCallback } from "react";
import { Settings as SettingsEntity, User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, DollarSign, Clock, Paintbrush, Calculator, TrendingDown, Plus, Trash2, Square, Shapes, Type, Scissors, Beaker } from "lucide-react";
import SettingsAuthWrapper from "@/components/SettingsAuthWrapper";

const unitFactors = {
  oz: 1 / 128,
  pint: 1 / 8,
  quart: 1 / 4,
  liter: 1 / 3.78541,
  gallon: 1,
};

const unitOptions = [
  { value: "oz", label: "Ounces (oz)" },
  { value: "pint", label: "Pints (pt)" },
  { value: "quart", label: "Quarts (qt)" },
  { value: "liter", label: "Liters (L)" },
  { value: "gallon", label: "Gallons (gal)" },
];

const getCostPerGallon = (cost, unit) => {
  const parsedCost = parseFloat(cost);
  if (isNaN(parsedCost) || parsedCost <= 0) return 0;
  const factor = unitFactors[unit] || unitFactors['gallon']; 
  if (factor === 0) return 0;
  return parsedCost / factor;
};

// Settings definitions grouped by UI tab via `group` field.
// Groups: rates | mix | mask | labor | discounts (discounts handled separately)
const settingsDefinitions = [
    // ===== Rates & Minimums =====
    { name: "default_labor_rate", type: "number", category: "painting_pricing", group: "rates", description: "Default hourly labor rate ($/hr)", default: "60" },
    { name: "min_labor_hours", type: "number", category: "painting_pricing", group: "rates", description: "Minimum total labor hours per job", default: "0" },
    { name: "min_paint_cost", type: "number", category: "painting_pricing", group: "rates", description: "Minimum total cost for paint & supplies ($)", default: "0" },
    { name: "base_supplies_per_job", type: "number", category: "painting_supplies", group: "rates", description: "Flat cost for general consumables per job ($)", default: "50" },
    { name: "default_paint_supplies_per_sqft", type: "number", category: "painting_supplies", group: "rates", description: "Default paint application supplies per sq. ft. per color ($)", default: "1.25" },

    // ===== Paint Mix & Coverage =====
    { name: "paint_cost_per_unit", type: "number", category: "painting_pricing", group: "mix", description: "Paint cost (per chosen unit)", default: "25" },
    { name: "paint_unit", type: "select", options: ["oz", "pint", "quart", "liter", "gallon"], category: "painting_pricing", group: "mix", description: "Paint unit of measure", default: "gallon" },
    { name: "hardener_cost_per_unit", type: "number", category: "painting_pricing", group: "mix", description: "Hardener cost (per chosen unit)", default: "15" },
    { name: "hardener_unit", type: "select", options: ["oz", "pint", "quart", "liter", "gallon"], category: "painting_pricing", group: "mix", description: "Hardener unit of measure", default: "gallon" },
    { name: "reducer_cost_per_unit", type: "number", category: "painting_pricing", group: "mix", description: "Reducer cost (per chosen unit)", default: "12" },
    { name: "reducer_unit", type: "select", options: ["oz", "pint", "quart", "liter", "gallon"], category: "painting_pricing", group: "mix", description: "Reducer unit of measure", default: "gallon" },
    { name: "paint_mix_ratio", type: "number", category: "painting_supplies", group: "mix", description: "Paint ratio parts (e.g., 3)", default: "3" },
    { name: "hardener_mix_ratio", type: "number", category: "painting_supplies", group: "mix", description: "Hardener ratio parts (e.g., 1)", default: "1" },
    { name: "reducer_mix_ratio", type: "number", category: "painting_supplies", group: "mix", description: "Reducer ratio parts (e.g., 1)", default: "1" },
    { name: "mixed_paint_coverage_sqft_per_gallon", type: "number", category: "painting_supplies", group: "mix", description: "Mixed paint coverage (sq ft per gallon)", default: "350" },
    { name: "paint_waste_multiplier", type: "number", category: "painting_supplies", group: "mix", description: "Paint waste multiplier (e.g., 1.25 = 25% waste)", default: "1.25" },
    { name: "fixed_paint_waste_gallons", type: "number", category: "painting_supplies", group: "mix", description: "Fixed extra waste paint per job (gallons)", default: "0" },

    // ===== Paint Mask =====
    { name: "paint_mask_rate_per_sqft", type: "number", category: "painting_supplies", group: "mask", description: "Paint mask vinyl material cost ($/sqft)", default: "0.75" },
    { name: "paint_mask_machine_cutting_rate_per_sqft", type: "number", category: "painting_pricing", group: "mask", description: "Plotter/machine cutting cost ($/sqft)", default: "0.10" },
    { name: "paint_mask_cutting_labor_rate_per_sqft", type: "number", category: "painting_labor", group: "mask", description: "Hand weeding/trimming labor ($/sqft)", default: "0.15" },
    { name: "paint_mask_application_labor_rate_per_sqft", type: "number", category: "painting_labor", group: "mask", description: "Mask application labor ($/sqft)", default: "0.25" },

    // ===== Labor (times, multipliers, letter prep) =====
    // Base
    { name: "base_labor_hours_per_sqft", type: "number", category: "painting_labor", group: "labor", description: "Base labor hours per sq ft of paintable area", default: "0.05" },
    // Fixed times
    { name: "setup_time_labor_hours", type: "number", category: "painting_labor", group: "labor", description: "Fixed setup & cleanup hours per job", default: "0.5" },
    { name: "paint_mixing_labor_hours", type: "number", category: "painting_labor", group: "labor", description: "Mixing time per gallon (hours)", default: "0.25" },
    { name: "color_change_setup_hours", type: "number", category: "painting_labor", group: "labor", description: "Setup hours per color change (after first color)", default: "0.25" },
    { name: "paint_gun_cleaning_hours", type: "number", category: "painting_labor", group: "labor", description: "Gun cleaning hours per color used", default: "0.15" },
    // Paint sides
    { name: "one_side_paint_multiplier", type: "number", category: "painting_labor", group: "labor", description: "Multiplier — paint one side only", default: "0.8" },
    { name: "both_sides_paint_multiplier", type: "number", category: "painting_labor", group: "labor", description: "Multiplier — paint both sides", default: "1.0" },
    { name: "additional_color_multiplier", type: "number", category: "painting_labor", group: "labor", description: "Extra labor per additional color (e.g., 0.3 = +30% per extra color)", default: "0.3" },
    // Lettering complexity (applied based on letter size → small letters = complex, large = simple)
    { name: "simple_complexity_multiplier", type: "number", category: "painting_labor", group: "labor", description: "Lettering — Simple complexity (large/extra-large letters)", default: "0.7" },
    { name: "moderate_complexity_multiplier", type: "number", category: "painting_labor", group: "labor", description: "Lettering — Moderate complexity (normal/medium letters & panels)", default: "1.0" },
    { name: "complex_complexity_multiplier", type: "number", category: "painting_labor", group: "labor", description: "Lettering — Complex complexity (small/extra-small letters)", default: "1.5" },
    // Letter perimeter & prep
    { name: "letter_perimeter_factor", type: "number", category: "painting_labor", group: "labor", description: "Letter perimeter factor (estimated perimeter ÷ height)", default: "3.5" },
    { name: "lettering_extra_small_prep_multiplier", type: "number", category: "painting_labor", group: "labor", description: "Prep multiplier — Extra small letters (≤4\")", default: "1.5" },
    { name: "lettering_small_prep_multiplier", type: "number", category: "painting_labor", group: "labor", description: "Prep multiplier — Small letters (4-8\")", default: "1.3" },
    { name: "lettering_normal_prep_multiplier", type: "number", category: "painting_labor", group: "labor", description: "Prep multiplier — Normal letters (8-12\")", default: "1.0" },
    { name: "lettering_medium_prep_multiplier", type: "number", category: "painting_labor", group: "labor", description: "Prep multiplier — Medium letters (12-20\")", default: "0.9" },
    { name: "lettering_large_prep_multiplier", type: "number", category: "painting_labor", group: "labor", description: "Prep multiplier — Large letters (20-30\")", default: "0.8" },
    { name: "lettering_extra_large_prep_multiplier", type: "number", category: "painting_labor", group: "labor", description: "Prep multiplier — Extra large letters (30\"+)", default: "0.7" },
];

export default function PaintSettings() {
  const [isLocked, setIsLocked] = useState(true);
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [liquidPaintRate, setLiquidPaintRate] = useState(0);
  
  const [panelTiers, setPanelTiers] = useState([
    { min_quantity: 1, max_quantity: 5, labor_multiplier: 1.0 },
    { min_quantity: 6, max_quantity: 10, labor_multiplier: 0.95 },
    { min_quantity: 11, max_quantity: 20, labor_multiplier: 0.90 },
    { min_quantity: 21, max_quantity: 999, labor_multiplier: 0.85 }
  ]);
  
  const [complexShapesTiers, setComplexShapesTiers] = useState([
    { min_quantity: 1, max_quantity: 5, labor_multiplier: 1.0 },
    { min_quantity: 6, max_quantity: 10, labor_multiplier: 0.95 },
    { min_quantity: 11, max_quantity: 20, labor_multiplier: 0.90 },
    { min_quantity: 21, max_quantity: 999, labor_multiplier: 0.85 }
  ]);
  
  const [letteringTiers, setLetteringTiers] = useState([
    { min_quantity: 1, max_quantity: 5, labor_multiplier: 1.0 },
    { min_quantity: 6, max_quantity: 10, labor_multiplier: 0.95 },
    { min_quantity: 11, max_quantity: 20, labor_multiplier: 0.90 },
    { min_quantity: 21, max_quantity: 999, labor_multiplier: 0.85 }
  ]);

  const calculateMixingExample = useCallback(() => {
    const examplePaintableArea = 100;
    const exampleColors = 3;
    const totalArea = examplePaintableArea * exampleColors;
    
    const wasteMultiplier = parseFloat(settings.paint_waste_multiplier) || 1.25;
    const coverage = parseFloat(settings.mixed_paint_coverage_sqft_per_gallon) || 350;
    
    const gallonsNeeded = (totalArea * wasteMultiplier) / coverage;
    const numberOfMixes = Math.ceil(gallonsNeeded);
    const mixingHoursPerGallon = parseFloat(settings.paint_mixing_labor_hours) || 0;
    const totalMixingHours = numberOfMixes * mixingHoursPerGallon;
    
    return {
      exampleArea: totalArea,
      gallonsNeeded,
      numberOfMixes,
      mixingHoursPerGallon,
      totalMixingHours
    };
  }, [settings]);

  const mixingExample = calculateMixingExample();

  const initializeAndLoad = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dbSettings, user] = await Promise.all([
        SettingsEntity.list(),
        User.me()
      ]);
      setCurrentUser(user);

      const settingsMap = {};
      dbSettings.forEach(s => {
        settingsMap[s.setting_name] = s.setting_value;
      });

      const finalSettings = {};
      settingsDefinitions.forEach(def => {
        finalSettings[def.name] = settingsMap[def.name] !== undefined ? settingsMap[def.name] : def.default;
      });
      
      setSettings(finalSettings);
      
      if (settingsMap.panel_labor_tiers) {
        try {
          const parsedTiers = JSON.parse(settingsMap.panel_labor_tiers);
          if (Array.isArray(parsedTiers) && parsedTiers.every(t => 
            typeof t.min_quantity === 'number' && 
            typeof t.max_quantity === 'number' && 
            typeof t.labor_multiplier === 'number'
          )) {
            setPanelTiers(parsedTiers);
          }
        } catch (e) {
          console.error('Error parsing panel tiers from database:', e);
        }
      }
      
      if (settingsMap.complex_shapes_labor_tiers) {
        try {
          const parsedTiers = JSON.parse(settingsMap.complex_shapes_labor_tiers);
          if (Array.isArray(parsedTiers) && parsedTiers.every(t => 
            typeof t.min_quantity === 'number' && 
            typeof t.max_quantity === 'number' && 
            typeof t.labor_multiplier === 'number'
          )) {
            setComplexShapesTiers(parsedTiers);
          }
        } catch (e) {
          console.error('Error parsing complex shapes tiers from database:', e);
        }
      }
      
      if (settingsMap.lettering_labor_tiers) {
        try {
          const parsedTiers = JSON.parse(settingsMap.lettering_labor_tiers);
          if (Array.isArray(parsedTiers) && parsedTiers.every(t => 
            typeof t.min_quantity === 'number' && 
            typeof t.max_quantity === 'number' && 
            typeof t.labor_multiplier === 'number'
          )) {
            setLetteringTiers(parsedTiers);
          }
        } catch (e) {
          console.error('Error parsing lettering tiers from database:', e);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      const defaultSettings = {};
      settingsDefinitions.forEach(def => {
        defaultSettings[def.name] = def.default;
      });
      setSettings(defaultSettings);
    }
    setIsLoading(false);
  }, []); 

  useEffect(() => {
    initializeAndLoad();
  }, [initializeAndLoad]);

  useEffect(() => {
    const paintCostPerGallon = getCostPerGallon(
      settings.paint_cost_per_unit,
      settings.paint_unit
    );
    const hardenerCostPerGallon = getCostPerGallon(
      settings.hardener_cost_per_unit,
      settings.hardener_unit
    );
    const reducerCostPerGallon = getCostPerGallon(
      settings.reducer_cost_per_unit,
      settings.reducer_unit
    );
    
    const paintMixRatio = parseFloat(settings.paint_mix_ratio) || 0;
    const hardenerMixRatio = parseFloat(settings.hardener_mix_ratio) || 0;
    const reducerMixRatio = parseFloat(settings.reducer_mix_ratio) || 0;

    const totalRatioParts = paintMixRatio + hardenerMixRatio + reducerMixRatio;
    
    if (totalRatioParts === 0) {
      setLiquidPaintRate(0);
      return;
    }

    const costOfMixedBatchGallonEquivalent = 
      (paintCostPerGallon * paintMixRatio) +
      (hardenerCostPerGallon * hardenerMixRatio) +
      (reducerCostPerGallon * reducerMixRatio);

    const costPerGallonOfMixedPaint = costOfMixedBatchGallonEquivalent / totalRatioParts;
    const coverageSqFtPerGallon = parseFloat(settings.mixed_paint_coverage_sqft_per_gallon) || 1;
    const finalRate = coverageSqFtPerGallon > 0 ? costPerGallonOfMixedPaint / coverageSqFtPerGallon : 0;
    setLiquidPaintRate(finalRate);
  }, [settings]);

  const saveSettings = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const existingDbSettings = await SettingsEntity.list();
      const existingSettingsMap = new Map(
        existingDbSettings.map(s => [s.setting_name, s])
      );

      const updates = [];
      const creates = [];

      for (const def of settingsDefinitions) {
        const valueToSave = settings[def.name];
        if (valueToSave === undefined || valueToSave === null) {
          continue;
        }

        const data = {
          setting_name: def.name,
          setting_value: String(valueToSave),
          setting_type: def.type,
          category: def.category,
          description: def.description,
        };

        const existing = existingSettingsMap.get(def.name);
        if (existing) {
          if (existing.setting_value !== data.setting_value) {
            updates.push(SettingsEntity.update(existing.id, data));
          }
        } else {
          creates.push(SettingsEntity.create(data));
        }
      }
      
      const panelTiersData = {
        setting_name: 'panel_labor_tiers',
        setting_value: JSON.stringify(panelTiers),
        setting_type: 'text',
        category: 'painting_labor',
        description: 'Panel quantity-based labor discount tiers'
      };
      const existingPanelTiers = existingSettingsMap.get('panel_labor_tiers');
      if (existingPanelTiers) {
        if (existingPanelTiers.setting_value !== panelTiersData.setting_value) {
          updates.push(SettingsEntity.update(existingPanelTiers.id, panelTiersData));
        }
      } else {
        creates.push(SettingsEntity.create(panelTiersData));
      }
      
      const complexShapesTiersData = {
        setting_name: 'complex_shapes_labor_tiers',
        setting_value: JSON.stringify(complexShapesTiers),
        setting_type: 'text',
        category: 'painting_labor',
        description: 'Complex shapes quantity-based labor discount tiers'
      };
      const existingComplexShapesTiers = existingSettingsMap.get('complex_shapes_labor_tiers');
      if (existingComplexShapesTiers) {
        if (existingComplexShapesTiers.setting_value !== complexShapesTiersData.setting_value) {
          updates.push(SettingsEntity.update(existingComplexShapesTiers.id, complexShapesTiersData));
        }
      } else {
        creates.push(SettingsEntity.create(complexShapesTiersData));
      }
      
      const letteringTiersData = {
        setting_name: 'lettering_labor_tiers',
        setting_value: JSON.stringify(letteringTiers),
        setting_type: 'text',
        category: 'painting_labor',
        description: 'Lettering quantity-based labor discount tiers'
      };
      const existingLetteringTiers = existingSettingsMap.get('lettering_labor_tiers');
      if (existingLetteringTiers) {
        if (existingLetteringTiers.setting_value !== letteringTiersData.setting_value) {
          updates.push(SettingsEntity.update(existingLetteringTiers.id, letteringTiersData));
        }
      } else {
        creates.push(SettingsEntity.create(letteringTiersData));
      }

      if (updates.length > 0 || creates.length > 0) {
        await Promise.all([...updates, ...creates]);
        alert('Settings saved successfully!');
      } else {
        alert('No settings were changed. Nothing to save.');
      }
      
    } catch (error) {
      console.error('Save process failed:', error);
      alert('Save failed: ' + (error.message || 'An unknown error occurred.'));
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  
  const addTier = (tiers, setTiers) => {
    const lastTier = tiers.length > 0 ? tiers[tiers.length - 1] : null;
    const newMin = lastTier ? lastTier.max_quantity + 1 : 1;
    setTiers(prev => [...prev, {
      min_quantity: newMin,
      max_quantity: newMin + 5,
      labor_multiplier: 0.85
    }]);
  };
  
  const removeTier = (tiers, setTiers, index) => {
    if (tiers.length > 1) {
      setTiers(prev => prev.filter((_, i) => i !== index));
    }
  };
  
  const updateTier = (tiers, setTiers, index, field, value) => {
    setTiers(prev => prev.map((tier, i) => {
      if (i !== index) return tier;
      return { ...tier, [field]: parseFloat(value) || 0 };
    }));
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading settings...</p>
      </div>
    );
  }

  const renderSettingInput = (def) => {
    const value = settings[def.name];
    const commonProps = {
      id: def.name,
      value: value || '',
      onChange: (e) => updateSetting(def.name, e.target.value),
      disabled: isLocked,
      className: "mt-1",
      min: def.type === "number" ? "0" : undefined,
      step: def.type === "number" ? "0.01" : undefined,
    };

    switch (def.type) {
      case "number":
        let step = "0.01";
        if (def.name.includes("ratio") || def.name.includes("multiplier") || def.name.includes("factor")) {
          step = "0.1";
        } else if (def.name.includes("hours")) {
          step = "0.25";
        } else if (def.name.includes("per_sqft")) {
            step = "0.01";
        } else if (def.name.includes("cost") && !def.name.includes("per_sqft")) {
            step = "1";
        }
        
        return (
          <div key={def.name}>
            <Label htmlFor={def.name}>{def.description}</Label>
            <Input type="number" step={step} {...commonProps} />
          </div>
        );
      case "select":
        return (
          <div key={def.name}>
            <Label htmlFor={def.name}>{def.description}</Label>
            <Select value={value || def.default} onValueChange={(val) => updateSetting(def.name, val)} disabled={isLocked}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select unit" /></SelectTrigger>
              <SelectContent>
                {def.options.map(optionValue => (
                  <SelectItem key={optionValue} value={optionValue}>
                    {unitOptions.find(o => o.value === optionValue)?.label || optionValue}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      default:
        return (
          <div key={def.name}>
            <Label htmlFor={def.name}>{def.description}</Label>
            <Input type="text" {...commonProps} />
          </div>
        );
    }
  };

  const getGroup = (group) => settingsDefinitions.filter(d => d.group === group);
  const inputsByName = (names) => settingsDefinitions.filter(d => names.includes(d.name));

  const SectionCard = ({ title, description, icon: Icon, defs, cols = 2, children }) => (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-base font-semibold text-slate-900">
          {Icon && <Icon className="w-5 h-5 text-slate-500" />}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {defs && defs.length > 0 && (
          <div className={`grid gap-4 ${cols === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            {defs.map(def => renderSettingInput(def))}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
  
  const renderTiersList = (tiers, setTiers, itemType, icon, color) => {
    const Icon = icon;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Icon className={`w-5 h-5 ${color}`} />
          <h4 className="font-medium text-slate-800">{itemType} Items</h4>
        </div>
        {tiers.map((tier, index) => (
          <div key={index} className="flex items-end gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex-1 grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Min Qty</Label>
                <Input
                  type="number"
                  min="1"
                  value={tier.min_quantity}
                  onChange={(e) => updateTier(tiers, setTiers, index, 'min_quantity', e.target.value)}
                  disabled={isLocked}
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Max Qty</Label>
                <Input
                  type="number"
                  min="1"
                  value={tier.max_quantity}
                  onChange={(e) => updateTier(tiers, setTiers, index, 'max_quantity', e.target.value)}
                  disabled={isLocked}
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Labor Multiplier</Label>
                <Input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={tier.labor_multiplier}
                  onChange={(e) => updateTier(tiers, setTiers, index, 'labor_multiplier', e.target.value)}
                  disabled={isLocked}
                  className="mt-1 h-9"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-xs font-medium text-amber-900 whitespace-nowrap">
                {tier.min_quantity}-{tier.max_quantity} items
              </div>
              <div className="text-xs text-amber-600">
                {((1 - tier.labor_multiplier) * 100).toFixed(0)}% off labor
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeTier(tiers, setTiers, index)}
              disabled={isLocked || tiers.length === 1}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 w-9"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        
        <Button
          onClick={() => addTier(tiers, setTiers)}
          disabled={isLocked}
          variant="outline"
          size="sm"
          className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Tier
        </Button>
      </div>
    );
  };
  
  const fixedTimes = inputsByName(['setup_time_labor_hours','paint_mixing_labor_hours','color_change_setup_hours','paint_gun_cleaning_hours']);
  const sidesAndColor = inputsByName(['one_side_paint_multiplier','both_sides_paint_multiplier','additional_color_multiplier']);
  const complexityMults = inputsByName(['simple_complexity_multiplier','moderate_complexity_multiplier','complex_complexity_multiplier']);
  const letterPrep = inputsByName(['letter_perimeter_factor','lettering_extra_small_prep_multiplier','lettering_small_prep_multiplier','lettering_normal_prep_multiplier','lettering_medium_prep_multiplier','lettering_large_prep_multiplier','lettering_extra_large_prep_multiplier']);
  const baseLabor = inputsByName(['base_labor_hours_per_sqft']);

  const liquidRateCard = (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm font-medium text-blue-900 flex items-center gap-2">
            <Calculator className="w-4 h-4" /> Calculated Mixed Paint Cost
          </p>
          <p className="text-xs text-blue-700 mt-1">Derived from paint, hardener, reducer cost & coverage.</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-blue-900">${liquidPaintRate.toFixed(4)}</p>
          <p className="text-xs text-blue-700">per sq ft</p>
        </div>
      </CardContent>
    </Card>
  );

  const managementContent = (
    <Tabs defaultValue="rates" className="w-full">
      <TabsList className="grid w-full grid-cols-5 mb-6">
        <TabsTrigger value="rates" className="flex items-center gap-2"><DollarSign className="w-4 h-4" />Rates & Minimums</TabsTrigger>
        <TabsTrigger value="mix" className="flex items-center gap-2"><Beaker className="w-4 h-4" />Paint Mix</TabsTrigger>
        <TabsTrigger value="mask" className="flex items-center gap-2"><Scissors className="w-4 h-4" />Paint Mask</TabsTrigger>
        <TabsTrigger value="labor" className="flex items-center gap-2"><Clock className="w-4 h-4" />Labor</TabsTrigger>
        <TabsTrigger value="discounts" className="flex items-center gap-2"><TrendingDown className="w-4 h-4" />Qty Discounts</TabsTrigger>
      </TabsList>

      {/* ===== Rates & Minimums ===== */}
      <TabsContent value="rates" className="space-y-6">
        <SectionCard
          title="Hourly Rate & Job Minimums"
          description="Core hourly rate and minimum charges that protect against undercharging on small jobs."
          icon={DollarSign}
          defs={inputsByName(['default_labor_rate','min_labor_hours','min_paint_cost'])}
        />
        <SectionCard
          title="Default Supplies"
          description="Base consumables cost per job, and default per-sqft application supplies (rollers, trays, etc.)."
          icon={Paintbrush}
          defs={inputsByName(['base_supplies_per_job','default_paint_supplies_per_sqft'])}
        />
      </TabsContent>

      {/* ===== Paint Mix ===== */}
      <TabsContent value="mix" className="space-y-6">
        {liquidRateCard}
        <SectionCard
          title="Paint Component Costs"
          description="Cost of each component. Choose the unit you buy in — the system normalizes to gallons."
          icon={DollarSign}
          defs={inputsByName(['paint_cost_per_unit','paint_unit','hardener_cost_per_unit','hardener_unit','reducer_cost_per_unit','reducer_unit'])}
        />
        <SectionCard
          title="Mix Ratios"
          description="Parts of each component in your standard mix. Example: 3 paint : 1 hardener : 1 reducer."
          icon={Beaker}
          defs={inputsByName(['paint_mix_ratio','hardener_mix_ratio','reducer_mix_ratio'])}
          cols={3}
        />
        <SectionCard
          title="Coverage & Waste"
          description="How far a gallon goes and how much extra paint to plan for."
          icon={Calculator}
          defs={inputsByName(['mixed_paint_coverage_sqft_per_gallon','paint_waste_multiplier','fixed_paint_waste_gallons'])}
          cols={3}
        />
      </TabsContent>

      {/* ===== Paint Mask ===== */}
      <TabsContent value="mask" className="space-y-6">
        <SectionCard
          title="Paint Mask — Materials & Cutting"
          description="ALL four rates below add together when paint mask is used (multi-color jobs). Material is the vinyl itself. Machine = plotter cost. Hand weeding/trimming + application = labor."
          icon={Scissors}
          defs={inputsByName(['paint_mask_rate_per_sqft','paint_mask_machine_cutting_rate_per_sqft','paint_mask_cutting_labor_rate_per_sqft','paint_mask_application_labor_rate_per_sqft'])}
        />
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 text-xs text-amber-800 space-y-1">
            <p className="font-semibold">How paint mask cost is calculated (per item, when 2+ colors):</p>
            <p>• <strong>Mask Material Cost</strong> = mask sqft × ${(parseFloat(settings.paint_mask_rate_per_sqft)||0).toFixed(2)} × (colors − 1)</p>
            <p>• <strong>Machine Cutting Cost</strong> = mask sqft × ${(parseFloat(settings.paint_mask_machine_cutting_rate_per_sqft)||0).toFixed(2)} × (colors − 1)</p>
            <p>• <strong>Hand Weeding Labor</strong> = mask sqft × ${(parseFloat(settings.paint_mask_cutting_labor_rate_per_sqft)||0).toFixed(2)} × (colors − 1)</p>
            <p>• <strong>Application Labor</strong> = mask sqft × ${(parseFloat(settings.paint_mask_application_labor_rate_per_sqft)||0).toFixed(2)} × (colors − 1)</p>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== Labor ===== */}
      <TabsContent value="labor" className="space-y-6">
        <SectionCard
          title="Base Painting Labor"
          description="Hours of painting labor per square foot of paintable area. Typical: 0.03–0.08 hr/sqft. (0.05 = 3 min/sqft)"
          icon={Clock}
          defs={baseLabor}
        />
        <SectionCard
          title="Fixed Per-Job Labor Times"
          description="Time added once per job (or per gallon/color), regardless of item count."
          icon={Clock}
          defs={fixedTimes}
          cols={2}
        >
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Mixing example (100 sqft × 3 colors):</p>
            <p>• Area with waste: {mixingExample.exampleArea} × {parseFloat(settings.paint_waste_multiplier||1.25)} = {(mixingExample.exampleArea*parseFloat(settings.paint_waste_multiplier||1.25)).toFixed(0)} sqft</p>
            <p>• Gallons needed: {mixingExample.gallonsNeeded.toFixed(2)} → {mixingExample.numberOfMixes} mix(es)</p>
            <p>• Mixing time: {mixingExample.totalMixingHours.toFixed(2)} hrs</p>
          </div>
        </SectionCard>
        <SectionCard
          title="Sides & Color Multipliers"
          description="One-side vs both-sides, and extra labor added per additional color applied."
          icon={Palette => null}
          defs={sidesAndColor}
          cols={3}
        />
        <SectionCard
          title="Lettering Complexity Multipliers"
          description="Applied to LETTERING items based on letter size: small/extra-small = Complex, normal/medium = Moderate, large/extra-large = Simple. Panels and complex shapes always use Moderate."
          icon={Type}
          defs={complexityMults}
          cols={3}
        />
        <SectionCard
          title="Lettering Geometry & Prep"
          description="Letter perimeter estimation factor, plus prep time multipliers by letter size. Smaller letters need more prep per sqft."
          icon={Type}
          defs={letterPrep}
        />
      </TabsContent>

      {/* ===== Quantity Discounts ===== */}
      <TabsContent value="discounts" className="space-y-4">
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-base font-semibold text-amber-900">
              <TrendingDown className="w-5 h-5 text-amber-500" />
              Quantity-Based Labor Discounts
            </CardTitle>
            <CardDescription>
              Reduce labor cost as quantity grows (repetition gains efficiency). Materials always stay at full price.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="panel" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="panel" className="flex items-center gap-2"><Square className="w-4 h-4" />Panels</TabsTrigger>
                <TabsTrigger value="complex_shapes" className="flex items-center gap-2"><Shapes className="w-4 h-4" />Complex Shapes</TabsTrigger>
                <TabsTrigger value="lettering" className="flex items-center gap-2"><Type className="w-4 h-4" />Lettering</TabsTrigger>
              </TabsList>
              <TabsContent value="panel" className="space-y-4">
                {renderTiersList(panelTiers, setPanelTiers, "Panel", Square, "text-blue-600")}
              </TabsContent>
              <TabsContent value="complex_shapes" className="space-y-4">
                {renderTiersList(complexShapesTiers, setComplexShapesTiers, "Complex Shapes", Shapes, "text-purple-600")}
              </TabsContent>
              <TabsContent value="lettering" className="space-y-4">
                {renderTiersList(letteringTiers, setLetteringTiers, "Lettering", Type, "text-green-600")}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Paintbrush className="w-8 h-8" />
              Painting Settings
            </h1>
            <p className="text-slate-600">Configure parameters for the Painting Estimator module</p>
          </div>
          <Button 
            onClick={saveSettings} 
            disabled={isSaving || isLocked}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3"
          >
            {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Settings</>}
          </Button>
        </div>

        <SettingsAuthWrapper
          correctPassword="Cinci2467"
          onUnlock={() => setIsLocked(false)}
          user={currentUser}
        >
          {managementContent}
        </SettingsAuthWrapper>

        <div className="mt-8 flex justify-end">
          <Button onClick={saveSettings} disabled={isSaving || isLocked} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3">{isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save All Settings</>}</Button>
        </div>
      </div>
    </div>
  );
}