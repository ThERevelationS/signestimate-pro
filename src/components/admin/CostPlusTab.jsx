import React, { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Save, Calculator, TrendingUp, Briefcase, DollarSign } from 'lucide-react';

/**
 * Cost-Plus configuration editor.
 *
 * The Cost-Plus formula (applied per project line):
 *   marked_cost  = direct_cost * (1 + category_markup%)         [per category]
 *   burdened     = sum(material_lines) + sum(labor_lines) * labor_multiplier
 *   with_oh      = burdened * (1 + overhead%)
 *   final        = with_oh * (1 + profit%)
 *
 * NOTE: This screen only edits the config. The actual application lives in
 * components/markup/markupEngine.js (applyCostPlus).
 */
export default function CostPlusTab() {
  const [config, setConfig] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadAll = async () => {
    setLoading(true);
    try {
      const [configs, cats] = await Promise.all([
        base44.entities.CostPlusConfig.filter({ config_name: 'default' }),
        base44.entities.MarkupCategory.list('sort_order'),
      ]);
      let cfg = configs[0];
      if (!cfg) {
        cfg = await base44.entities.CostPlusConfig.create({
          config_name: 'default',
          labor_multiplier: 1.0,
          overhead_percent: 15,
          profit_percent: 20,
          category_markups: {},
        });
      }
      setConfig(cfg);
      setCategories(cats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const updateField = (field, value) => setConfig(prev => ({ ...prev, [field]: value }));
  const updateCategoryMarkup = (key, pctStr) => {
    const n = parseFloat(pctStr);
    setConfig(prev => ({
      ...prev,
      category_markups: { ...(prev.category_markups || {}), [key]: isFinite(n) ? n : 0 },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.CostPlusConfig.update(config.id, {
        labor_multiplier: Number(config.labor_multiplier) || 1,
        overhead_percent: Number(config.overhead_percent) || 0,
        profit_percent: Number(config.profit_percent) || 0,
        category_markups: config.category_markups || {},
        notes: config.notes || '',
      });
      toast({ title: 'Saved', description: 'Cost-Plus configuration updated.' });
      await loadAll();
    } catch (e) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  // Live preview of a $1000 material + $500 labor reference quote
  const preview = useMemo(() => {
    if (!config) return null;
    const matCost = 1000;
    const laborCost = 500;
    const burdened = matCost + laborCost * (Number(config.labor_multiplier) || 1);
    const withOh = burdened * (1 + (Number(config.overhead_percent) || 0) / 100);
    const final = withOh * (1 + (Number(config.profit_percent) || 0) / 100);
    return { burdened, withOh, final };
  }, [config]);

  if (loading || !config) {
    return <div className="p-12 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  const sortedCats = [...categories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-600 max-w-2xl">
          Cost-Plus pricing layers <strong>labor burden</strong> → <strong>overhead</strong> → <strong>profit</strong> on top of direct cost. Optional per-category markups apply first.
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white">
          <Save className="w-4 h-4 mr-1.5" /> {saving ? 'Saving…' : 'Save Cost-Plus'}
        </Button>
      </div>

      {/* Core multipliers */}
      <div className="grid md:grid-cols-3 gap-4">
        <CoreField
          icon={<Briefcase className="w-4 h-4 text-blue-600" />}
          label="Labor Burden Multiplier"
          hint="Applied to direct labor cost. 1.30 = +30% for taxes, benefits, insurance."
          suffix="×"
          step="0.01"
          value={config.labor_multiplier ?? 1}
          onChange={(v) => updateField('labor_multiplier', v)}
        />
        <CoreField
          icon={<Calculator className="w-4 h-4 text-amber-600" />}
          label="Overhead %"
          hint="Added to (materials + burdened labor)."
          suffix="%"
          value={config.overhead_percent ?? 0}
          onChange={(v) => updateField('overhead_percent', v)}
        />
        <CoreField
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
          label="Profit %"
          hint="Added after overhead. Final markup on the running subtotal."
          suffix="%"
          value={config.profit_percent ?? 0}
          onChange={(v) => updateField('profit_percent', v)}
        />
      </div>

      {/* Live preview */}
      {preview && (
        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-slate-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900">Live Preview — $1,000 materials + $500 labor</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <PreviewStat label="Direct Cost" value="$1,500.00" />
              <PreviewStat label="+ Labor Burden" value={`$${preview.burdened.toFixed(2)}`} />
              <PreviewStat label="+ Overhead" value={`$${preview.withOh.toFixed(2)}`} />
              <PreviewStat label="Final Price" value={`$${preview.final.toFixed(2)}`} highlight />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-category markups */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Optional Per-Category Markups</h3>
          <p className="text-xs text-slate-500 mb-4">Applied to each category's direct cost <em>before</em> labor burden / overhead / profit. Leave blank or 0 for no extra markup.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedCats.map(c => {
              const val = config.category_markups?.[c.category_key];
              return (
                <div key={c.category_key} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <Label className="text-xs font-semibold text-slate-800">{c.category_name}</Label>
                  <div className="text-[10px] text-slate-400 font-mono mb-2">{c.category_key}</div>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      value={val ?? ''}
                      onChange={(e) => updateCategoryMarkup(c.category_key, e.target.value)}
                      className="h-9 pr-7 text-right tabular-nums"
                      placeholder="0"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
                  </div>
                </div>
              );
            })}
            {sortedCats.length === 0 && (
              <div className="col-span-full text-sm text-slate-500 italic">No markup categories defined yet. Add them under Tier Markups first.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CoreField({ icon, label, hint, suffix, step = '0.1', value, onChange }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <Label className="text-sm font-semibold text-slate-800">{label}</Label>
      </div>
      <div className="text-[11px] text-slate-500 mb-2 leading-snug">{hint}</div>
      <div className="relative">
        <Input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 pr-8 text-right tabular-nums font-semibold"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">{suffix}</span>
      </div>
    </div>
  );
}

function PreviewStat({ label, value, highlight }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${highlight ? 'bg-emerald-100 border border-emerald-300' : 'bg-white border border-slate-200'}`}>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">{label}</div>
      <div className={`text-base font-bold tabular-nums ${highlight ? 'text-emerald-700' : 'text-slate-900'}`}>{value}</div>
    </div>
  );
}