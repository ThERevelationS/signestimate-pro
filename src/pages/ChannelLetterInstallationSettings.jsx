import React, { useState, useEffect, useCallback } from "react";
import { Settings as SettingsEntity, User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Save, Wrench, DollarSign, Clock, Ruler, AlertTriangle, CheckCircle2, Layers, Building2, Fuel, RefreshCw, Type, Receipt } from "lucide-react";
import SettingsAuthWrapper from "@/components/SettingsAuthWrapper";
import { useToast } from "@/components/ui/use-toast";
import { WALL_MATERIALS } from "@/components/channelLetterInstall/wallMaterials";
import { refreshFuelPrice } from "@/functions/refreshFuelPrice";

// Helper to build a set of base-time settings for a given installation type
const buildBaseTimeSet = (category, prefix, typeLabel, includeElectrical, defaults) => {
  const sizes = [
    { key: "extra_small", label: "XS", drillD: defaults.xs.drill, prepD: defaults.xs.prep, elecD: defaults.xs.elec },
    { key: "small", label: "Small", drillD: defaults.s.drill, prepD: defaults.s.prep, elecD: defaults.s.elec },
    { key: "medium", label: "Medium", drillD: defaults.m.drill, prepD: defaults.m.prep, elecD: defaults.m.elec },
    { key: "large", label: "Large", drillD: defaults.l.drill, prepD: defaults.l.prep, elecD: defaults.l.elec },
    { key: "extra_large", label: "XL", drillD: defaults.xl.drill, prepD: defaults.xl.prep, elecD: defaults.xl.elec },
    { key: "extra_extra_large", label: "XXL", drillD: defaults.xxl.drill, prepD: defaults.xxl.prep, elecD: defaults.xxl.elec },
  ];
  const out = [];
  sizes.forEach(s => {
    out.push({ name: `install_${prefix}_drill_rate_${s.key}`, type: "number", category, label: `${s.label} — Drill Pattern / Drill Time`, suffix: "min/letter", description: `Minutes per ${s.label} letter for layout, drill pattern, and drilling (${typeLabel})`, default: String(s.drillD) });
    out.push({ name: `install_${prefix}_prep_rate_${s.key}`, type: "number", category, label: `${s.label} — Installation / Prep Time`, suffix: "min/letter", description: `Minutes per ${s.label} letter for prep, mounting, and finish install (${typeLabel})`, default: String(s.prepD) });
    if (includeElectrical) {
      out.push({ name: `install_${prefix}_electrical_rate_${s.key}`, type: "number", category, label: `${s.label} — Electrical Hookup`, suffix: "min/letter", description: `Baseline minutes per ${s.label} letter for electrical hookup (${typeLabel})`, default: String(s.elecD) });
    }
  });
  return out;
};

