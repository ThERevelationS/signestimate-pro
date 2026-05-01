import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, RefreshCw, ShieldAlert } from 'lucide-react';

const SettingsEntity = base44.entities.Settings;

const DEFAULT_SETTINGS = {
  // Concrete
  foundation_min_excavation_time: { value: '1.0', label: 'Min Excavation Time (hrs)', category: 'foundation_labor', type: 'number' },
  // Labor rates
  foundation_main_labor_rate: { value: '60', label: 'Main Labor Rate ($/hr)', category: 'foundation_labor', type: 'number' },
  foundation_rebar_time_cross_section: { value: '0.05', label: 'Rebar Labor Time Per Cross Section (hrs)', category: 'foundation_labor', type: 'number' },
  foundation_rebar_time_linear_ft: { value: '0.02', label: 'Rebar Labor Time Per Linear Ft (hrs)', category: 'foundation_labor', type: 'number' },
  foundation_forming_cost_per_sqft: { value: '2.50', label: 'Forming Rate ($/sqft)', category: 'foundation_labor', type: 'number' },
  foundation_pouring_cost_per_cy: { value: '15', label: 'Pouring Labor Rate ($/CY)', category: 'foundation_labor', type: 'number' },
  foundation_finishing_cost_per_sqft: { value: '1.25', label: 'Finishing Labor Rate ($/sqft)', category: 'foundation_labor', type: 'number' },
  foundation_hand_dig_time_per_cy: { value: '2.0', label: 'Hand Dig Time (hrs/CY)', category: 'foundation_labor', type: 'number' },
  foundation_equipment_excavation_time_per_cy: { value: '0.5', label: 'Equipment Excavation Time (hrs/CY)', category: 'foundation_labor', type: 'number' },
  // Forming materials
  foundation_forming_materials_spread_foot: { value: '0.5', label: 'Forming Material Cost Multiplier - Spread Foot', category: 'foundation_calc', type: 'number' },
  foundation_forming_materials_pillar: { value: '0.75', label: 'Forming Material Cost Multiplier - Pillar', category: 'foundation_calc', type: 'number' },
  // Concrete delivery
  foundation_fuel_surcharge: { value: '30', label: 'Default Fuel / Delivery Surcharge Per Load ($)', category: 'foundation_pricing', type: 'number' },
  // Pole painting
  pole_paint_cost_per_lf: { value: '3.50', label: 'Paint Material Cost Per Linear Foot ($)', category: 'foundation_pricing', type: 'number' },
  pole_paint_labor_per_lf: { value: '2.50', label: 'Paint Labor Cost Per Linear Foot ($)', category: 'foundation_pricing', type: 'number' },
  pole_paint_size_multiplier_4in: { value: '1.0', label: '4" Pole Size Multiplier', category: 'foundation_calc', type: 'number' },
  pole_paint_size_multiplier_6in: { value: '1.25', label: '6" Pole Size Multiplier', category: 'foundation_calc', type: 'number' },
  pole_paint_size_multiplier_8in: { value: '1.5', label: '8" Pole Size Multiplier', category: 'foundation_calc', type: 'number' },
  pole_paint_size_multiplier_10in: { value: '1.75', label: '10" Pole Size Multiplier', category: 'foundation_calc', type: 'number' },
  pole_paint_size_multiplier_12in: { value: '2.0', label: '12"+ Pole Size Multiplier', category: 'foundation_calc', type: 'number' },
  // Wall / Masonry settings
  wall_mortar_cost_per_sqft: { value: '0.35', label: 'Mortar/Grout Cost Per Sq Ft of Wall Face ($)', category: 'foundation_pricing', type: 'number' },
  wall_labor_rate: { value: '45', label: 'Wall Masonry Labor Rate ($/sqft)', category: 'foundation_labor', type: 'number' },
  wall_labor_bricks_per_hour: { value: '50', label: 'Cinderblock/Filler Units Laid Per Labor Hour', category: 'foundation_calc', type: 'number' },
  wall_minimum_charge: { value: '150', label: 'Minimum Charge ($)', category: 'foundation_pricing', type: 'number' },
};

