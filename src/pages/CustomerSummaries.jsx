import React, { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ChevronDown, ChevronRight, ExternalLink, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Cap initial load; "Load more" raises the limit when needed.
const PAGE_SIZE = 200;

// Map a module key to a friendly label and the page used to edit that estimate.
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

// CoreBridge-style Customers search: labeled filter bar + dense results table
// with expandable rows showing each customer's estimate history.
export default function CustomerSummaries() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [pendingQuery, setPendingQuery] = useState('');
  const [query, setQuery] = useState('');
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
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter((s) =>
      (s.client_name || '').toLowerCase().includes(q) ||
      (s.summary_name || '').toLowerCase().includes(q) ||
      (s.estimate_number || '').toLowerCase().includes(q)
    );
  }, [list, query]);

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-[1200px] mx-auto bg-white border border-slate-300 rounded-sm shadow-sm">
        {/* Page header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-base font-bold text-lime-700 uppercase tracking-wide flex items-center gap-2">
            <Users className="w-4 h-4" /> Customers
          </h1>
          <Button size="sm" onClick={() => navigate(createPageUrl('CustomerSummary'))}
            className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-sm h-8">
            <Plus className="w-4 h-4 mr-1" /> Create New
          </Button>
        </div>

        {/* Filter panel */}
        <div className="px-4 py-3 bg-slate-100 border-b border-slate-300">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[220px] max-w-sm">
              <Label className="text-xs">Company / Client Name</Label>
              <Input className="h-8 rounded-sm bg-white" value={pendingQuery}
                onChange={(e) => setPendingQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setQuery(pendingQuery)} />
            </div>
            <Button onClick={() => setQuery(pendingQuery)} className="h-8 bg-zinc-700 hover:bg-zinc-600 text-white rounded-sm">
              Search
            </Button>
          </div>
        </div>

        {/* Results table */}
        {loading ? (
          <div className="text-center text-slate-500 p-8">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium text-slate-700">
              {list.length === 0 ? 'No customers yet.' : 'No customers match your search.'}
            </p>
            <p className="text-xs mt-1">
              {list.length === 0
                ? 'Customers are created automatically the first time you save an estimate for a client.'
                : 'Try a different search term.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-700 text-white text-xs">
                  <th className="w-8 px-2 py-2" />
                  <th className="text-left px-3 py-2 font-semibold">Company Name</th>
                  <th className="text-left px-3 py-2 font-semibold">Pricing Tier</th>
                  <th className="text-left px-3 py-2 font-semibold"># of Estimates</th>
                  <th className="text-left px-3 py-2 font-semibold">Estimate #</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => {
                  const links = Array.isArray(s.linked_projects) ? s.linked_projects : [];
                  const isOpen = !!expanded[s.id];
                  return (
                    <React.Fragment key={s.id}>
                      <tr className={`border-b border-slate-200 hover:bg-lime-50/60 cursor-pointer ${idx % 2 ? 'bg-slate-50/60' : 'bg-white'}`}
                        onClick={() => setExpanded((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}>
                        <td className="px-2 py-2 text-lime-700">
                          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </td>
                        <td className="px-3 py-2">
                          <Link to={`${createPageUrl('CustomerSummary')}?id=${s.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-lime-700 font-semibold hover:underline">
                            {s.client_name || s.summary_name || '—'}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-slate-700">Tier {s.tier_number || 1}</td>
                        <td className="px-3 py-2 text-slate-700">{links.length}</td>
                        <td className="px-3 py-2 text-slate-600">{s.estimate_number || '—'}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <Link to={`${createPageUrl('CustomerSummary')}?id=${s.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded-sm hover:bg-slate-100">
                            Open Summary
                          </Link>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handleDelete(s.id, e)}>
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <td />
                          <td colSpan={5} className="px-3 py-2">
                            {links.length === 0 ? (
                              <p className="text-xs text-slate-500 italic py-1">
                                No estimates linked yet. Save an estimate for this client to populate it.
                              </p>
                            ) : (
                              <div className="space-y-1 py-1">
                                {links.map((l, i) => {
                                  const meta = MODULE_META[l.module] || {
                                    label: l.module || 'Estimate',
                                    color: 'bg-slate-100 text-slate-700 border-slate-200',
                                    editUrl: () => '#',
                                  };
                                  return (
                                    <div key={`${l.module}-${l.project_id}-${i}`}
                                      className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-sm px-3 py-1.5">
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-sm border ${meta.color} flex-shrink-0`}>
                                          {meta.label}
                                        </span>
                                        <span className="text-sm text-slate-800 truncate">
                                          {l.project_name || 'Untitled estimate'}
                                        </span>
                                      </div>
                                      {l.project_id && (
                                        <Link to={meta.editUrl(l.project_id)}
                                          className="text-xs text-lime-700 font-medium hover:underline flex items-center gap-1 flex-shrink-0">
                                          Edit <ExternalLink className="w-3 h-3" />
                                        </Link>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            <div className="px-3 py-2 text-xs text-slate-500 border-t border-slate-200 flex items-center justify-between">
              <span>Showing {filtered.length} of {list.length} customers</span>
              {hasMore && !query && (
                <Button variant="outline" size="sm" className="h-7 rounded-sm" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : 'Load more'}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}