
import React, { useState, useEffect } from "react";
import { Settings as SettingsEntity, User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Save, Anchor, DollarSign, Clock } from "lucide-react";
import SettingsAuthWrapper from "@/components/SettingsAuthWrapper";

export default function FoundationSettings() {
  const [isLocked, setIsLocked] = useState(true);
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const initializeAndLoad = async () => {
      const defaultSettings = {
        foundation_concrete_cost_per_cy: "135",
        foundation_rebar_cost_per_ft: "0.75",
        foundation_excavation_cost_per_cy: "15",
        foundation_forming_labor_rate: "55",
        foundation_pouring_labor_rate: "60",
        foundation_finishing_labor_rate: "50",
        foundation_forming_hours_per_sqft: "0.15",
        foundation_pouring_hours_per_cy: "0.5",
        foundation_finishing_hours_per_sqft: "0.10",
        company_name: "Sign Company",
        default_notes_template: ""
      };

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

  const getSettingDefinitions = () => {
    return [
      { name: "foundation_concrete_cost_per_cy", type: "number", category: "foundation_pricing", description: "Cost per cubic yard of concrete from Ernst Concrete" },
      { name: "foundation_rebar_cost_per_ft", type: "number", category: "foundation_pricing", description: "Cost per linear foot of rebar" },
      { name: "foundation_excavation_cost_per_cy", type: "number", category: "foundation_pricing", description: "Cost per cubic yard of excavation (non-labor)" },
      { name: "foundation_forming_labor_rate", type: "number", category: "foundation_labor", description: "Forming labor hourly rate" },
      { name: "foundation_pouring_labor_rate", type: "number", category: "foundation_labor", description: "Pouring labor hourly rate" },
      { name: "foundation_finishing_labor_rate", type: "number", category: "foundation_labor", description: "Finishing labor hourly rate" },
      { name: "foundation_hand_dig_labor_rate", type: "number", category: "foundation_labor", description: "Hand dig labor hourly rate" },
      { name: "foundation_equipment_excavation_labor_rate", type: "number", category: "foundation_labor", description: "Equipment excavation operator hourly rate" },
      { name: "foundation_forming_hours_per_sqft", type: "number", category: "foundation_calc", description: "Forming time per square foot" },
      { name: "foundation_pouring_hours_per_cy", type: "number", category: "foundation_calc", description: "Pouring time per cubic yard" },
      { name: "foundation_finishing_hours_per_sqft", type: "number", category: "foundation_calc", description: "Finishing time per square foot" },
      { name: "foundation_excavation_hours_per_cy", type: "number", category: "foundation_calc", description: "Excavation labor time per cubic yard (applies to both hand dig and equipment)" },
      { name: "company_name", type: "text", category: "general", description: "Company name" },
      { name: "default_notes_template", type: "text", category: "general", description: "Default project notes template" }
    ];
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
      {/* Pricing */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DollarSign />Foundation Pricing</CardTitle>
          <p className="text-sm text-slate-500">Based on Ernst Concrete, Cincinnati area</p>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label>Concrete Cost ($/cubic yard)</Label>
              <Input 
                type="number" 
                step="1"
                value={settings.foundation_concrete_cost_per_cy} 
                onChange={(e) => updateSetting('foundation_concrete_cost_per_cy', e.target.value)} 
                disabled={isLocked}
              />
              <p className="text-xs text-slate-500 mt-1">Typical range: $120-150/cy</p>
            </div>
            <div>
              <Label>Rebar Cost ($/linear foot)</Label>
              <Input 
                type="number" 
                step="0.05"
                value={settings.foundation_rebar_cost_per_ft} 
                onChange={(e) => updateSetting('foundation_rebar_cost_per_ft', e.target.value)} 
                disabled={isLocked}
              />
            </div>
            <div>
              <Label>Excavation Cost ($/cubic yard)</Label>
              <Input 
                type="number" 
                step="1"
                value={settings.foundation_excavation_cost_per_cy} 
                onChange={(e) => updateSetting('foundation_excavation_cost_per_cy', e.target.value)} 
                disabled={isLocked}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Labor Rates */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock />Labor Rates</CardTitle></CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <Label>Forming Rate ($/hour)</Label>
              <Input 
                type="number" 
                step="1"
                value={settings.foundation_forming_labor_rate} 
                onChange={(e) => updateSetting('foundation_forming_labor_rate', e.target.value)} 
                disabled={isLocked}
              />
            </div>
            <div>
              <Label>Pouring Rate ($/hour)</Label>
              <Input 
                type="number" 
                step="1"
                value={settings.foundation_pouring_labor_rate} 
                onChange={(e) => updateSetting('foundation_pouring_labor_rate', e.target.value)} 
                disabled={isLocked}
              />
            </div>
            <div>
              <Label>Finishing Rate ($/hour)</Label>
              <Input 
                type="number" 
                step="1"
                value={settings.foundation_finishing_labor_rate} 
                onChange={(e) => updateSetting('foundation_finishing_labor_rate', e.target.value)} 
                disabled={isLocked}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Labor Time Factors */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock />Labor Time Calculations</CardTitle>
          <p className="text-sm text-slate-500">Time required for each step</p>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <Label>Forming (hours/sqft)</Label>
              <Input 
                type="number" 
                step="0.01"
                value={settings.foundation_forming_hours_per_sqft} 
                onChange={(e) => updateSetting('foundation_forming_hours_per_sqft', e.target.value)} 
                disabled={isLocked}
              />
              <p className="text-xs text-slate-500 mt-1">Applied to form surface area</p>
            </div>
            <div>
              <Label>Pouring (hours/cubic yard)</Label>
              <Input 
                type="number" 
                step="0.1"
                value={settings.foundation_pouring_hours_per_cy} 
                onChange={(e) => updateSetting('foundation_pouring_hours_per_cy', e.target.value)} 
                disabled={isLocked}
              />
            </div>
            <div>
              <Label>Finishing (hours/sqft)</Label>
              <Input 
                type="number" 
                step="0.01"
                value={settings.foundation_finishing_hours_per_sqft} 
                onChange={(e) => updateSetting('foundation_finishing_hours_per_sqft', e.target.value)} 
                disabled={isLocked}
              />
              <p className="text-xs text-slate-500 mt-1">Applied to top surface area</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Anchor className="w-8 h-8" />
              Foundation Settings
            </h1>
            <p className="text-slate-600">Configure parameters for foundation estimates</p>
          </div>
          <Button onClick={saveSettings} disabled={isSaving || isLocked} className="bg-green-600 hover:bg-green-700">
            {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" />Save All Settings</>}
          </Button>
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
