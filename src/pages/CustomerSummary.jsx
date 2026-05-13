import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Save, Plus, Trash2, FileDown } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MODULE_CATEGORIZERS } from '@/components/markup/projectCategorizer';
import {
  applyMarkups,
  parseVolumeDiscountBrackets,
  parseVolumeDiscountCategories,
} from '@/components/markup/markupEngine';

const MODULE_LABELS = {
  channel_letter_installation: 'Channel & Dimensional Letters',
  foundation: 'Foundation / Concrete / Masonry',
  brick_stone: 'Brick & Stone',
  paint: 'Paint Estimator',
  laser: 'Laser',
  cnc: 'CNC',
  metal_fabrication: 'Metal Fabrication',
};

const MODULE_ENTITY_MAP = {
  channel_letter_installation: 'ChannelLetterInstallation',
  foundation: 'FoundationProject',
  brick_stone: 'BrickStoneProject',
  paint: 'Project',
  laser: 'LaserProject',
  cnc: 'CNCProject',
  metal_fabrication: 'MetalProject',
};

const fmt = (n) => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CustomerSummary() {
  const [searchParams] = useSearchParams();
  const summaryId = searchParams.get('id');
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tiers, setTiers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState([]);
  const [summary, setSummary] = useState({
    summary_name: '',
    client_name: '',
    estimate_number: '',
    tier_number: 1,
    linked_projects: [],
    notes: '',
  });
  const [loadedProjects, setLoadedProjects] = useState({}); // { project_id: project }
  const [availableProjects, setAvailableProjects] = useState({}); // { module: [project, ...] }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Initial load
  useEffect(() => {
    (async () => {
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

        // Load available projects from every module
        const modProjects = {};
        await Promise.all(Object.entries(MODULE_ENTITY_MAP).map(async ([mod, entName]) => {
          try {
            const list = await base44.entities[entName].list('-updated_date', 100);
            modProjects[mod] = list;
          } catch {
            modProjects[mod] = [];
          }
        }));
        setAvailableProjects(modProjects);

        if (summaryId) {
          const existing = await base44.entities.CustomerSummary.filter({ id: summaryId });
          if (existing[0]) setSummary(existing[0]);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, [summaryId]);

  // Hydrate linked project details
  useEffect(() => {
    const hydrate = async () => {
      const newLoaded = { ...loadedProjects };
      for (const link of summary.linked_projects || []) {
        if (!newLoaded[link.project_id]) {
          const all = availableProjects[link.module] || [];
          const found = all.find(p => p.id === link.project_id);
          if (found) newLoaded[link.project_id] = found;
        }
      }
      setLoadedProjects(newLoaded);
    };
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary.linked_projects, availableProjects]);

  const selectedTier = useMemo(() => tiers.find(t => t.tier_number === Number(summary.tier_number)) || tiers[0], [tiers, summary.tier_number]);

  // Build the cost lines from all linked projects
  const allLines = useMemo(() => {
    const lines = [];
    for (const link of summary.linked_projects || []) {
      const proj = loadedProjects[link.project_id];
      if (!proj) continue;
      const fn = MODULE_CATEGORIZERS[link.module];
      if (!fn) continue;
      const projLines = fn(proj).map(l => ({ ...l, source_project_name: proj.project_name || link.project_name }));
      lines.push(...projLines);
    }
    return lines;
  }, [summary.linked_projects, loadedProjects]);

  const markupResult = useMemo(() => {
    const brackets = parseVolumeDiscountBrackets(settings);
    const eligibleCategoryKeys = parseVolumeDiscountCategories(settings);
    return applyMarkups(allLines, selectedTier, { brackets, eligibleCategoryKeys });
  }, [allLines, selectedTier, settings]);

  const categoryNameByKey = useMemo(() => Object.fromEntries(categories.map(c => [c.category_key, c.category_name])), [categories]);

  const addLinkedProject = (module, projectId) => {
    const proj = (availableProjects[module] || []).find(p => p.id === projectId);
    if (!proj) return;
    if ((summary.linked_projects || []).some(l => l.project_id === projectId)) return;
    setSummary(s => ({
      ...s,
      linked_projects: [...(s.linked_projects || []), { module, project_id: projectId, project_name: proj.project_name }],
    }));
  };

  const removeLinkedProject = (projectId) => {
    setSummary(s => ({
      ...s,
      linked_projects: (s.linked_projects || []).filter(l => l.project_id !== projectId),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        summary_name: summary.summary_name || 'Untitled Summary',
        client_name: summary.client_name || '',
        estimate_number: summary.estimate_number || '',
        tier_number: Number(summary.tier_number) || 1,
        linked_projects: summary.linked_projects || [],
        notes: summary.notes || '',
      };
      if (summary.id) {
        await base44.entities.CustomerSummary.update(summary.id, payload);
      } else {
        const created = await base44.entities.CustomerSummary.create(payload);
        navigate(`/CustomerSummary?id=${created.id}`, { replace: true });
        setSummary(created);
      }
      toast({ title: 'Saved', description: 'Customer summary saved.' });
    } catch (e) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const exportCSV = () => {
    const rows = [['Module', 'Source Project', 'Description', 'Category', 'Raw Cost', 'Markup', 'Volume Disc %', 'Final Cost']];
    markupResult.lines.forEach(l => {
      rows.push([
        MODULE_LABELS[l.module] || l.module,
        l.source_project_name || '',
        l.label,
        categoryNameByKey[l.category_key] || l.category_key,
        l.cost.toFixed(2),
        l.markup_multiplier.toFixed(3) + 'x',
        l.volume_discount_applied + '%',
        l.final_cost.toFixed(2),
      ]);
    });
    rows.push([]);
    rows.push(['', '', '', 'Raw Subtotal', '', '', '', markupResult.totals.raw_subtotal.toFixed(2)]);
    rows.push(['', '', '', 'After Markup', '', '', '', markupResult.totals.marked_subtotal.toFixed(2)]);
    rows.push(['', '', '', 'Volume Discount %', '', '', '', markupResult.totals.volume_discount_pct + '%']);
    rows.push(['', '', '', 'GRAND TOTAL', '', '', '', markupResult.totals.grand_total.toFixed(2)]);

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${summary.summary_name || 'summary'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading…</div>;

  // Group lines by category for the summary view
  const byCategory = {};
  markupResult.lines.forEach(l => {
    const key = l.category_key;
    if (!byCategory[key]) byCategory[key] = { name: categoryNameByKey[key] || key, lines: [], rawTotal: 0, finalTotal: 0 };
    byCategory[key].lines.push(l);
    byCategory[key].rawTotal += l.cost;
    byCategory[key].finalTotal += l.final_cost;
  });

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Summary</h1>
          <p className="text-sm text-slate-500">Aggregate projects across modules, apply tier markup and volume discount.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><FileDown className="w-4 h-4 mr-1.5" /> Export CSV</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-1.5" /> {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Summary Info</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Summary Name</Label>
            <Input value={summary.summary_name || ''} onChange={(e) => setSummary(s => ({ ...s, summary_name: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Client</Label>
            <Input value={summary.client_name || ''} onChange={(e) => setSummary(s => ({ ...s, client_name: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Estimate #</Label>
            <Input value={summary.estimate_number || ''} onChange={(e) => setSummary(s => ({ ...s, estimate_number: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Pricing Tier</Label>
            <Select value={String(summary.tier_number || 1)} onValueChange={(v) => setSummary(s => ({ ...s, tier_number: Number(v) }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {tiers.map(t => (
                  <SelectItem key={t.id} value={String(t.tier_number)}>
                    Tier {t.tier_number} — {t.tier_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Linked Projects</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <ProjectAdder availableProjects={availableProjects} onAdd={addLinkedProject} linkedIds={(summary.linked_projects || []).map(l => l.project_id)} />
          </div>
          {(summary.linked_projects || []).length === 0 ? (
            <p className="text-sm text-slate-500 italic">No projects linked yet. Add one above.</p>
          ) : (
            <div className="space-y-1">
              {summary.linked_projects.map(link => (
                <div key={link.project_id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Badge variant="outline">{MODULE_LABELS[link.module] || link.module}</Badge>
                    <span className="font-medium">{link.project_name}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLinkedProject(link.project_id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Cost Breakdown by Category</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {Object.keys(byCategory).length === 0 ? (
            <p className="text-sm text-slate-500 italic">No cost lines yet — link a project above.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="p-2 border border-slate-200">Category</th>
                  <th className="p-2 border border-slate-200">Source</th>
                  <th className="p-2 border border-slate-200">Description</th>
                  <th className="p-2 border border-slate-200 text-right">Raw Cost</th>
                  <th className="p-2 border border-slate-200 text-right">Markup</th>
                  <th className="p-2 border border-slate-200 text-right">Vol Disc</th>
                  <th className="p-2 border border-slate-200 text-right">Final</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byCategory).map(([catKey, group]) => (
                  <React.Fragment key={catKey}>
                    <tr className="bg-slate-100/60">
                      <td colSpan={7} className="p-2 border border-slate-200 font-semibold text-slate-700">
                        {group.name} — Raw {fmt(group.rawTotal)} → Final {fmt(group.finalTotal)}
                      </td>
                    </tr>
                    {group.lines.map((l, i) => (
                      <tr key={`${catKey}-${i}`} className="hover:bg-slate-50">
                        <td className="p-2 border border-slate-200"></td>
                        <td className="p-2 border border-slate-200 text-slate-500 text-xs">{l.source_project_name}</td>
                        <td className="p-2 border border-slate-200">{l.label}</td>
                        <td className="p-2 border border-slate-200 text-right text-slate-600">{fmt(l.cost)}</td>
                        <td className="p-2 border border-slate-200 text-right">{((l.markup_multiplier - 1) * 100).toFixed(1)}%</td>
                        <td className="p-2 border border-slate-200 text-right">{l.volume_discount_applied}%</td>
                        <td className="p-2 border border-slate-200 text-right font-medium">{fmt(l.final_cost)}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card className="border-2 border-slate-900">
        <CardContent className="p-6 space-y-2">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Raw cost subtotal</span>
            <span>{fmt(markupResult.totals.raw_subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>After tier {summary.tier_number} markup</span>
            <span>{fmt(markupResult.totals.marked_subtotal)}</span>
          </div>
          {markupResult.totals.volume_discount_pct > 0 && (
            <div className="flex justify-between text-sm text-amber-700">
              <span>Volume discount ({markupResult.totals.volume_discount_pct}% on eligible categories)</span>
              <span>−{fmt(markupResult.totals.marked_subtotal - markupResult.totals.grand_total)}</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between text-lg font-bold text-slate-900">
            <span>Grand Total</span>
            <span>{fmt(markupResult.totals.grand_total)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProjectAdder({ availableProjects, onAdd, linkedIds }) {
  const [module, setModule] = useState('channel_letter_installation');
  const [projectId, setProjectId] = useState('');

  const list = (availableProjects[module] || []).filter(p => !linkedIds.includes(p.id));

  return (
    <>
      <div className="min-w-[220px]">
        <Label className="text-xs">Module</Label>
        <Select value={module} onValueChange={(v) => { setModule(v); setProjectId(''); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(MODULE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-[280px] flex-1">
        <Label className="text-xs">Project</Label>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger><SelectValue placeholder="Choose a project…" /></SelectTrigger>
          <SelectContent>
            {list.length === 0 ? (
              <div className="px-2 py-2 text-xs text-slate-500">No available projects</div>
            ) : list.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.project_name || p.summary_name || '(untitled)'} {p.client_name ? `— ${p.client_name}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button size="sm" onClick={() => { if (projectId) { onAdd(module, projectId); setProjectId(''); } }} disabled={!projectId}>
        <Plus className="w-4 h-4 mr-1" /> Add
      </Button>
    </>
  );
}