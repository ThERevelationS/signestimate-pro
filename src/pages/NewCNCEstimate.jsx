
import React, { useState, useEffect } from "react";
import { CNCProject, Settings } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Save, Router } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const imperialSizes = ["1/16", "1/8", "3/16", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8", "1", "1-1/4", "1-1/2", "2", "2-1/2", "3", "3-1/2", "4"];
const materials = ["Acrylic", "Wood", "MDF", "Plywood", "PVC", "HDPE", "Aluminum", "Corian"];

export default function NewCNCEstimate() {
  const navigate = useNavigate();
  const [project, setProject] = useState({
    project_name: "",
    client_name: "",
    items: [],
    machine_rate_per_hour: 75,
    labor_rate: 45,
    setup_time_percentage: 20, // New field
    fixed_setup_hours: 0, // New field
    notes: ""
  });
  const [globalSettings, setGlobalSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPrerequisites();
  }, []);

  const loadPrerequisites = async () => {
    try {
      const settingsData = await Settings.list();
      const settingsObj = {};
      settingsData.forEach(s => { settingsObj[s.setting_name] = s.setting_value; });
      setGlobalSettings(settingsObj);
      
      // Initialize project settings from global settings for a new estimate
      setProject(prev => ({
        ...prev,
        machine_rate_per_hour: parseFloat(settingsObj.cnc_machine_rate) || 75,
        labor_rate: parseFloat(settingsObj.cnc_labor_rate) || 45,
        setup_time_percentage: parseFloat(settingsObj.cnc_setup_time_percentage) || 20, // Initialize new field
        fixed_setup_hours: parseFloat(settingsObj.min_cnc_setup_hours) || 0, // Initialize new field
        notes: settingsObj.default_notes_template || ""
      }));
    } catch (error) {
      console.error('Error loading prerequisites:', error);
    }
    setIsLoading(false);
  };

  const addItem = () => {
    setProject(prev => ({
      ...prev,
      items: [...prev.items, {
        item_type: "panel",
        description: "",
        material_type: "Wood",
        material_thickness: "3/4",
        quantity: 1,
        length: 0,
        width: 0,
        letter_height: 0,
        num_letters: 0,
        carve_area_sqin: 0,
        carve_depth: 0.125,
        cut_speed_ipm: 50,
        carve_speed_sqipm: 10,
        machine_time_hours: 0,
        setup_time_hours: 0,
        machine_cost: 0,
        labor_cost: 0,
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

      // Auto-set cut speed based on thickness for CNC
      if (field === 'material_thickness') {
        const speedSettingKey = `cnc_cut_speed_${value.replace('/', '_').replace('-', '_')}`;
        item.cut_speed_ipm = parseFloat(globalSettings[speedSettingKey]) || 50;
      }
      
      // Calculate cut length based on item type
      const letterPerimFactor = parseFloat(globalSettings.cnc_letter_perimeter_factor) || 3.5;
      
      let cutLength = 0;
      if (item.item_type === 'panel') {
        cutLength = (item.length + item.width) * 2;
      } else if (item.item_type === 'lettering') {
        cutLength = item.letter_height * letterPerimFactor * item.num_letters;
      }
      
      // Machine Time calculation
      const materialCutMultiplierKey = `${item.material_type.toLowerCase()}_cnc_cut_multiplier`;
      const cutMultiplier = parseFloat(globalSettings[materialCutMultiplierKey]) || 1.0;
      const cutTimeMinutes = cutLength > 0 && item.cut_speed_ipm > 0 
        ? (cutLength / item.cut_speed_ipm) * cutMultiplier : 0;
      
      const carveTimeMinutes = item.carve_area_sqin > 0 && item.carve_speed_sqipm > 0 
        ? item.carve_area_sqin / item.carve_speed_sqipm : 0;
      
      const machineTimeHours = ((cutTimeMinutes + carveTimeMinutes) * item.quantity) / 60;
      item.machine_time_hours = machineTimeHours;

      // Setup time calculation - use project's setup_time_percentage
      const setupTimePercentage = prev.setup_time_percentage; 
      const setupTimeHours = machineTimeHours * (setupTimePercentage / 100);
      item.setup_time_hours = setupTimeHours;

      // Costs
      item.machine_cost = machineTimeHours * prev.machine_rate_per_hour;
      item.labor_cost = setupTimeHours * prev.labor_rate;
      
      newItems[index] = { ...item };
      return { ...prev, items: newItems };
    });
  };

  const calculateTotals = () => {
    const totalMachineCost = project.items.reduce((sum, item) => sum + (item.machine_cost || 0), 0);
    let totalLaborCost = project.items.reduce((sum, item) => sum + (item.labor_cost || 0), 0);
    const totalSetupHours = project.items.reduce((sum, item) => sum + (item.setup_time_hours || 0), 0);
    
    // Add fixed setup time to labor cost
    totalLaborCost += (project.fixed_setup_hours || 0) * project.labor_rate;

    const minLaborHours = parseFloat(globalSettings.min_cnc_labor_hours) || 0;
    
    // If calculated item setup time is less than minimum, override with minimum.
    // Note: fixed_setup_hours are added *before* this check, so they are part of the base labor cost.
    // This minLaborHours check applies to the dynamic setup time calculated per item.
    if (totalSetupHours > 0 && totalSetupHours < minLaborHours) {
        // If the *item specific* calculated setup hours are less than the minimum,
        // we replace the item-specific labor cost portion with the min labor hours cost.
        // It's important to consider if minLaborHours is meant to replace *all* labor or just dynamic.
        // For simplicity, let's assume if the sum of dynamic setup hours is below min,
        // the *dynamic part* of the labor cost is adjusted.
        // The current implementation is simple: if *any* dynamic setup time exists and is below min,
        // it sets the *entire* dynamic labor cost to the min.
        // To be precise: subtract existing dynamic labor, then add min labor for dynamic portion.
        // For this scenario, assuming min_cnc_labor_hours acts as a floor for *combined* item setup time.
        // We'll re-calculate the labor cost as min_cnc_labor_hours * labor_rate,
        // but only for the *dynamic* portion, retaining the fixed_setup_hours cost.
        const dynamicLaborFromItems = project.items.reduce((sum, item) => sum + (item.labor_cost || 0), 0);
        totalLaborCost = (totalLaborCost - dynamicLaborFromItems) + (minLaborHours * project.labor_rate);
    }

    return { totalMachine: totalMachineCost, totalLabor: totalLaborCost };
  };

  const saveProject = async () => {
    if (!project.project_name || !project.client_name) {
      alert('Please fill in project name and client name');
      return;
    }
    
    setIsSaving(true);
    try {
      const { totalMachine, totalLabor } = calculateTotals();
      const finalProject = { ...project, total_machine_cost: totalMachine, total_labor_cost: totalLabor, status: 'calculated' }
      
      await CNCProject.create(finalProject);
      navigate(createPageUrl("CNCProjects"));
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Error saving project. Please try again.');
    }
    setIsSaving(false);
  };

  const { totalMachine, totalLabor } = calculateTotals();

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("CNCProjects")}><Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Router className="w-6 h-6" />
              New CNC Estimate
            </h1>
            <p className="text-slate-600">Estimate costs for CNC routing and carving jobs</p>
          </div>
        </div>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader><CardTitle>Project Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div><Label>Project Name *</Label><Input value={project.project_name} onChange={(e) => setProject(p => ({ ...p, project_name: e.target.value }))} /></div>
                  <div><Label>Client Name *</Label><Input value={project.client_name} onChange={(e) => setProject(p => ({ ...p, client_name: e.target.value }))} /></div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Fixed Setup Time (hours)</Label>
                    <Input type="number" min="0" value={project.fixed_setup_hours} onFocus={(e) => e.target.select()} onChange={(e) => setProject(p => ({...p, fixed_setup_hours: parseFloat(e.target.value) || 0}))} />
                  </div>
                  <div>
                    <Label>Setup Time Percentage (%)</Label>
                    <Input type="number" min="0" max="100" value={project.setup_time_percentage} onFocus={(e) => e.target.select()} onChange={(e) => setProject(p => ({...p, setup_time_percentage: parseFloat(e.target.value) || 0}))} />
                    <p className="text-xs text-slate-500 mt-1">Percentage of machine time added as labor setup time per item.</p>
                  </div>
                </div>
                <div><Label>Notes</Label><Textarea value={project.notes} onChange={(e) => setProject(p => ({ ...p, notes: e.target.value }))} /></div>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Project Items</CardTitle>
                  <Button onClick={addItem} size="sm"><Plus className="w-4 h-4 mr-2" />Add Item</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {project.items.map((item, index) => (
                  <div key={index} className="p-6 border rounded-xl bg-slate-25">
                    <div className="flex justify-between items-start mb-4"><h4 className="font-medium">Item {index + 1}</h4><Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button></div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="md:col-span-3"><Label>Description</Label><Input value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} /></div>
                      <div><Label>Job Type</Label><Select value={item.item_type} onValueChange={(v) => updateItem(index, 'item_type', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="panel">Panel Cut</SelectItem><SelectItem value="lettering">Lettering Cut</SelectItem><SelectItem value="3d_carving">3D Carving</SelectItem></SelectContent></Select></div>
                      <div><Label>Material Type</Label><Select value={item.material_type} onValueChange={(v) => updateItem(index, 'material_type', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{materials.map(mat => <SelectItem key={mat} value={mat}>{mat}</SelectItem>)}</SelectContent></Select></div>
                      <div><Label>Material Thickness</Label><Select value={item.material_thickness} onValueChange={(v) => updateItem(index, 'material_thickness', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{imperialSizes.map(size => <SelectItem key={size} value={size}>{size}"</SelectItem>)}</SelectContent></Select></div>
                      <div><Label>Quantity</Label><Input type="number" min="1" value={item.quantity || ""} onFocus={(e) => e.target.select()} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)} /></div>
                      
                      {item.item_type === 'panel' && (<><div><Label>Length (in)</Label><Input type="number" min="0" value={item.length || ""} onFocus={(e) => e.target.select()} onChange={e => updateItem(index, 'length', parseFloat(e.target.value) || 0)} /></div><div><Label>Height (in)</Label><Input type="number" min="0" value={item.width || ""} onFocus={(e) => e.target.select()} onChange={e => updateItem(index, 'width', parseFloat(e.target.value) || 0)} /></div></>)}
                      
                      {item.item_type === 'lettering' && (<><div><Label>Letter Height (in)</Label><Input type="number" min="0" value={item.letter_height || ""} onFocus={(e) => e.target.select()} onChange={e => updateItem(index, 'letter_height', parseFloat(e.target.value) || 0)} /></div><div><Label>Number of Letters</Label><Input type="number" min="0" value={item.num_letters || ""} onFocus={(e) => e.target.select()} onChange={e => updateItem(index, 'num_letters', parseInt(e.target.value) || 0)} /></div></>)}
                      
                      {item.item_type === '3d_carving' && (<><div><Label>Carve Area (in²)</Label><Input type="number" min="0" value={item.carve_area_sqin || ""} onFocus={(e) => e.target.select()} onChange={e => updateItem(index, 'carve_area_sqin', parseFloat(e.target.value) || 0)} /></div><div><Label>Carve Depth (in)</Label><Input type="number" min="0" step="0.125" value={item.carve_depth || ""} onFocus={(e) => e.target.select()} onChange={e => updateItem(index, 'carve_depth', parseFloat(e.target.value) || 0)} /></div></>)}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t grid md:grid-cols-2 gap-4">
                      {item.item_type !== '3d_carving' && (<div><Label>Cut Speed (in/min)</Label><Input type="number" min="0" value={item.cut_speed_ipm || ""} onFocus={(e) => e.target.select()} onChange={(e) => updateItem(index, 'cut_speed_ipm', parseFloat(e.target.value) || 0)} placeholder="Auto-calculated" /><p className="text-xs text-slate-500 mt-1">Auto-set by thickness, can be overridden.</p></div>)}
                      {item.item_type === '3d_carving' && (<div><Label>Carve Speed (in²/min)</Label><Input type="number" min="0" value={item.carve_speed_sqipm || ""} onFocus={(e) => e.target.select()} onChange={(e) => updateItem(index, 'carve_speed_sqipm', parseFloat(e.target.value) || 0)} /></div>)}
                    </div>
                    
                    <div className="mt-4 p-4 bg-white rounded-lg border">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div><span className="text-slate-500">Machine Time:</span><p className="font-medium">{(item.machine_time_hours || 0).toFixed(1)} hrs</p></div>
                        <div><span className="text-slate-500">Machine Cost:</span><p className="font-medium">${(item.machine_cost || 0).toFixed(2)}</p></div>
                        <div><span className="text-slate-500">Setup Time:</span><p className="font-medium">{(item.setup_time_hours || 0).toFixed(1)} hrs</p></div>
                        <div><span className="text-slate-500">Labor Cost:</span><p className="font-semibold">${(item.labor_cost || 0).toFixed(2)}</p></div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card className="bg-white border-0 shadow-sm sticky top-8">
              <CardHeader><CardTitle>Cost Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-green-800">Total Machine Cost:</span>
                    <span className="font-bold text-lg text-green-900">${totalMachine.toFixed(2)}</span>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-blue-800">Total Labor Cost:</span>
                    <span className="font-bold text-lg text-blue-900">${totalLabor.toFixed(2)}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-slate-500 text-center">Using rates from <Link to={createPageUrl("CNCSettings")} className="text-blue-600 underline">CNC Settings</Link></p>
                </div>
              </CardContent>
            </Card>
            <Button onClick={saveProject} disabled={isSaving} className="w-full bg-green-600 hover:bg-green-700">{isSaving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" />Save Estimate</>}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
