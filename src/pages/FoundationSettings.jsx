import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, RefreshCw } from 'lucide-react';
import SettingsAuthWrapper from '@/components/SettingsAuthWrapper';

const SettingsEntity = base44.entities.Settings;

const DEFAULT_SETTINGS = {
  // Concrete
  foundation_concrete_cost_per_cy: { value: '135', label: 'Concrete Cost Per CY ($)', category: 'foundation_pricing', type: 'number' },
  foundation_min_excavation_time: { value: '1.0', label: 'Min Excavation Time (hrs)', category: 'foundation_labor', type: 'number' },
  foundation_hand_dig_excavation_cost_per_cy: { value: '10', label: 'Hand Dig Excavation Cost Per CY ($)', category: 'foundation_pricing', type: 'number' },
  foundation_equipment_excavation_cost_per_cy: { value: '15', label: 'Equipment Excavation Cost Per CY ($)', category: 'foundation_pricing', type: 'number' },
  // Labor rates
  foundation_forming_labor_rate: { value: '55', label: 'Forming Labor Rate ($/hr)', category: 'foundation_labor', type: 'number' },
  foundation_pouring_labor_rate: { value: '60', label: 'Pouring Labor Rate ($/hr)', category: 'foundation_labor', type: 'number' },
  foundation_finishing_labor_rate: { value: '50', label: 'Finishing Labor Rate ($/hr)', category: 'foundation_labor', type: 'number' },
  foundation_hand_dig_labor_rate: { value: '45', label: 'Hand Dig Labor Rate ($/hr)', category: 'foundation_labor', type: 'number' },
  foundation_equipment_excavation_labor_rate: { value: '35', label: 'Equipment Excavation Labor Rate ($/hr)', category: 'foundation_labor', type: 'number' },
  // Forming materials
  foundation_forming_materials_spread_foot: { value: '0.5', label: 'Forming Material Cost Multiplier - Spread Foot', category: 'foundation_calc', type: 'number' },
  foundation_forming_materials_pillar: { value: '0.75', label: 'Forming Material Cost Multiplier - Pillar', category: 'foundation_calc', type: 'number' },
  // Rebar
  foundation_rebar_cost_per_ft: { value: '0.75', label: 'Rebar Cost Per Foot ($)', category: 'foundation_pricing', type: 'number' },
  // Wall / Masonry settings (NEW)
  wall_mortar_cost_per_sqft: { value: '0.35', label: 'Mortar/Grout Cost Per Sq Ft of Wall Face ($)', category: 'foundation_pricing', type: 'number' },
  wall_labor_rate: { value: '45', label: 'Wall Masonry Labor Rate ($/hr)', category: 'foundation_labor', type: 'number' },
  wall_labor_bricks_per_hour: { value: '50', label: 'Wall Units Laid Per Labor Hour', category: 'foundation_calc', type: 'number' },
};

export default function FoundationSettings() {
  const [settings, setSettings] = useState({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const raw = await SettingsEntity.filter({ category: ['foundation_pricing', 'foundation_labor', 'foundation_calc'] });
    const map = {};
    raw.forEach(s => { map[s.setting_name] = s; });
    setSettings(map);
    setLoading(false);
  };

  const getValue = (key) => {
    if (settings[key]) return settings[key].setting_value;
    return DEFAULT_SETTINGS[key]?.value ?? '';
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: { ...(prev[key] || { setting_name: key }), setting_value: value }
    }));
  };

  const handleSave = async () => {
    for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
      const current = settings[key];
      const value = current?.setting_value ?? def.value;
      if (current?.id) {
        await SettingsEntity.update(current.id, { setting_value: value });
      } else {
        await SettingsEntity.create({
          setting_name: key,
          setting_value: value,
          setting_type: def.type,
          description: def.label,
          category: def.category,
        });
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    loadSettings();
  };

  const SettingInput = ({ settingKey }) => {
    const def = DEFAULT_SETTINGS[settingKey];
    if (!def) return null;
    return (
      <div>
        <Label className="text-xs text-slate-600">{def.label}</Label>
        <Input
          type="number"
          className="h-8 mt-1"
          value={getValue(settingKey)}
          onChange={e => handleChange(settingKey, e.target.value)}
          step="0.01"
          min="0"
        />
      </div>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <SettingsAuthWrapper>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Foundation Settings</h1>
            <p className="text-slate-500 text-sm">Configure pricing and labor rates for foundation and wall estimates</p>
          </div>
          <Button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700 text-white">
            <Save className="w-4 h-4 mr-2" />
            {saved ? 'Saved!' : 'Save Settings'}
          </Button>
        </div>

        <Tabs defaultValue="pricing">
          <TabsList>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="labor">Labor Rates</TabsTrigger>
            <TabsTrigger value="calc">Calculation Factors</TabsTrigger>
            <TabsTrigger value="wall">Wall / Masonry</TabsTrigger>
          </TabsList>

          <TabsContent value="pricing" className="space-y-4 pt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Concrete & Excavation Pricing</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <SettingInput settingKey="foundation_concrete_cost_per_cy" />
                <SettingInput settingKey="foundation_rebar_cost_per_ft" />
                <SettingInput settingKey="foundation_hand_dig_excavation_cost_per_cy" />
                <SettingInput settingKey="foundation_equipment_excavation_cost_per_cy" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="labor" className="space-y-4 pt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Labor Rates</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <SettingInput settingKey="foundation_forming_labor_rate" />
                <SettingInput settingKey="foundation_pouring_labor_rate" />
                <SettingInput settingKey="foundation_finishing_labor_rate" />
                <SettingInput settingKey="foundation_hand_dig_labor_rate" />
                <SettingInput settingKey="foundation_equipment_excavation_labor_rate" />
                <SettingInput settingKey="foundation_min_excavation_time" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calc" className="space-y-4 pt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Calculation Factors</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <SettingInput settingKey="foundation_forming_materials_spread_foot" />
                <SettingInput settingKey="foundation_forming_materials_pillar" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wall" className="space-y-4 pt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Wall & Masonry Settings</CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  These settings control cost calculations for brick, stone, and cinderblock walls built on top of foundations.
                  Mortar gap for each wall is set per-project in the estimate.
                </p>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <SettingInput settingKey="wall_mortar_cost_per_sqft" />
                <SettingInput settingKey="wall_labor_rate" />
                <SettingInput settingKey="wall_labor_bricks_per_hour" />
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-blue-800 font-medium">About the Wall Cost Formula</p>
                <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc ml-4">
                  <li><strong>Material cost</strong> = number of units × cost per unit (full unit cost even when cut at corners)</li>
                  <li><strong>Mortar cost</strong> = (2 × wall perimeter × wall height) ÷ 144 × mortar cost per sq ft</li>
                  <li><strong>Labor cost</strong> = (total units ÷ units per hour) × labor rate</li>
                  <li>Mortar gap is set per-wall in the estimate (default 3/8")</li>
                  <li>Concrete walls have no mortar or offset applied</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SettingsAuthWrapper>
  );
}