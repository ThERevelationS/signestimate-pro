
import React, { useState, useEffect, useCallback } from "react";
import { Settings as SettingsEntity, User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Save, DollarSign, Clock, Calculator, Zap, Percent, AlertCircle } from "lucide-react";
import SettingsAuthWrapper from "@/components/SettingsAuthWrapper";

const imperialSizes = ["1/16", "1/8", "3/16", "1/4", "3/8", "1/2", "3/4"];
const materials = ["Acrylic", "Wood", "Leather"];

export default function LaserSettings() {
  const [isLocked, setIsLocked] = useState(true);
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [laserRate, setLaserRate] = useState({ total: 0, parts: {} });

  const calculateRate = useCallback((prefix) => {
    const purchasePrice = parseFloat(settings[`${prefix}_purchase_price`]) || 0;
    const lifespan = parseFloat(settings[`${prefix}_lifespan_years`]) || 1;
    const usageHours = parseFloat(settings[`${prefix}_usage_hours_per_week`]) || 1;
    
    const laserMaintenance = parseFloat(settings[`${prefix}_annual_maintenance_cost`]) || 0;
    const chillerMaintenance = parseFloat(settings[`${prefix}_chiller_annual_maintenance_cost`]) || 0;
    const totalMaintenance = laserMaintenance + chillerMaintenance;

    const laserPower = parseFloat(settings[`${prefix}_power_consumption_kw`]) || 0;
    const chillerPower = parseFloat(settings[`${prefix}_chiller_power_consumption_kw`]) || 0;
    const blowerPower = parseFloat(settings[`${prefix}_blower_power_consumption_kw`]) || 0;
    const totalPowerKw = laserPower + chillerPower + blowerPower;
    
    const electricityCost = parseFloat(settings.electricity_cost_per_kwh) || 0;
    const consumables = parseFloat(settings[`${prefix}_consumables_cost_per_hour`]) || 0;
    const overhead = parseFloat(settings.facility_overhead_per_hour) || 0;

    // CO2 Laser Tube Cost
    const tubeCost = parseFloat(settings[`${prefix}_tube_purchase_price`]) || 0;
    const tubeLifespanHours = parseFloat(settings[`${prefix}_tube_lifespan_hours`]) || 1;
    const tubeCostPerHour = tubeLifespanHours > 0 ? tubeCost / tubeLifespanHours : 0;

    const annualHours = usageHours * 52;
    if (annualHours === 0 || lifespan === 0) return { total: 0, parts: {} };

    const depreciation = (purchasePrice / lifespan) / annualHours;
    const maintenanceCost = totalMaintenance / annualHours;
    const powerCost = totalPowerKw * electricityCost;

    const total = depreciation + maintenanceCost + powerCost + consumables + tubeCostPerHour + overhead;
    return {
      total: total.toFixed(2),
      parts: { depreciation, maintenanceCost, powerCost, consumables, tubeCostPerHour, overhead }
    };
  }, [settings]);

  useEffect(() => {
    const initializeAndLoad = async () => {
      const defaultSettings = {
        laser_machine_rate: "100",
        laser_labor_rate: "45",
        handling_time_percentage: "15",
        laser_letter_perimeter_factor: "3.5",
        laser_engrave_speed_sqipm: "5",
        acrylic_cut_multiplier: "1.0",
        wood_cut_multiplier: "1.2",
        leather_cut_multiplier: "0.8",
        min_laser_labor_hours: "0.25",
        min_laser_setup_hours: "0.5",
        laser_fixed_material_setup_cost: "0",
        company_name: "Sign Company",
        default_notes_template: "",

        laser_purchase_price: "15000",
        laser_lifespan_years: "5",
        laser_usage_hours_per_week: "40",
        laser_annual_maintenance_cost: "500",
        laser_chiller_annual_maintenance_cost: "100",
        laser_power_consumption_kw: "2",
        laser_chiller_power_consumption_kw: "0.5",
        laser_blower_power_consumption_kw: "0.75",
        laser_consumables_cost_per_hour: "2",
        laser_tube_purchase_price: "1500",
        laser_tube_lifespan_hours: "4000",
        electricity_cost_per_kwh: "0.12",
        operator_cost_per_hour: "25",
        facility_overhead_per_hour: "5",
      };

      imperialSizes.forEach(size => {
        const key = `cut_speed_${size.replace('/', '_')}`;
        defaultSettings[key] = "20";
      });

      setSettings(defaultSettings);

      setIsLoading(true);
      try {
        const [user, allSettings] = await Promise.all([User.me(), SettingsEntity.list()]);
        setCurrentUser(user);
        const settingsObj = {};
        allSettings.forEach(s => { settingsObj[s.setting_name] = s.setting_value; });
        setSettings(prev => ({ ...prev, ...settingsObj }));
      } catch (error) {
        console.error('Error loading prerequisites:', error);
      }
      setIsLoading(false);
    };

    initializeAndLoad();
  }, []);

  useEffect(() => {
    setLaserRate(calculateRate('laser'));
  }, [calculateRate]);

  const saveSingleSetting = async (key, value) => {
    setIsSaving(true);
    try {
      const existing = await SettingsEntity.filter({ setting_name: key });
      const data = {
        setting_name: key,
        setting_value: String(value),
        setting_type: 'number',
        category: 'laser_rates',
        description: `Calculated value for ${key.replace(/_/g, ' ')}`
      };
      if (existing.length > 0) {
        await SettingsEntity.update(existing[0].id, data);
      } else {
        await SettingsEntity.create(data);
      }
      updateSetting(key, String(value));
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
      { name: "laser_machine_rate", type: "number", category: "laser_rates", description: "Laser machine hourly rate" },
      { name: "laser_labor_rate", type: "number", category: "laser_rates", description: "Laser labor hourly rate" },
      { name: "handling_time_percentage", type: "number", category: "laser_labor", description: "Handling time as percentage of machine time" },
      { name: "laser_letter_perimeter_factor", type: "number", category: "laser_calc", description: "Laser letter perimeter calculation factor" },
      { name: "laser_engrave_speed_sqipm", type: "number", category: "laser_speed", description: "Engraving speed in square inches per minute" },
      { name: "min_laser_setup_hours", type: "number", category: "laser_labor", description: "Fixed setup time in hours per project" },
      { name: "min_laser_labor_hours", type: "number", category: "laser_labor", description: "Minimum laser labor hours per project" },
      { name: "laser_fixed_material_setup_cost", type: "number", category: "laser_labor", description: "Fixed material setup cost per project" },
      { name: "company_name", type: "text", category: "general", description: "Company name" },
      { name: "default_notes_template", type: "text", category: "general", description: "Default project notes template" },
      { name: "laser_purchase_price", type: "number", category: "laser_calculator", description: "Laser purchase price" },
      { name: "laser_lifespan_years", type: "number", category: "laser_calculator", description: "Laser expected lifespan in years" },
      { name: "laser_usage_hours_per_week", type: "number", category: "laser_calculator", description: "Laser usage hours per week" },
      { name: "laser_annual_maintenance_cost", type: "number", category: "laser_calculator", description: "Laser annual maintenance cost" },
      { name: "laser_chiller_annual_maintenance_cost", type: "number", category: "laser_calculator", description: "Laser chiller annual maintenance cost" },
      { name: "laser_power_consumption_kw", type: "number", category: "laser_calculator", description: "Laser power consumption in kW" },
      { name: "laser_chiller_power_consumption_kw", type: "number", category: "laser_calculator", description: "Chiller power consumption in kW" },
      { name: "laser_blower_power_consumption_kw", type: "number", category: "laser_calculator", description: "Blower power consumption in kW" },
      { name: "laser_consumables_cost_per_hour", type: "number", category: "laser_calculator", description: "Laser consumables cost per hour" },
      { name: "laser_tube_purchase_price", type: "number", category: "laser_calculator", description: "CO2 laser tube purchase price" },
      { name: "laser_tube_lifespan_hours", type: "number", category: "laser_calculator", description: "CO2 laser tube lifespan in hours" },
      { name: "electricity_cost_per_kwh", type: "number", category: "shared_calculator", description: "Electricity cost per kWh" },
      { name: "operator_cost_per_hour", type: "number", category: "shared_calculator", description: "Operator cost per hour" },
      { name: "facility_overhead_per_hour", type: "number", category: "shared_calculator", description: "Facility overhead cost per hour" },
    ];
    
    materials.forEach(mat => {
      defs.push({ 
        name: `${mat.toLowerCase()}_cut_multiplier`, 
        type: "number", 
        category: "laser_material",
        description: `Cut time multiplier for ${mat}` 
      });
    });
    
    imperialSizes.forEach(size => {
      defs.push({ 
        name: `cut_speed_${size.replace('/', '_')}`, 
        type: "number", 
        category: "laser_speed",
        description: `Cut speed for ${size}" material`
      });
    });
    
    return defs;
  };
  
  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const definitions = getSettingDefinitions();
      for (const def of definitions) {
        try {
          const existing = await SettingsEntity.filter({ setting_name: def.name });
          const data = {
            setting_name: def.name,
            setting_value: settings[def.name] || "",
            setting_type: def.type,
            category: def.category,
            description: def.description || `${def.name} setting`
          };
          
          if (existing.length > 0) {
            await SettingsEntity.update(existing[0].id, data);
          } else {
            await SettingsEntity.create(data);
          }
        } catch (settingError) {
          console.error(`Error saving setting ${def.name}:`, settingError);
        }
      }
      alert('All settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving some settings. Please check the console and try again.');
    }
    setIsSaving(false);
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) return <div className="p-8">Loading settings...</div>;

  const settingsContent = (
    <div className="space-y-8">
      {/* Machine Rate Calculator */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calculator /> Laser Machine Rate Calculator</CardTitle>
          <p className="text-sm text-slate-500">Calculate your machine's hourly operational cost. Shared costs like operator and electricity are used by other calculators.</p>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-x-8 gap-y-4 pt-6">
          <div className="space-y-4">
            <h4 className="font-medium text-slate-800 border-b pb-2">Machine & Maintenance</h4>
            <div><Label>Purchase Price ($)</Label><Input type="number" value={settings.laser_purchase_price || ''} onChange={e => updateSetting('laser_purchase_price', e.target.value)} disabled={isLocked} /></div>
            <div><Label>Lifespan (Years)</Label><Input type="number" value={settings.laser_lifespan_years || ''} onChange={e => updateSetting('laser_lifespan_years', e.target.value)} disabled={isLocked} /></div>
            <div><Label>Usage (Hours/Week)</Label><Input type="number" value={settings.laser_usage_hours_per_week || ''} onChange={e => updateSetting('laser_usage_hours_per_week', e.target.value)} disabled={isLocked} /></div>
            <div><Label>Laser Annual Maintenance ($)</Label><Input type="number" value={settings.laser_annual_maintenance_cost || ''} onChange={e => updateSetting('laser_annual_maintenance_cost', e.target.value)} disabled={isLocked} /></div>
            <div><Label>Chiller Annual Upkeep ($)</Label><Input type="number" value={settings.laser_chiller_annual_maintenance_cost || ''} onChange={e => updateSetting('laser_chiller_annual_maintenance_cost', e.target.value)} disabled={isLocked} /></div>
            
            <h4 className="font-medium text-slate-800 border-b pb-2 pt-4">CO2 Laser Tube (Consumable)</h4>
            <div><Label>Tube Purchase Price ($)</Label><Input type="number" value={settings.laser_tube_purchase_price || ''} onChange={e => updateSetting('laser_tube_purchase_price', e.target.value)} disabled={isLocked} /></div>
            <div><Label>Tube Lifespan (Hours)</Label><Input type="number" value={settings.laser_tube_lifespan_hours || ''} onChange={e => updateSetting('laser_tube_lifespan_hours', e.target.value)} disabled={isLocked} /><p className="text-xs text-slate-500 mt-1">Typical range: 2,000-10,000 hours</p></div>
            
            <h4 className="font-medium text-slate-800 border-b pb-2 pt-4">Operational Costs</h4>
            <div><Label>Laser Power Consumption (kW)</Label><Input type="number" value={settings.laser_power_consumption_kw || ''} onChange={e => updateSetting('laser_power_consumption_kw', e.target.value)} disabled={isLocked} /></div>
            <div><Label>Chiller Power Consumption (kW)</Label><Input type="number" value={settings.laser_chiller_power_consumption_kw || ''} onChange={e => updateSetting('laser_chiller_power_consumption_kw', e.target.value)} disabled={isLocked} /></div>
            <div><Label>Blower Power Consumption (kW)</Label><Input type="number" value={settings.laser_blower_power_consumption_kw || ''} onChange={e => updateSetting('laser_blower_power_consumption_kw', e.target.value)} disabled={isLocked} /></div>
            <div><Label>Consumables ($/hr)</Label><Input type="number" value={settings.laser_consumables_cost_per_hour || ''} onChange={e => updateSetting('laser_consumables_cost_per_hour', e.target.value)} disabled={isLocked} /></div>

            <h4 className="font-medium text-slate-800 border-b pb-2 pt-4">Shared Costs</h4>
            <div><Label>Electricity Cost ($/kWh)</Label><Input type="number" value={settings.electricity_cost_per_kwh || ''} onChange={e => updateSetting('electricity_cost_per_kwh', e.target.value)} disabled={isLocked} /></div>
            <div><Label>Operator Cost ($/hr)</Label><Input type="number" value={settings.operator_cost_per_hour || ''} onChange={e => updateSetting('operator_cost_per_hour', e.target.value)} disabled={isLocked} /></div>
            <div><Label>Facility Overhead ($/hr)</Label><Input type="number" value={settings.facility_overhead_per_hour || ''} onChange={e => updateSetting('facility_overhead_per_hour', e.target.value)} disabled={isLocked} /></div>
          </div>
          <div className="bg-slate-50 p-6 rounded-lg space-y-3 self-start">
            <h3 className="font-semibold text-lg text-slate-900">Calculated Rate Breakdown</h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between"><span>Depreciation:</span><span className="font-mono">${(laserRate.parts.depreciation || 0).toFixed(2)}/hr</span></div>
              <div className="flex justify-between"><span>Maintenance:</span><span className="font-mono">${(laserRate.parts.maintenanceCost || 0).toFixed(2)}/hr</span></div>
              <div className="flex justify-between"><span>Power:</span><span className="font-mono">${(laserRate.parts.powerCost || 0).toFixed(2)}/hr</span></div>
              <div className="flex justify-between"><span>Consumables:</span><span className="font-mono">${(laserRate.parts.consumables || 0).toFixed(2)}/hr</span></div>
              <div className="flex justify-between border-l-2 border-red-400 pl-2"><span>CO2 Tube:</span><span className="font-mono">${(laserRate.parts.tubeCostPerHour || 0).toFixed(2)}/hr</span></div>
              <div className="flex justify-between"><span>Overhead:</span><span className="font-mono">${(laserRate.parts.overhead || 0).toFixed(2)}/hr</span></div>
            </div>
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900 text-xl">Total Rate:</span>
                <span className="font-mono font-bold text-2xl text-blue-600">${laserRate.total}</span>
              </div>
              <p className="text-xs text-slate-500">per hour</p>
            </div>
            <Button className="w-full mt-4" onClick={() => saveSingleSetting('laser_machine_rate', laserRate.total)} disabled={isLocked || isSaving}>
              <Save className="w-4 h-4 mr-2" />
              Save to Laser Rate Setting
            </Button>
            <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-800 rounded-md mt-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0"/>
                <p className="text-xs">Saving this will update the "Machine Rate" value used in new estimates. You can manually override it below if needed.</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Laser Settings - Rates & Labor */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign />Laser Rates & Labor</CardTitle></CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div><Label>Machine Rate ($/hour)</Label><Input type="number" value={settings.laser_machine_rate} onChange={(e) => updateSetting('laser_machine_rate', e.target.value)} disabled={isLocked}/></div>
            <div><Label>Labor Rate ($/hour)</Label><Input type="number" value={settings.laser_labor_rate} onChange={(e) => updateSetting('laser_labor_rate', e.target.value)} disabled={isLocked}/></div>
          </div>
          <Separator />
          <div>
            <Label>Handling Time (% of Machine Time)</Label>
            <div className="relative mt-1 max-w-xs">
                <Input type="number" value={settings.handling_time_percentage} onChange={(e) => updateSetting('handling_time_percentage', e.target.value)} disabled={isLocked} className="pl-8"/>
                <Percent className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 mt-1">Labor for handling, setup, and cleanup calculated as a percentage of the total machine run time.</p>
          </div>
          <div>
            <Label>Fixed Setup Time (hours)</Label>
            <Input type="number" min="0" step="0.1" value={settings.min_laser_setup_hours} onChange={(e) => updateSetting('min_laser_setup_hours', e.target.value)} disabled={isLocked} className="mt-1 max-w-xs"/>
            <p className="text-xs text-slate-500 mt-1">A fixed setup time added to each project's labor cost.</p>
          </div>
          <div>
            <Label>Fixed Material Setup Cost ($)</Label>
            <Input type="number" min="0" step="1" value={settings.laser_fixed_material_setup_cost} onChange={(e) => updateSetting('laser_fixed_material_setup_cost', e.target.value)} disabled={isLocked} className="mt-1 max-w-xs"/>
            <p className="text-xs text-slate-500 mt-1">A fixed material/setup cost added to each project.</p>
          </div>
          <div>
            <Label>Minimum Labor (hours)</Label>
            <Input type="number" min="0" step="0.1" value={settings.min_laser_labor_hours} onChange={(e) => updateSetting('min_laser_labor_hours', e.target.value)} disabled={isLocked} className="mt-1 max-w-xs"/>
          </div>
        </CardContent>
      </Card>

      {/* Laser Settings - Material Cut Time Multipliers */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2"><Zap />Laser Material Cut Time Multipliers</CardTitle></CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <h4 className="font-semibold text-slate-500 md:col-span-1">Material</h4>
            <h4 className="font-semibold text-slate-500 md:col-span-1">Cut Time Multiplier</h4>
          </div>
          {materials.map(mat => (
            <div key={mat} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 items-center">
              <Label className="font-medium">{mat}</Label>
              <Input type="number" step="0.1" value={settings[`${mat.toLowerCase()}_cut_multiplier`]} onChange={(e) => updateSetting(`${mat.toLowerCase()}_cut_multiplier`, e.target.value)} disabled={isLocked}/>
            </div>
          ))}
        </CardContent>
      </Card>
      
      {/* Laser Settings - Cut Speed by Thickness */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock />Laser Cut Speed by Thickness</CardTitle></CardHeader>
        <CardContent className="pt-6 space-y-4">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {imperialSizes.map(size => (
              <div key={size}>
                <Label>Cut Speed for {size}" (in/min)</Label>
                <Input type="number" value={settings[`cut_speed_${size.replace('/', '_')}`]} onChange={(e) => updateSetting(`cut_speed_${size.replace('/', '_')}`, e.target.value)} disabled={isLocked} className="mt-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Laser Settings - Engraving Speed */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2"><Zap />Laser Engraving Speed</CardTitle></CardHeader>
        <CardContent className="pt-6">
          <div className="max-w-xs">
            <Label>Engraving Speed (sq in/min)</Label>
            <Input 
              type="number" 
              step="0.1"
              value={settings.laser_engrave_speed_sqipm} 
              onChange={(e) => updateSetting('laser_engrave_speed_sqipm', e.target.value)} 
              disabled={isLocked} 
              className="mt-1" 
            />
            <p className="text-xs text-slate-500 mt-1">Square inches engraved per minute. Typical range: 3-10 sq in/min depending on detail level.</p>
          </div>
        </CardContent>
      </Card>

      {/* General Shop Settings */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2"><Zap />General Shop Settings</CardTitle></CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div><Label>Company Name</Label><Input value={settings.company_name} onChange={(e) => updateSetting('company_name', e.target.value)} disabled={isLocked}/></div>
          <div><Label>Default Notes Template</Label><Textarea value={settings.default_notes_template} onChange={(e) => updateSetting('default_notes_template', e.target.value)} disabled={isLocked}/></div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3"><Zap className="w-8 h-8" />Laser Settings</h1>
            <p className="text-slate-600">Configure parameters for the Laser Estimator module</p>
          </div>
          <Button onClick={saveSettings} disabled={isSaving || isLocked} className="bg-green-600 hover:bg-green-700">{isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" />Save All Settings</>}</Button>
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
