
import React, { useState, useEffect } from "react";
import { BrickStoneProject, User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Search, Eye, Edit, Trash2, Server } from "lucide-react";
import { format } from "date-fns";

export default function BrickStoneProjects() {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    let filtered = [...projects];
    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredProjects(filtered);
    if (filtered.length > 0 && !selectedProject) {
      setSelectedProject(filtered[0]);
    } else if (filtered.length === 0) {
      setSelectedProject(null);
    }
    if (selectedProject && !filtered.find(p => p.id === selectedProject.id)) {
      setSelectedProject(filtered.length > 0 ? filtered[0] : null);
    }
  }, [projects, searchTerm, selectedProject]);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      let user;
      try {
        user = await User.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error getting current user:', error);
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }

      const projectsData = await BrickStoneProject.filter({ created_by: user.email }, '-created_date');
      setProjects(projectsData);
      
      if (projectsData.length > 0) {
        setSelectedProject(projectsData[0]);
      } else {
        setSelectedProject(null);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
    setIsLoading(false);
  };

  const deleteProject = async (projectId, projectName) => {
    if (confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      try {
        await BrickStoneProject.delete(projectId);
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
    navigate(createPageUrl(`NewBrickStoneEstimate?edit=${project.id}`));
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
              <Server className="w-8 h-8" />
              Brick & Stone Projects
            </h1>
            <p className="text-slate-600">Manage your sign base estimates</p>
          </div>
          <Link to={createPageUrl("NewBrickStoneEstimate")}>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3">
              <Plus className="w-5 h-5 mr-2" />
              New Estimate
            </Button>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input 
                    placeholder="Search projects..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="pl-10" 
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredProjects.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    <p>No projects found. Create your first brick & stone estimate!</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {filteredProjects.map((project) => (
                      <div
                        key={project.id}
                        className={`p-6 border-b border-slate-50 last:border-b-0 hover:bg-rose-50 transition-colors cursor-pointer ${
                          selectedProject?.id === project.id ? 'bg-rose-50 border-l-4 border-rose-500' : ''
                        }`}
                        onClick={() => setSelectedProject(project)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 truncate">{project.project_name}</h3>
                            <p className="text-slate-600 mb-2">{project.client_name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${getStatusColor(project.status)} mt-1`}>
                              {project.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateToEdit(project);
                              }}
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
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
                          <span className="capitalize">{project.base_type?.replace('_', ' ')}</span>
                          {project.material_name && <span>{project.material_name}</span>}
                        </div>
                      </div>
                    ))}
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
                      <div className="flex items-center gap-2 text-slate-600">
                        <span className="font-medium">Client:</span>
                        {selectedProject.client_name}
                      </div>
                      {selectedProject.estimate_number && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="font-medium">Estimate #:</span>
                          {selectedProject.estimate_number}
                        </div>
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
                      <div className="flex items-center gap-2 text-slate-600">
                        <span className="font-medium">Created:</span>
                        {format(new Date(selectedProject.created_date), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>

                  <div className="bg-rose-50 p-4 rounded-lg border border-rose-200">
                    <h4 className="font-medium text-rose-900 mb-3">Base Specifications</h4>
                    <div className="space-y-2 text-sm text-rose-800">
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span className="font-medium capitalize">{selectedProject.base_type?.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dimensions:</span>
                        <span className="font-medium">
                          {selectedProject.base_length}" × {selectedProject.base_width}" × {selectedProject.base_height}"
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Layers:</span>
                        <span className="font-medium">{selectedProject.layers || 1}</span>
                      </div>
                      {selectedProject.base_type === 'hollow_rectangular' && (
                        <div className="flex justify-between">
                          <span>Wall Thickness:</span>
                          <span className="font-medium">{selectedProject.wall_thickness}"</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Mortar Gap:</span>
                        <span className="font-medium">{selectedProject.mortar_gap}"</span>
                      </div>
                      {selectedProject.material_name && (
                        <>
                          <div className="flex justify-between border-t border-rose-300 pt-2 mt-2">
                            <span>Material:</span>
                            <span className="font-medium">{selectedProject.material_name}</span>
                          </div>
                          {selectedProject.material_dimensions && (
                            <div className="flex justify-between">
                              <span>Brick Size:</span>
                              <span className="font-medium">
                                {selectedProject.material_dimensions.length}" × {selectedProject.material_dimensions.width}" × {selectedProject.material_dimensions.height}"
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {selectedProject.calculated_bricks && (
                    <div>
                      <h4 className="font-medium text-slate-900 mb-3">Material Requirements</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Total Bricks/Stones:</span>
                          <span className="font-medium text-blue-600">{selectedProject.calculated_bricks}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Surface Area:</span>
                          <span className="font-medium">{selectedProject.calculated_surface_area?.toFixed(2)} sq ft</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Mortar Bags (60lb):</span>
                          <span className="font-medium">{selectedProject.mortar_bags_needed}</span>
                        </div>
                        {selectedProject.labor_hours && (
                           <div className="flex justify-between">
                            <span className="text-slate-600">Labor Hours:</span>
                            <span className="font-medium">{selectedProject.labor_hours?.toFixed(2)} hrs</span>
                           </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-3">Cost Breakdown</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Material Cost:</span>
                        <span className="font-medium">${(selectedProject.material_cost || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Mortar Cost:</span>
                        <span className="font-medium">${(selectedProject.mortar_cost || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-3 mt-2">
                        <span>TOTAL:</span>
                        <span className="text-green-600">${(selectedProject.total_cost || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {selectedProject.notes && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-slate-900 mb-2">Notes</h4>
                      <p className="text-sm text-slate-600">{selectedProject.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="p-12 text-center text-slate-500">
                  <Eye className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>Select a project to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
