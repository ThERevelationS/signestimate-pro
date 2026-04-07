import React, { useState, useEffect } from "react";
import { FoundationProject, User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Search, ExternalLink, Edit2, Trash2, Anchor } from "lucide-react";
import { format } from "date-fns";

export default function FoundationProjects() {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      const projectsData = await FoundationProject.filter({ created_by: user.email }, '-created_date');
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (searchTerm) {
      const filtered = projects.filter(project =>
        project.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.estimate_number && project.estimate_number.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredProjects(filtered);
    } else {
      setFilteredProjects(projects);
    }
  }, [projects, searchTerm]);

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'calculated': return 'bg-green-100 text-green-800 border-green-200';
      case 'archived': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
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
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Anchor className="w-8 h-8" />
              Foundation Projects
            </h1>
            <p className="text-slate-600">Manage your foundation estimates</p>
          </div>
          <Link to={createPageUrl("NewFoundationEstimate")}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3">
              <Plus className="w-5 h-5 mr-2" />
              New Estimate
            </Button>
          </Link>
        </div>

        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredProjects.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <p>No projects found.</p>
              </div>
            ) : (
              <div className="grid gap-6 p-6">
                {filteredProjects.map((project) => (
                  <Card key={project.id} className="border border-slate-200 hover:border-blue-300 transition-all hover:shadow-md">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2">{project.project_name}</CardTitle>
                          <div className="space-y-1 text-sm text-slate-600">
                            <p className="font-medium">Client: {project.client_name}</p>
                            {project.estimate_number && <p>Estimate #: {project.estimate_number}</p>}
                            <p>Created: {format(new Date(project.created_date), 'MMM d, yyyy')}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                          <div className="flex gap-2">
                            <Link to={`${createPageUrl("NewFoundationEstimate")}?id=${project.id}`}>
                              <Button variant="outline" size="sm">
                                <Edit2 className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(project.id, project.project_name)}
                              className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-slate-700 mb-3">Project Details</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-600">Foundation Items:</span>
                              <span className="font-medium">{project.items?.length || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Equipment:</span>
                              <span className="font-medium">{project.selected_equipment?.length || 0}</span>
                            </div>
                            {project.hyperlink && (
                              <div className="mt-2">
                                <a
                                  href={project.hyperlink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Project Link
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-700 mb-3">Cost Summary</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-600">Materials:</span>
                              <span className="font-medium">${((project.total_concrete_cost || 0) + (project.total_rebar_cost || 0)).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Excavation:</span>
                              <span className="font-medium">${(project.total_excavation_cost || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Labor:</span>
                              <span className="font-medium">${(project.total_labor_cost || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Equipment:</span>
                              <span className="font-medium">${(project.total_equipment_cost || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-slate-200">
                              <span className="font-semibold text-slate-900">Total:</span>
                              <span className="font-bold text-green-600 text-base">
                                ${((project.total_concrete_cost || 0) + (project.total_rebar_cost || 0) + 
                                   (project.total_excavation_cost || 0) + (project.total_labor_cost || 0) + 
                                   (project.total_equipment_cost || 0)).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {project.notes && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <h4 className="font-semibold text-slate-700 mb-2 text-sm">Notes</h4>
                          <p className="text-sm text-slate-600">{project.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}