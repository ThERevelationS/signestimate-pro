import React, { useState, useEffect, useMemo } from "react";
import { FoundationProject } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trash2, Users } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/AuthContext";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { fmtCurrency } from "@/lib/formatters";
import ProjectQueue from "@/components/corebridge/ProjectQueue";
import EstimateDetailPanel from "@/components/corebridge/EstimateDetailPanel";

// Cap the initial page-load fetch so we never download thousands of historical
// projects up front. Users still get a "Load more" affordance when they hit it.
const PAGE_SIZE = 200;

const statusColors = {
  draft: 'bg-amber-100 text-amber-800 border-amber-200',
  calculated: 'bg-green-100 text-green-800 border-green-200',
  archived: 'bg-slate-100 text-slate-800 border-slate-200',
};

// Grand total as displayed by the old card layout — a plain sum of the
// already-saved cost fields (no re-calculation happens here).
const projectTotal = (p) =>
  (p.total_concrete_cost || 0) + (p.total_rebar_cost || 0) +
  (p.total_excavation_cost || 0) + (p.total_labor_cost || 0) +
  (p.total_equipment_cost || 0);

export default function FoundationProjects() {
  // Pull the current user from AuthContext (already fetched on app bootstrap)
  // instead of issuing another User.me() round-trip.
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 200);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAllUsers, user?.email]);

  const loadProjects = async () => {
    if (!user?.email && !showAllUsers) return; // wait for auth
    setIsLoading(true);
    try {
      const projectsData = showAllUsers
        ? await FoundationProject.list('-created_date', PAGE_SIZE)
        : await FoundationProject.filter({ created_by: user.email }, '-created_date', PAGE_SIZE);
      setProjects(projectsData || []);
      setHasMore((projectsData || []).length >= PAGE_SIZE);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
    setIsLoading(false);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      // Bumping the limit is simpler than offset pagination here — the
      // backend's `list/filter` second-arg accepts a higher cap.
      const next = projects.length + PAGE_SIZE;
      const more = showAllUsers
        ? await FoundationProject.list('-created_date', next)
        : await FoundationProject.filter({ created_by: user.email }, '-created_date', next);
      setProjects(more || []);
      setHasMore((more || []).length >= next);
    } catch (error) {
      console.error('Error loading more projects:', error);
    }
    setLoadingMore(false);
  };

  const filteredProjects = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter(project =>
      project.project_name?.toLowerCase().includes(term) ||
      project.client_name?.toLowerCase().includes(term) ||
      (project.estimate_number && project.estimate_number.toLowerCase().includes(term))
    );
  }, [projects, debouncedSearch]);

  useEffect(() => {
    if (filteredProjects.length === 0) { setSelectedId(null); return; }
    if (!selectedId || !filteredProjects.some(p => p.id === selectedId)) {
      setSelectedId(filteredProjects[0].id);
    }
  }, [filteredProjects, selectedId]);

  const selected = useMemo(
    () => filteredProjects.find(p => p.id === selectedId) || null,
    [filteredProjects, selectedId]
  );

  const handleDelete = async (projectId, projectName) => {
    if (confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      try {
        await FoundationProject.delete(projectId);
        await loadProjects();
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Error deleting project. Please try again.');
      }
    }
  };

  if (isLoading) return <div className="p-8 text-slate-600">Loading estimates...</div>;

  const columns = [
    { key: "name", label: "Estimate Description", render: (p) => <span className="font-medium text-slate-800">{p.project_name}</span> },
    { key: "client", label: "Customer", render: (p) => <span className="text-slate-700">{p.client_name}</span> },
    { key: "est", label: "Estimate #", render: (p) => <span className="text-slate-600">{p.estimate_number || "—"}</span> },
    { key: "items", label: "Items", render: (p) => <span className="text-slate-600">{p.items?.length || 0}</span> },
    { key: "status", label: "Status", render: (p) => <Badge className={`${statusColors[p.status] || statusColors.archived} text-[10px]`}>{p.status}</Badge> },
    { key: "created", label: "Created Date", render: (p) => <span className="text-slate-600 whitespace-nowrap">{format(new Date(p.created_date), 'MM/dd/yyyy')}</span> },
    { key: "total", label: "Total", align: "right", render: (p) => <span className="font-semibold text-slate-900">{fmtCurrency(projectTotal(p))}</span> },
    {
      key: "actions", label: "", align: "right",
      render: (p) => (
        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.project_name); }}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <ProjectQueue
      title="Concrete | Masonry | Poles Estimates"
      subtitle="Manage your concrete, masonry & pole estimates"
      newEstimatePage="NewFoundationEstimate"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      filterExtras={
        <div className="flex items-center gap-2 pb-1">
          <Switch id="show-all" checked={showAllUsers} onCheckedChange={setShowAllUsers} />
          <Label htmlFor="show-all" className="text-xs text-slate-600 whitespace-nowrap flex items-center gap-1.5 cursor-pointer">
            <Users className="w-3.5 h-3.5" /> All Users
          </Label>
        </div>
      }
      rows={filteredProjects}
      totalCount={projects.length}
      columns={columns}
      selectedId={selectedId}
      onSelect={setSelectedId}
      hasMore={hasMore && !debouncedSearch}
      loadingMore={loadingMore}
      onLoadMore={loadMore}
      detailPanel={selected ? (
        <EstimateDetailPanel
          project={selected}
          editPage="NewFoundationEstimate"
          editParam="id"
          itemsLabel="Foundation Items"
          statusBadge={<Badge className={`${statusColors[selected.status] || statusColors.archived} text-[10px]`}>{selected.status}</Badge>}
          extraFields={
            <>
              {showAllUsers && selected.created_by && <p className="text-slate-400 text-xs">By: {selected.created_by}</p>}
              <p className="text-slate-600">Equipment: {selected.selected_equipment?.length || 0}</p>
            </>
          }
          renderItem={(item, i) => ({
            title: item.description || item.foundation_type?.replace(/_/g, ' ') || `Item ${i + 1}`,
            lines: [item.quantity ? `Qty ${item.quantity}` : null],
          })}
          totals={[
            { label: "Concrete", value: selected.total_concrete_cost },
            { label: "Rebar", value: selected.total_rebar_cost },
            { label: "Excavation", value: selected.total_excavation_cost },
            { label: "Labor", value: selected.total_labor_cost },
            { label: "Equipment", value: selected.total_equipment_cost },
          ]}
        />
      ) : null}
    />
  );
}