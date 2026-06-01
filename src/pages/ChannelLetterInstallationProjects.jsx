import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ChannelLetterInstallation } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/AuthContext";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { fmtCurrency } from "@/lib/formatters";

// Cap initial fetch so first paint isn't blocked downloading every historical
// project. The "Load more" button raises the limit when the user asks.
const PAGE_SIZE = 200;

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

  const navigate = useNavigate();

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

  // Keep selection valid as the filtered list changes (without putting the
  // selected project in deps and re-running on every selection change).
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'calculated': return 'bg-green-100 text-green-800 border-green-200';
      case 'archived': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const navigateToEdit = (project) => {
    navigate(createPageUrl(`NewChannelLetterInstallation?edit=${project.id}`));
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Channel & Dimensional Letter Projects</h1>
            <p className="text-slate-600">Manage your channel letter and dimensional lettering estimates</p>
          </div>
          <Link to={createPageUrl("NewChannelLetterInstallation")}>
            <Button className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3">
              <Plus className="w-5 h-5 mr-2" />
              New Estimate
            </Button>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input placeholder="Search projects..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredProjects.length === 0 ? (
                  <div className="p-12 text-center text-slate-500"><p>No projects found.</p></div>
                ) : (
                  <div className="space-y-0">
                    {filteredProjects.map((project) => (
                      <div
                        key={project.id}
                        className={`p-6 border-b border-slate-50 last:border-b-0 hover:bg-blue-50 transition-colors cursor-pointer ${selectedProjectId === project.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                        onClick={() => navigateToEdit(project)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 truncate">{project.project_name}</h3>
                            <p className="text-slate-600 mb-2">{project.client_name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${getStatusColor(project.status)} mt-1`}>{project.status}</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteProject(project.id, project.project_name);
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span>{format(new Date(project.created_date), 'MMM d, yyyy')}</span>
                          <span className="capitalize">{project.installation_type?.replace('_', ' ')}</span>
                          <span className="font-medium">{fmtCurrency(project.total_cost)}</span>
                        </div>
                      </div>
                    ))}
                    {hasMore && !debouncedSearch && (
                      <div className="p-4 flex justify-center">
                        <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                          {loadingMore ? "Loading…" : "Load more projects"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div>
            {selectedProject ? (
              <Card className="bg-white border-0 shadow-sm sticky top-8">
                <CardHeader className="border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-900">Project Details</CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigateToEdit(selectedProject)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">{selectedProject.project_name}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-600"><span className="font-medium">Client:</span>{selectedProject.client_name}</div>
                      {selectedProject.estimate_number && (
                        <div className="flex items-center gap-2 text-slate-600"><span className="font-medium">Estimate #:</span>{selectedProject.estimate_number}</div>
                      )}
                      {selectedProject.hyperlink && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="font-medium">Link:</span>
                          <a 
                            href={selectedProject.hyperlink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline truncate max-w-48"
                          >
                            {selectedProject.hyperlink}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-600"><span className="font-medium">Created:</span>{format(new Date(selectedProject.created_date), 'MMM d, yyyy')}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-slate-900 mb-3">Installation Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="font-medium capitalize mb-1">{selectedProject.installation_type?.replace('_', ' ')}</p>
                        <div className="text-xs text-slate-600 space-y-1">
                          {selectedProject.installation_type !== 'raceway' && (
                            <p>Qty: {selectedProject.qty_letters} letters</p>
                          )}
                          {selectedProject.installation_type === 'raceway' && (
                            <p>Raceway: {selectedProject.raceway_length_feet} ft</p>
                          )}
                          <p>Letter Size: {selectedProject.letter_height_inches}" ({selectedProject.letter_size})</p>
                          <p>Installation Height: {selectedProject.installation_height_feet} ft</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {(selectedProject.thick_hollow_walls || selectedProject.parapet || selectedProject.poor_electrical_access) && (
                    <div>
                      <h4 className="font-medium text-slate-900 mb-3">Conditions</h4>
                      <div className="space-y-1 text-sm text-amber-600">
                        {selectedProject.thick_hollow_walls && <p>• Thick/Hollow Walls</p>}
                        {selectedProject.parapet && <p>• Parapet Installation</p>}
                        {selectedProject.poor_electrical_access && <p>• Poor Electrical Access</p>}
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-600">Labor Hours:</span><span className="font-medium">{(selectedProject.labor_hours || 0).toFixed(2)} hrs</span></div>
                      <div className="flex justify-between"><span className="text-slate-600">Labor Cost:</span><span className="font-medium">{fmtCurrency(selectedProject.labor_cost)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-600">Supplies:</span><span className="font-medium">{fmtCurrency(selectedProject.total_supplies_cost)}</span></div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                        <span>Total:</span>
                        <span>{fmtCurrency(selectedProject.total_cost)}</span>
                      </div>
                    </div>
                  </div>

                  {selectedProject.notes && (
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">Notes</h4>
                      <p className="text-sm text-slate-600">{selectedProject.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white border-0 shadow-sm"><CardContent className="p-12 text-center text-slate-500"><Eye className="w-12 h-12 mx-auto mb-4 text-slate-300" /><p>Select a project to view details</p></CardContent></Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}