const settingsDefinitions = [
  // Pricing & Labor
  { name: "install_labor_rate", type: "number", category: "install_pricing", label: "Installer Hourly Rate", suffix: "$/hr", description: "Primary installer rate per hour", default: "65" },
  { name: "install_manual_labor_rate", type: "number", category: "install_pricing", label: "Manual Labor Rate", suffix: "$/hr", description: "Hourly rate for on-site helper / manual labor", default: "35" },

  // Base Installation Times — Channel Flush-Mount (the original/legacy set, names kept for backward compat)
  { name: "install_drill_rate_extra_small", type: "number", category: "install_rates_flush", label: "XS — Drill Pattern / Drill Time", suffix: "min/letter", description: "Minutes per XS letter for layout, drill pattern, and drilling", default: "15" },
  { name: "install_prep_rate_extra_small", type: "number", category: "install_rates_flush", label: "XS — Installation / Prep Time", suffix: "min/letter", description: "Minutes per XS letter for prep, mounting, and finish install", default: "30" },
  { name: "install_electrical_rate_extra_small", type: "number", category: "install_rates_flush", label: "XS — Electrical Hookup", suffix: "min/letter", description: "Baseline minutes per XS letter for electrical hookup", default: "5" },

  { name: "install_drill_rate_small", type: "number", category: "install_rates_flush", label: "Small — Drill Pattern / Drill Time", suffix: "min/letter", description: "Minutes per small letter for layout, drill pattern, and drilling", default: "30" },
  { name: "install_prep_rate_small", type: "number", category: "install_rates_flush", label: "Small — Installation / Prep Time", suffix: "min/letter", description: "Minutes per small letter for prep, mounting, and finish install", default: "60" },
  { name: "install_electrical_rate_small", type: "number", category: "install_rates_flush", label: "Small — Electrical Hookup", suffix: "min/letter", description: "Baseline minutes per small letter for electrical hookup", default: "10" },

  { name: "install_drill_rate_medium", type: "number", category: "install_rates_flush", label: "Medium — Drill Pattern / Drill Time", suffix: "min/letter", description: "Minutes per medium letter for layout, drill pattern, and drilling", default: "50" },
  { name: "install_prep_rate_medium", type: "number", category: "install_rates_flush", label: "Medium — Installation / Prep Time", suffix: "min/letter", description: "Minutes per medium letter for prep, mounting, and finish install", default: "100" },
  { name: "install_electrical_rate_medium", type: "number", category: "install_rates_flush", label: "Medium — Electrical Hookup", suffix: "min/letter", description: "Baseline minutes per medium letter for electrical hookup", default: "15" },

  { name: "install_drill_rate_large", type: "number", category: "install_rates_flush", label: "Large — Drill Pattern / Drill Time", suffix: "min/letter", description: "Minutes per large letter for layout, drill pattern, and drilling", default: "80" },
  { name: "install_prep_rate_large", type: "number", category: "install_rates_flush", label: "Large — Installation / Prep Time", suffix: "min/letter", description: "Minutes per large letter for prep, mounting, and finish install", default: "160" },
  { name: "install_electrical_rate_large", type: "number", category: "install_rates_flush", label: "Large — Electrical Hookup", suffix: "min/letter", description: "Baseline minutes per large letter for electrical hookup", default: "20" },

  { name: "install_drill_rate_extra_large", type: "number", category: "install_rates_flush", label: "XL — Drill Pattern / Drill Time", suffix: "min/letter", description: "Minutes per XL letter for layout, drill pattern, and drilling", default: "120" },
  { name: "install_prep_rate_extra_large", type: "number", category: "install_rates_flush", label: "XL — Installation / Prep Time", suffix: "min/letter", description: "Minutes per XL letter for prep, mounting, and finish install", default: "240" },
  { name: "install_electrical_rate_extra_large", type: "number", category: "install_rates_flush", label: "XL — Electrical Hookup", suffix: "min/letter", description: "Baseline minutes per XL letter for electrical hookup", default: "25" },

  { name: "install_drill_rate_extra_extra_large", type: "number", category: "install_rates_flush", label: "XXL — Drill Pattern / Drill Time", suffix: "min/letter", description: "Minutes per XXL letter for layout, drill pattern, and drilling", default: "170" },
  { name: "install_prep_rate_extra_extra_large", type: "number", category: "install_rates_flush", label: "XXL — Installation / Prep Time", suffix: "min/letter", description: "Minutes per XXL letter for prep, mounting, and finish install", default: "340" },
  { name: "install_electrical_rate_extra_extra_large", type: "number", category: "install_rates_flush", label: "XXL — Electrical Hookup", suffix: "min/letter", description: "Baseline minutes per XXL letter for electrical hookup", default: "30" },

  // Base Installation Times — Halo-Lit (mirrors flush defaults; user can tune separately)
  ...buildBaseTimeSet("install_rates_halo", "halo", "Halo-Lit", true, {
    xs:  { drill: 15,  prep: 30,  elec: 5 },
    s:   { drill: 30,  prep: 60,  elec: 10 },
    m:   { drill: 50,  prep: 100, elec: 15 },
    l:   { drill: 80,  prep: 160, elec: 20 },
    xl:  { drill: 120, prep: 240, elec: 25 },
    xxl: { drill: 170, prep: 340, elec: 30 },
  }),

  // Base Installation Times — Dimensional (no electrical hookup)
  ...buildBaseTimeSet("install_rates_dimensional", "dimensional", "Dimensional", false, {
    xs:  { drill: 10,  prep: 20,  elec: 0 },
    s:   { drill: 20,  prep: 45,  elec: 0 },
    m:   { drill: 40,  prep: 80,  elec: 0 },
    l:   { drill: 65,  prep: 130, elec: 0 },
    xl:  { drill: 100, prep: 200, elec: 0 },
    xxl: { drill: 140, prep: 280, elec: 0 },
  }),

  // Base Installation Times — Capsule / Logo / Pillbox (mirrors flush-mount defaults; tunable separately)
  ...buildBaseTimeSet("install_rates_capsule", "capsule", "Capsule / Logo / Pillbox", true, {
    xs:  { drill: 15,  prep: 30,  elec: 5 },
    s:   { drill: 30,  prep: 60,  elec: 10 },
    m:   { drill: 50,  prep: 100, elec: 15 },
    l:   { drill: 80,  prep: 160, elec: 20 },
    xl:  { drill: 120, prep: 240, elec: 25 },
    xxl: { drill: 170, prep: 340, elec: 30 },
  }),

  // Base Installation Times — Raceway (lives inside Base Installation Times now)
  { name: "install_raceway_base_minutes_per_foot", type: "number", category: "install_rates_raceway", label: "Base Cost per Foot", suffix: "min/ft", description: "Base minutes of labor per foot of raceway installed", default: "30" },
  { name: "install_raceway_extra_minutes_per_foot", type: "number", category: "install_rates_raceway", label: "Extra Cost per Foot", suffix: "min/ft", description: "Additional minutes per foot for complex / oversized raceway work", default: "0" },
  { name: "install_raceway_letter_mounting_rate", type: "number", category: "install_rates_raceway", label: "Raceway Letter Mounting", suffix: "min/letter", description: "Minutes per letter mounted to raceway", default: "18" },
  { name: "install_raceway_electrical_hookup_minutes", type: "number", category: "install_rates_raceway", label: "Electrical Hookup", suffix: "min/raceway", description: "Minutes per raceway for the electrical hookup work", default: "30" },

  // Height Multipliers
  { name: "install_height_0_12ft", type: "number", category: "install_multipliers", label: "Height 0–12 ft", suffix: "×", description: "Ladder-level work", default: "1.0" },
  { name: "install_height_12_20ft", type: "number", category: "install_multipliers", label: "Height 12–20 ft", suffix: "×", description: "Scaffolding required", default: "1.3" },
  { name: "install_height_20_30ft", type: "number", category: "install_multipliers", label: "Height 20–30 ft", suffix: "×", description: "Lift required", default: "1.6" },
  { name: "install_height_30plus_ft", type: "number", category: "install_multipliers", label: "Height 30+ ft", suffix: "×", description: "Crane / special equipment", default: "2.0" },

  // Site Condition Multipliers
  { name: "install_parapet_multiplier", type: "number", category: "install_site_conditions", label: "Parapet", suffix: "×", description: "Working over rooftop edge wall", default: "1.4" },
  // Thick / Hollow Walls — ADDITIVE minutes (per letter and per raceway), not a multiplier
  { name: "install_thick_walls_extra_per_letter", type: "number", category: "install_thick_walls", label: "Extra Time per Letter", suffix: "+min/letter", description: "Additional minutes added per letter when installing into brick veneer, masonry, or hollow-cavity walls", default: "8" },
  { name: "install_thick_walls_extra_per_raceway", type: "number", category: "install_thick_walls", label: "Extra Time per Raceway", suffix: "+min/raceway", description: "Additional minutes added per raceway line item when installing into thick or hollow walls", default: "30" },
  // Poor Electrical Access — 10 severity levels, ADDED minutes per letter on top of the size's electrical hookup baseline
  { name: "install_poor_electrical_level_1", type: "number", category: "install_electrical_severity", label: "Level 1 — A Bit Harder", suffix: "+min/letter", description: "Extra minutes per letter added to electrical hookup", default: "3" },
  { name: "install_poor_electrical_level_2", type: "number", category: "install_electrical_severity", label: "Level 2 — Mildly Annoying", suffix: "+min/letter", description: "Extra minutes per letter added to electrical hookup", default: "6" },
  { name: "install_poor_electrical_level_3", type: "number", category: "install_electrical_severity", label: "Level 3 — Inconvenient", suffix: "+min/letter", description: "Extra minutes per letter added to electrical hookup", default: "10" },
  { name: "install_poor_electrical_level_4", type: "number", category: "install_electrical_severity", label: "Level 4 — Real Pain", suffix: "+min/letter", description: "Extra minutes per letter added to electrical hookup", default: "15" },
  { name: "install_poor_electrical_level_5", type: "number", category: "install_electrical_severity", label: "Level 5 — Frustrating", suffix: "+min/letter", description: "Extra minutes per letter added to electrical hookup", default: "20" },
  { name: "install_poor_electrical_level_6", type: "number", category: "install_electrical_severity", label: "Level 6 — Seriously?", suffix: "+min/letter", description: "Extra minutes per letter added to electrical hookup", default: "28" },
  { name: "install_poor_electrical_level_7", type: "number", category: "install_electrical_severity", label: "Level 7 — Nightmare Fuel", suffix: "+min/letter", description: "Extra minutes per letter added to electrical hookup", default: "38" },
  { name: "install_poor_electrical_level_8", type: "number", category: "install_electrical_severity", label: "Level 8 — Who Designed This?", suffix: "+min/letter", description: "Extra minutes per letter added to electrical hookup", default: "50" },
  { name: "install_poor_electrical_level_9", type: "number", category: "install_electrical_severity", label: "Level 9 — Total Disaster", suffix: "+min/letter", description: "Extra minutes per letter added to electrical hookup", default: "65" },
  { name: "install_poor_electrical_level_10", type: "number", category: "install_electrical_severity", label: "Level 10 — What the Heck is Wrong With These People!?", suffix: "+min/letter", description: "Extra minutes per letter added to electrical hookup", default: "90" },
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

  // Letter Pricing — Raceway tiers (per linear foot, escalating)
  { name: "letters_raceway_1st_per_ft", type: "number", category: "letters_raceway_pricing", label: "1st Raceway", suffix: "$/ft", description: "Cost per linear foot for the first raceway on a project", default: "22.53" },
  { name: "letters_raceway_2nd_per_ft", type: "number", category: "letters_raceway_pricing", label: "2nd Raceway", suffix: "$/ft", description: "Cost per linear foot for the second raceway", default: "23.53" },
  { name: "letters_raceway_3rd_per_ft", type: "number", category: "letters_raceway_pricing", label: "3rd Raceway", suffix: "$/ft", description: "Cost per linear foot for the third raceway", default: "24.53" },
  { name: "letters_raceway_4th_per_ft", type: "number", category: "letters_raceway_pricing", label: "4th Raceway", suffix: "$/ft", description: "Cost per linear foot for the fourth (and beyond) raceway", default: "25.53" },

  // Letter Pricing — Channel letters (per vertical inch)
  { name: "letters_channel_raceway_per_inch", type: "number", category: "letters_channel_pricing", label: "Raceway-Mounted Channel Letters", suffix: "$/in", description: "Cost per vertical inch — channel letters mounted to a raceway", default: "7.10" },
  { name: "letters_channel_flush_per_inch", type: "number", category: "letters_channel_pricing", label: "Flush-Mounted Channel Letters", suffix: "$/in", description: "Cost per vertical inch — channel letters mounted directly to wall", default: "9.03" },
  { name: "letters_channel_halo_per_inch", type: "number", category: "letters_channel_pricing", label: "Halo-Lit Channel Letters", suffix: "$/in", description: "Cost per vertical inch — reverse / halo-lit channel letters (~30% premium over flush)", default: "11.75" },

  // Letter Pricing — Capsule / logo / dimensional (per square foot)
  { name: "letters_capsule_logo_per_sqft", type: "number", category: "letters_area_pricing", label: "Capsule / Logo / Pillbox", suffix: "$/sqft", description: "Cost per square foot for capsule, pillbox, or logo elements", default: "45.37" },
  { name: "letters_dimensional_per_sqft", type: "number", category: "letters_area_pricing", label: "Dimensional Letters (in-house)", suffix: "$/sqft", description: "Cost per square foot for in-house fabricated dimensional letters", default: "65.00" },

  // Project Fees — Defaults prefilled on new estimates
  { name: "letters_default_delivery_fee", type: "number", category: "letters_fees", label: "Default Delivery / Shipping", suffix: "$", description: "Default delivery fee pre-filled on new projects", default: "90" },
  { name: "letters_default_other_fee", type: "number", category: "letters_fees", label: "Default Other Fee", suffix: "$", description: "Default 'Other' fee pre-filled on new projects", default: "0" },
];

