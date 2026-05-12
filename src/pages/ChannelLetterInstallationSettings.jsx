import React, { useState, useEffect, useCallback } from "react";
import { Settings as SettingsEntity, User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Save, Wrench, DollarSign, Clock, Ruler, AlertTriangle, CheckCircle2, Layers, Building2, Fuel, RefreshCw } from "lucide-react";
import SettingsAuthWrapper from "@/components/SettingsAuthWrapper";
import { useToast } from "@/components/ui/use-toast";
import { WALL_MATERIALS } from "@/components/channelLetterInstall/wallMaterials";
import { refreshFuelPrice } from "@/functions/refreshFuelPrice";

const settingsDefinitions = [
  // Pricing & Labor
  { name: "install_labor_rate", type: "number", category: "install_pricing", label: "Hourly Labor Rate", suffix: "$/hr", description: "Crew rate per hour for installation work", default: "65" },

  // Base Rates per Letter Size (minutes per letter)
  { name: "install_base_rate_extra_small", type: "number", category: "install_rates", label: "Extra Small (2\"–8\")", suffix: "min/letter", description: "Base minutes per XS letter", default: "45" },
  { name: "install_base_rate_small", type: "number", category: "install_rates", label: "Small (8\"–12\")", suffix: "min/letter", description: "Base minutes per small letter", default: "90" },
  { name: "install_base_rate_medium", type: "number", category: "install_rates", label: "Medium (12\"–24\")", suffix: "min/letter", description: "Base minutes per medium letter", default: "150" },
  { name: "install_base_rate_large", type: "number", category: "install_rates", label: "Large (24\"–48\")", suffix: "min/letter", description: "Base minutes per large letter", default: "240" },
  { name: "install_base_rate_extra_large", type: "number", category: "install_rates", label: "Extra Large (48\"–60\")", suffix: "min/letter", description: "Base minutes per XL letter", default: "360" },
  { name: "install_base_rate_extra_extra_large", type: "number", category: "install_rates", label: "XXL (60\"+)", suffix: "min/letter", description: "Base minutes per XXL letter", default: "510" },

  // Raceway Rates — separated into its own tab
  { name: "install_raceway_base_minutes_per_foot", type: "number", category: "install_raceway", label: "Base Cost per Foot", suffix: "min/ft", description: "Base minutes of labor per foot of raceway installed", default: "30" },
  { name: "install_raceway_extra_minutes_per_foot", type: "number", category: "install_raceway", label: "Extra Cost per Foot", suffix: "min/ft", description: "Additional minutes per foot for complex / oversized raceway work", default: "0" },
  { name: "install_raceway_letter_mounting_rate", type: "number", category: "install_raceway", label: "Raceway Letter Mounting", suffix: "min/letter", description: "Minutes per letter mounted to raceway", default: "18" },

  // Type Multipliers
  { name: "install_halo_multiplier", type: "number", category: "install_multipliers", label: "Halo-Lit Installations", suffix: "×", description: "Time multiplier for halo-lit (reverse-lit) installs", default: "1.3" },
  { name: "install_dimensional_lettering_multiplier", type: "number", category: "install_multipliers", label: "Dimensional Lettering (Non-Illuminated)", suffix: "×", description: "Time multiplier for non-illuminated dimensional letters (typically faster — no electrical)", default: "0.85" },

  // Height Multipliers
  { name: "install_height_0_12ft", type: "number", category: "install_multipliers", label: "Height 0–12 ft", suffix: "×", description: "Ladder-level work", default: "1.0" },
  { name: "install_height_12_20ft", type: "number", category: "install_multipliers", label: "Height 12–20 ft", suffix: "×", description: "Scaffolding required", default: "1.3" },
  { name: "install_height_20_30ft", type: "number", category: "install_multipliers", label: "Height 20–30 ft", suffix: "×", description: "Lift required", default: "1.6" },
  { name: "install_height_30plus_ft", type: "number", category: "install_multipliers", label: "Height 30+ ft", suffix: "×", description: "Crane / special equipment", default: "2.0" },

  // Site Condition Multipliers
  { name: "install_thick_walls_multiplier", type: "number", category: "install_site_conditions", label: "Thick / Hollow Walls", suffix: "×", description: "Brick veneer, masonry, hollow cavity", default: "1.2" },
  { name: "install_parapet_multiplier", type: "number", category: "install_site_conditions", label: "Parapet", suffix: "×", description: "Working over rooftop edge wall", default: "1.4" },
  { name: "install_poor_electrical_multiplier", type: "number", category: "install_site_conditions", label: "Poor Electrical Access", suffix: "×", description: "Difficult conduit / power routing", default: "1.3" },
  { name: "install_escort_multiplier", type: "number", category: "install_site_conditions", label: "Escort Required", suffix: "×", description: "Must be escorted on-site at all times", default: "1.15" },
  { name: "install_badging_multiplier", type: "number", category: "install_site_conditions", label: "Badging / Check-in", suffix: "×", description: "Security badge or sign-in required", default: "1.1" },
  { name: "install_after_hours_multiplier", type: "number", category: "install_site_conditions", label: "After-Hours / Weekend", suffix: "×", description: "Night, early morning, or weekend install", default: "1.5" },
  { name: "install_set_hours_multiplier", type: "number", category: "install_site_conditions", label: "Set-Hours Installation", suffix: "×", description: "Fixed time window / scheduled appointment", default: "1.15" },
  { name: "install_poor_site_access_multiplier", type: "number", category: "install_site_conditions", label: "Poor Site Access", suffix: "×", description: "No lift room, obstructions, tight space", default: "1.25" },

  // Wall Material Multipliers — auto-generated from the shared catalog
  ...WALL_MATERIALS.map(m => ({
    name: m.settingKey,
    type: "number",
    category: "install_wall_materials",
    label: m.label,
    suffix: "×",
    description: m.description,
    default: String(m.default),
  })),

  // Shop & Travel
  { name: "install_shop_address", type: "text", category: "install_shop_travel", label: "Shop Address", description: "Starting point for all installation travel calculations", default: "417 Northland Blvd, Cincinnati, OH 45246" },
  { name: "install_gasoline_price_per_gallon", type: "number", category: "install_shop_travel", label: "Gasoline Price", suffix: "$/gal", description: "Auto-refreshed daily from regional AAA data. Applied to owned vehicles with fuel_type = Gasoline.", default: "3.50" },
  { name: "install_diesel_price_per_gallon", type: "number", category: "install_shop_travel", label: "Diesel Price", suffix: "$/gal", description: "Auto-refreshed daily from regional AAA data. Applied to owned vehicles with fuel_type = Diesel.", default: "4.00" },
  { name: "install_travel_labor_rate", type: "number", category: "install_shop_travel", label: "Travel Labor Rate", suffix: "$/hr", description: "Hourly rate billed for crew travel time (separate from on-site labor)", default: "45" },
  { name: "install_travel_avg_speed_mph", type: "number", category: "install_shop_travel", label: "Average Travel Speed", suffix: "mph", description: "Used to estimate travel time from miles (round-trip)", default: "45" },
  { name: "install_default_truck_mpg", type: "number", category: "install_shop_travel", label: "Default Truck MPG", suffix: "mpg", description: "Fallback MPG if no owned truck is selected on the line item", default: "14" },
  { name: "install_travel_overhead_per_mile", type: "number", category: "install_shop_travel", label: "Vehicle Overhead", suffix: "$/mile", description: "Maintenance / wear allowance per mile (above fuel)", default: "0.25" },
  { name: "install_min_travel_charge", type: "number", category: "install_shop_travel", label: "Minimum Travel Charge", suffix: "$", description: "Floor amount applied if any travel is required", default: "0" },
];

