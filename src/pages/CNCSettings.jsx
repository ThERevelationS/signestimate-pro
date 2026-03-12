
import React, { useState, useEffect, useCallback } from "react";
import { Settings as SettingsEntity, User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Save, Settings, DollarSign, Clock, Router, Percent, Calculator, AlertCircle } from "lucide-react";
import SettingsAuthWrapper from "@/components/SettingsAuthWrapper";

const imperialSizes = ["1/16", "1/8", "3/16", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8", "1", "1-1/4", "1-1/2", "2", "2-1/2", "3", "3-1/2", "4"];
const materials = ["Acrylic", "Wood", "MDF", "Plywood", "PVC", "HDPE", "Aluminum", "Corian"];

export default function CNCSettings() {
  const [isLocked, setIsLocked] = useState(true);
  const [settings, setSettings] = useState({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [cncRate, setCncRate] = useState({ total: 0, parts: {} });

  const calculateRate = useCallback((prefix) => {
    // Ensure settings are treated as numbers, with fallbacks
    const purchasePrice = parseFloat(settings[`${prefix}_purchase_price`] || 0);
    const lifespan = parseFloat(settings[`${prefix}_lifespan_years`] || 1);
    const usageHours = parseFloat(settings[`${prefix}_usage_hours_per_week`] || 1);
    const maintenance = parseFloat(settings[`${prefix}_annual_maintenance_cost`] || 0);
    const powerKw = parseFloat(settings[`${prefix}_power_consumption_kw`] || 0);
    const electricityCost = parseFloat(settings.electricity_cost_per_kwh || 0);
    const consumables = parseFloat(settings[`${prefix}_tooling_cost_per_hour`] || 0);
    const operatorCost = parseFloat(settings.operator_cost_per_hour || 0); // This is now excluded from the total
    const overhead = parseFloat(settings.facility_overhead_per_hour || 0);

    const annualHours = usageHours * 52;
    // Prevent division by zero if annualHours is 0
    if (annualHours === 0) return { total: 0, parts: {
        depreciation: 0, maintenanceCost: 0, powerCost: 0,
        consumables: 0, operatorCost: 0, overhead: 0
    } };

    const depreciation = (purchasePrice / lifespan) / annualHours;
    const maintenanceCost = maintenance / annualHours;
    const powerCost = powerKw * electricityCost;

    const total = depreciation + maintenanceCost + powerCost + consumables + overhead; // Operator cost removed from this sum
    return {
      total: total.toFixed(2),
      parts: {
        depreciation,
        maintenanceCost,
        powerCost,
        consumables,
        operatorCost, // Keep it in parts for breakdown display, but not in total
        overhead
      }
    };
  }, [settings]);

  useEffect(() => {
    const loadAndInitializeSettings = async () => {
        setIsLoading(true);

        // 1. Construct the full set of defaults
        const defaultSettings = {
            cnc_machine_rate: "75",
            cnc_labor_rate: "45",
            cnc_setup_time_percentage: "20",
            min_cnc_setup_hours: "0.5", // Added new default
            cnc_letter_perimeter_factor: "3.5",
            company_name: "Sign Company",
            default_notes_template: "",
            min_cnc_labor_hours: "0.5",
            acrylic_cnc_cut_multiplier: "1.2",
            wood_cnc_cut_multiplier: "1.0",
            mdf_cnc_cut_multiplier: "1.1",
            plywood_cnc_cut_multiplier: "1.0",
            pvc_cnc_cut_multiplier: "1.3",
            hdpe_cnc_cut_multiplier: "1.4",
            aluminum_cnc_cut_multiplier: "2.0",
            corian_cnc_cut_multiplier: "1.8",
            // New calculator defaults
            cnc_purchase_price: "25000",
            cnc_lifespan_years: "10",
            cnc_usage_hours_per_week: "40",
            cnc_annual_maintenance_cost: "1000",
            cnc_power_consumption_kw: "5",
            cnc_tooling_cost_per_hour: "5",
            electricity_cost_per_kwh: "0.15",
            operator_cost_per_hour: "25",
            facility_overhead_per_hour: "10",
        };
        imperialSizes.forEach(size => {
            const key = `cnc_cut_speed_${size.replace('/', '_').replace('-', '_')}`;
            defaultSettings[key] = "50"; 
        });
        
        try {
            // 2. Load user and DB settings
            const [user, dbSettings] = await Promise.all([User.me(), SettingsEntity.list()]);
            setCurrentUser(user);

            const dbSettingsMap = {};
            dbSettings.forEach(s => { dbSettingsMap[s.setting_name] = s.setting_value; });

            // 3. Merge DB settings over the defaults
            const finalSettings = { ...defaultSettings, ...dbSettingsMap };
            
            // 4. Set state once
            setSettings(finalSettings);
        } catch (error) {
            console.error('Error loading settings:', error);
            setSettings(defaultSettings); // Fallback to defaults on error
        } finally {
            setIsLoading(false);
        }
    };

    loadAndInitializeSettings();
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    setCncRate(calculateRate('cnc'));
  }, [calculateRate]); // Recalculate when calculateRate (which depends on settings) changes

  const saveSingleSetting = async (key, value) => {
    setIsSaving(true);
    try {
      const definitions = getSettingDefinitions();
      const def = definitions.find(d => d.name === key);
      const existing = await SettingsEntity.filter({ setting_name: key });
      const data = {
        setting_name: key,
        setting_value: String(value), // Ensure value is stored as a string
        setting_type: def ? def.type : 'text', // Use defined type or default
        category: def ? def.category : 'general', // Use defined category or default
      };
      if (existing.length > 0) {
        await SettingsEntity.update(existing[0].id, data);
      } else {
        await SettingsEntity.create(data);
      }
      updateSetting(key, String(value)); // Update local state with the string value
      alert(`Setting '${key}' saved successfully!`);
    } catch (error) {
      console.error(`Error saving setting ${key}:`, error);
      alert('Failed to save setting.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const getSettingDefinitions = () => {
    let defs = [
      { name: "cnc_machine_rate", type: "number", category: "cnc_rates" },
      { name: "cnc_labor_rate", type: "number", category: "cnc_rates" },
      { name: "cnc_setup_time_percentage", type: "number", category: "cnc_labor" },
      { name: "min_cnc_setup_hours", type: "number", category: "cnc_labor" }, // Added new definition
      { name: "cnc_letter_perimeter_factor", type: "number", category: "cnc_calc" },
      { name: "min_cnc_labor_hours", type: "number", category: "cnc_labor" },
      { name: "company_name", type: "text", category: "general" },
      { name: "default_notes_template", type: "text", category: "general" },
      // New calculator definitions
      { name: "cnc_purchase_price", type: "number", category: "cnc_calculator" },
      { name: "cnc_lifespan_years", type: "number", category: "cnc_calculator" },
      { name: "cnc_usage_hours_per_week", type: "number", category: "cnc_calculator" },
      { name: "cnc_annual_maintenance_cost", type: "number", category: "cnc_calculator" },
      { name: "cnc_power_consumption_kw", type: "number", category: "cnc_calculator" },
      { name: "cnc_tooling_cost_per_hour", type: "number", category: "cnc_calculator" },
      { name: "electricity_cost_per_kwh", type: "number", category: "general_costs" },
      { name: "operator_cost_per_hour", type: "number", category: "general_costs" },
      { name: "facility_overhead_per_hour", type: "number", category: "general_costs" },
    ];
    
    materials.forEach(mat => {
      defs.push({ name: `${mat.toLowerCase()}_cnc_cut_multiplier`, type: "number", category: "cnc_material" });
    });
    
    imperialSizes.forEach(size => {
      defs.push({ name: `cnc_cut_speed_${size.replace('/', '_').replace('-', '_')}`, type: "number", category: "cnc_speed" });
    });
    
    return defs;
  };
  
  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const definitions = getSettingDefinitions();
      for (const def of definitions) {
        const existing = await SettingsEntity.filter({ setting_name: def.name });
        const data = {
          setting_name: def.name,
          setting_value: settings[def.name] || "",
          setting_type: def.type,
          category: def.category,
        };
        if (existing.length > 0) {
          await SettingsEntity.update(existing[0].id, data);
        } else {
          await SettingsEntity.create(data);
        }
      }
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    }
    setIsSaving(false);
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) return <div className="p-8">Loading settings...</div>;

  const settingsContent = (
    <div className="space-y-8">
      {/* CNC Machine Rate Calculator */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calculator /> CNC Machine Rate Calculator</CardTitle>
          <p className="text-sm text-slate-500">Calculate your machine's hourly operational cost.</p>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-x-8 gap-y-4 pt-6">
          <div className="space-y-4">
            <h4 className="font-medium text-slate-800 border-b pb-2">Machine & Maintenance</h4>
            <div><Label>Purchase Price ($)</Label><Input type="number" value={settings.cnc_purchase_price || ''} onChange={e => updateSetting('cnc_purchase_price', e.target.value)} disabled={isLocked} /></div>
            <div><Label>Lifespan (Years)</Label><Input type="number" value={settings.cnc_lifespan_years || ''} onChange={e => updateSetting('cnc_lifespan_years', e.target.value)} disabled={isLocked} /></div>
            <div><Label>Usage (Hours/Week)</Label><Input type="number" value={settings.cnc_usage_hours_per_week || ''} onChange={e => updateSetting('cnc_usage_hours_per_week', e.target.value)} disabled={isLocked} /></div>
            <div><Label>Annual Maintenance ($)</Label><Input type="number" value={settings.cnc_annual_maintenance_cost || ''} onChange={e => updateSetting('cnc_annual_maintenance_cost', e.target.value)} disabled={isLocked} /></div>
            
            <h4 className="font-medium text-slate-800 border-b pb-2 pt-4">Operational Costs</h4>
            <div><Label>Power Consumption (kW)</Label><Input type="number" value={settings.cnc_power_consumption_kw || ''} onChange={e => updateSetting('cnc_power_consumption_kw', e.target.value)} disabled={isLocked} /></div>
            <div><Label>Tooling ($/hr)</Label><Input type="number" value={settings.cnc_tooling_cost_per_hour || ''} onChange={e => updateSetting('cnc_tooling_cost_per_hour', e.target.value)} disabled={isLocked} /></div>

            <h4 className="font-medium text-slate-800 border-b pb-2 pt-4">Shared Costs</h4>
            <div><Label>Electricity Cost ($/kWh)</Label><Input type="number" value={settings.electricity_cost_per_kwh || ''} onChange={e => updateSetting('electricity_cost_per_kwh', e.target.value)} disabled={isLocked} /></div>
            <div><Label>Operator Cost ($/hr)</Label><Input type="number" value={settings.operator_cost_per_hour || ''} onChange={e => updateSetting('operator_cost_per_hour', e.target.value)} disabled={isLocked} /></div>
            <div><Label>Facility Overhead ($/hr)</Label><Input type="number" value={settings.facility_overhead_per_hour || ''} onChange={e => updateSetting('facility_overhead_per_hour', e.target.value)} disabled={isLocked} /></div>
          </div>
          <div className="bg-slate-50 p-6 rounded-lg space-y-3 self-start">
            <h3 className="font-semibold text-lg text-slate-900">Calculated Rate Breakdown</h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between"><span>Depreciation:</span><span className="font-mono">${(cncRate.parts.depreciation || 0).toFixed(2)}/hr</span></div>
              <div className="flex justify-between"><span>Maintenance:</span><span className="font-mono">${(cncRate.parts.maintenanceCost || 0).toFixed(2)}/hr</span></div>
              <div className="flex justify-between"><span>Power:</span><span className="font-mono">${(cncRate.parts.powerCost || 0).toFixed(2)}/hr</span></div>
              <div className="flex justify-between"><span>Tooling:</span><span className="font-mono">${(cncRate.parts.consumables || 0).toFixed(2)}/hr</span></div>
              <div className="flex justify-between"><span>Overhead:</span><span className="font-mono">${(cncRate.parts.overhead || 0).toFixed(2)}/hr</span></div>
            </div>
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900 text-xl">Total Rate:</span>
                <span className="font-mono font-bold text-2xl text-blue-600">${cncRate.total}</span>
              </div>
              <p className="text-xs text-slate-500">per hour</p>
            </div>
            <Button className="w-full mt-4" onClick={() => saveSingleSetting('cnc_machine_rate', cncRate.total)} disabled={isLocked || isSaving}>
              <Save className="w-4 h-4 mr-2" />
              Save to CNC Rate Setting
            </Button>
             <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-800 rounded-md mt-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0"/>
                <p className="text-xs">Saving this will update the "Machine Rate" value used in new estimates.</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign />CNC Rates & Labor</CardTitle></CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div><Label>Machine Rate ($/hour)</Label><Input type="number" value={settings.cnc_machine_rate || ""} onChange={(e) => updateSetting('cnc_machine_rate', e.target.value)} disabled={isLocked} /></div>
            <div><Label>Labor Rate ($/hour)</Label><Input type="number" value={settings.cnc_labor_rate || ""} onChange={(e) => updateSetting('cnc_labor_rate', e.target.value)} disabled={isLocked} /></div>
          </div>
          <Separator />
          <div>
            <Label>Setup Time (% of Machine Time)</Label>
            <div className="relative mt-1 max-w-xs">
                <Input type="number" value={settings.cnc_setup_time_percentage || ""} onChange={(e) => updateSetting('cnc_setup_time_percentage', e.target.value)} disabled={isLocked} className="pl-8"/>
                <Percent className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 mt-1">Setup time for each item, calculated as a percentage of its machine run time.</p>
          </div>
           <div>
            <Label>Fixed Setup Time (hours)</Label>
            <Input type="number" min="0" step="0.1" value={settings.min_cnc_setup_hours || ""} onChange={(e) => updateSetting('min_cnc_setup_hours', e.target.value)} disabled={isLocked} className="mt-1 max-w-xs"/>
            <p className="text-xs text-slate-500 mt-1">A fixed setup time added to each project's labor cost.</p>
          </div>
          <div>
            <Label>Minimum Labor (hours)</Label>
            <Input type="number" min="0" step="0.1" value={settings.min_cnc_labor_hours || ""} onChange={(e) => updateSetting('min_cnc_labor_hours', e.target.value)} disabled={isLocked} className="mt-1 max-w-xs"/>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-0 shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings />Material Cut Time Multipliers</CardTitle></CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <h4 className="font-semibold text-slate-500">Material</h4>
            <h4 className="font-semibold text-slate-500">Cut Time Multiplier</h4>
          </div>
          {materials.map(mat => (
            <div key={mat} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 items-center">
              <Label className="font-medium">{mat}</Label>
              <Input type="number" step="0.1" value={settings[`${mat.toLowerCase()}_cnc_cut_multiplier`] || ""} onChange={(e) => updateSetting(`${mat.toLowerCase()}_cnc_cut_multiplier`, e.target.value)} disabled={isLocked} />
            </div>
          ))}
        </CardContent>
      </Card>
      
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock />CNC Cut Speed by Thickness</CardTitle></CardHeader>
        <CardContent className="pt-6 space-y-4">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {imperialSizes.map(size => (
              <div key={size}>
                <Label>Cut Speed for {size}" (in/min)</Label>
                <Input type="number" value={settings[`cnc_cut_speed_${size.replace('/', '_').replace('-', '_')}`] || ""} onChange={(e) => updateSetting(`cnc_cut_speed_${size.replace('/', '_').replace('-', '_')}`, e.target.value)} disabled={isLocked} className="mt-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-0 shadow-sm">
        <CardHeader><CardTitle>General Settings</CardTitle></CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div><Label>Company Name</Label><Input value={settings.company_name || ""} onChange={(e) => updateSetting('company_name', e.target.value)} disabled={isLocked} /></div>
          <div><Label>Default Notes Template</Label><Textarea value={settings.default_notes_template || ""} onChange={(e) => updateSetting('default_notes_template', e.target.value)} disabled={isLocked} /></div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3"><Router className="w-8 h-8" />CNC Settings</h1>
            <p className="text-slate-600">Configure parameters for the CNC Router module</p>
          </div>
          <Button onClick={saveSettings} disabled={isSaving || isLocked} className="bg-green-600 hover:bg-green-700">{isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" />Save Settings</>}</Button>
        </div>
        <SettingsAuthWrapper
            correctPassword="Cinci2467"
            onUnlock={() => setIsLocked(false)}
            user={currentUser}
        >
          {settingsContent}
        </SettingsAuthWrapper>
      </div>
    </div>
  );
}