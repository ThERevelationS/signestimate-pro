import React, { useState, useEffect } from 'react';
import { Settings, User } from '@/entities/all';
import SettingsAuthWrapper from '@/components/SettingsAuthWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Server } from 'lucide-react';

export default function BrickStoneSettings2() {
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [userData, settingsData] = await Promise.all([
        User.me(),
        Settings.list()
      ]);
      setCurrentUser(userData);

      const settingsObj = {};
      settingsData.forEach(s => {
        settingsObj[s.setting_name] = s.setting_value;
      });
      setSettings(settingsObj);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    setIsLoading(false);
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveAllSettings = async () => {
    setIsSaving(true);
    try {
      const allSettings = await Settings.list();
      const updates = [];

      const settingsToSave = [
        { name: 'brick_mortar_gap', value: settings.brick_mortar_gap || '0.375', type: 'number', description: 'Standard mortar gap in inches', category: 'brick_stone_calc' },
        { name: 'brick_waste_factor', value: settings.brick_waste_factor || '1.1', type: 'number', description: 'Waste factor for brick/stone (1.1 = 10%)', category: 'brick_stone_calc' },
        { name: 'brick_mortar_bags_per_100sqft', value: settings.brick_mortar_bags_per_100sqft || '3', type: 'number', description: 'Mortar bags (60lb) needed per 100 sq ft', category: 'brick_stone_calc' },
        { name: 'brick_mortar_cost_per_bag', value: settings.brick_mortar_cost_per_bag || '12', type: 'number', description: 'Cost per 60lb bag of mortar', category: 'brick_stone_pricing' },
      ];

      for (const setting of settingsToSave) {
        const existing = allSettings.find(s => s.setting_name === setting.name);
        if (existing) {
          updates.push(Settings.update(existing.id, {
            setting_value: setting.value,
            setting_type: setting.type,
            description: setting.description,
            category: setting.category
          }));
        } else {
          updates.push(Settings.create({
            setting_name: setting.name,
            setting_value: setting.value,
            setting_type: setting.type,
            description: setting.description,
            category: setting.category
          }));
        }
      }

      await Promise.all(updates);
      alert('Settings saved successfully!');
      await loadData();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return <div className="p-8">Loading settings...</div>;
  }

  const settingsContent = (
    <div className="space-y-6">
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Material & Calculation Settings</CardTitle>
          <CardDescription>Configure mortar gaps, waste factors, and material requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Mortar Gap (inches)</Label>
              <Input
                type="number"
                step="0.125"
                value={settings.brick_mortar_gap || '0.375'}
                onChange={(e) => updateSetting('brick_mortar_gap', e.target.value)}
                disabled={isLocked}
              />
              <p className="text-xs text-slate-500 mt-1">Standard gap between bricks (typically 3/8")</p>
            </div>
            <div>
              <Label>Waste Factor</Label>
              <Input
                type="number"
                step="0.05"
                value={settings.brick_waste_factor || '1.1'}
                onChange={(e) => updateSetting('brick_waste_factor', e.target.value)}
                disabled={isLocked}
              />
              <p className="text-xs text-slate-500 mt-1">Multiplier for waste (1.1 = 10% waste)</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Mortar Bags (60lb) per 100 sq ft</Label>
              <Input
                type="number"
                step="0.5"
                value={settings.brick_mortar_bags_per_100sqft || '3'}
                onChange={(e) => updateSetting('brick_mortar_bags_per_100sqft', e.target.value)}
                disabled={isLocked}
              />
              <p className="text-xs text-slate-500 mt-1">Number of 60lb mortar bags needed per 100 sq ft</p>
            </div>
            <div>
              <Label>Mortar Cost per Bag ($)</Label>
              <Input
                type="number"
                step="0.5"
                value={settings.brick_mortar_cost_per_bag || '12'}
                onChange={(e) => updateSetting('brick_mortar_cost_per_bag', e.target.value)}
                disabled={isLocked}
              />
              <p className="text-xs text-slate-500 mt-1">Cost per 60lb bag of mortar mix</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Server className="w-8 h-8" />
              Brick & Stone 2 Settings
            </h1>
            <p className="text-slate-600">Configure pricing, labor rates, and calculation parameters</p>
          </div>
          {!isLocked && (
            <Button onClick={saveAllSettings} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
              {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" />Save Settings</>}
            </Button>
          )}
        </div>

        <SettingsAuthWrapper correctPassword="Cinci2467" onUnlock={() => setIsLocked(false)} user={currentUser}>
          {settingsContent}
          <Card className="bg-indigo-50 border-indigo-100 mt-6">
            <CardHeader>
              <CardTitle className="text-sm text-indigo-900">How Brick & Stone Costs are Calculated</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-indigo-800 space-y-2">
              <p><strong>Material Cost:</strong> Calculated Number of Bricks × Waste Factor × Cost Per Brick.</p>
              <p><strong>Mortar Cost:</strong> (Surface Area ÷ 100) × Mortar Bags per 100sqft × Cost per Bag.</p>
              <p><strong>Calculated Bricks:</strong> Total Surface Area ÷ (Brick Area + Mortar Gap Area).</p>
            </CardContent>
          </Card>
        </SettingsAuthWrapper>
      </div>
    </div>
  );
}