const TAB_META = {
  pricing_labor: {
    title: "Pricing & Labor",
    icon: DollarSign,
    description: "Core hourly rate applied to all installation labor.",
    categories: ["install_pricing"],
  },
  base_rates: {
    title: "Base Rates",
    icon: Ruler,
    description: "Minutes of labor per letter by size (Flush Mount, Halo-Lit, Dimensional Lettering).",
    categories: ["install_rates"],
  },
  raceway: {
    title: "Raceway",
    icon: Ruler,
    description: "Raceway-specific labor: base minutes per foot, extra minutes per foot, and per-letter mounting time.",
    categories: ["install_raceway"],
  },
  multipliers: {
    title: "Type & Height",
    icon: Clock,
    description: "Adjustments based on installation type and working height.",
    categories: ["install_multipliers"],
  },
  site_conditions: {
    title: "Site Conditions",
    icon: AlertTriangle,
    description: "Per-condition labor multipliers. 1.0 = no impact, 1.5 = 50% more time.",
    categories: ["install_site_conditions"],
  },
  wall_materials: {
    title: "Wall Materials",
    icon: Layers,
    description: "Labor multiplier applied based on the exterior wall material the letters are installed into.",
    categories: ["install_wall_materials"],
  },
  shop_travel: {
    title: "Travel",
    icon: Building2,
    description: "Shop starting location and travel cost parameters. Fuel price auto-updates daily.",
    categories: ["install_shop_travel"],
  },
};

