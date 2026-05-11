import React, { useState, useEffect, useCallback } from "react";
import { Settings as SettingsEntity, User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, DollarSign, Clock, Calculator, Zap, Percent, AlertCircle, Scissors, Type, CheckCircle2, Settings as SettingsIcon } from "lucide-react";
import SettingsAuthWrapper from "@/components/SettingsAuthWrapper";
import { useToast } from "@/components/ui/use-toast";

const imperialSizes = ["1/16", "1/8", "3/16", "1/4", "3/8", "1/2", "3/4"];
const materials = ["Acrylic", "Wood", "Leather"];

// Defined OUTSIDE the component so they keep stable identity across renders.
// (Inline-defined components would unmount/remount every render and steal focus.)
const SectionCard = ({ title, description, icon: Icon, children }) => (
  <Card className="bg-white border-0 shadow-sm">
    <CardHeader>
      <CardTitle className="flex items-center gap-3 text-base font-semibold text-slate-900">
        {Icon && <Icon className="w-5 h-5 text-slate-500" />}
        {title}
      </CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent className="space-y-4">
      {children}
    </CardContent>
  </Card>
);

const NumberField = ({ label, name, step = "0.01", help, value, onChange, disabled }) => (
  <div>
    <Label>{label}</Label>
    <Input
      type="number"
      step={step}
      value={value ?? ""}
      onFocus={(e) => e.target.select()}
      onChange={(e) => onChange(name, e.target.value)}
      disabled={disabled}
      className="mt-1"
    />
    {help && <p className="text-xs text-slate-500 mt-1">{help}</p>}
  </div>
);

