
import React, { useState, useEffect, useCallback } from "react";
import { Settings as SettingsEntity, User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, DollarSign, Clock, Paintbrush, Calculator, TrendingDown, Plus, Trash2, Square, Shapes, Type } from "lucide-react";
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

const settingsDefinitions = [
    // General Pricing & Labor
    { name: "default_labor_rate", type: "number", category: "painting_pricing", description: "Default hourly labor rate for all painting tasks", default: "60" },
    { name: "base_supplies_per_job", type: "number", category: "painting_supplies", description: "Flat cost for general consumables per job", default: "50" },
    { name: "paint_mixing_labor_hours", type: "number", category: "painting_labor", description: "Fixed labor hours for mixing paint per job", default: "0.25" },
    { name: "setup_time_labor_hours", type: "number", category: "painting_labor", description: "Fixed labor hours for job setup and cleanup", default: "0.5" },
    
    // Paint Application & Materials
    { name: "paint_cost_per_unit", type: "number", category: "painting_pricing", description: "Cost of one unit of paint", default: "25" },
    { name: "paint_unit", type: "select", options: ["oz", "pint", "quart", "liter", "gallon"], category: "painting_pricing", description: "The unit of measure for paint cost", default: "gallon" },
    { name: "hardener_cost_per_unit", type: "number", category: "painting_pricing", description: "Cost of one unit of hardener", default: "15" },
    { name: "hardener_unit", type: "select", options: ["oz", "pint", "quart", "liter", "gallon"], category: "painting_pricing", description: "The unit of measure for hardener cost", default: "gallon" },
    { name: "reducer_cost_per_unit", type: "number", category: "painting_pricing", description: "Cost of one unit of reducer", default: "12" },
    { name: "reducer_unit", type: "select", options: ["oz", "pint", "quart", "liter", "gallon"], category: "painting_pricing", description: "The unit of measure for reducer cost", default: "gallon" },
    { name: "paint_mix_ratio", type: "number", category: "painting_supplies", description: "Paint component ratio in the mix (e.g., 3 parts paint)", default: "3" },
    { name: "hardener_mix_ratio", type: "number", category: "painting_supplies", description: "Hardener component ratio in the mix (e.g., 1 part hardener)", default: "1" },
    { name: "reducer_mix_ratio", type: "number", category: "painting_supplies", description: "Reducer component ratio in the mix (e.g., 1 part reducer)", default: "1" },
    { name: "mixed_paint_coverage_sqft_per_gallon", type: "number", category: "painting_supplies", description: "Coverage in square feet for one gallon of mixed paint", default: "350" },
    { name: "paint_waste_multiplier", type: "number", category: "painting_supplies", description: "Multiplier to account for paint waste (e.g., 1.25 for 25% waste)", default: "1.25" },
    { name: "default_paint_supplies_per_sqft", type: "number", category: "painting_supplies", description: "Cost of paint-specific supplies per sq. ft. per color (rollers, trays, etc.)", default: "1.25" },

    // Paint Mask
    { name: "paint_mask_rate_per_sqft", type: "number", category: "painting_supplies", description: "Material cost for paint mask vinyl per square foot", default: "0.75" },
    { name: "paint_mask_cutting_labor_rate_per_sqft", type: "number", category: "painting_labor", description: "Labor cost for cutting the paint mask per sq. ft.", default: "0.15" },
    { name: "paint_mask_machine_cutting_rate_per_sqft", type: "number", category: "painting_pricing", description: "Machine cost for cutting the paint mask per sq. ft.", default: "0.10" },
    { name: "paint_mask_application_labor_rate_per_sqft", type: "number", category: "painting_labor", description: "Labor cost for applying the paint mask per sq. ft.", default: "0.25" },

    // Labor Multipliers
    { name: "base_labor_hours_per_sqft", type: "number", category: "painting_labor", description: "Base labor hours for painting per square foot", default: "0.5" },
    { name: "simple_complexity_multiplier", type: "number", category: "painting_labor", description: "Labor multiplier for simple complexity jobs", default: "0.7" },
    { name: "moderate_complexity_multiplier", type: "number", category: "painting_labor", description: "Labor multiplier for moderate complexity jobs", default: "1.0" },
    { name: "complex_complexity_multiplier", type: "number", category: "painting_labor", description: "Labor multiplier for complex complexity jobs", default: "1.5" },
    { name: "one_side_paint_multiplier", type: "number", category: "painting_labor", description: "Labor multiplier for painting one side only", default: "0.8" },
    { name: "both_sides_paint_multiplier", type: "number", category: "painting_labor", description: "Labor multiplier for painting both sides", default: "1.0" },
    { name: "additional_color_multiplier", type: "number", category: "painting_labor", description: "Labor multiplier for each additional color applied", default: "0.3" },
    { name: "letter_perimeter_factor", type: "number", category: "painting_labor", description: "Multiplier to estimate letter perimeter from its height", default: "3.5" },
    
    // Minimums
    { name: "min_labor_hours", type: "number", category: "painting_pricing", description: "Minimum total labor hours for a paint job", default: "0" },
    { name: "min_paint_cost", type: "number", category: "painting_pricing", description: "Minimum total cost for liquid paint and supplies", default: "0" },
];