export default function ChannelLetterInstallationSettings() {
  const [isLocked, setIsLocked] = useState(true);
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [refreshingFuel, setRefreshingFuel] = useState(false);
  const { toast } = useToast();

  const showSavedToast = (message = "Settings saved") => {
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

  const initializeAndLoad = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dbSettings, user] = await Promise.all([
        SettingsEntity.list(),
        User.me()
      ]);
      setCurrentUser(user);

      const settingsMap = {};
      dbSettings.forEach(s => { settingsMap[s.setting_name] = s.setting_value; });

      const finalSettings = {};
      settingsDefinitions.forEach(def => {
        finalSettings[def.name] = settingsMap[def.name] !== undefined ? settingsMap[def.name] : def.default;
      });

      setSettings(finalSettings);
    } catch (error) {
      console.error("Error loading settings:", error);
      const defaultSettings = {};
      settingsDefinitions.forEach(def => { defaultSettings[def.name] = def.default; });
      setSettings(defaultSettings);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { initializeAndLoad(); }, [initializeAndLoad]);

  const saveSettings = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const existingDbSettings = await SettingsEntity.list();
      const existingSettingsMap = new Map(existingDbSettings.map(s => [s.setting_name, s]));

      const updates = [];
      const creates = [];

      for (const def of settingsDefinitions) {
        const valueToSave = settings[def.name];
        if (valueToSave === undefined || valueToSave === null) continue;

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

      if (updates.length > 0 || creates.length > 0) {
        await Promise.all([...updates, ...creates]);
        showSavedToast();
      } else {
        showSavedToast("No changes to save");
      }
    } catch (error) {
      console.error("Save failed:", error);
      toast({ duration: 3000, variant: "destructive", description: "Save failed: " + (error.message || "Unknown error") });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleRefreshFuel = async () => {
    setRefreshingFuel(true);
    try {
      const res = await refreshFuelPrice({});
      const gas = res?.data?.gasoline_price_per_gallon;
      const diesel = res?.data?.diesel_price_per_gallon;
      if (gas && diesel) {
        setSettings(prev => ({
          ...prev,
          install_gasoline_price_per_gallon: gas.toFixed(3),
          install_diesel_price_per_gallon: diesel.toFixed(3),
        }));
        showSavedToast(`Fuel updated — Gas $${gas.toFixed(3)} · Diesel $${diesel.toFixed(3)}`);
      } else {
        toast({ variant: "destructive", description: "Could not refresh fuel prices" });
      }
    } catch (e) {
      toast({ variant: "destructive", description: "Refresh failed: " + e.message });
    } finally {
      setRefreshingFuel(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
          <span className="text-sm">Loading settings…</span>
        </div>
      </div>
    );
  }

  const renderSettingInput = (def) => {
    const value = settings[def.name];
    let step = "0.01";
    if (def.name.includes("multiplier")) step = "0.05";
    else if (def.suffix === "min/letter" || def.suffix === "min/ft") step = "1";
    else if (def.name.includes("rate") && !def.name.includes("labor_rate")) step = "0.25";

    if (def.type === "text") {
      return (
        <div key={def.name} className="md:col-span-3">
          <div className="flex items-baseline justify-between mb-1.5">
            <Label htmlFor={def.name} className="text-sm font-medium text-slate-800">{def.label}</Label>
          </div>
          <Input
            type="text"
            id={def.name}
            value={value || ""}
            onChange={(e) => updateSetting(def.name, e.target.value)}
            disabled={isLocked}
            className="h-10 bg-white border-slate-200 focus:border-slate-400 focus:ring-0 text-sm transition-colors"
          />
          {def.description && <p className="mt-1.5 text-xs text-slate-500 leading-tight">{def.description}</p>}
        </div>
      );
    }

    const isFuel = def.name === "install_gasoline_price_per_gallon" || def.name === "install_diesel_price_per_gallon";

    return (
      <div key={def.name}>
        <div className="flex items-baseline justify-between mb-1.5">
          <Label htmlFor={def.name} className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
            {isFuel && <Fuel className="w-3.5 h-3.5 text-emerald-600" />}
            {def.label}
          </Label>
          {def.suffix && <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">{def.suffix}</span>}
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            step={step}
            id={def.name}
            value={value || ""}
            onChange={(e) => updateSetting(def.name, e.target.value)}
            disabled={isLocked}
            className="h-10 bg-white border-slate-200 focus:border-slate-400 focus:ring-0 text-sm tabular-nums font-medium transition-colors"
            min="0"
          />
          {isFuel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefreshFuel}
              disabled={isLocked || refreshingFuel}
              className="h-10 px-3 whitespace-nowrap"
              title="Refresh fuel price now"
            >
              <RefreshCw className={`w-4 h-4 ${refreshingFuel ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
        {def.description && <p className="mt-1.5 text-xs text-slate-500 leading-tight">{def.description}</p>}
      </div>
    );
  };

  const renderTabContent = (tabKey) => {
    const meta = TAB_META[tabKey];
    const defs = settingsDefinitions.filter(d => meta.categories.includes(d.category));
    const Icon = meta.icon;

    return (
      <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-slate-700" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">{meta.title}</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5 leading-relaxed">{meta.description}</CardDescription>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium px-2 py-1 bg-slate-50 rounded-md">
              {defs.length} {defs.length === 1 ? "setting" : "settings"}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-6 pb-6">
          {defs.map(def => renderSettingInput(def))}
        </CardContent>
      </Card>
    );
  };

  const managementContent = (
    <Tabs defaultValue="pricing_labor" className="w-full">
      <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 mb-6 h-auto p-1">
        {Object.entries(TAB_META).map(([key, meta]) => {
          const Icon = meta.icon;
          return (
            <TabsTrigger key={key} value={key} className="flex items-center gap-2 py-2.5 text-xs">
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{meta.title}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
      {Object.keys(TAB_META).map(key => (
        <TabsContent key={key} value={key} className="space-y-4">
          {renderTabContent(key)}
        </TabsContent>
      ))}
    </Tabs>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-10 pb-32">
        {/* Hero header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
            <span>Channel Letter / Dimensional Letter Install</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-medium">Settings</span>
          </div>
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center shadow-lg shadow-slate-900/10">
                <Wrench className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Installation Settings</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Fine-tune labor rates, multipliers, and travel costs used by the estimator.
                </p>
              </div>
            </div>
            <Button
              onClick={saveSettings}
              disabled={isSaving || isLocked}
              className="bg-slate-900 hover:bg-slate-800 text-white px-5 h-11 rounded-xl shadow-sm"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" /> Save Settings
                </>
              )}
            </Button>
          </div>
        </div>

        <SettingsAuthWrapper correctPassword="Cinci2467" onUnlock={() => setIsLocked(false)} user={currentUser}>
          {managementContent}
        </SettingsAuthWrapper>
      </div>

      {!isLocked && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-[var(--sidebar-width,16rem)] bg-white/80 backdrop-blur-md border-t border-slate-200 px-6 py-3 z-40">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              Changes are saved manually — click save when you're done.
            </div>
            <Button onClick={saveSettings} disabled={isSaving} className="bg-slate-900 hover:bg-slate-800 text-white h-10 px-5 rounded-xl">
              {isSaving ? "Saving…" : <><Save className="w-4 h-4 mr-2" /> Save Settings</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}