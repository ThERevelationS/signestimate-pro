// List of saved Vinyl Estimator projects — CoreBridge dense queue.

import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { VinylProject } from "@/entities/all";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Settings as SettingsIcon } from "lucide-react";
import { format } from "date-fns";
import { fmtCurrency } from "@/lib/formatters";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import ProjectQueue from "@/components/corebridge/ProjectQueue";
import EstimateDetailPanel from "@/components/corebridge/EstimateDetailPanel";

// Mirror the FoundationProjects cap so initial paint isn't blocked
// downloading the full historical list.
const PAGE_SIZE = 200;

export default function VinylProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 200);
  const [selectedId, setSelectedId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await VinylProject.list("-created_date", PAGE_SIZE);
      setProjects(data || []);
      setHasMore((data || []).length >= PAGE_SIZE);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = projects.length + PAGE_SIZE;
      const data = await VinylProject.list("-created_date", next);
      setProjects(data || []);
      setHasMore((data || []).length >= next);
    } catch (e) {
      console.error(e);
    }
    setLoadingMore(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter(p =>
      p.project_name?.toLowerCase().includes(term) ||
      p.client_name?.toLowerCase().includes(term)
    );
  }, [projects, debouncedSearch]);

  useEffect(() => {
    if (filtered.length === 0) { setSelectedId(null); return; }
    if (!selectedId || !filtered.some(p => p.id === selectedId)) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selected = useMemo(() => filtered.find(p => p.id === selectedId) || null, [filtered, selectedId]);

  const remove = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await VinylProject.delete(id);
    load();
  };

  if (loading) return <div className="p-8 text-slate-600">Loading estimates...</div>;

  const columns = [
    { key: "name", label: "Estimate Description", render: (p) => <span className="font-medium text-slate-800">{p.project_name}</span> },
    { key: "client", label: "Customer", render: (p) => <span className="text-slate-700">{p.client_name}</span> },
    { key: "status", label: "Status", render: (p) => <Badge variant="outline" className="capitalize text-[10px]">{p.status || "draft"}</Badge> },
    { key: "parts", label: "Parts", render: (p) => <span className="text-slate-600">{p.items?.length || 0}</span> },
    { key: "created", label: "Created Date", render: (p) => <span className="text-slate-600 whitespace-nowrap">{p.created_date && format(new Date(p.created_date), "MM/dd/yyyy")}</span> },
    { key: "total", label: "Total", align: "right", render: (p) => <span className="font-semibold text-slate-900">{fmtCurrency(p.total_cost)}</span> },
    {
      key: "actions", label: "", align: "right",
      render: (p) => (
        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={(e) => { e.stopPropagation(); remove(p.id, p.project_name); }}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <ProjectQueue
      title="Vinyl Estimates"
      subtitle="Printed graphics, cut vinyl & laminated decals"
      newEstimatePage="NewVinylEstimate"
      headerActions={
        <Link to={createPageUrl("VinylSettings")}>
          <Button variant="outline" size="sm" className="h-8 rounded-sm">
            <SettingsIcon className="w-4 h-4 mr-1" /> Machines
          </Button>
        </Link>
      }
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      rows={filtered}
      totalCount={projects.length}
      columns={columns}
      selectedId={selectedId}
      onSelect={setSelectedId}
      hasMore={hasMore && !debouncedSearch}
      loadingMore={loadingMore}
      onLoadMore={loadMore}
      emptyMessage="No vinyl estimates yet."
      detailPanel={selected ? (
        <EstimateDetailPanel
          project={selected}
          editPage="NewVinylEstimate"
          editParam="id"
          itemsLabel="Parts"
          statusBadge={<Badge variant="outline" className="capitalize text-[10px]">{selected.status || "draft"}</Badge>}
          renderItem={(item, i) => ({
            title: item.part_name || item.description || `Part ${i + 1}`,
            lines: [
              item.width_inches && item.height_inches ? `${item.width_inches}" × ${item.height_inches}"` : null,
              item.quantity ? `Qty ${item.quantity}` : null,
            ],
          })}
          grandTotal={selected.total_cost}
        />
      ) : null}
    />
  );
}