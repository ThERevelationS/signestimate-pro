import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ChannelLetterInstallation } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/AuthContext";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { fmtCurrency } from "@/lib/formatters";
import ProjectQueue from "@/components/corebridge/ProjectQueue";
import EstimateDetailPanel from "@/components/corebridge/EstimateDetailPanel";

// Cap initial fetch so first paint isn't blocked downloading every historical
// project. The "Load more" button raises the limit when the user asks.
const PAGE_SIZE = 200;

const statusColors = {
  draft: 'bg-amber-100 text-amber-800 border-amber-200',
  calculated: 'bg-green-100 text-green-800 border-green-200',
  archived: 'bg-slate-100 text-slate-800 border-slate-200',
};

export default function ChannelLetterInstallationProjects() {
  // Pull the current user from AuthContext (already fetched once on bootstrap)
  // instead of issuing another User.me() round-trip on this page.
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 200);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadProjects = useCallback(async () => {
    if (!user?.email) return;
    setIsLoading(true);
    try {
      const projectsData = await ChannelLetterInstallation.filter(
        { created_by: user.email },
        '-created_date',
        PAGE_SIZE
      );
      setProjects(projectsData || []);
      setHasMore((projectsData || []).length >= PAGE_SIZE);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
    setIsLoading(false);
  }, [user?.email]);

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

  // Keep selection valid as the filtered list changes.
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
      const more = await ChannelLetterInstallation.filter(
        { created_by: user.email },
        '-created_date',
        next
      );
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
        await ChannelLetterInstallation.delete(projectId);
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
    { key: "type", label: "Install Type", render: (p) => <span className="text-slate-600 capitalize">{p.installation_type?.replace(/_/g, ' ')}</span> },
    { key: "status", label: "Status", render: (p) => <Badge className={`${statusColors[p.status] || statusColors.archived} text-[10px]`}>{p.status}</Badge> },
    { key: "created", label: "Created Date", render: (p) => <span className="text-slate-600 whitespace-nowrap">{format(new Date(p.created_date), 'MM/dd/yyyy')}</span> },
    { key: "total", label: "Total", align: "right", render: (p) => <span className="font-semibold text-slate-900">{fmtCurrency(p.total_cost)}</span> },
    {
      key: "actions", label: "", align: "right",
      render: (p) => (
        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={(e) => { e.stopPropagation(); deleteProject(p.id, p.project_name); }}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <ProjectQueue
      title="Channel & Dimensional Letter Estimates"
      subtitle="Manage your channel letter and dimensional lettering estimates"
      newEstimatePage="NewChannelLetterInstallation"
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
          editPage="NewChannelLetterInstallation"
          hideItems
          renderItem={() => ({ title: "" })}
          statusBadge={<Badge className={`${statusColors[selectedProject.status] || statusColors.archived} text-[10px]`}>{selectedProject.status}</Badge>}
          extraFields={
            <div className="pt-2 space-y-0.5 text-xs text-slate-600">
              <p className="capitalize font-medium text-slate-700">{selectedProject.installation_type?.replace(/_/g, ' ')}</p>
              {selectedProject.installation_type === 'raceway'
                ? <p>Raceway: {selectedProject.raceway_length_feet} ft</p>
                : <p>Qty: {selectedProject.qty_letters} letters</p>}
              <p>Letter Size: {selectedProject.letter_height_inches}" ({selectedProject.letter_size})</p>
              <p>Installation Height: {selectedProject.installation_height_feet} ft</p>
              <p>Labor Hours: {(selectedProject.labor_hours || 0).toFixed(2)} hrs</p>
              {selectedProject.thick_hollow_walls && <p className="text-amber-600">• Thick/Hollow Walls</p>}
              {selectedProject.parapet && <p className="text-amber-600">• Parapet Installation</p>}
              {selectedProject.poor_electrical_access && <p className="text-amber-600">• Poor Electrical Access</p>}
            </div>
          }
          totals={[
            { label: "Labor Cost", value: selectedProject.labor_cost },
            { label: "Supplies", value: selectedProject.total_supplies_cost },
          ]}
        />
      ) : null}
    />
  );
}