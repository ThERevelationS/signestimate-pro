import React, { useState, useEffect, useCallback } from "react";
import { Settings as SettingsEntity, User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Wrench, DollarSign, Clock, Ruler, AlertTriangle } from "lucide-react";
import SettingsAuthWrapper from "@/components/SettingsAuthWrapper";

const settingsDefinitions = [
  // Pricing & Labor
  { name: "install_labor_rate", type: "number", category: "install_pricing", description: "Hourly labor rate for installation work", default: "65" },
  
  // Base Rates per Letter Size
  { name: "install_base_rate_extra_small", type: "number", category: "install_rates", description: "Base hours per letter - XS (2\"-8\")", default: "0.75" },
  { name: "install_base_rate_small", type: "number", category: "install_rates", description: "Base hours per letter - Small (8\"-12\")", default: "1.5" },
  { name: "install_base_rate_medium", type: "number", category: "install_rates", description: "Base hours per letter - Medium (12\"-24\")", default: "2.5" },
  { name: "install_base_rate_large", type: "number", category: "install_rates", description: "Base hours per letter - Large (24\"-48\")", default: "4.0" },
  { name: "install_base_rate_extra_large", type: "number", category: "install_rates", description: "Base hours per letter - XL (48\"-60\")", default: "6.0" },
  { name: "install_base_rate_extra_extra_large", type: "number", category: "install_rates", description: "Base hours per letter - XXL (60\"+)", default: "8.5" },
  
  // Raceway Rates
  { name: "install_raceway_rate_per_foot", type: "number", category: "install_rates", description: "Hours per foot of raceway installation", default: "0.5" },
  { name: "install_raceway_letter_mounting_rate", type: "number", category: "install_rates", description: "Hours per letter for mounting to raceway", default: "0.3" },
  
  // Type Multipliers
  { name: "install_halo_multiplier", type: "number", category: "install_multipliers", description: "Multiplier for halo-lit installations", default: "1.3" },
  
  // Height Multipliers
  { name: "install_height_0_12ft", type: "number", category: "install_multipliers", description: "Height multiplier: 0-12 feet (ladder work)", default: "1.0" },
  { name: "install_height_12_20ft", type: "number", category: "install_multipliers", description: "Height multiplier: 12-20 feet (scaffolding)", default: "1.3" },
  { name: "install_height_20_30ft", type: "number", category: "install_multipliers", description: "Height multiplier: 20-30 feet (lift required)", default: "1.6" },
  { name: "install_height_30plus_ft", type: "number", category: "install_multipliers", description: "Height multiplier: 30+ feet (crane/special equipment)", default: "2.0" },
  
  // Site Condition Multipliers — one per toggleable condition
  { name: "install_thick_walls_multiplier", type: "number", category: "install_site_conditions", description: "Thick / Hollow Walls (brick veneer, masonry, hollow cavity)", default: "1.2" },
  { name: "install_parapet_multiplier", type: "number", category: "install_site_conditions", description: "Parapet (working over rooftop edge wall)", default: "1.4" },
  { name: "install_poor_electrical_multiplier", type: "number", category: "install_site_conditions", description: "Poor Electrical Access (difficult conduit / power routing)", default: "1.3" },
  { name: "install_escort_multiplier", type: "number", category: "install_site_conditions", description: "Escort Required (must be escorted on-site at all times)", default: "1.15" },
  { name: "install_badging_multiplier", type: "number", category: "install_site_conditions", description: "Badging / Check-in (security badge or sign-in required)", default: "1.1" },
  { name: "install_after_hours_multiplier", type: "number", category: "install_site_conditions", description: "After-Hours / Weekend (night, early morning, or weekend install)", default: "1.5" },
  { name: "install_set_hours_multiplier", type: "number", category: "install_site_conditions", description: "Set-Hours Installation (fixed time window / scheduled appointment)", default: "1.15" },
  { name: "install_poor_site_access_multiplier", type: "number", category: "install_site_conditions", description: "Poor Site Access (no lift room, obstructions, tight space)", default: "1.25" },
];

export default function ChannelLetterInstallationSettings() {
  const [isLocked, setIsLocked] = useState(true);
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

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

      if (updates.length > 0 || creates.length > 0) {
        await Promise.all([...updates, ...creates]);
        alert('Settings saved successfully!');
      } else {
        alert('No settings were changed.');
      }
      
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
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading settings...</p>
      </div>
    );
  }

  const renderSettingInput = (def) => {
    const value = settings[def.name];
    let step = "0.01";
    if (def.name.includes("multiplier")) {
      step = "0.1";
    } else if (def.name.includes("rate") && !def.name.includes("labor_rate")) {
      step = "0.25";
    } else if (def.name.includes("supplies")) {
      step = "1";
    }

    return (
      <div key={def.name}>
        <Label htmlFor={def.name}>{def.description}</Label>
        <Input 
          type="number" 
          step={step}
          id={def.name}
          value={value || ''}
          onChange={(e) => updateSetting(def.name, e.target.value)}
          disabled={isLocked}
          className="mt-1"
          min="0"
        />
      </div>
    );
  };

  const categoryDescriptions = {
    "install_pricing": "Define the core labor rates and base costs for installation projects.",
    "install_rates": "Set base hour rates for different letter sizes and installation types.",
    "install_multipliers": "Adjust rates based on installation height and type complexity.",
    "install_site_conditions": "Labor multipliers for each toggleable site condition on a line item. 1.0 = no impact, 1.5 = 50% more time."
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

  const managementContent = (
    <div className="space-y-8">
      {renderCategory("Pricing & Labor", "install_pricing", DollarSign)}
      {renderCategory("Base Installation Rates", "install_rates", Ruler)}
      {renderCategory("Type & Height Multipliers", "install_multipliers", Clock)}
      {renderCategory("Site Condition Multipliers", "install_site_conditions", AlertTriangle)}
    </div>
  );

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Wrench className="w-8 h-8" />
              Channel Letter Installation Settings
            </h1>
            <p className="text-slate-600">Configure parameters for the Installation Estimator module</p>
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
          <Button onClick={saveSettings} disabled={isSaving || isLocked} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3">
            {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save All Settings</>}
          </Button>
        </div>
      </div>
    </div>
  );
}