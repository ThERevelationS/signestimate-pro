import React, { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Save, Trash2, Plus, Info } from 'lucide-react';
import TierExcelUploader from '@/components/markup/TierExcelUploader';

const formatPct = (mult) => {
  if (!mult) return '';
  return ((mult - 1) * 100).toFixed(1);
};
const parsePctToMult = (pctStr) => {
  const n = parseFloat(pctStr);
  if (!isFinite(n)) return 1;
  return 1 + n / 100;
};

export default function TierMarkups() {
  const [user, setUser] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadAll = async () => {
    setLoading(true);
    try {
      const [u, t, c, s] = await Promise.all([
        base44.auth.me(),
        base44.entities.MarkupTier.list('sort_order'),
        base44.entities.MarkupCategory.list('sort_order'),
        base44.entities.Settings.filter({ category: 'pricing' }),
      ]);
      setUser(u);
      setTiers(t);
      setCategories(c);
      setSettings(s);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const isAdmin = user?.role === 'admin';

  const updateTierMarkup = (tierId, catKey, pctStr) => {
    setTiers(prev => prev.map(t => t.id === tierId
      ? { ...t, markups: { ...(t.markups || {}), [catKey]: parsePctToMult(pctStr) } }
      : t));
  };

  const updateTierField = (tierId, field, value) => {
    setTiers(prev => prev.map(t => t.id === tierId ? { ...t, [field]: value } : t));
  };

  const updateSettingValue = (id, value) => {
    setSettings(prev => prev.map(s => s.id === id ? { ...s, setting_value: value } : s));
  };

  const handleSaveAll = async () => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      await Promise.all([
        ...tiers.map(t => base44.entities.MarkupTier.update(t.id, {
          tier_number: Number(t.tier_number),
          tier_name: t.tier_name,
          description: t.description || '',
          markups: t.markups || {},
          sort_order: Number(t.sort_order) || Number(t.tier_number),
        })),
        ...settings.map(s => base44.entities.Settings.update(s.id, { setting_value: String(s.setting_value) })),
      ]);
      toast({ title: 'Saved', description: 'Tier markups updated.' });
      await loadAll();
    } catch (e) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleAddTier = async () => {
    const nextNum = (tiers.reduce((m, t) => Math.max(m, t.tier_number || 0), 0) || 0) + 1;
    const blankMarkups = {};
    categories.forEach(c => { blankMarkups[c.category_key] = 1.0; });
    await base44.entities.MarkupTier.create({
      tier_number: nextNum,
      tier_name: `Tier ${nextNum}`,
      markups: blankMarkups,
      sort_order: nextNum,
    });
    await loadAll();
  };

  const handleDeleteTier = async (id) => {
    if (!confirm('Delete this tier?')) return;
    await base44.entities.MarkupTier.delete(id);
    await loadAll();
  };

  const handleExcelImport = async (importedTiers) => {
    // Delete existing tiers then bulk create
    await Promise.all(tiers.map(t => base44.entities.MarkupTier.delete(t.id)));
    await base44.entities.MarkupTier.bulkCreate(importedTiers);
    await loadAll();
  };

  const sortedCats = useMemo(() => [...categories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)), [categories]);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading…</div>;

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center text-slate-600">
            Admin access required to view tier markups.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tier Markups</h1>
          <p className="text-sm text-slate-500">Pricing tiers applied to customer summaries. Values shown as markup % (e.g. 50 = 1.5× cost).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TierExcelUploader categories={sortedCats} onImport={handleExcelImport} />
          <Button variant="outline" size="sm" onClick={handleAddTier}><Plus className="w-4 h-4 mr-1.5" /> Add Tier</Button>
          <Button size="sm" onClick={handleSaveAll} disabled={saving}>
            <Save className="w-4 h-4 mr-1.5" /> {saving ? 'Saving…' : 'Save All'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tier Markup Table</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left p-2 border border-slate-200 w-16">Tier #</th>
                <th className="text-left p-2 border border-slate-200 min-w-[160px]">Name</th>
                {sortedCats.map(c => (
                  <th key={c.category_key} className="text-left p-2 border border-slate-200 min-w-[120px]">
                    <div className="font-medium text-slate-700">{c.category_name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{c.category_key}</div>
                  </th>
                ))}
                <th className="p-2 border border-slate-200 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {tiers.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="p-1 border border-slate-200">
                    <Input
                      type="number"
                      value={t.tier_number || ''}
                      onChange={(e) => updateTierField(t.id, 'tier_number', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </td>
                  <td className="p-1 border border-slate-200">
                    <Input
                      value={t.tier_name || ''}
                      onChange={(e) => updateTierField(t.id, 'tier_name', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </td>
                  {sortedCats.map(c => (
                    <td key={c.category_key} className="p-1 border border-slate-200">
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.1"
                          value={formatPct(t.markups?.[c.category_key])}
                          onChange={(e) => updateTierMarkup(t.id, c.category_key, e.target.value)}
                          className="h-8 text-sm pr-6"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                      </div>
                    </td>
                  ))}
                  <td className="p-1 border border-slate-200 text-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteTier(t.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Info className="w-4 h-4" /> Volume Discount Brackets</CardTitle>
          <p className="text-xs text-slate-500">Discounts applied on top of tier markups, only to eligible categories.</p>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          {settings.map(s => (
            <div key={s.id}>
              <Label className="text-xs text-slate-600">{s.description || s.setting_name}</Label>
              <Input
                value={s.setting_value}
                onChange={(e) => updateSettingValue(s.id, e.target.value)}
                className="h-9"
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}