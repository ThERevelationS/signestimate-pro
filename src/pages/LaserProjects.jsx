import React, { useState, useEffect, useMemo, useCallback } from "react";
import { LaserProject } from "@/entities/all";
import { format } from "date-fns";
import { useAuth } from "@/lib/AuthContext";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import ProjectQueue from "@/components/corebridge/ProjectQueue";
import MachineProjectDetails from "@/components/corebridge/MachineProjectDetails";

const PAGE_SIZE = 200;

export default function LaserProjects() {
  // Use the shared auth context — avoids a second User.me() round-trip.
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 200);
  const [selectedId, setSelectedId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadProjects = useCallback(async () => {
    if (!user?.email) return;
    setIsLoading(true);
    try {
      const data = await LaserProject.filter({ created_by: user.email }, '-created_date', PAGE_SIZE);
      setProjects(data || []);
      setHasMore((data || []).length >= PAGE_SIZE);
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
    }
    setIsLoading(false);
  }, [user?.email]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

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
      const data = await LaserProject.filter({ created_by: user.email }, '-created_date', next);
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
      title="Laser Estimates"
      subtitle="Manage your laser cutting & engraving estimates"
      newEstimatePage="NewLaserEstimate"
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
      detailPanel={selected ? <MachineProjectDetails project={selected} editPage="NewLaserEstimate" /> : null}
    />
  );
}