import React, { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Save, Trash2, Plus, Info, LayoutGrid, Table as TableIcon, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import TierExcelUploader from '@/components/markup/TierExcelUploader';
import TierBadge, { getTierTheme } from '@/components/markup/TierBadge';
import MarkupPctInput from '@/components/admin/MarkupPctInput';

// IMPORTANT: The stored `markups[category_key]` value is the price multiplier
// applied directly to cost (sale_price = cost × multiplier). For example, a stored
// value of 3.0 means "sell at 3× cost" and is shown in the spreadsheet as
// "Mark-up: 300.0%". A stored value of 1.0 means "sell at cost" → 100.0%.
// (Do not confuse with "+50% over cost" notation — that's not what this app uses.)
const formatPct = (mult) => {
  if (!mult && mult !== 0) return '';
  return (mult * 100).toFixed(1);
};
const parsePctToMult = (pctStr) => {
  const n = parseFloat(pctStr);
  if (!isFinite(n)) return 1;
  return n / 100;
};

// Color-code based on the displayed % (which is multiplier × 100).
// 200%+ (≥2× cost) = highest tier of markup, 100% = at cost, <100% = below cost.
const pctColor = (pct) => {
  if (pct >= 200) return 'text-rose-600 font-semibold';
  if (pct >= 150) return 'text-amber-600 font-semibold';
  if (pct >= 100) return 'text-blue-600 font-medium';
  if (pct > 0)    return 'text-emerald-600 font-medium';
  return 'text-slate-400';
};

export default function TierMarkupsTab() {
  const [tiers, setTiers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('cards');
  const [discountsOpen, setDiscountsOpen] = useState(false);
  const { toast } = useToast();

  const loadAll = async () => {
    setLoading(true);
    try {
      const [t, c, s] = await Promise.all([
        base44.entities.MarkupTier.list('sort_order'),
        base44.entities.MarkupCategory.list('sort_order'),
        base44.entities.Settings.filter({ category: 'pricing' }),
      ]);
      setTiers(t);
      setCategories(c);
      setSettings(s);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const updateTierMarkup = (tierId, catKey, pctStr) => {
    setTiers(prev => prev.map(t => t.id === tierId ? { ...t, markups: { ...(t.markups || {}), [catKey]: parsePctToMult(pctStr) } } : t));
  };
  const updateTierField = (tierId, field, value) => {
    setTiers(prev => prev.map(t => t.id === tierId ? { ...t, [field]: value } : t));
  };
  const updateSettingValue = (id, value) => {
    setSettings(prev => prev.map(s => s.id === id ? { ...s, setting_value: value } : s));
  };

  const handleSaveAll = async () => {
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
    await base44.entities.MarkupTier.create({ tier_number: nextNum, tier_name: `Tier ${nextNum}`, markups: blankMarkups, sort_order: nextNum });
    await loadAll();
  };

  const handleDeleteTier = async (id) => {
    if (!confirm('Delete this tier?')) return;
    await base44.entities.MarkupTier.delete(id);
    await loadAll();
  };

  const handleExcelImport = async (importedTiers) => {
    await Promise.all(tiers.map(t => base44.entities.MarkupTier.delete(t.id)));
    await base44.entities.MarkupTier.bulkCreate(importedTiers);
    await loadAll();
  };

  const sortedCats = useMemo(() => [...categories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)), [categories]);
  const sortedTiers = useMemo(() => [...tiers].sort((a, b) => (a.sort_order || a.tier_number || 0) - (b.sort_order || b.tier_number || 0)), [tiers]);

  const stats = useMemo(() => {
    if (tiers.length === 0 || categories.length === 0) return null;
    let highest = 0, lowest = Infinity;
    sortedTiers.forEach(t => {
      Object.values(t.markups || {}).forEach(m => {
        const pct = m * 100; // multiplier × 100 (e.g. 3.0 → 300%)
        if (pct > highest) highest = pct;
        if (pct < lowest) lowest = pct;
      });
    });
    return { highest, lowest: lowest === Infinity ? 0 : lowest, tierCount: tiers.length, catCount: categories.length };
  }, [tiers, categories, sortedTiers]);

  if (loading) {
    return <div className="p-12 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-600">
          Tier 1 = highest markup (general public) → higher tiers = preferred pricing. Values are the <strong>"Mark-up to put in Corebridge"</strong> column from the pricing spreadsheet — i.e. <em>sale price ÷ cost</em> × 100 (e.g. <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">300</code> = sell at 3× cost).
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TierExcelUploader categories={sortedCats} onImport={handleExcelImport} />
          <Button variant="outline" size="sm" onClick={handleAddTier}><Plus className="w-4 h-4 mr-1.5" /> Add Tier</Button>
          <Button size="sm" onClick={handleSaveAll} disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white">
            <Save className="w-4 h-4 mr-1.5" /> {saving ? 'Saving…' : 'Save All'}
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatChip icon={<TierBadge tierNumber={1} size="sm" />} label="Tiers" value={stats.tierCount} />
          <StatChip icon={<LayoutGrid className="w-4 h-4 text-slate-500" />} label="Categories" value={stats.catCount} />
          <StatChip icon={<TrendingUp className="w-4 h-4 text-rose-500" />} label="Highest Markup" value={`${stats.highest.toFixed(0)}%`} valueClass="text-rose-600" />
          <StatChip icon={<TrendingUp className="w-4 h-4 text-emerald-500 rotate-180" />} label="Lowest Markup" value={`${stats.lowest.toFixed(0)}%`} valueClass="text-emerald-600" />
        </div>
      )}

      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button onClick={() => setViewMode('table')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
          <TableIcon className="w-3.5 h-3.5" /> Table view
        </button>
        <button onClick={() => setViewMode('cards')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
          <LayoutGrid className="w-3.5 h-3.5" /> Card view
        </button>
      </div>

      {viewMode === 'table'
        ? <TableView tiers={sortedTiers} sortedCats={sortedCats} onUpdateField={updateTierField} onUpdateMarkup={updateTierMarkup} onDelete={handleDeleteTier} />
        : <CardView tiers={sortedTiers} sortedCats={sortedCats} onUpdateField={updateTierField} onUpdateMarkup={updateTierMarkup} onDelete={handleDeleteTier} />
      }

      <Card className="border-slate-200 shadow-sm">
        <button onClick={() => setDiscountsOpen(o => !o)} className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"><Info className="w-4 h-4 text-white" /></div>
            <div className="text-left">
              <h3 className="font-semibold text-slate-900">Volume Discounts & Settings</h3>
              <p className="text-xs text-slate-500">Discounts applied on top of tier markups for eligible categories</p>
            </div>
          </div>
          {discountsOpen ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
        </button>
        {discountsOpen && (
          <CardContent className="border-t border-slate-100 pt-5 grid sm:grid-cols-2 gap-4">
            {settings.map(s => (
              <div key={s.id}>
                <Label className="text-xs font-medium text-slate-700">{s.description || s.setting_name}</Label>
                <Input value={s.setting_value} onChange={(e) => updateSettingValue(s.id, e.target.value)} className="h-9 mt-1" />
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function StatChip({ icon, label, value, valueClass = 'text-slate-900' }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">{label}</div>
        <div className={`text-lg font-bold tabular-nums ${valueClass}`}>{value}</div>
      </div>
    </div>
  );
}

function TableView({ tiers, sortedCats, onUpdateField, onUpdateMarkup, onDelete }) {
  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
              <th className="sticky left-0 z-10 bg-gradient-to-r from-slate-50 to-slate-100/50 text-left px-4 py-3 w-20 border-r border-slate-200">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Tier</div>
              </th>
              <th className="sticky left-20 z-10 bg-gradient-to-r from-slate-50 to-slate-100/50 text-left px-4 py-3 min-w-[200px] border-r border-slate-200">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Name</div>
              </th>
              {sortedCats.map(c => (
                <th key={c.category_key} className="text-left px-3 py-3 min-w-[130px] border-r border-slate-100 last:border-r-0">
                  <div className="font-semibold text-slate-800 text-xs leading-tight">{c.category_name}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{c.category_key}</div>
                </th>
              ))}
              <th className="px-3 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t, i) => {
              const theme = getTierTheme(t.tier_number);
              return (
                <tr key={t.id} className={`group border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/80 px-4 py-3 border-r border-slate-100">
                    <div className="flex items-center gap-2">
                      <TierBadge tierNumber={t.tier_number} size="md" />
                      <Input type="number" value={t.tier_number || ''} onChange={(e) => onUpdateField(t.id, 'tier_number', e.target.value)} className="h-7 w-12 text-xs text-center px-1" />
                    </div>
                  </td>
                  <td className="sticky left-20 z-10 bg-white group-hover:bg-slate-50/80 px-4 py-3 border-r border-slate-100">
                    <Input value={t.tier_name || ''} onChange={(e) => onUpdateField(t.id, 'tier_name', e.target.value)} className={`h-9 font-medium border-l-4 ${theme.accent}`} placeholder="Tier name" />
                  </td>
                  {sortedCats.map(c => {
                    const mult = t.markups?.[c.category_key];
                    const pct = mult ? mult * 100 : 0;
                    return (
                      <td key={c.category_key} className="px-2 py-2 border-r border-slate-100 last:border-r-0">
                        <div className="relative">
                          <MarkupPctInput
                            value={mult}
                            onCommit={(pctStr) => onUpdateMarkup(t.id, c.category_key, pctStr)}
                            className={`h-9 text-sm pr-7 text-right tabular-nums ${pctColor(pct)}`}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50" onClick={() => onDelete(t.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function CardView({ tiers, sortedCats, onUpdateField, onUpdateMarkup, onDelete }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {tiers.map(t => {
        const theme = getTierTheme(t.tier_number);
        return (
          <Card key={t.id} className="border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className={`${theme.bg} ${theme.text} px-4 py-3 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <TierBadge tierNumber={t.tier_number} size="lg" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider opacity-75 font-medium">Tier {t.tier_number}</div>
                  <Input value={t.tier_name || ''} onChange={(e) => onUpdateField(t.id, 'tier_name', e.target.value)} className="h-7 bg-white/10 border-white/20 text-white placeholder:text-white/60 text-sm font-semibold focus-visible:bg-white/20" placeholder="Tier name" />
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => onDelete(t.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <CardContent className="p-3 space-y-1.5">
              {sortedCats.map(c => {
                const mult = t.markups?.[c.category_key];
                const pct = mult ? mult * 100 : 0;
                return (
                  <div key={c.category_key} className="flex items-center gap-2 group hover:bg-slate-50 rounded-md px-2 py-1 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-700 truncate">{c.category_name}</div>
                    </div>
                    <div className="relative flex-shrink-0">
                      <MarkupPctInput
                        value={mult}
                        onCommit={(pctStr) => onUpdateMarkup(t.id, c.category_key, pctStr)}
                        className={`h-8 w-24 text-sm pr-7 text-right tabular-nums ${pctColor(pct)}`}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}