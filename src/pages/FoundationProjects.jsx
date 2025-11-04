import React, { useState, useEffect } from "react";
import { FoundationProject } from "@/entities/all";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ExternalLink, Trash2, Edit, Anchor } from "lucide-react";

export default function FoundationProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    let filtered = [...projects];
    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.estimate_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredProjects(filtered);
  }, [projects, searchTerm]);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const data = await FoundationProject.list();
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
    setIsLoading(false);
  };

  const handleDelete = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await FoundationProject.delete(projectId);
        loadProjects();
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Error deleting project. Please try again.');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'calculated': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Anchor className="w-8 h-8" />
              Foundation Projects
            </h1>
            <p className="text-slate-600">Manage all your foundation estimates</p>
          </div>
          <Button 
            onClick={() => navigate(createPageUrl("NewFoundationEstimate"))}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Estimate
          </Button>
        </div>

        <Card className="bg-white border-0 shadow-sm mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by project name, client, or estimate number..."
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {filteredProjects.length === 0 ? (
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="py-12 text-center text-slate-500">
              <Anchor className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No foundation projects found. Create your first estimate to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const total = (project.total_concrete_cost || 0) + (project.total_rebar_cost || 0) + 
                           (project.total_excavation_cost || 0) + (project.total_labor_cost || 0);
              
              return (
                <Card key={project.id} className="bg-white border-0 shadow-sm hover:shadow-lg transition-shadow">
                  <CardHeader className="border-b">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{project.project_name}</CardTitle>
                        <p className="text-sm text-slate-600">{project.client_name}</p>
                        <p className="text-xs text-slate-500 mt-1">{project.estimate_number}</p>
                      </div>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Foundations:</span>
                        <span className="font-medium">{project.items?.length || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Concrete:</span>
                        <span className="font-medium">${(project.total_concrete_cost || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Labor:</span>
                        <span className="font-medium">${(project.total_labor_cost || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-3">
                        <span>Total:</span>
                        <span className="text-green-600">${total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-6">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(createPageUrl("NewFoundationEstimate") + `?edit=${project.id}`)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      {project.hyperlink && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(project.hyperlink, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(project.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}