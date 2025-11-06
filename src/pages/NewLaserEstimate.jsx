
import React, { useState, useEffect, useCallback } from "react";
import { LaserProject, Settings, User } from "@/entities/all";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, Plus, Trash2, ArrowLeft, Zap } from "lucide-react";

const imperialSizes = ["1/16", "1/8", "3/16", "1/4", "3/8", "1/2", "3/4"]; // Updated: Removed "1"
const materials = ["Acrylic", "Wood", "Leather"];

const parseImperialFraction = (fractionString) => {
  if (typeof fractionString !== 'string') return parseFloat(fractionString) || 0;
  let totalValue = 0;
  const wholeAndFraction = fractionString.split('-');
  if (wholeAndFraction.length === 2) {
    totalValue += parseFloat(wholeAndFraction[0]);
    fractionString = wholeAndFraction[1];
  } else {
    fractionString = wholeAndFraction[0];
  }
  const parts = fractionString.split('/');
  if (parts.length === 2) {
    const numerator = parseFloat(parts[0]);
    const denominator = parseFloat(parts[1]);
    if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
      totalValue += numerator / denominator;
    }
  } else {
    totalValue += parseFloat(fractionString) || 0;
  }
  return totalValue;
};

export default function NewLaserEstimate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [isEditing, setIsEditing] = useState(false);

  const [project, setProject] = useState({
    project_name: "",
    client_name: "",
    estimate_number: "",
    hyperlink: "",
    items: [],
    machine_rate_per_hour: 100,
    labor_rate: 75,
    fixed_setup_hours: 0.5,
    notes: ""
  });

  const [globalSettings, setGlobalSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const loadProjectForEdit = useCallback(async (projectId) => {
    try {
      const projectToEdit = await LaserProject.get(projectId);
      if (projectToEdit) {
        setProject(projectToEdit);
        setIsEditing(true);
      } else {
        console.warn(`Project with ID ${projectId} not found.`);
        navigate(createPageUrl("LaserProjects"));
      }
    } catch (error) {
      console.error('Error loading project for edit:', error);
      alert('Error loading project for edit. Please try again.');
    }
  }, [navigate]);

  const loadPrerequisites = useCallback(async () => {
    try {
      const settingsData = await Settings.list();
      const settingsObj = {};
      settingsData.forEach(setting => {
        settingsObj[setting.setting_name] = setting.setting_value;
      });
      setGlobalSettings(settingsObj);

      if (!editId) {
        const newDefaults = {
          machine_rate_per_hour: parseFloat(settingsObj.laser_machine_rate) || 100,
          labor_rate: parseFloat(settingsObj.laser_labor_rate) || 75,
          fixed_setup_hours: parseFloat(settingsObj.min_laser_setup_hours) || 0.5,
          notes: settingsObj.default_notes_template || ""
        };
        setProject(prev => ({ ...prev, ...newDefaults }));
      }
    } catch (error) {
      console.error('Error loading prerequisites:', error);
    }
    setIsLoading(false);
  }, [editId]);

  useEffect(() => {
    loadPrerequisites();
    if (editId) {
      loadProjectForEdit(editId);
    }
  }, [editId, loadPrerequisites, loadProjectForEdit]);

  const addItem = () => {
    const newItem = {
      item_type: "panel",
      description: "",
      material_type: "Acrylic",
      material_thickness: "1/4",
      quantity: 1,
      length: 24,
      width: 12,
      letter_height: 12,
      num_letters: 10,
      engrave_area_sqin: 0,
      total_cut_length_inches: 0,
      cut_speed_ipm: 20,
      engrave_speed_sqipm: 5,
      machine_time_hours: 0,
      handling_time_hours: 0,
      machine_cost: 0,
      labor_cost: 0
    };
    setProject(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const removeItem = (index) => {
    setProject(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setProject(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        
        // Auto-calculate based on item type
        if (field === 'item_type' || field === 'material_type' || field === 'material_thickness' || 
            field === 'length' || field === 'width' || field === 'letter_height' || 
            field === 'num_letters' || field === 'quantity' || field === 'engrave_area_sqin') {
          
          const perimFactor = parseFloat(globalSettings.laser_letter_perimeter_factor) || 3.5;
          
          // Reset total_cut_length_inches first to ensure correct recalculation
          updated.total_cut_length_inches = 0;

          if (updated.item_type === 'panel' || updated.item_type === 'engrave_and_cut') {
            const perimeterInches = 2 * (updated.length + updated.width);
            updated.total_cut_length_inches = perimeterInches * updated.quantity;
          } else if (updated.item_type === 'lettering') {
            const perimeterPerLetter = updated.letter_height * perimFactor;
            updated.total_cut_length_inches = perimeterPerLetter * updated.num_letters * updated.quantity;
          }
          // For 'engraving', total_cut_length_inches remains 0.
          
          // Get cut speed from settings based on thickness
          const thicknessKey = `cut_speed_${updated.material_thickness.replace('/', '_')}`;
          const baseSpeed = parseFloat(globalSettings[thicknessKey]) || 20;
          
          // Apply material multiplier
          const materialMultiplier = parseFloat(globalSettings[`${updated.material_type.toLowerCase()}_cut_multiplier`]) || 1.0;
          updated.cut_speed_ipm = baseSpeed * materialMultiplier;
          
          // Get engraving speed from settings
          updated.engrave_speed_sqipm = parseFloat(globalSettings.laser_engrave_speed_sqipm) || 5;
        }
        
        return updated;
      })
    }));
  };

  const calculateTotals = useCallback(() => {
    const handlingPercentage = parseFloat(globalSettings.handling_time_percentage) || 15;
    
    let totalMachineCost = 0;
    let totalLaborCost = 0;
    
    const updatedItems = project.items.map(item => {
      // Calculate cut time
      const cutTimeMinutes = item.total_cut_length_inches / item.cut_speed_ipm;
      
      // Calculate engrave time
      const engraveTimeMinutes = item.engrave_area_sqin / item.engrave_speed_sqipm;
      
      // Total machine time
      const totalMachineTimeMinutes = cutTimeMinutes + engraveTimeMinutes;
      const machineTimeHours = totalMachineTimeMinutes / 60;
      
      // Handling time
      const handlingTimeHours = machineTimeHours * (handlingPercentage / 100);
      
      // Costs
      const machineCost = machineTimeHours * project.machine_rate_per_hour;
      const laborCost = handlingTimeHours * project.labor_rate;
      
      totalMachineCost += machineCost;
      totalLaborCost += laborCost;
      
      return {
        ...item,
        machine_time_hours: machineTimeHours,
        handling_time_hours: handlingTimeHours,
        machine_cost: machineCost,
        labor_cost: laborCost
      };
    });
    
    // Add fixed setup time labor cost
    const fixedSetupLaborCost = project.fixed_setup_hours * project.labor_rate;
    totalLaborCost += fixedSetupLaborCost;
    
    return {
      items: updatedItems,
      total_machine_cost: totalMachineCost,
      total_labor_cost: totalLaborCost
    };
  }, [project.items, project.machine_rate_per_hour, project.labor_rate, project.fixed_setup_hours, globalSettings]);

  useEffect(() => {
    if (!isLoading && project.items.length > 0) {
      const calculated = calculateTotals();
      setProject(prev => ({
        ...prev,
        items: calculated.items,
        total_machine_cost: calculated.total_machine_cost,
        total_labor_cost: calculated.total_labor_cost
      }));
    }
  }, [calculateTotals, isLoading, project.items.length]); // Added project.items.length to dependency array to trigger recalculation when items are added/removed

  const saveProject = async () => {
    if (!project.project_name || !project.client_name || !project.estimate_number || !project.hyperlink) {
      alert('Please fill in all required project information fields');
      return;
    }

    if (project.items.length === 0) {
      alert('Please add at least one item to the project');
      return;
    }

    setIsSaving(true);
    try {
      const calculated = calculateTotals();
      const dataToSave = {
        ...project,
        items: calculated.items,
        total_machine_cost: calculated.total_machine_cost,
        total_labor_cost: calculated.total_labor_cost,
        status: 'calculated'
      };

      if (isEditing && editId) {
        await LaserProject.update(editId, dataToSave);
        alert('Project updated successfully!');
      } else {
        await LaserProject.create(dataToSave);
        alert('Project saved successfully!');
      }
      navigate(createPageUrl("LaserProjects"));
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Error saving project. Please try again.');
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Zap className="w-8 h-8" />
              {isEditing ? 'Edit' : 'New'} Laser Estimate
            </h1>
            <p className="text-slate-600">Create detailed laser cutting and engraving estimates</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate(createPageUrl("LaserProjects"))}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
            <Button onClick={saveProject} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
              {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" />Save Project</>}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Project Info */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader><CardTitle className="text-lg font-semibold text-slate-900">Project Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client_name">Client Name *</Label>
                    <Input 
                      id="client_name" 
                      value={project.client_name} 
                      onChange={(e) => setProject(prev => ({ ...prev, client_name: e.target.value }))} 
                      placeholder="Enter client name" 
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="project_name">Project Name *</Label>
                    <Input 
                      id="project_name" 
                      value={project.project_name} 
                      onChange={(e) => setProject(prev => ({ ...prev, project_name: e.target.value }))} 
                      placeholder="Enter project name" 
                      className="mt-1" 
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="estimate_number">Estimate Number *</Label>
                    <Input 
                      id="estimate_number" 
                      value={project.estimate_number} 
                      onChange={(e) => setProject(prev => ({ ...prev, estimate_number: e.target.value }))} 
                      placeholder="e.g., LASER-2024-001" 
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="hyperlink">Project Link *</Label>
                    <Input 
                      id="hyperlink" 
                      value={project.hyperlink} 
                      onChange={(e) => setProject(prev => ({ ...prev, hyperlink: e.target.value }))} 
                      placeholder="https://..." 
                      className="mt-1" 
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Project Notes</Label>
                  <Textarea 
                    id="notes" 
                    value={project.notes} 
                    onChange={(e) => setProject(prev => ({ ...prev, notes: e.target.value }))} 
                    placeholder="Any additional notes..." 
                    className="mt-1 h-24" 
                  />
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-semibold text-slate-900">Items</CardTitle>
                  <Button onClick={addItem} size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {project.items.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <p>No items added yet. Click "Add Item" to get started.</p>
                  </div>
                ) : (
                  project.items.map((item, index) => (
                    <div key={index} className="p-6 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-slate-900">Item #{index + 1}</h4>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <Label>Description</Label>
                          <Input 
                            value={item.description} 
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder="Brief description" 
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label>Item Type</Label>
                          <Select value={item.item_type} onValueChange={(value) => updateItem(index, 'item_type', value)}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="panel">Panel (Cut Perimeter)</SelectItem>
                              <SelectItem value="lettering">Lettering (Cut Letters)</SelectItem>
                              <SelectItem value="engraving">Engraving Only</SelectItem>
                              <SelectItem value="engrave_and_cut">Engrave and Cut</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Material Type</Label>
                          <Select value={item.material_type} onValueChange={(value) => updateItem(index, 'material_type', value)}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {materials.map(mat => (
                                <SelectItem key={mat} value={mat}>{mat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Material Thickness</Label>
                          <Select value={item.material_thickness} onValueChange={(value) => updateItem(index, 'material_thickness', value)}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {imperialSizes.map(size => (
                                <SelectItem key={size} value={size}>{size}"</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Quantity</Label>
                          <Input 
                            type="number" 
                            min="1" 
                            value={item.quantity} 
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                            className="mt-1"
                          />
                        </div>

                        {(item.item_type === 'panel' || item.item_type === 'engrave_and_cut') && (
                          <>
                            <div>
                              <Label>Length (inches)</Label>
                              <Input 
                                type="number" 
                                step="0.125" 
                                value={item.length} 
                                onChange={(e) => updateItem(index, 'length', parseFloat(e.target.value) || 0)}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label>Width (inches)</Label>
                              <Input 
                                type="number" 
                                step="0.125" 
                                value={item.width} 
                                onChange={(e) => updateItem(index, 'width', parseFloat(e.target.value) || 0)}
                                className="mt-1"
                              />
                            </div>
                          </>
                        )}

                        {item.item_type === 'lettering' && (
                          <>
                            <div>
                              <Label>Letter Height (inches)</Label>
                              <Input 
                                type="number" 
                                step="0.125" 
                                value={item.letter_height} 
                                onChange={(e) => updateItem(index, 'letter_height', parseFloat(e.target.value) || 0)}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label>Number of Letters</Label>
                              <Input 
                                type="number" 
                                min="1" 
                                value={item.num_letters} 
                                onChange={(e) => updateItem(index, 'num_letters', parseFloat(e.target.value) || 0)}
                                className="mt-1"
                              />
                            </div>
                          </>
                        )}

                        {(item.item_type === 'panel' || item.item_type === 'lettering' || item.item_type === 'engrave_and_cut') && (
                          <div className="md:col-span-2 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800">
                              <strong>Total Cut Length:</strong> {item.total_cut_length_inches.toFixed(2)}" 
                              <span className="mx-2">•</span>
                              <strong>Cut Speed:</strong> {item.cut_speed_ipm.toFixed(1)} in/min
                            </p>
                          </div>
                        )}

                        {/* Engraving Section - Only for engraving and engrave_and_cut types */}
                        {(item.item_type === 'engraving' || item.item_type === 'engrave_and_cut') && (
                          <div className="md:col-span-2 border-t pt-4">
                            <Label>Engraving Area (sq inches)</Label>
                            <Input 
                              type="number" 
                              step="0.1" 
                              value={item.engrave_area_sqin} 
                              onChange={(e) => updateItem(index, 'engrave_area_sqin', parseFloat(e.target.value) || 0)}
                              placeholder="Enter engraving area"
                              className="mt-1"
                            />
                            {item.engrave_area_sqin > 0 && (
                              <p className="text-xs text-slate-500 mt-1">
                                Engrave Speed: {item.engrave_speed_sqipm.toFixed(1)} sq in/min
                              </p>
                            )}
                          </div>
                        )}

                        <div className="md:col-span-2 p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-slate-600">Machine Time</p>
                              <p className="font-semibold text-slate-900">{item.machine_time_hours.toFixed(3)} hrs</p>
                            </div>
                            <div>
                              <p className="text-slate-600">Handling Time</p>
                              <p className="font-semibold text-slate-900">{item.handling_time_hours.toFixed(3)} hrs</p>
                            </div>
                            <div>
                              <p className="text-slate-600">Machine Cost</p>
                              <p className="font-semibold text-green-700">${item.machine_cost.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-slate-600">Labor Cost</p>
                              <p className="font-semibold text-green-700">${item.labor_cost.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Advanced Settings */}
                {project.items.length > 0 && (
                  <div className="border-t pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                      className="w-full"
                    >
                      {showAdvancedSettings ? 'Hide' : 'Show'} Advanced Settings
                    </Button>
                    
                    {showAdvancedSettings && (
                      <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                          <Label>Fixed Setup Time (hours)</Label>
                          <Input 
                            type="number" 
                            step="0.1" 
                            value={project.fixed_setup_hours} 
                            onChange={(e) => setProject(prev => ({ ...prev, fixed_setup_hours: parseFloat(e.target.value) || 0 }))}
                            className="mt-1"
                          />
                          <p className="text-xs text-slate-500 mt-1">One-time setup cost applied to the entire project</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div>
            <Card className="bg-white border-0 shadow-sm sticky top-8">
              <CardHeader><CardTitle>Project Summary</CardTitle></CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-4">
                  <div>
                    <Label>Machine Rate ($/hr)</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={project.machine_rate_per_hour} 
                      onChange={(e) => setProject(prev => ({ ...prev, machine_rate_per_hour: parseFloat(e.target.value) || 0 }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Labor Rate ($/hr)</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={project.labor_rate} 
                      onChange={(e) => setProject(prev => ({ ...prev, labor_rate: parseFloat(e.target.value) || 0 }))}
                      className="mt-1"
                    />
                  </div>
                  {/* Fixed Setup Time (hrs) input removed from here and moved to advanced settings */}
                </div>

                <div className="border-t pt-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Total Items:</span>
                    <span className="font-medium">{project.items.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Machine Cost:</span>
                    <span className="font-medium">${(project.total_machine_cost || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Labor Cost:</span>
                    <span className="font-medium">${(project.total_labor_cost || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-3">
                    <span>TOTAL:</span>
                    <span className="text-green-600">${((project.total_machine_cost || 0) + (project.total_labor_cost || 0)).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