export default function PaintSettings() {
  const [isLocked, setIsLocked] = useState(true);
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [liquidPaintRate, setLiquidPaintRate] = useState(0);
  
  // Separate quantity tiers for each item type
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
      
      // Load separate quantity tiers for each item type
      if (settingsMap.panel_labor_tiers) {
        try {
          const parsedTiers = JSON.parse(settingsMap.panel_labor_tiers);
          // Ensure tiers have valid structure before setting
          if (Array.isArray(parsedTiers) && parsedTiers.every(t => 
            typeof t.min_quantity === 'number' && 
            typeof t.max_quantity === 'number' && 
            typeof t.labor_multiplier === 'number'
          )) {
            setPanelTiers(parsedTiers);
          } else {
            console.warn('Invalid structure for panel_labor_tiers, using default.');
          }
        } catch (e) {
          console.error('Error parsing panel tiers from database, using default:', e);
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
          } else {
            console.warn('Invalid structure for complex_shapes_labor_tiers, using default.');
          }
        } catch (e) {
          console.error('Error parsing complex shapes tiers from database, using default:', e);
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
          } else {
            console.warn('Invalid structure for lettering_labor_tiers, using default.');
          }
        } catch (e) {
          console.error('Error parsing lettering tiers from database, using default:', e);
        }
      }
    } catch (error) {
      console.error('Error loading settings, using all defaults:', error);
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
  }, [
    settings.paint_cost_per_unit,
    settings.paint_unit,
    settings.hardener_cost_per_unit,
    settings.hardener_unit,
    settings.reducer_cost_per_unit,
    settings.reducer_unit,
    settings.paint_mix_ratio,
    settings.hardener_mix_ratio,
    settings.reducer_mix_ratio,
    settings.mixed_paint_coverage_sqft_per_gallon,
  ]);

  // NEW: Calculate paint mixing example
  const calculateMixingExample = useCallback(() => {
    const examplePaintableArea = 100; // 100 sq ft example
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
  }, [
    settings.paint_waste_multiplier,
    settings.mixed_paint_coverage_sqft_per_gallon,
    settings.paint_mixing_labor_hours
  ]);

  const mixingExample = calculateMixingExample();

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
      
      // Save panel tiers
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
      
      // Save complex shapes tiers
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
      
      // Save lettering tiers
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
  
  // Generic tier management functions
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
        <div className="animate-pulse space-y-6 text-center">
          <p className="text-slate-600">Loading settings...</p>
        </div>
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

  const categoryDescriptions = {
    "painting_pricing": "Define the core rates, costs, and minimum charges for painting projects.",
    "painting_supplies": "Set parameters for paint mixing ratios, coverage, waste, and other supplies.",
    // "painting_labor" description is now handled directly in the custom card
  };

  const renderCategory = (title, category, icon) => {
    const Icon = icon;
    const filteredSettings = settingsDefinitions.filter(def => def.category === category);
    if (filteredSettings.length === 0) return null;

    return (
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-900">
            <Icon className="w-6 h-6 text-slate-500" />
            {title}
          </CardTitle>
          {categoryDescriptions[category] && <CardDescription>{categoryDescriptions[category]}</CardDescription>}
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          {filteredSettings.map(def => renderSettingInput(def))}
        </CardContent>
      </Card>
    );
  };
  
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
  
  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
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
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {renderCategory("Pricing & Minimums", "painting_pricing", DollarSign)}
              {renderCategory("Supplies & Materials", "painting_supplies", Paintbrush)}

              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-900">
                    <Clock className="w-6 h-6 text-slate-500" />
                    Labor Settings
                  </CardTitle>
                  <p className="text-sm text-slate-600">Configure labor rates and time calculations</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {settingsDefinitions
                      .filter(def => def.category === "painting_labor" && !["paint_mixing_labor_hours", "setup_time_labor_hours"].includes(def.name))
                      .map(def => renderSettingInput(def))}
                  </div>
                  
                  <div className="border-t pt-6">
                    <h4 className="font-medium text-slate-800 mb-4">Fixed Labor Times</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      {renderSettingInput(settingsDefinitions.find(def => def.name === "paint_mixing_labor_hours"))}
                      {renderSettingInput(settingsDefinitions.find(def => def.name === "setup_time_labor_hours"))}
                    </div>

                    <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <h5 className="font-medium text-amber-800 mb-2 text-sm">Paint Mixing Calculation Example</h5>
                      <div className="space-y-1 text-xs text-amber-700">
                        <p>• Example: 100 sq ft × 3 colors = {mixingExample.exampleArea} sq ft total</p>
                        <p>• With waste: {mixingExample.exampleArea} × {parseFloat(settings.paint_waste_multiplier || 1.25)} = {(mixingExample.exampleArea * parseFloat(settings.paint_waste_multiplier || 1.25)).toFixed(0)} sq ft</p>
                        <p>• Gallons needed: {(mixingExample.exampleArea * parseFloat(settings.paint_waste_multiplier || 1.25)).toFixed(0)} ÷ {parseFloat(settings.mixed_paint_coverage_sqft_per_gallon || 350)} coverage = {mixingExample.gallonsNeeded.toFixed(2)} gal</p>
                        <p className="font-semibold">• Mixes required: {mixingExample.numberOfMixes} (rounded up)</p>
                        <p className="font-semibold text-amber-900">• Total mixing time: {mixingExample.numberOfMixes} mixes × {mixingExample.mixingHoursPerGallon} hrs = {mixingExample.totalMixingHours.toFixed(2)} hours</p>
                        <p className="mt-2 text-amber-800 italic">Note: Each gallon (or partial) requires a separate mix. Mixing time scales with volume, not item quantity.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quantity-Based Labor Discounts - Tabbed by Item Type */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg font-semibold text-amber-900">
                    <TrendingDown className="w-6 h-6 text-amber-500" />
                    Quantity-Based Labor Discounts
                  </CardTitle>
                  <CardDescription>
                    Reduce labor costs as quantity increases. Labor becomes more efficient with repetition.
                    Configure separate discount curves for each item type. Materials remain at full price.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="panel" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                      <TabsTrigger value="panel" className="flex items-center gap-2">
                        <Square className="w-4 h-4" />
                        Panels
                      </TabsTrigger>
                      <TabsTrigger value="complex_shapes" className="flex items-center gap-2">
                        <Shapes className="w-4 h-4" />
                        Complex Shapes
                      </TabsTrigger>
                      <TabsTrigger value="lettering" className="flex items-center gap-2">
                        <Type className="w-4 h-4" />
                        Lettering
                      </TabsTrigger>
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
                  
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mt-4">
                    <h4 className="font-medium text-blue-900 mb-2 text-sm">How It Works:</h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• Different item types can have different discount curves</li>
                      <li>• Panels might scale differently than complex shapes or lettering</li>
                      <li>• Example: 10 panels at 0.90x vs 10 letters at 0.85x multiplier</li>
                      <li>• Multipliers only affect labor - materials stay full price</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg font-semibold text-blue-900">
                    <Calculator className="w-6 h-6 text-blue-500" />
                    Calculated Liquid Paint Cost
                  </CardTitle>
                  <CardDescription>This value is derived from the paint, hardener, reducer, and coverage settings above.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center p-6 bg-blue-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-blue-800 font-medium mb-1">Cost per square foot of mixed paint:</p>
                    <h3 className="text-3xl font-bold text-blue-900 flex items-center gap-2">
                      <DollarSign className="w-7 h-7" />
                      {liquidPaintRate.toFixed(4)}
                      <span className="text-lg font-normal text-blue-700">/ sq ft</span>
                    </h3>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </SettingsAuthWrapper>

        <div className="mt-8 flex justify-end">
          <Button onClick={saveSettings} disabled={isSaving || isLocked} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3">{isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save All Settings</>}</Button>
        </div>
      </div>
    </div>
  );
}