export default function FoundationSettings() {
  const [settings, setSettings] = useState({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const user = await base44.auth.me();
    setIsAdmin(user?.role === 'admin');
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
          disabled={!isAdmin}
        />
      </div>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Concrete | Masonry | Poles Settings</h1>
            <p className="text-slate-500 text-sm">Configure pricing and labor rates for concrete, masonry & pole estimates</p>
          </div>
          {isAdmin && (
            <Button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700 text-white">
              <Save className="w-4 h-4 mr-2" />
              {saved ? 'Saved!' : 'Save Settings'}
            </Button>
          )}
        </div>

        <Tabs defaultValue="labor">
          <TabsList>
            <TabsTrigger value="labor">Labor Rates</TabsTrigger>
            <TabsTrigger value="delivery">Fuel & Delivery</TabsTrigger>
            <TabsTrigger value="pole_painting">Pole Painting</TabsTrigger>
            <TabsTrigger value="calc">Calculation Factors</TabsTrigger>
            <TabsTrigger value="wall">Wall / Masonry</TabsTrigger>
          </TabsList>

          <TabsContent value="labor" className="space-y-4 pt-4">
            <Card className="bg-amber-50 border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-amber-900">Main Labor Rate</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SettingInput settingKey="foundation_main_labor_rate" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Excavation Time (Hours/CY)</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <SettingInput settingKey="foundation_hand_dig_time_per_cy" />
                <SettingInput settingKey="foundation_equipment_excavation_time_per_cy" />
                <SettingInput settingKey="foundation_min_excavation_time" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Rebar Labor Time (Hours)</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <SettingInput settingKey="foundation_rebar_time_cross_section" />
                <SettingInput settingKey="foundation_rebar_time_linear_ft" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Forming, Pouring & Finishing Unit Costs</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <SettingInput settingKey="foundation_forming_cost_per_sqft" />
                <SettingInput settingKey="foundation_pouring_cost_per_cy" />
                <SettingInput settingKey="foundation_finishing_cost_per_sqft" />
              </CardContent>
            </Card>
            <Card className="bg-indigo-50 border-indigo-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-indigo-900">How Labor Rates are Calculated</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-indigo-800 space-y-2">
                <p><strong>Rebar Labor Cost:</strong> ((Total Linear Feet × Time Per Linear Ft) + (Total Intersections × Time Per Cross Section)) × Main Labor Rate.</p>
                <p><strong>Excavation Cost:</strong> (Volume in Cubic Yards × 1.25 Expansion Factor) × Time Per CY × Main Labor Rate.</p>
                <p><strong>Forming Cost:</strong> (Perimeter in Feet × Depth in Feet) × Forming Rate per SQFT.</p>
                <p><strong>Pouring Cost:</strong> Volume in Cubic Yards × Pouring Rate per CY.</p>
                <p><strong>Finishing Cost:</strong> Top Surface Area in Sq. Feet × Finishing Rate per SQFT.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="delivery" className="space-y-4 pt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Fuel & Delivery Surcharge</CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  This is the default surcharge applied per concrete truck load. Supplier-specific surcharges can be set per concrete service in Inventory and will override this default.
                </p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SettingInput settingKey="foundation_fuel_surcharge" />
              </CardContent>
            </Card>
            <Card className="bg-indigo-50 border-indigo-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-indigo-900">How Delivery Costs Work</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-indigo-800 space-y-2">
                <p><strong>Per Truck Cost:</strong> (Rounded Yards × Rate/YD) + Small Load Fee + Fuel/Delivery Surcharge.</p>
                <p><strong>Rounding:</strong> Each truck's yardage is rounded up to the nearest ¼ yard for billing.</p>
                <p><strong>Small Load Fees:</strong> Configured per supplier in Inventory. Triggered when a truck carries less than 5 YD.</p>
                <p><strong>Supplier Override:</strong> If a concrete service in Inventory has its own fuel surcharge set, that value is used instead of this default.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pole_painting" className="space-y-4 pt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pole Painting — Base Rates</CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Cost per linear foot of pole height. The size multiplier adjusts the rate based on pole width.
                </p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SettingInput settingKey="pole_paint_cost_per_lf" />
                <SettingInput settingKey="pole_paint_labor_per_lf" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Size Multipliers</CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Larger poles require more paint and labor. These multipliers are applied to the base rates above.
                </p>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <SettingInput settingKey="pole_paint_size_multiplier_4in" />
                <SettingInput settingKey="pole_paint_size_multiplier_6in" />
                <SettingInput settingKey="pole_paint_size_multiplier_8in" />
                <SettingInput settingKey="pole_paint_size_multiplier_10in" />
                <SettingInput settingKey="pole_paint_size_multiplier_12in" />
              </CardContent>
            </Card>
            <Card className="bg-indigo-50 border-indigo-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-indigo-900">How Pole Painting is Calculated</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-indigo-800 space-y-2">
                <p><strong>Paint Material Cost:</strong> Pole Height (ft) × Paint Cost Per LF × Size Multiplier.</p>
                <p><strong>Paint Labor Cost:</strong> Pole Height (ft) × Paint Labor Per LF × Size Multiplier.</p>
                <p><strong>Total Painting Cost:</strong> Paint Material + Paint Labor.</p>
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
            <Card className="bg-indigo-50 border-indigo-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-indigo-900">How Materials are Calculated</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-indigo-800 space-y-2">
                <p><strong>Forming Materials Cost:</strong> Concrete Cost × Forming Material Cost Multiplier.</p>
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
              <CardContent className="flex flex-col gap-6">
                <SettingInput settingKey="wall_mortar_cost_per_sqft" />
                <SettingInput settingKey="wall_labor_rate" />
                <SettingInput settingKey="wall_labor_bricks_per_hour" />
                <SettingInput settingKey="wall_minimum_charge" />
              </CardContent>
            </Card>
            <Card className="bg-indigo-50 border-indigo-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-indigo-900">How Wall Costs are Calculated</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-indigo-800 space-y-2">
                <p><strong>Material Cost:</strong> (Total Wall Surface Area ÷ Single Brick Area) × Waste Factor × Price Per Brick.</p>
                <p><strong>Mortar Cost:</strong> Wall Surface Area × Mortar Cost Per Sq Ft.</p>
                <p><strong>Labor Cost:</strong> (Total Number of Bricks ÷ Bricks Per Hour) × Wall Masonry Labor Rate.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}