const TAB_META = {
  pricing_labor: {
    title: "Pricing & Labor",
    icon: DollarSign,
    description: "Hourly rates for the primary installer and on-site manual labor.",
    categories: ["install_pricing"],
  },
  base_rates: {
    title: "Base Installation Times",
    icon: Ruler,
    description: "Minutes per letter by installation type and size. Pick a sub-tab to edit Channel Flush, Halo-Lit, Dimensional, Capsule/Logo/Pillbox, or Raceway times.",
    categories: ["install_rates_flush", "install_rates_halo", "install_rates_dimensional", "install_rates_capsule", "install_rates_raceway"],
  },
  multipliers: {
    title: "Height",
    icon: Clock,
    description: "Working-height adjustments applied on top of the base installation times.",
    categories: ["install_multipliers"],
  },
  site_conditions: {
    title: "Site Conditions",
    icon: AlertTriangle,
    description: "Per-condition adjustments. Use the sub-tabs for Multipliers, Electrical Severity, and Thick / Hollow Walls.",
    categories: ["install_site_conditions", "install_electrical_severity", "install_thick_walls"],
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
  letter_pricing: {
    title: "Letter Pricing",
    icon: Type,
    description: "Purchase pricing for channel letters, capsule/logo, and dimensional letters. (Raceway per-foot pricing lives in Base Installation Times → Raceway.)",
    categories: ["letters_channel_pricing", "letters_area_pricing"],
  },
  letter_fees: {
    title: "Project Fees",
    icon: Receipt,
    description: "Default Delivery / Shipping and Other fees pre-filled on new estimates.",
    categories: ["letters_fees"],
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

  // Renders one of the three letter-size base-time grids (flush / halo / dimensional)
  const renderSizeGrid = (drillPrefix, prepPrefix, elecPrefix, includeElectrical) => {
    const sizes = [
      { key: "extra_small", label: 'Extra Small', range: '2"–8"' },
      { key: "small", label: 'Small', range: '8"–12"' },
      { key: "medium", label: 'Medium', range: '12"–24"' },
      { key: "large", label: 'Large', range: '24"–48"' },
      { key: "extra_large", label: 'Extra Large', range: '48"–60"' },
      { key: "extra_extra_large", label: 'XXL', range: '60"+' },
    ];

    const renderField = (name, label) => {
      if (!name) return null;
      const value = settings[name];
      return (
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <Label htmlFor={name} className="text-xs font-medium text-slate-700">{label}</Label>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">min</span>
          </div>
          <Input
            type="number"
            step="1"
            id={name}
            value={value || ""}
            onChange={(e) => updateSetting(name, e.target.value)}
            disabled={isLocked}
            className="h-9 bg-white border-slate-200 focus:border-slate-400 focus:ring-0 text-sm tabular-nums font-medium"
            min="0"
          />
        </div>
      );
    };

    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sizes.map(s => {
          const drillName = `${drillPrefix}${s.key}`;
          const prepName = `${prepPrefix}${s.key}`;
          const elecName = includeElectrical ? `${elecPrefix}${s.key}` : null;
          const drillVal = parseFloat(settings[drillName]) || 0;
          const prepVal = parseFloat(settings[prepName]) || 0;
          const elecVal = elecName ? (parseFloat(settings[elecName]) || 0) : 0;
          const total = drillVal + prepVal + elecVal;
          return (
            <div key={s.key} className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 hover:bg-slate-50 transition-colors">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{s.label}</div>
                  <div className="text-[11px] text-slate-500">{s.range}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Total / letter</div>
                  <div className="text-sm font-bold text-slate-900 tabular-nums">{total} min</div>
                </div>
              </div>
              <div className="space-y-2">
                {renderField(drillName, "Drill Pattern / Drill Time")}
                {renderField(prepName, "Installation / Prep Time")}
                {includeElectrical && renderField(elecName, "Electrical Hookup")}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Raceway sub-tab — labor times + per-foot purchase pricing (4 tiers)
  const renderRacewayContent = () => {
    const laborDefs = settingsDefinitions.filter(d => d.category === "install_rates_raceway");
    const tierDefs = settingsDefinitions.filter(d => d.category === "letters_raceway_pricing");
    return (
      <div className="space-y-6">
        <div>
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Labor Times</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {laborDefs.map(def => renderSettingInput(def))}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Raceway Purchase Pricing (per linear foot, escalating per raceway)</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {tierDefs.map(def => renderSettingInput(def))}
          </div>
        </div>
      </div>
    );
  };

  const renderBaseRatesContent = () => {
    const SUBTABS = [
      { key: "flush", label: "Channel Flush-Mount", description: "Times for channel letters mounted directly to the wall." },
      { key: "halo", label: "Channel Halo-Lit", description: "Times for reverse / halo-lit channel letters." },
      { key: "dimensional", label: "Dimensional Letters", description: "Times for non-illuminated dimensional letters (no electrical hookup)." },
      { key: "capsule", label: "Capsule / Logo / Pillbox", description: "Times for capsule, pillbox, and logo elements." },
      { key: "raceway", label: "Raceway", description: "Per-foot, per-letter mounting, and electrical hookup times for raceway installs." },
    ];

    return (
      <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Ruler className="w-5 h-5 text-slate-700" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">Base Installation Times</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Minutes per letter (or per foot for raceway) by installation type and size. The estimator sums these and then applies height and site multipliers.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 pb-6">
          <Tabs defaultValue="flush" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-5 h-auto p-1">
              {SUBTABS.map(st => (
                <TabsTrigger key={st.key} value={st.key} className="py-2 text-xs">
                  {st.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {SUBTABS.map(st => (
              <TabsContent key={st.key} value={st.key} className="space-y-4">
                <p className="text-xs text-slate-500 italic">{st.description}</p>
                {st.key === "flush" && renderSizeGrid("install_drill_rate_", "install_prep_rate_", "install_electrical_rate_", true)}
                {st.key === "halo" && renderSizeGrid("install_halo_drill_rate_", "install_halo_prep_rate_", "install_halo_electrical_rate_", true)}
                {st.key === "dimensional" && renderSizeGrid("install_dimensional_drill_rate_", "install_dimensional_prep_rate_", null, false)}
                {st.key === "capsule" && renderSizeGrid("install_capsule_drill_rate_", "install_capsule_prep_rate_", "install_capsule_electrical_rate_", true)}
                {st.key === "raceway" && renderRacewayContent()}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    );
  };

  // Site Conditions parent — three sub-tabs: Multipliers, Electrical Severity, Thick / Hollow Walls
  const renderSiteConditionsContent = () => {
    const SUBTABS = [
      { key: "multipliers", label: "Multipliers", category: "install_site_conditions", description: "Per-condition labor multipliers. 1.0 = no impact, 1.5 = 50% more time." },
      { key: "electrical", label: "Electrical Severity", category: "install_electrical_severity", description: "10 severity levels for Poor Electrical Access. The selected level's minutes are ADDED to each letter's Electrical Hookup baseline." },
      { key: "thick_walls", label: "Thick / Hollow Walls", category: "install_thick_walls", description: "Additive minutes for brick veneer, masonry, or hollow-cavity walls — applied per letter and per raceway (not a multiplier)." },
    ];

    return (
      <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-slate-700" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">Site Conditions</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Per-condition adjustments. Multipliers scale labor time. Electrical Severity and Thick / Hollow Walls are additive minutes.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 pb-6">
          <Tabs defaultValue="multipliers" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-5 h-auto p-1">
              {SUBTABS.map(st => (
                <TabsTrigger key={st.key} value={st.key} className="py-2 text-xs">
                  {st.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {SUBTABS.map(st => {
              const defs = settingsDefinitions.filter(d => d.category === st.category);
              return (
                <TabsContent key={st.key} value={st.key} className="space-y-4">
                  <p className="text-xs text-slate-500 italic">{st.description}</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {defs.map(def => renderSettingInput(def))}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
    );
  };

  const renderTabContent = (tabKey) => {
    if (tabKey === "base_rates") return renderBaseRatesContent();
    if (tabKey === "site_conditions") return renderSiteConditionsContent();

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
      <TabsList className="grid w-full grid-cols-3 lg:grid-cols-8 mb-6 h-auto p-1">
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