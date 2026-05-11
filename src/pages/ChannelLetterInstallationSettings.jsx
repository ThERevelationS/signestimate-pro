import React, { useState, useEffect, useCallback } from "react";
import { Settings as SettingsEntity, User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Wrench, DollarSign, Clock, Ruler, AlertTriangle, CheckCircle2, Layers } from "lucide-react";
import SettingsAuthWrapper from "@/components/SettingsAuthWrapper";
import { WALL_MATERIALS } from "@/components/channelLetterInstall/wallMaterials";

const settingsDefinitions = [
  // Pricing & Labor
  { name: "install_labor_rate", type: "number", category: "install_pricing", label: "Hourly Labor Rate", suffix: "$/hr", description: "Crew rate per hour for installation work", default: "65" },

  // Base Rates per Letter Size
  { name: "install_base_rate_extra_small", type: "number", category: "install_rates", label: "Extra Small (2\"–8\")", suffix: "hrs/letter", description: "Base hours per XS letter", default: "0.75" },
  { name: "install_base_rate_small", type: "number", category: "install_rates", label: "Small (8\"–12\")", suffix: "hrs/letter", description: "Base hours per small letter", default: "1.5" },
  { name: "install_base_rate_medium", type: "number", category: "install_rates", label: "Medium (12\"–24\")", suffix: "hrs/letter", description: "Base hours per medium letter", default: "2.5" },
  { name: "install_base_rate_large", type: "number", category: "install_rates", label: "Large (24\"–48\")", suffix: "hrs/letter", description: "Base hours per large letter", default: "4.0" },
  { name: "install_base_rate_extra_large", type: "number", category: "install_rates", label: "Extra Large (48\"–60\")", suffix: "hrs/letter", description: "Base hours per XL letter", default: "6.0" },
  { name: "install_base_rate_extra_extra_large", type: "number", category: "install_rates", label: "XXL (60\"+)", suffix: "hrs/letter", description: "Base hours per XXL letter", default: "8.5" },

  // Raceway Rates
  { name: "install_raceway_rate_per_foot", type: "number", category: "install_rates", label: "Raceway per Foot", suffix: "hrs/ft", description: "Hours per foot of raceway installation", default: "0.5" },
  { name: "install_raceway_letter_mounting_rate", type: "number", category: "install_rates", label: "Raceway Letter Mounting", suffix: "hrs/letter", description: "Hours per letter mounted to raceway", default: "0.3" },

  // Type Multipliers
  { name: "install_halo_multiplier", type: "number", category: "install_multipliers", label: "Halo-Lit Installations", suffix: "×", description: "Time multiplier for halo-lit (reverse-lit) installs", default: "1.3" },

  // Height Multipliers
  { name: "install_height_0_12ft", type: "number", category: "install_multipliers", label: "Height 0–12 ft", suffix: "×", description: "Ladder-level work", default: "1.0" },
  { name: "install_height_12_20ft", type: "number", category: "install_multipliers", label: "Height 12–20 ft", suffix: "×", description: "Scaffolding required", default: "1.3" },
  { name: "install_height_20_30ft", type: "number", category: "install_multipliers", label: "Height 20–30 ft", suffix: "×", description: "Lift required", default: "1.6" },
  { name: "install_height_30plus_ft", type: "number", category: "install_multipliers", label: "Height 30+ ft", suffix: "×", description: "Crane / special equipment", default: "2.0" },

  // Site Condition Multipliers — one per toggleable condition
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
];

const CATEGORY_META = {
  install_pricing: {
    title: "Pricing & Labor",
    description: "Core hourly rate applied to all installation labor.",
    icon: DollarSign,
    accent: "from-emerald-500/10 to-emerald-500/0",
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
  },
  install_rates: {
    title: "Base Installation Rates",
    description: "Time required per letter by size and per foot of raceway.",
    icon: Ruler,
    accent: "from-blue-500/10 to-blue-500/0",
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
  },
  install_multipliers: {
    title: "Type & Height Multipliers",
    description: "Adjustments based on installation type and working height.",
    icon: Clock,
    accent: "from-amber-500/10 to-amber-500/0",
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
  },
  install_site_conditions: {
    title: "Site Condition Multipliers",
    description: "Per-condition labor multipliers. 1.0 = no impact, 1.5 = 50% more time.",
    icon: AlertTriangle,
    accent: "from-rose-500/10 to-rose-500/0",
    iconColor: "text-rose-600",
    iconBg: "bg-rose-50",
  },
  install_wall_materials: {
    title: "Wall Material Multipliers",
    description: "Labor multiplier applied based on the exterior wall material the letters are installed into.",
    icon: Layers,
    accent: "from-purple-500/10 to-purple-500/0",
    iconColor: "text-purple-600",
    iconBg: "bg-purple-50",
  },
};

