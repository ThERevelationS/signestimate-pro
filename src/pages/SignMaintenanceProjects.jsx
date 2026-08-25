import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { MaintenanceProject } from "@/entities/all";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Package, Settings } from "lucide-react";
import { format } from "date-fns";
import { fmtCurrency } from "@/lib/formatters";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import ProjectQueue from "@/components/corebridge/ProjectQueue";
import EstimateDetailPanel from "@/components/corebridge/EstimateDetailPanel";

// Match the cap used by the other project list pages so the first paint
// isn't blocked downloading every historical maintenance estimate.
const PAGE_SIZE = 200;

export default function SignMaintenanceProjects() {
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
      const list = await MaintenanceProject.list("-created_date", PAGE_SIZE);
      setProjects(list || []);
      setHasMore((list || []).length >= PAGE_SIZE);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = projects.length + PAGE_SIZE;
      const list = await MaintenanceProject.list("-created_date", next);
      setProjects(list || []);
      setHasMore((list || []).length >= next);
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
      p.client_name?.toLowerCase().includes(term) ||
      p.site_address?.toLowerCase().includes(term)
    );
  }, [projects, debouncedSearch]);

  useEffect(() => {
    if (filtered.length === 0) { setSelectedId(null); return; }
    if (!selectedId || !filtered.some(p => p.id === selectedId)) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selected = useMemo(() => filtered.find(p => p.id === selectedId) || null, [filtered, selectedId]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this maintenance estimate?")) return;
    await MaintenanceProject.delete(id);
    load();
  };

  if (loading) return <div className="p-8 text-slate-600">Loading estimates...</div>;

  const columns = [
    { key: "name", label: "Estimate Description", render: (p) => <span className="font-medium text-slate-800">{p.project_name || "Untitled"}</span> },
    { key: "client", label: "Customer", render: (p) => <span className="text-slate-700">{p.client_name || "—"}</span> },
    { key: "est", label: "Estimate #", render: (p) => <span className="text-slate-600">{p.estimate_number || "—"}</span> },
    { key: "site", label: "Site Address", render: (p) => <span className="text-slate-600 truncate block max-w-[220px]">{p.site_address || "—"}</span> },
    { key: "status", label: "Status", render: (p) => <Badge variant="outline" className="capitalize text-[10px]">{p.status || "draft"}</Badge> },
    { key: "created", label: "Created Date", render: (p) => <span className="text-slate-600 whitespace-nowrap">{p.created_date && format(new Date(p.created_date), "MM/dd/yyyy")}</span> },
    { key: "total", label: "Total", align: "right", render: (p) => <span className="font-semibold text-slate-900">{fmtCurrency(p.total_cost)}</span> },
    {
      key: "actions", label: "", align: "right",
      render: (p) => (
        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <ProjectQueue
      title="Sign Maintenance Estimates"
      subtitle="Existing maintenance estimates"
      newEstimatePage="NewSignMaintenance"
      headerActions={
        <>
          <Link to={createPageUrl("MaintenanceInventory")}>
            <Button variant="outline" size="sm" className="h-8 rounded-sm"><Package className="w-4 h-4 mr-1" /> Inventory</Button>
          </Link>
          <Link to={createPageUrl("SignMaintenanceSettings")}>
            <Button variant="outline" size="sm" className="h-8 rounded-sm"><Settings className="w-4 h-4 mr-1" /> Settings</Button>
          </Link>
        </>
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
      emptyMessage="No maintenance estimates yet."
      detailPanel={selected ? (
        <EstimateDetailPanel
          project={selected}
          editPage="NewSignMaintenance"
          itemsLabel="Service Items"
          statusBadge={<Badge variant="outline" className="capitalize text-[10px]">{selected.status || "draft"}</Badge>}
          extraFields={selected.site_address ? <p className="text-slate-600">Site: {selected.site_address}</p> : null}
          renderItem={(item, i) => ({
            title: item.description || item.sign_type?.replace(/_/g, " ") || `Service ${i + 1}`,
            lines: [
              item.quantity ? `Qty ${item.quantity}` : null,
              item.actions?.length ? item.actions.join(", ").replace(/_/g, " ") : null,
            ],
          })}
          grandTotal={selected.total_cost}
        />
      ) : null}
    />
  );
}