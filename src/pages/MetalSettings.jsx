
import React, { useState, useEffect } from "react";
import { Settings as SettingsEntity, User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Save, Settings, DollarSign, Clock, Wrench } from "lucide-react";
import SettingsAuthWrapper from "@/components/SettingsAuthWrapper";

export default function MetalSettings() {
  const [isLocked, setIsLocked] = useState(true);
  const [settings, setSettings] = useState({
    metal_fabrication_rate: "65",
    metal_welding_rate: "75",
    metal_finishing_rate: "55",
    weld_time_per_inch: "0.5",
    company_name: "Sign Company",
    default_notes_template: "",
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadPrerequisites = async () => {
        setIsLoading(true);
        try {
            const [user, allSettings] = await Promise.all([User.me(), SettingsEntity.list()]);
            setCurrentUser(user);
            const settingsObj = {};
            allSettings.forEach(s => { settingsObj[s.setting_name] = s.setting_value; });
            setSettings(prev => ({ ...prev, ...settingsObj }));
        } catch (error) {
            console.error('Error loading settings:', error);
        }
        setIsLoading(false);
    };
    loadPrerequisites();
  }, []);

  const getSettingDefinitions = () => {
    let defs = [
      { name: "metal_fabrication_rate", type: "number", category: "metal_rates" },
      { name: "metal_welding_rate", type: "number", category: "metal_rates" },
      { name: "metal_finishing_rate", type: "number", category: "metal_rates" },
      { name: "weld_time_per_inch", type: "number", category: "metal_calc" },
      { name: "company_name", type: "text", category: "general" },
      { name: "default_notes_template", type: "text", category: "general" },
    ];
    
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
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign />Labor Rates</CardTitle></CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div><Label>Fabrication Rate ($/hour)</Label><Input type="number" value={settings.metal_fabrication_rate} onChange={(e) => updateSetting('metal_fabrication_rate', e.target.value)} disabled={isLocked} /></div>
            <div><Label>Welding Rate ($/hour)</Label><Input type="number" value={settings.metal_welding_rate} onChange={(e) => updateSetting('metal_welding_rate', e.target.value)} disabled={isLocked} /></div>
            <div><Label>Finishing Rate ($/hour)</Label><Input type="number" value={settings.metal_finishing_rate} onChange={(e) => updateSetting('metal_finishing_rate', e.target.value)} disabled={isLocked} /></div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock />Time Calculations</CardTitle></CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Weld Time per Inch (minutes)</Label>
            <Input type="number" step="0.1" value={settings.weld_time_per_inch} onChange={(e) => updateSetting('weld_time_per_inch', e.target.value)} disabled={isLocked} className="mt-1 max-w-xs" />
            <p className="text-xs text-slate-500 mt-1">Average time to weld one inch of material</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-0 shadow-sm">
        <CardHeader><CardTitle>General Settings</CardTitle></CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div><Label>Company Name</Label><Input value={settings.company_name} onChange={(e) => updateSetting('company_name', e.target.value)} disabled={isLocked} /></div>
          <div><Label>Default Notes Template</Label><Textarea value={settings.default_notes_template} onChange={(e) => updateSetting('default_notes_template', e.target.value)} disabled={isLocked} /></div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3"><Wrench className="w-8 h-8" />Metal Fabrication Settings</h1>
            <p className="text-slate-600">Configure parameters for the Metal Fabrication module</p>
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
