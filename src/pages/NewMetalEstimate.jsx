import React, { useState, useEffect, useCallback } from "react";
import { MetalProject, Settings, Inventory as InventoryEntity } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Save, Wrench, Edit } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";

const itemTypes = ["channel_letters", "cabinet_sign", "monument_sign", "pole_sign", "flat_cut_letters", "fabricated_letters", "frame_assembly", "custom_brackets"];
const materialTypes = ["Aluminum", "Steel", "Stainless_Steel", "Galvanized_Steel"];

export default function NewMetalEstimate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [isEditing, setIsEditing] = useState(false);

  const [project, setProject] = useState({
    project_name: "",
    client_name: "",
    items: [],
    fabrication_rate: 65,
    welding_rate: 75,
    finishing_rate: 55,
    notes: ""
  });
  const [globalSettings, setGlobalSettings] = useState({});
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadPrerequisites = useCallback(async () => {
    try {
      const [settingsData, inventoryData] = await Promise.all([
          Settings.list(),
          InventoryEntity.list()
      ]);
      const settingsObj = {};
      settingsData.forEach(s => { settingsObj[s.setting_name] = s.setting_value; });
      setGlobalSettings(settingsObj);
      setInventory(inventoryData);
      
      if (!editId) {
        setProject(prev => ({
          ...prev,
          fabrication_rate: parseFloat(settingsObj.fabrication_rate) || 65,
          welding_rate: parseFloat(settingsObj.welding_rate) || 75,
          finishing_rate: parseFloat(settingsObj.finishing_rate) || 55,
          notes: settingsObj.default_notes_template || ""
        }));
      }
    } catch (error) {
      console.error('Error loading prerequisites:', error);
    }
  }, [editId]);

  const loadProjectForEdit = useCallback(async (projectId) => {
    try {
      const projectToEdit = await MetalProject.get(projectId);
      if (projectToEdit) {
        setProject(projectToEdit);
        setIsEditing(true);
      } else {
        navigate(createPageUrl("MetalProjects"));
      }
    } catch (error) {
      console.error('Error loading project for edit:', error);
    }
  }, [navigate]);

  useEffect(() => {
    const loadAll = async () => {
        setIsLoading(true);
        await loadPrerequisites();
        if (editId) {
            await loadProjectForEdit(editId);
        }
        setIsLoading(false);
    };
    loadAll();
  }, [editId, loadPrerequisites, loadProjectForEdit]);

  const addItem = () => {
    setProject(prev => ({
      ...prev,
      items: [...prev.items, {
        item_type: "fabricated_letters",
        description: "",
        inventory_item_id: null,
        material_length_ft: 0,
        quantity: 1,
        fabrication_hours: 0,
        welding_hours: 0,
        finishing_hours: 0,
        material_cost: 0,
        supplies_cost: 0,
        fabrication_cost: 0,
        welding_cost: 0,
        finishing_cost: 0,
      }]
    }));
  };

  const removeItem = (index) => {
    setProject(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const updateItem = (index, field, value) => {
    setProject(prev => {
      const newItems = [...prev.items];
      let item = { ...newItems[index], [field]: value };

      // --- Recalculate ---
      const inventoryItem = inventory.find(i => i.id === item.inventory_item_id);
      if (inventoryItem) {
          item.material_cost = (item.material_length_ft || 0) * (inventoryItem.cost_per_unit || 0);
      }

      item.fabrication_cost = (item.fabrication_hours || 0) * prev.fabrication_rate;
      item.welding_cost = (item.welding_hours || 0) * prev.welding_rate;
      item.finishing_cost = (item.finishing_hours || 0) * prev.finishing_rate;
      
      newItems[index] = { ...item };
      return { ...prev, items: newItems };
    });
  };

  const calculateTotals = () => {
    const totals = {
      material: 0,
      supplies: 0,
      fabrication: 0,
      welding: 0,
      finishing: 0
    };
    project.items.forEach(item => {
      totals.material += (item.material_cost || 0) * (item.quantity || 1);
      totals.supplies += (item.supplies_cost || 0) * (item.quantity || 1);
      totals.fabrication += (item.fabrication_cost || 0) * (item.quantity || 1);
      totals.welding += (item.welding_cost || 0) * (item.quantity || 1);
      totals.finishing += (item.finishing_cost || 0) * (item.quantity || 1);
    });
    return totals;
  };

  const saveProject = async () => {
    if (!project.project_name || !project.client_name) {
      alert('Please fill in project name and client name');
      return;
    }
    
    setIsSaving(true);
    try {
      const totals = calculateTotals();
      const finalProject = { 
          ...project, 
          total_material_cost: totals.material,
          total_supplies_cost: totals.supplies,
          total_fabrication_cost: totals.fabrication,
          total_welding_cost: totals.welding,
          total_finishing_cost: totals.finishing,
          status: 'calculated' 
      };
      
      if (isEditing) {
        await MetalProject.update(editId, finalProject);
      } else {
        await MetalProject.create(finalProject);
      }
      navigate(createPageUrl("MetalProjects"));
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Error saving project. Please try again.');
    }
    setIsSaving(false);
  };

  const totals = calculateTotals();

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("MetalProjects")}><Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              {isEditing ? <Edit className="w-6 h-6"/> : <Wrench className="w-6 h-6" />}
              {isEditing ? 'Edit Metal Fabrication Estimate' : 'New Metal Fabrication Estimate'}
            </h1>
            <p className="text-slate-600">Estimate costs for fabricated metal signs and components</p>
          </div>
        </div>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white border-0 shadow-sm"><CardHeader><CardTitle>Project Information</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid md:grid-cols-2 gap-4"><div><Label>Project Name *</Label><Input value={project.project_name} onChange={(e) => setProject(p => ({ ...p, project_name: e.target.value }))} /></div><div><Label>Client Name *</Label><Input value={project.client_name} onChange={(e) => setProject(p => ({ ...p, client_name: e.target.value }))} /></div></div><div><Label>Notes</Label><Textarea value={project.notes} onChange={(e) => setProject(p => ({ ...p, notes: e.target.value }))} /></div></CardContent></Card>
            
            <Card className="bg-white border-0 shadow-sm">
                <CardHeader><div className="flex justify-between items-center"><CardTitle>Project Items</CardTitle><Button onClick={addItem} size="sm"><Plus className="w-4 h-4 mr-2" />Add Item</Button></div></CardHeader>
                <CardContent className="space-y-6">
                    {project.items.map((item, index) => (
                      <div key={index} className="p-6 border rounded-xl bg-slate-25">
                        <div className="flex justify-between items-start mb-4"><h4 className="font-medium">Item {index + 1}</h4><Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button></div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="md:col-span-3"><Label>Description</Label><Input value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} /></div>
                          <div><Label>Item Type</Label><Select value={item.item_type} onValueChange={(v) => updateItem(index, 'item_type', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{itemTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
                          <div className="md:col-span-2"><Label>Material</Label><Select value={item.inventory_item_id} onValueChange={(v) => updateItem(index, 'inventory_item_id', v)}><SelectTrigger><SelectValue placeholder="Select from inventory" /></SelectTrigger><SelectContent>{inventory.map(i => <SelectItem key={i.id} value={i.id}>{i.material_type} {i.product_type} {i.size} - ${i.cost_per_unit}/{i.unit_type}</SelectItem>)}</SelectContent></Select></div>
                          <div><Label>Material Length (ft)</Label><Input type="number" min="0" value={item.material_length_ft || ""} onChange={e => updateItem(index, 'material_length_ft', parseFloat(e.target.value) || 0)} /></div>
                          <div><Label>Supplies Cost</Label><Input type="number" min="0" value={item.supplies_cost || ""} onChange={e => updateItem(index, 'supplies_cost', parseFloat(e.target.value) || 0)} /></div>
                          <div><Label>Quantity</Label><Input type="number" min="1" value={item.quantity || ""} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)} /></div>
                          
                          <div className="md:col-span-3 pt-4 border-t"><h5 className="font-medium text-sm text-slate-700">Labor Hours</h5></div>
                          <div><Label>Fabrication</Label><Input type="number" min="0" value={item.fabrication_hours || ""} onChange={e => updateItem(index, 'fabrication_hours', parseFloat(e.target.value) || 0)} /></div>
                          <div><Label>Welding</Label><Input type="number" min="0" value={item.welding_hours || ""} onChange={e => updateItem(index, 'welding_hours', parseFloat(e.target.value) || 0)} /></div>
                          <div><Label>Finishing</Label><Input type="number" min="0" value={item.finishing_hours || ""} onChange={e => updateItem(index, 'finishing_hours', parseFloat(e.target.value) || 0)} /></div>
                        </div>
                        <div className="mt-4 p-4 bg-white rounded-lg border text-xs">
                          <div className="flex justify-between"><span className="text-slate-500">Material Cost:</span><p className="font-medium">${(item.material_cost || 0).toFixed(2)}</p></div>
                          <div className="flex justify-between"><span className="text-slate-500">Fabrication Cost:</span><p className="font-medium">${(item.fabrication_cost || 0).toFixed(2)}</p></div>
                          <div className="flex justify-between"><span className="text-slate-500">Welding Cost:</span><p className="font-medium">${(item.welding_cost || 0).toFixed(2)}</p></div>
                          <div className="flex justify-between"><span className="text-slate-500">Finishing Cost:</span><p className="font-medium">${(item.finishing_cost || 0).toFixed(2)}</p></div>
                        </div>
                      </div>
                    ))}
                </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card className="bg-white border-0 shadow-sm sticky top-8"><CardHeader><CardTitle>Cost Summary</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-slate-600">Total Material Cost:</span><span className="font-medium text-slate-900">${totals.material.toFixed(2)}</span></div><div className="flex justify-between"><span className="text-slate-600">Total Supplies Cost:</span><span className="font-medium text-slate-900">${totals.supplies.toFixed(2)}</span></div><div className="flex justify-between"><span className="text-slate-600">Total Fabrication Cost:</span><span className="font-medium text-slate-900">${totals.fabrication.toFixed(2)}</span></div><div className="flex justify-between"><span className="text-slate-600">Total Welding Cost:</span><span className="font-medium text-slate-900">${totals.welding.toFixed(2)}</span></div><div className="flex justify-between"><span className="text-slate-600">Total Finishing Cost:</span><span className="font-medium text-slate-900">${totals.finishing.toFixed(2)}</span></div><div className="mt-4 pt-4 border-t"><div className="flex justify-between items-center"><span className="font-bold text-lg text-slate-900">Grand Total:</span><span className="font-bold text-2xl text-blue-600">${(totals.material + totals.supplies + totals.fabrication + totals.welding + totals.finishing).toFixed(2)}</span></div></div></CardContent></Card>
            <Button onClick={saveProject} disabled={isSaving} className="w-full bg-green-600 hover:bg-green-700">{isSaving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" />{isEditing ? 'Update Estimate' : 'Save Estimate'}</>}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}