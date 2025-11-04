import React, { useState, useEffect } from "react";
import { CNCProject } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Search, Eye, Router, Edit } from "lucide-react";
import { format } from "date-fns";

export default function CNCProjects() {
  const [projects, setProjects] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    let f = projects.filter(p =>
      p.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFiltered(f);
    
    // Handle selection logic
    if (f.length > 0) {
      if (!selected || !f.some(item => item.id === selected.id)) {
        setSelected(f[0]);
      }
    } else {
      setSelected(null);
    }
  }, [projects, searchTerm, selected?.id]); // Use selected.id instead of full selected object

  const loadProjects = async () => {
    setIsLoading(true);
    const data = await CNCProject.list('-created_date');
    setProjects(data);
    if (data.length > 0) setSelected(data[0]);
    setIsLoading(false);
  };

  const getStatusColor = (status) => ({
    draft: 'bg-amber-100 text-amber-800',
    calculated: 'bg-green-100 text-green-800',
    archived: 'bg-slate-100 text-slate-800',
  }[status] || 'bg-slate-100 text-slate-800');

  if (isLoading) return <div className="p-8">Loading projects...</div>;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">CNC Projects</h1>
            <p className="text-slate-600">Manage your CNC routing estimates</p>
          </div>
          <Link to={createPageUrl("NewCNCEstimate")}><Button><Plus className="w-5 h-5 mr-2" />New Estimate</Button></Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader><Input placeholder="Search projects..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></CardHeader>
              <CardContent className="p-0">
                {filtered.length === 0 ? <div className="p-12 text-center text-slate-500">No projects found.</div> :
                  <div>
                    {filtered.map((p) => (
                      <div key={p.id} className={`p-6 border-b hover:bg-slate-25 cursor-pointer ${selected?.id === p.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`} onClick={() => setSelected(p)}>
                        <div className="flex justify-between mb-2">
                          <div>
                            <h3 className="font-semibold">{p.project_name}</h3>
                            <p className="text-slate-600">{p.client_name}</p>
                          </div>
                        </div>
                        <div className="flex gap-4 text-sm text-slate-500"><span>{format(new Date(p.created_date), 'MMM d, yyyy')}</span><span>{p.items?.length || 0} items</span></div>
                      </div>
                    ))}
                  </div>
                }
              </CardContent>
            </Card>
          </div>
          <div>
            {selected ? (
              <Card className="bg-white border-0 shadow-sm sticky top-8">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Project Details</CardTitle>
                    <Link to={createPageUrl(`NewCNCEstimate?edit=${selected.id}`)}>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div>
                    <h3 className="font-semibold mb-2">{selected.project_name}</h3>
                    <div className="space-y-2 text-sm">
                      <p>Client: {selected.client_name}</p>
                      {selected.estimate_number && (
                        <p>Estimate #: {selected.estimate_number}</p>
                      )}
                      {selected.hyperlink && (
                        <div className="flex items-center gap-2">
                          <span>Link:</span>
                          <a 
                            href={selected.hyperlink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline truncate max-w-48"
                          >
                            {selected.hyperlink}
                          </a>
                        </div>
                      )}
                      <p>Created: {format(new Date(selected.created_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">Items</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                      {selected.items?.map((item, i) => <div key={i} className="p-3 bg-slate-50 rounded-lg text-sm"><p className="font-medium">{item.description || `Item ${i + 1}`}</p><p className="capitalize">{item.material_type} - {item.material_thickness}"</p><p className="capitalize text-slate-500">{item.item_type.replace('_', ' ')}</p></div>)}
                    </div>
                  </div>
                  <div className="border-t pt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span>Total Machine Cost:</span><span className="font-medium">${(selected.total_machine_cost || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Total Labor Cost:</span><span className="font-medium">${(selected.total_labor_cost || 0).toFixed(2)}</span></div>
                  </div>
                  {selected.notes && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Notes</h4>
                      <p className="text-sm text-slate-600">{selected.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : <Card><CardContent className="p-12 text-center text-slate-500"><Eye className="w-12 h-12 mx-auto mb-4" /><p>Select a project</p></CardContent></Card>}
          </div>
        </div>
      </div>
    </div>
  );
}