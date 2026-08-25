import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Project } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/AuthContext";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import ProjectQueue from "@/components/corebridge/ProjectQueue";
import EstimateDetailPanel from "@/components/corebridge/EstimateDetailPanel";

const PAGE_SIZE = 200;

const statusColors = {
  draft: 'bg-amber-100 text-amber-800 border-amber-200',
  calculated: 'bg-green-100 text-green-800 border-green-200',
  archived: 'bg-slate-100 text-slate-800 border-slate-200',
};

export default function PaintProjects() {
  // useAuth() to avoid a duplicate User.me() (already fetched on bootstrap).
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 200);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadProjects = useCallback(async () => {
    if (!user) return; // wait for auth to populate
    setIsLoading(true);
    try {
      const projectsData = await Project.list('-created_date', PAGE_SIZE);
      setProjects(projectsData || []);
      setHasMore((projectsData || []).length >= PAGE_SIZE);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter(project =>
      project.project_name?.toLowerCase().includes(term) ||
      project.client_name?.toLowerCase().includes(term)
    );
  }, [projects, debouncedSearch]);

  useEffect(() => {
    if (filteredProjects.length === 0) {
      setSelectedProjectId(null);
      return;
    }
    if (!selectedProjectId || !filteredProjects.some(p => p.id === selectedProjectId)) {
      setSelectedProjectId(filteredProjects[0].id);
    }
  }, [filteredProjects, selectedProjectId]);

  const selectedProject = useMemo(
    () => filteredProjects.find(p => p.id === selectedProjectId) || null,
    [filteredProjects, selectedProjectId]
  );

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = projects.length + PAGE_SIZE;
      const more = await Project.list('-created_date', next);
      setProjects(more || []);
      setHasMore((more || []).length >= next);
    } catch (error) {
      console.error('Error loading more projects:', error);
    }
    setLoadingMore(false);
  };

  const deleteProject = async (projectId, projectName) => {
    if (confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      try {
        await Project.delete(projectId);
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
    { key: "status", label: "Status", render: (p) => <Badge className={`${statusColors[p.status] || statusColors.archived} text-[10px]`}>{p.status}</Badge> },
    { key: "items", label: "Products", render: (p) => <span className="text-slate-600">{p.items?.length || 0}</span> },
    { key: "created", label: "Created Date", render: (p) => <span className="text-slate-600 whitespace-nowrap">{format(new Date(p.created_date), 'MM/dd/yyyy')}</span> },
    {
      key: "actions", label: "", align: "right",
      render: (p) => (
        <Button
          variant="ghost" size="sm"
          className="h-6 px-1.5 text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={(e) => { e.stopPropagation(); deleteProject(p.id, p.project_name); }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <ProjectQueue
      title="Paint Estimates"
      subtitle="Manage your paint project estimates"
      newEstimatePage="NewPaintEstimate"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      rows={filteredProjects}
      totalCount={projects.length}
      columns={columns}
      selectedId={selectedProjectId}
      onSelect={setSelectedProjectId}
      hasMore={hasMore && !debouncedSearch}
      loadingMore={loadingMore}
      onLoadMore={loadMore}
      detailPanel={selectedProject ? (
        <EstimateDetailPanel
          project={selectedProject}
          editPage="NewPaintEstimate"
          statusBadge={<Badge className={`${statusColors[selectedProject.status] || statusColors.archived} text-[10px]`}>{selectedProject.status}</Badge>}
          renderItem={(item, i) => ({
            title: item.description || `Item ${i + 1}`,
            lines: [
              item.item_type ? `Type: ${item.item_type.replace(/_/g, ' ')}` : null,
              (item.item_type === 'panel' || item.item_type === 'complex_shapes')
                ? `${item.length}"L × ${item.width}"H × ${item.thickness}" thick`
                : `${item.length} letters @ ${item.width}" high, ${item.thickness}" thick`,
              item.letter_size ? `Letter Size: ${item.letter_size.replace(/_/g, ' ')}` : null,
              item.edge_complexity_multiplier && item.edge_complexity_multiplier !== 1.0
                ? `Edge Complexity: ${item.edge_complexity_multiplier}x` : null,
              item.paint_mask_sqft > 0 ? `Paint Mask: ${item.paint_mask_sqft} sq ft` : null,
              item.paint_colors?.length ? `Colors: ${item.paint_colors.join(', ')}` : null,
            ],
          })}
          totals={[
            { label: "Total Paint Mask", value: selectedProject.total_paint_mask_cost },
            { label: "Total Paint & Supplies", value: selectedProject.total_liquid_paint_and_supplies_cost },
            { label: "Total Labor", value: selectedProject.total_labor_cost },
          ]}
        />
      ) : null}
    />
  );
}