import React, { useState, useEffect, useMemo, useCallback } from "react";
import { MetalProject } from "@/entities/all";
import { format } from "date-fns";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import ProjectQueue from "@/components/corebridge/ProjectQueue";
import EstimateDetailPanel from "@/components/corebridge/EstimateDetailPanel";

const PAGE_SIZE = 200;

export default function MetalProjects() {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 200);
  const [selectedId, setSelectedId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await MetalProject.list('-created_date', PAGE_SIZE);
      setProjects(data || []);
      setHasMore((data || []).length >= PAGE_SIZE);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

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
    if (!selectedId || !filtered.some(p => p.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => filtered.find(p => p.id === selectedId) || null,
    [filtered, selectedId]
  );

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = projects.length + PAGE_SIZE;
      const data = await MetalProject.list('-created_date', next);
      setProjects(data || []);
      setHasMore((data || []).length >= next);
    } catch (error) {
      console.error('Error loading more projects:', error);
    }
    setLoadingMore(false);
  };

  if (isLoading) return <div className="p-8 text-slate-600">Loading estimates...</div>;

  const columns = [
    { key: "name", label: "Estimate Description", render: (p) => <span className="font-medium text-slate-800">{p.project_name}</span> },
    { key: "client", label: "Customer", render: (p) => <span className="text-slate-700">{p.client_name}</span> },
    { key: "items", label: "Products", render: (p) => <span className="text-slate-600">{p.items?.length || 0}</span> },
    { key: "created", label: "Created Date", render: (p) => <span className="text-slate-600 whitespace-nowrap">{format(new Date(p.created_date), 'MM/dd/yyyy')}</span> },
  ];

  return (
    <ProjectQueue
      title="Metal Fabrication Estimates"
      subtitle="Manage your metal fabrication estimates"
      newEstimatePage="NewMetalEstimate"
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
      detailPanel={selected ? (
        <EstimateDetailPanel
          project={selected}
          editPage="NewMetalEstimate"
          renderItem={(item, i) => ({
            title: item.description || `Item ${i + 1}`,
            lines: [
              `${(item.material_type || '').replace(/_/g, ' ')}${item.material_thickness ? ` — ${item.material_thickness}` : ''}`,
              item.item_type ? item.item_type.replace(/_/g, ' ') : null,
            ],
          })}
          totals={[
            { label: "Material Cost", value: selected.total_material_cost },
            { label: "Supplies Cost", value: selected.total_supplies_cost },
            { label: "Fabrication Cost", value: selected.total_fabrication_cost },
            { label: "Welding Cost", value: selected.total_welding_cost },
            { label: "Finishing Cost", value: selected.total_finishing_cost },
          ]}
        />
      ) : null}
    />
  );
}