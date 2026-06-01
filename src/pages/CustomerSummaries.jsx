import React, { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, FileText, Trash2, ChevronDown, ChevronRight, ExternalLink, Search, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import useDebouncedValue from '@/hooks/useDebouncedValue';

// Cap initial load; "Load more" raises the limit when needed.
const PAGE_SIZE = 200;

// Map a module key to a friendly label and the page used to edit that estimate.
// Each module's "edit" page reads either ?edit= or ?id= depending on the route —
// we generate the matching URL.
const MODULE_META = {
  channel_letter_installation: {
    label: 'Channel & Dimensional Letters',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    editUrl: (id) => `${createPageUrl('NewChannelLetterInstallation')}?edit=${id}`,
  },
  foundation: {
    label: 'Concrete | Masonry | Poles',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    editUrl: (id) => `${createPageUrl('NewFoundationEstimate')}?id=${id}`,
  },
  brick_stone: {
    label: 'Brick / Stone',
    color: 'bg-stone-50 text-stone-700 border-stone-200',
    editUrl: (id) => `${createPageUrl('NewFoundationEstimate')}?id=${id}`,
  },
  paint: {
    label: 'Paint',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    editUrl: (id) => `${createPageUrl('NewPaintEstimate')}?edit=${id}`,
  },
  laser: {
    label: 'Laser',
    color: 'bg-red-50 text-red-700 border-red-200',
    editUrl: (id) => `${createPageUrl('NewLaserEstimate')}?edit=${id}`,
  },
  cnc: {
    label: 'CNC',
    color: 'bg-green-50 text-green-700 border-green-200',
    editUrl: (id) => `${createPageUrl('NewCNCEstimate')}?edit=${id}`,
  },
  metal_fabrication: {
    label: 'Metal Fabrication',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    editUrl: (id) => `${createPageUrl('NewMetalEstimate')}?edit=${id}`,
  },
};

export default function CustomerSummaries() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 200);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.CustomerSummary.list('-updated_date', PAGE_SIZE);
      setList(data || []);
      setHasMore((data || []).length >= PAGE_SIZE);
    } catch {
      setList([]);
    }
    setLoading(false);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = list.length + PAGE_SIZE;
      const data = await base44.entities.CustomerSummary.list('-updated_date', next);
      setList(data || []);
      setHasMore((data || []).length >= next);
    } catch {
      // no-op
    }
    setLoadingMore(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    if (!confirm('Delete this customer summary? This will not delete the underlying estimates.')) return;
    await base44.entities.CustomerSummary.delete(id);
    load();
  };

  const filtered = useMemo(() => {
    if (!debouncedQuery) return list;
    const q = debouncedQuery.toLowerCase();
    return list.filter((s) =>
      (s.client_name || '').toLowerCase().includes(q) ||
      (s.summary_name || '').toLowerCase().includes(q) ||
      (s.estimate_number || '').toLowerCase().includes(q)
    );
  }, [list, debouncedQuery]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Customer Summaries</h1>
            <p className="text-sm text-slate-500">One row per client — auto-generated from saved estimates across every module.</p>
          </div>
        </div>
        <Button onClick={() => navigate(createPageUrl('CustomerSummary'))} variant="outline">
          <Plus className="w-4 h-4 mr-1.5" /> New Manual Summary
        </Button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search by client name or estimate number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 h-10 bg-white"
        />
      </div>

      {loading ? (
        <div className="text-center text-slate-500 p-8">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-slate-500">
            <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium text-slate-700">
              {list.length === 0 ? 'No customer summaries yet.' : 'No clients match your search.'}
            </p>
            <p className="text-xs mt-1">
              {list.length === 0
                ? 'They are created automatically the first time you save an estimate for a client.'
                : 'Try a different search term.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => {
            const links = Array.isArray(s.linked_projects) ? s.linked_projects : [];
            const isOpen = !!expanded[s.id];
            return (
              <Card key={s.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <button
                    onClick={() => setExpanded((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
                    className="w-full p-4 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )}
                      <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {s.client_name || s.summary_name || '—'}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Tier {s.tier_number || 1} · {links.length} estimate{links.length === 1 ? '' : 's'}
                          {s.estimate_number ? ` · ${s.estimate_number}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Link
                        to={`${createPageUrl('CustomerSummary')}?id=${s.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100"
                      >
                        Open summary
                      </Link>
                      <Button variant="ghost" size="icon" onClick={(e) => handleDelete(s.id, e)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 space-y-1.5">
                      {links.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">
                          No estimates linked yet. Save an estimate for this client to populate it.
                        </p>
                      ) : (
                        links.map((l, i) => {
                          const meta = MODULE_META[l.module] || {
                            label: l.module || 'Estimate',
                            color: 'bg-slate-100 text-slate-700 border-slate-200',
                            editUrl: () => '#',
                          };
                          return (
                            <div
                              key={`${l.module}-${l.project_id}-${i}`}
                              className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span
                                  className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${meta.color} flex-shrink-0`}
                                >
                                  {meta.label}
                                </span>
                                <span className="text-sm text-slate-800 truncate">
                                  {l.project_name || 'Untitled estimate'}
                                </span>
                              </div>
                              {l.project_id && (
                                <Link
                                  to={meta.editUrl(l.project_id)}
                                  className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 flex-shrink-0"
                                >
                                  Edit <ExternalLink className="w-3 h-3" />
                                </Link>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {hasMore && !debouncedQuery && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}