export default function LaserSettings() {
  const [isLocked, setIsLocked] = useState(true);
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [parameterLaserRate, setParameterLaserRate] = useState({ total: 0, parts: {} });
  const [engravingLaserRate, setEngravingLaserRate] = useState({ total: 0, parts: {} });
  const { toast } = useToast();

  const showSavedToast = (message = 'Settings saved successfully') => {
    toast({
      duration: 2000,
      description: (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="font-medium text-slate-900">{message}</span>
        </div>
      ),
    });
  };

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
    const overhead = parseFloat(settings.facility_overhead_per_hour) || 0;

    const tubeCost = parseFloat(settings[`${prefix}_tube_purchase_price`]) || 0;
    const tubeLifespanHours = parseFloat(settings[`${prefix}_tube_lifespan_hours`]) || 1;
    const tubeCostPerHour = tubeLifespanHours > 0 ? tubeCost / tubeLifespanHours : 0;

    const annualHours = usageHours * 52;
    if (annualHours === 0 || lifespan === 0) return { total: 0, parts: {} };

    const depreciation = (purchasePrice / lifespan) / annualHours;
    const maintenanceCost = totalMaintenance / annualHours;
    const powerCost = totalPowerKw * electricityCost;

    const total = depreciation + maintenanceCost + powerCost + tubeCostPerHour + overhead;
    return {
      total: total.toFixed(2),
      parts: { depreciation, maintenanceCost, powerCost, tubeCostPerHour, overhead }
    };
  }, [settings]);

  useEffect(() => {
    const initializeAndLoad = async () => {
      const defaultSettings = {
        // Parameter Laser Settings
        parameter_laser_machine_rate: "100",
        parameter_laser_labor_rate: "45",
        parameter_handling_time_percentage: "15",
        laser_letter_perimeter_factor: "3.5",
        acrylic_cut_multiplier: "1.0",
        wood_cut_multiplier: "1.2",
        leather_cut_multiplier: "0.8",
        min_parameter_laser_labor_hours: "0.25",
        min_parameter_laser_setup_hours: "0.5",
        parameter_laser_fixed_material_setup_cost: "0",
        
        // Engraving Settings
        engraving_laser_machine_rate: "80",
        engraving_laser_labor_rate: "40",
        engraving_handling_time_percentage: "20",
        laser_engrave_speed_sqipm: "5",
        acrylic_engrave_multiplier: "1.0",
        wood_engrave_multiplier: "1.3",
        leather_engrave_multiplier: "0.7",
        min_engraving_laser_labor_hours: "0.25",
        min_engraving_laser_setup_hours: "0.5",
        engraving_laser_fixed_material_setup_cost: "0",
        
        company_name: "Sign Company",
        default_notes_template: "",

        // Parameter Laser Calculator
        parameter_laser_purchase_price: "15000",
        parameter_laser_lifespan_years: "5",
        parameter_laser_usage_hours_per_week: "40",
        parameter_laser_annual_maintenance_cost: "500",
        parameter_laser_chiller_annual_maintenance_cost: "100",
        parameter_laser_power_consumption_kw: "2",
        parameter_laser_chiller_power_consumption_kw: "0.5",
        parameter_laser_blower_power_consumption_kw: "0.75",
        parameter_laser_tube_purchase_price: "1500",
        parameter_laser_tube_lifespan_hours: "4000",
        
        // Engraving Laser Calculator
        engraving_laser_purchase_price: "12000",
        engraving_laser_lifespan_years: "5",
        engraving_laser_usage_hours_per_week: "35",
        engraving_laser_annual_maintenance_cost: "400",
        engraving_laser_chiller_annual_maintenance_cost: "80",
        engraving_laser_power_consumption_kw: "1.5",
        engraving_laser_chiller_power_consumption_kw: "0.4",
        engraving_laser_blower_power_consumption_kw: "0.6",
        engraving_laser_tube_purchase_price: "1200",
        engraving_laser_tube_lifespan_hours: "3500",
        
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
    setParameterLaserRate(calculateRate('parameter_laser'));
    setEngravingLaserRate(calculateRate('engraving_laser'));
  }, [calculateRate]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

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
      showSavedToast(`Saved: ${key.replace(/_/g, ' ')}`);
    } catch (error) {
      console.error(`Error saving setting ${key}:`, error);
      toast({
        duration: 3000,
        variant: 'destructive',
        description: 'Failed to save setting.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getSettingDefinitions = () => {
    let defs = [
      // Parameter Laser
      { name: "parameter_laser_machine_rate", type: "number", category: "laser_rates", description: "Parameter laser machine hourly rate" },
      { name: "parameter_laser_labor_rate", type: "number", category: "laser_rates", description: "Parameter laser labor hourly rate" },
      { name: "parameter_handling_time_percentage", type: "number", category: "laser_labor", description: "Parameter laser handling time as percentage of machine time" },
      { name: "min_parameter_laser_setup_hours", type: "number", category: "laser_labor", description: "Fixed setup time in hours per parameter laser project" },
      { name: "min_parameter_laser_labor_hours", type: "number", category: "laser_labor", description: "Minimum parameter laser labor hours per project" },
      { name: "parameter_laser_fixed_material_setup_cost", type: "number", category: "laser_labor", description: "Fixed material setup cost per parameter laser project" },
      
      // Engraving Laser
      { name: "engraving_laser_machine_rate", type: "number", category: "laser_rates", description: "Engraving laser machine hourly rate" },
      { name: "engraving_laser_labor_rate", type: "number", category: "laser_rates", description: "Engraving laser labor hourly rate" },
      { name: "engraving_handling_time_percentage", type: "number", category: "laser_labor", description: "Engraving laser handling time as percentage of machine time" },
      { name: "min_engraving_laser_setup_hours", type: "number", category: "laser_labor", description: "Fixed setup time in hours per engraving laser project" },
      { name: "min_engraving_laser_labor_hours", type: "number", category: "laser_labor", description: "Minimum engraving laser labor hours per project" },
      { name: "engraving_laser_fixed_material_setup_cost", type: "number", category: "laser_labor", description: "Fixed material setup cost per engraving laser project" },
      
      { name: "laser_letter_perimeter_factor", type: "number", category: "laser_calc", description: "Laser letter perimeter calculation factor" },
      { name: "laser_engrave_speed_sqipm", type: "number", category: "laser_speed", description: "Engraving speed in square inches per minute" },
      { name: "company_name", type: "text", category: "general", description: "Company name" },
      { name: "default_notes_template", type: "text", category: "general", description: "Default project notes template" },
      
      // Parameter Laser Calculator
      { name: "parameter_laser_purchase_price", type: "number", category: "laser_calculator", description: "Parameter laser purchase price" },
      { name: "parameter_laser_lifespan_years", type: "number", category: "laser_calculator", description: "Parameter laser expected lifespan in years" },
      { name: "parameter_laser_usage_hours_per_week", type: "number", category: "laser_calculator", description: "Parameter laser usage hours per week" },
      { name: "parameter_laser_annual_maintenance_cost", type: "number", category: "laser_calculator", description: "Parameter laser annual maintenance cost" },
      { name: "parameter_laser_chiller_annual_maintenance_cost", type: "number", category: "laser_calculator", description: "Parameter laser chiller annual maintenance cost" },
      { name: "parameter_laser_power_consumption_kw", type: "number", category: "laser_calculator", description: "Parameter laser power consumption in kW" },
      { name: "parameter_laser_chiller_power_consumption_kw", type: "number", category: "laser_calculator", description: "Parameter laser chiller power consumption in kW" },
      { name: "parameter_laser_blower_power_consumption_kw", type: "number", category: "laser_calculator", description: "Parameter laser blower power consumption in kW" },
      { name: "parameter_laser_tube_purchase_price", type: "number", category: "laser_calculator", description: "Parameter laser CO2 tube purchase price" },
      { name: "parameter_laser_tube_lifespan_hours", type: "number", category: "laser_calculator", description: "Parameter laser CO2 tube lifespan in hours" },
      
      // Engraving Laser Calculator
      { name: "engraving_laser_purchase_price", type: "number", category: "laser_calculator", description: "Engraving laser purchase price" },
      { name: "engraving_laser_lifespan_years", type: "number", category: "laser_calculator", description: "Engraving laser expected lifespan in years" },
      { name: "engraving_laser_usage_hours_per_week", type: "number", category: "laser_calculator", description: "Engraving laser usage hours per week" },
      { name: "engraving_laser_annual_maintenance_cost", type: "number", category: "laser_calculator", description: "Engraving laser annual maintenance cost" },
      { name: "engraving_laser_chiller_annual_maintenance_cost", type: "number", category: "laser_calculator", description: "Engraving laser chiller annual maintenance cost" },
      { name: "engraving_laser_power_consumption_kw", type: "number", category: "laser_calculator", description: "Engraving laser power consumption in kW" },
      { name: "engraving_laser_chiller_power_consumption_kw", type: "number", category: "laser_calculator", description: "Engraving laser chiller power consumption in kW" },
      { name: "engraving_laser_blower_power_consumption_kw", type: "number", category: "laser_calculator", description: "Engraving laser blower power consumption in kW" },
      { name: "engraving_laser_tube_purchase_price", type: "number", category: "laser_calculator", description: "Engraving laser CO2 tube purchase price" },
      { name: "engraving_laser_tube_lifespan_hours", type: "number", category: "laser_calculator", description: "Engraving laser CO2 tube lifespan in hours" },
      
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
      defs.push({ 
        name: `${mat.toLowerCase()}_engrave_multiplier`, 
        type: "number", 
        category: "laser_material",
        description: `Engrave time multiplier for ${mat}` 
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
    if (isSaving) return;
    setIsSaving(true);
    try {
      const definitions = getSettingDefinitions();
      const existingDbSettings = await SettingsEntity.list();
      const existingMap = new Map(existingDbSettings.map(s => [s.setting_name, s]));

      const ops = [];
      for (const def of definitions) {
        const value = settings[def.name];
        if (value === undefined || value === null) continue;
        const data = {
          setting_name: def.name,
          setting_value: String(value),
          setting_type: def.type,
          category: def.category,
          description: def.description || `${def.name} setting`,
        };
        const existing = existingMap.get(def.name);
        if (existing) {
          if (existing.setting_value !== data.setting_value) {
            ops.push(SettingsEntity.update(existing.id, data));
          }
        } else {
          ops.push(SettingsEntity.create(data));
        }
      }

      if (ops.length > 0) {
        await Promise.all(ops);
        showSavedToast('Settings saved successfully');
      } else {
        showSavedToast('No changes to save');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        duration: 3000,
        variant: 'destructive',
        description: 'Save failed: ' + (error.message || 'An unknown error occurred.'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center"><p className="text-slate-600">Loading settings...</p></div>;

  // Common props injected into every NumberField so call sites stay short.
  const fp = (name) => ({ value: settings[name], onChange: updateSetting, disabled: isLocked });

  /* ====== Cost calculator block (re-used for both lasers) ====== */
  const renderCostCalculator = (prefix, rateState, saveTargetKey, accentClass) => (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-base font-semibold text-slate-900">
          <Calculator className="w-5 h-5 text-slate-500" />
          Machine Cost Calculator
        </CardTitle>
        <CardDescription>Compute the true hourly operational cost of this laser, then push it to its Machine Rate.</CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-x-8 gap-y-6 pt-2">
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-medium text-slate-800">Equipment Information</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <NumberField label="Laser Purchase Price ($)" name={`${prefix}_purchase_price`} step="1" {...fp(`${prefix}_purchase_price`)} />
              <NumberField label="Expected Lifespan (years)" name={`${prefix}_lifespan_years`} step="1" {...fp(`${prefix}_lifespan_years`)} />
              <NumberField label="Usage Hours per Week" name={`${prefix}_usage_hours_per_week`} step="1" {...fp(`${prefix}_usage_hours_per_week`)} />
              <NumberField label="CO2 Tube Purchase Price ($)" name={`${prefix}_tube_purchase_price`} step="1" {...fp(`${prefix}_tube_purchase_price`)} />
              <NumberField label="CO2 Tube Lifespan (hours)" name={`${prefix}_tube_lifespan_hours`} step="100" {...fp(`${prefix}_tube_lifespan_hours`)} />
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium text-slate-800">Maintenance & Power</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <NumberField label="Laser Annual Maintenance ($)" name={`${prefix}_annual_maintenance_cost`} step="1" {...fp(`${prefix}_annual_maintenance_cost`)} />
              <NumberField label="Chiller Annual Maintenance ($)" name={`${prefix}_chiller_annual_maintenance_cost`} step="1" {...fp(`${prefix}_chiller_annual_maintenance_cost`)} />
              <NumberField label="Laser Power (kW)" name={`${prefix}_power_consumption_kw`} step="0.1" {...fp(`${prefix}_power_consumption_kw`)} />
              <NumberField label="Chiller Power (kW)" name={`${prefix}_chiller_power_consumption_kw`} step="0.1" {...fp(`${prefix}_chiller_power_consumption_kw`)} />
              <NumberField label="Blower Power (kW)" name={`${prefix}_blower_power_consumption_kw`} step="0.1" {...fp(`${prefix}_blower_power_consumption_kw`)} />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-lg space-y-3 self-start">
          <h3 className="font-semibold text-lg text-slate-900">Calculated Rate Breakdown</h3>
          <div className="text-sm space-y-2">
            <div className="flex justify-between"><span>Depreciation:</span><span className="font-mono">${(rateState.parts.depreciation || 0).toFixed(2)}/hr</span></div>
            <div className="flex justify-between"><span>Maintenance:</span><span className="font-mono">${(rateState.parts.maintenanceCost || 0).toFixed(2)}/hr</span></div>
            <div className="flex justify-between"><span>Power:</span><span className="font-mono">${(rateState.parts.powerCost || 0).toFixed(2)}/hr</span></div>
            <div className="flex justify-between border-l-2 border-red-400 pl-2"><span>CO2 Tube:</span><span className="font-mono">${(rateState.parts.tubeCostPerHour || 0).toFixed(2)}/hr</span></div>
            <div className="flex justify-between"><span>Overhead:</span><span className="font-mono">${(rateState.parts.overhead || 0).toFixed(2)}/hr</span></div>
          </div>
          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900 text-xl">Total Rate:</span>
              <span className={`font-mono font-bold text-2xl ${accentClass}`}>${rateState.total}</span>
            </div>
            <p className="text-xs text-slate-500">per hour</p>
          </div>
          <Button className="w-full mt-4" onClick={() => saveSingleSetting(saveTargetKey, rateState.total)} disabled={isLocked || isSaving}>
            <Save className="w-4 h-4 mr-2" />
            Push to Machine Rate
          </Button>
          <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-800 rounded-md mt-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0"/>
            <p className="text-xs">Saving overwrites the Machine Rate used in new estimates. You can still manually override it in Rates & Labor below.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  /* ====== Rates & Labor block (per laser type) ====== */
  const renderRatesAndLabor = (prefix) => (
    <SectionCard title="Rates & Labor" description="Hourly rates, handling time, and project-level minimums." icon={DollarSign}>
      <div className="grid md:grid-cols-2 gap-6">
        <NumberField label="Machine Rate ($/hour)" name={`${prefix}_machine_rate`} step="1" {...fp(`${prefix}_machine_rate`)} />
        <NumberField label="Labor Rate ($/hour)" name={`${prefix}_labor_rate`} step="1" {...fp(`${prefix}_labor_rate`)} />
      </div>
      <Separator />
      <div>
        <Label>Handling Time (% of Machine Time)</Label>
        <div className="relative mt-1 max-w-xs">
          <Input
            type="number"
            value={settings[`${prefix === 'parameter_laser' ? 'parameter' : 'engraving'}_handling_time_percentage`] ?? ""}
            onChange={(e) => updateSetting(`${prefix === 'parameter_laser' ? 'parameter' : 'engraving'}_handling_time_percentage`, e.target.value)}
            disabled={isLocked}
            className="pl-8"
          />
          <Percent className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>
        <p className="text-xs text-slate-500 mt-1">Labor for handling, setup, and cleanup, as a % of total machine run time.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <NumberField label="Fixed Setup Time (hours)" name={`min_${prefix}_setup_hours`} step="0.1" help="Fixed setup time added per project." {...fp(`min_${prefix}_setup_hours`)} />
        <NumberField label="Fixed Material Setup Cost ($)" name={`${prefix}_fixed_material_setup_cost`} step="1" help="Fixed material/setup fee per project." {...fp(`${prefix}_fixed_material_setup_cost`)} />
        <NumberField label="Minimum Labor (hours)" name={`min_${prefix}_labor_hours`} step="0.1" help="Floor on billable labor." {...fp(`min_${prefix}_labor_hours`)} />
      </div>
    </SectionCard>
  );

  /* ====== Material multipliers block ====== */
  const renderMaterialMultipliers = (kind /* 'cut' | 'engrave' */) => (
    <SectionCard
      title={kind === 'cut' ? 'Material Cut Time Multipliers' : 'Material Engrave Time Multipliers'}
      description="Multiplier applied to time per material type."
      icon={Zap}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <h4 className="font-semibold text-slate-500">Material</h4>
        <h4 className="font-semibold text-slate-500">{kind === 'cut' ? 'Cut' : 'Engrave'} Multiplier</h4>
      </div>
      {materials.map(mat => (
        <div key={mat} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 items-center">
          <Label className="font-medium">{mat}</Label>
          <Input
            type="number"
            step="0.1"
            value={settings[`${mat.toLowerCase()}_${kind}_multiplier`] ?? ""}
            onChange={(e) => updateSetting(`${mat.toLowerCase()}_${kind}_multiplier`, e.target.value)}
            disabled={isLocked}
          />
        </div>
      ))}
    </SectionCard>
  );

  const settingsContent = (
    <Tabs defaultValue="parameter" className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-6">
        <TabsTrigger value="parameter" className="flex items-center gap-2"><Scissors className="w-4 h-4" />Parameter Laser</TabsTrigger>
        <TabsTrigger value="engraving" className="flex items-center gap-2"><Type className="w-4 h-4" />Engraving Laser</TabsTrigger>
        <TabsTrigger value="shared" className="flex items-center gap-2"><Zap className="w-4 h-4" />Cut Speeds & Shared</TabsTrigger>
        <TabsTrigger value="general" className="flex items-center gap-2"><SettingsIcon className="w-4 h-4" />General</TabsTrigger>
      </TabsList>

      {/* ===== Parameter Laser ===== */}
      <TabsContent value="parameter" className="space-y-6">
        {renderCostCalculator('parameter_laser', parameterLaserRate, 'parameter_laser_machine_rate', 'text-blue-600')}
        {renderRatesAndLabor('parameter_laser')}
        {renderMaterialMultipliers('cut')}
      </TabsContent>

      {/* ===== Engraving Laser ===== */}
      <TabsContent value="engraving" className="space-y-6">
        {renderCostCalculator('engraving_laser', engravingLaserRate, 'engraving_laser_machine_rate', 'text-green-600')}
        {renderRatesAndLabor('engraving_laser')}
        {renderMaterialMultipliers('engrave')}
        <SectionCard title="Engraving Speed" description="How fast the engraving laser removes material." icon={Clock}>
          <div className="max-w-xs">
            <NumberField
              label="Engraving Speed (sq in/min)"
              name="laser_engrave_speed_sqipm"
              step="0.1"
              help="Typical range: 3–10 sq in/min depending on detail level."
              {...fp('laser_engrave_speed_sqipm')}
            />
          </div>
        </SectionCard>
      </TabsContent>

      {/* ===== Cut Speeds & Shared Operating Costs ===== */}
      <TabsContent value="shared" className="space-y-6">
        <SectionCard
          title="Parameter Laser — Cut Speed by Thickness"
          description="Cut speed (inches/min) for each material thickness. Used to estimate machine time."
          icon={Clock}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {imperialSizes.map(size => {
              const key = `cut_speed_${size.replace('/', '_')}`;
              return (
                <NumberField
                  key={size}
                  label={`Cut Speed for ${size}" (in/min)`}
                  name={key}
                  step="1"
                  {...fp(key)}
                />
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="Shared Operating Costs"
          description="Used by BOTH lasers' cost calculators."
          icon={DollarSign}
        >
          <div className="grid md:grid-cols-3 gap-6">
            <NumberField label="Electricity Cost ($/kWh)" name="electricity_cost_per_kwh" step="0.01" {...fp('electricity_cost_per_kwh')} />
            <NumberField label="Operator Cost ($/hour)" name="operator_cost_per_hour" step="1" {...fp('operator_cost_per_hour')} />
            <NumberField label="Facility Overhead ($/hour)" name="facility_overhead_per_hour" step="1" {...fp('facility_overhead_per_hour')} />
          </div>
        </SectionCard>
      </TabsContent>

      {/* ===== General ===== */}
      <TabsContent value="general" className="space-y-6">
        <SectionCard title="General Shop Settings" description="Defaults applied across the laser module." icon={SettingsIcon}>
          <NumberField
            label="Letter Perimeter Factor"
            name="laser_letter_perimeter_factor"
            step="0.1"
            help="Multiplier for calculating letter perimeter from letter height."
            {...fp('laser_letter_perimeter_factor')}
          />
          <div>
            <Label>Company Name</Label>
            <Input
              value={settings.company_name ?? ""}
              onChange={(e) => updateSetting('company_name', e.target.value)}
              disabled={isLocked}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Default Notes Template</Label>
            <Textarea
              value={settings.default_notes_template ?? ""}
              onChange={(e) => updateSetting('default_notes_template', e.target.value)}
              disabled={isLocked}
              className="mt-1"
            />
          </div>
        </SectionCard>
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3"><Zap className="w-8 h-8" />Laser Settings</h1>
            <p className="text-slate-600">Configure parameters for the Laser Estimator module</p>
          </div>
          <Button onClick={saveSettings} disabled={isSaving || isLocked} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3">
            {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" />Save Settings</>}
          </Button>
        </div>
        
        <SettingsAuthWrapper 
            correctPassword="Cinci2467" 
            onUnlock={() => setIsLocked(false)}
            user={currentUser}
        >
          {settingsContent}
        </SettingsAuthWrapper>

        <div className="mt-8 flex justify-end">
          <Button onClick={saveSettings} disabled={isSaving || isLocked} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3">
            {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" />Save All Settings</>}
          </Button>
        </div>
      </div>
    </div>
  );
}