export default function ChannelLetterInstallationSettings() {
  const [isLocked, setIsLocked] = useState(true);
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [savedFlash, setSavedFlash] = useState(false);

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
      console.error('Error loading settings:', error);
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
      }
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2200);
    } catch (error) {
      console.error('Save failed:', error);
      alert('Save failed: ' + (error.message || 'An unknown error occurred.'));
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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
    else if (def.name.includes("rate") && !def.name.includes("labor_rate")) step = "0.25";

    return (
      <div key={def.name} className="group">
        <div className="flex items-baseline justify-between mb-1.5">
          <Label htmlFor={def.name} className="text-sm font-medium text-slate-800">
            {def.label}
          </Label>
          {def.suffix && (
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
              {def.suffix}
            </span>
          )}
        </div>
        <Input
          type="number"
          step={step}
          id={def.name}
          value={value || ''}
          onChange={(e) => updateSetting(def.name, e.target.value)}
          disabled={isLocked}
          className="h-10 bg-white border-slate-200 focus:border-slate-400 focus:ring-0 text-sm tabular-nums font-medium transition-colors"
          min="0"
        />
        {def.description && (
          <p className="mt-1.5 text-xs text-slate-500 leading-tight">{def.description}</p>
        )}
      </div>
    );
  };

  const renderCategory = (categoryKey) => {
    const meta = CATEGORY_META[categoryKey];
    if (!meta) return null;
    const Icon = meta.icon;
    const filteredSettings = settingsDefinitions.filter(def => def.category === categoryKey);
    if (filteredSettings.length === 0) return null;

    return (
      <Card key={categoryKey} className="bg-white border border-slate-200/80 shadow-sm overflow-hidden rounded-2xl">
        <div className={`h-1 bg-gradient-to-r ${meta.accent} from-current to-transparent ${meta.iconColor}`} />
        <CardHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl ${meta.iconBg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${meta.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">
                {meta.title}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {meta.description}
              </CardDescription>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium px-2 py-1 bg-slate-50 rounded-md">
              {filteredSettings.length} {filteredSettings.length === 1 ? 'setting' : 'settings'}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-0 pb-6">
          {filteredSettings.map(def => renderSettingInput(def))}
        </CardContent>
      </Card>
    );
  };

  const managementContent = (
    <div className="space-y-6">
      {Object.keys(CATEGORY_META).map(key => renderCategory(key))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-10 pb-32">
        {/* Hero header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
            <span>Channel Letter Install</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-medium">Settings</span>
          </div>
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center shadow-lg shadow-slate-900/10">
                <Wrench className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  Installation Settings
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Fine-tune labor rates, base hours, and condition multipliers used by the estimator.
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
              ) : savedFlash ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" /> Save Settings
                </>
              )}
            </Button>
          </div>
        </div>

        <SettingsAuthWrapper
          correctPassword="Cinci2467"
          onUnlock={() => setIsLocked(false)}
          user={currentUser}
        >
          {managementContent}
        </SettingsAuthWrapper>
      </div>

      {/* Sticky save bar */}
      {!isLocked && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-[var(--sidebar-width,16rem)] bg-white/80 backdrop-blur-md border-t border-slate-200 px-6 py-3 z-40">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              {savedFlash ? (
                <span className="flex items-center gap-2 text-emerald-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> All changes saved
                </span>
              ) : (
                <span>Changes are saved manually — remember to click save.</span>
              )}
            </div>
            <Button
              onClick={saveSettings}
              disabled={isSaving}
              className="bg-slate-900 hover:bg-slate-800 text-white h-10 px-5 rounded-xl"
            >
              {isSaving ? "Saving…" : <><Save className="w-4 h-4 mr-2" /> Save Settings</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}