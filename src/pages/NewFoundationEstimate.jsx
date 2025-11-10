
import React, { useState, useEffect, useCallback } from "react";
import { FoundationProject, Settings } from "@/entities/all";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, Plus, Trash2, ArrowLeft, Anchor } from "lucide-react";
import Foundation3DViewer from "@/components/Foundation3DViewer";

export default function NewFoundationEstimate() {
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
    concrete_cost_per_cy: 135,
    rebar_cost_per_ft: 0.75,
    excavation_cost_per_cy: 15,
    forming_labor_rate: 55,
    pouring_labor_rate: 60,
    finishing_labor_rate: 50,
    notes: ""
  });

  const [globalSettings, setGlobalSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadProjectForEdit = useCallback(async (projectId) => {
    try {
      const projectToEdit = await FoundationProject.get(projectId);
      if (projectToEdit) {
        setProject(projectToEdit);
        setIsEditing(true);
      } else {
        console.warn(`Project with ID ${projectId} not found.`);
        navigate(createPageUrl("FoundationProjects"));
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
          concrete_cost_per_cy: parseFloat(settingsObj.foundation_concrete_cost_per_cy) || 135,
          rebar_cost_per_ft: parseFloat(settingsObj.foundation_rebar_cost_per_ft) || 0.75,
          excavation_cost_per_cy: parseFloat(settingsObj.foundation_excavation_cost_per_cy) || 15,
          forming_labor_rate: parseFloat(settingsObj.foundation_forming_labor_rate) || 55,
          pouring_labor_rate: parseFloat(settingsObj.foundation_pouring_labor_rate) || 60,
          finishing_labor_rate: parseFloat(settingsObj.foundation_finishing_labor_rate) || 50,
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
      foundation_type: "spread_foot",
      description: "",
      quantity: 1,
      length_inches: 48,
      width_inches: 48,
      diameter: 24,
      depth_inches: 36,
      include_rebar: true,
      rebar_size: "#4",
      rebar_spacing_length: 18,
      rebar_spacing_width: 18,
      concrete_volume_cy: 0,
      excavation_volume_cy: 0,
      concrete_cost: 0,
      rebar_cost: 0,
      excavation_cost: 0,
      forming_hours: 0,
      forming_cost: 0,
      pouring_hours: 0,
      pouring_cost: 0,
      finishing_hours: 0,
      finishing_cost: 0,
      item_total_cost: 0
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

        // Auto-calculate volumes when dimensions change
        if (field === 'foundation_type' || field === 'length_inches' || field === 'width_inches' ||
            field === 'diameter' || field === 'depth_inches' || field === 'quantity') {

          if (updated.foundation_type === 'spread_foot') {
            // Convert inches to feet for volume calculation
            const lengthFeet = updated.length_inches / 12;
            const widthFeet = updated.width_inches / 12;
            const depthFeet = updated.depth_inches / 12;
            
            const volumeCubicFeet = lengthFeet * widthFeet * depthFeet;
            updated.concrete_volume_cy = (volumeCubicFeet / 27);
            
            // Excavation is typically 1 foot larger on each side (total 2 feet additional length/width)
            const excavationLength = lengthFeet + 1;
            const excavationWidth = widthFeet + 1;
            const excavationVolume = excavationLength * excavationWidth * depthFeet;
            updated.excavation_volume_cy = (excavationVolume / 27);
          } else if (updated.foundation_type === 'pillar') {
            const depthFeet = updated.depth_inches / 12;
            const radiusFeet = (updated.diameter / 12) / 2;
            const volumeCubicFeet = Math.PI * Math.pow(radiusFeet, 2) * depthFeet;
            updated.concrete_volume_cy = (volumeCubicFeet / 27);
            updated.excavation_volume_cy = updated.concrete_volume_cy;
          }
        }

        return updated;
      })
    }));
  };

  const calculateTotals = useCallback(() => {
    const formingHoursPerSqFt = parseFloat(globalSettings.foundation_forming_hours_per_sqft) || 0.15;
    const pouringHoursPerCy = parseFloat(globalSettings.foundation_pouring_hours_per_cy) || 0.5;
    const finishingHoursPerSqFt = parseFloat(globalSettings.foundation_finishing_hours_per_sqft) || 0.10;

    let totalConcreteCost = 0;
    let totalRebarCost = 0;
    let totalExcavationCost = 0;
    let totalLaborCost = 0;

    const updatedItems = project.items.map(item => {
      // Material costs
      const concreteCost = item.concrete_volume_cy * project.concrete_cost_per_cy * item.quantity;
      
      // Calculate rebar cost based on spacing
      let rebarCost = 0;
      if (item.include_rebar && item.foundation_type === 'spread_foot') {
        const lengthFeet = item.length_inches / 12;
        const widthFeet = item.width_inches / 12;
        const depthFeet = item.depth_inches / 12;
        
        // Calculate number of rebars based on 18" spacing
        const numRebarsLengthwise = Math.floor(widthFeet * 12 / item.rebar_spacing_width) + 1; // Bars running length-wise, based on width spacing
        const numRebarsWidthwise = Math.floor(lengthFeet * 12 / item.rebar_spacing_length) + 1; // Bars running width-wise, based on length spacing
        
        // Calculate layers based on depth
        const firstLayerOffset = 3; // 3 inches from top
        const layerSpacing = 18; // 18 inches between layers
        // If depth_inches <= firstLayerOffset, this will correctly result in 0 layers
        const numLayers = Math.max(0, Math.floor((item.depth_inches - firstLayerOffset) / layerSpacing) + 1);
        
        // Total rebar: lengthwise bars + crosswise bars, multiplied by layers
        const totalLengthwiseRebarFeet = numRebarsLengthwise * lengthFeet * numLayers;
        const totalWidthwiseRebarFeet = numRebarsWidthwise * widthFeet * numLayers;
        const totalRebarFeet = (totalLengthwiseRebarFeet + totalWidthwiseRebarFeet) * item.quantity;
        
        rebarCost = totalRebarFeet * project.rebar_cost_per_ft;
      }
      
      const excavationCost = item.excavation_volume_cy * project.excavation_cost_per_cy * item.quantity;

      // Labor calculations
      let formingSqFt = 0;
      let finishingSqFt = 0;

      if (item.foundation_type === 'spread_foot') {
        const lengthFeet = item.length_inches / 12;
        const widthFeet = item.width_inches / 12;
        const depthFeet = item.depth_inches / 12;
        
        const perimeter = 2 * (lengthFeet + widthFeet);
        formingSqFt = perimeter * depthFeet;
        finishingSqFt = lengthFeet * widthFeet;
      } else if (item.foundation_type === 'pillar') {
        const depthFeet = item.depth_inches / 12;
        const circumference = Math.PI * (item.diameter / 12);
        formingSqFt = circumference * depthFeet;
        
        const radiusFeet = (item.diameter / 12) / 2;
        finishingSqFt = Math.PI * Math.pow(radiusFeet, 2);
      }

      const formingHours = formingSqFt * formingHoursPerSqFt * item.quantity;
      const pouringHours = item.concrete_volume_cy * pouringHoursPerCy * item.quantity;
      const finishingHours = finishingSqFt * finishingHoursPerSqFt * item.quantity;

      const formingCost = formingHours * project.forming_labor_rate;
      const pouringCost = pouringHours * project.pouring_labor_rate;
      const finishingCost = finishingHours * project.finishing_labor_rate;

      const itemTotalCost = concreteCost + rebarCost + excavationCost + formingCost + pouringCost + finishingCost;

      totalConcreteCost += concreteCost;
      totalRebarCost += rebarCost;
      totalExcavationCost += excavationCost;
      totalLaborCost += (formingCost + pouringCost + finishingCost);

      return {
        ...item,
        concrete_cost: concreteCost,
        rebar_cost: rebarCost,
        excavation_cost: excavationCost,
        forming_hours: formingHours,
        forming_cost: formingCost,
        pouring_hours: pouringHours,
        pouring_cost: pouringCost,
        finishing_hours: finishingHours,
        finishing_cost: finishingCost,
        item_total_cost: itemTotalCost
      };
    });

    return {
      items: updatedItems,
      total_concrete_cost: totalConcreteCost,
      total_rebar_cost: totalRebarCost,
      total_excavation_cost: totalExcavationCost,
      total_labor_cost: totalLaborCost
    };
  }, [project.items, project.concrete_cost_per_cy, project.rebar_cost_per_ft,
      project.excavation_cost_per_cy, project.forming_labor_rate,
      project.pouring_labor_rate, project.finishing_labor_rate, globalSettings]);

  useEffect(() => {
    if (!isLoading && project.items.length > 0) {
      const calculated = calculateTotals();
      setProject(prev => ({
        ...prev,
        items: calculated.items,
        total_concrete_cost: calculated.total_concrete_cost,
        total_rebar_cost: calculated.total_rebar_cost,
        total_excavation_cost: calculated.total_excavation_cost,
        total_labor_cost: calculated.total_labor_cost
      }));
    }
  }, [calculateTotals, isLoading, project.items.length]);

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
        total_concrete_cost: calculated.total_concrete_cost,
        total_rebar_cost: calculated.total_rebar_cost,
        total_excavation_cost: calculated.total_excavation_cost,
        total_labor_cost: calculated.total_labor_cost,
        status: 'calculated'
      };

      if (isEditing && editId) {
        await FoundationProject.update(editId, dataToSave);
        alert('Project updated successfully!');
      } else {
        await FoundationProject.create(dataToSave);
        alert('Project saved successfully!');
      }
      navigate(createPageUrl("FoundationProjects"));
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
    <div className="p-3 md:p-6 bg-slate-50 min-h-screen">
      <div className="w-full mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Anchor className="w-8 h-8" />
              {isEditing ? 'Edit' : 'New'} Foundation Estimate
            </h1>
            <p className="text-slate-600">Create detailed foundation estimates with Ernst Concrete pricing</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate(createPageUrl("FoundationProjects"))}>
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
                      placeholder="e.g., FOUND-2024-001"
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
                  <CardTitle className="text-lg font-semibold text-slate-900">Foundations</CardTitle>
                  <Button onClick={addItem} size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Foundation
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {project.items.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <p>No foundations added yet. Click "Add Foundation" to get started.</p>
                  </div>
                ) : (
                  project.items.map((item, index) => (
                    <div key={index} className="p-6 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-slate-900">Foundation #{index + 1}</h4>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex flex-col gap-4">
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
                            <Label>Foundation Type</Label>
                            <Select value={item.foundation_type} onValueChange={(value) => updateItem(index, 'foundation_type', value)}>
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="spread_foot">Spread Foot (Rectangular)</SelectItem>
                                <SelectItem value="pillar">Pillar (Cylindrical)</SelectItem>
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

                          {item.foundation_type === 'spread_foot' && (
                            <>
                              <div>
                                <Label>Length (inches)</Label>
                                <Input
                                  type="number"
                                  step="1"
                                  value={item.length_inches}
                                  onChange={(e) => updateItem(index, 'length_inches', parseFloat(e.target.value) || 0)}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label>Width (inches)</Label>
                                <Input
                                  type="number"
                                  step="1"
                                  value={item.width_inches}
                                  onChange={(e) => updateItem(index, 'width_inches', parseFloat(e.target.value) || 0)}
                                  className="mt-1"
                                />
                              </div>
                            </>
                          )}

                          {item.foundation_type === 'pillar' && (
                            <div>
                              <Label>Diameter (inches)</Label>
                              <Input
                                type="number"
                                step="1"
                                value={item.diameter}
                                onChange={(e) => updateItem(index, 'diameter', parseFloat(e.target.value) || 0)}
                                className="mt-1"
                              />
                            </div>
                          )}

                          <div>
                            <Label>Depth (inches)</Label>
                            <Input
                              type="number"
                              step="1"
                              value={item.depth_inches}
                              onChange={(e) => updateItem(index, 'depth_inches', parseFloat(e.target.value) || 0)}
                              className="mt-1"
                            />
                          </div>
                        </div>

                        {item.foundation_type === 'spread_foot' && (
                          <div className="md:col-span-2 border-t pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <Label htmlFor={`include-rebar-${index}`} className="font-medium text-slate-800">Include Rebar Reinforcement</Label>
                              <input
                                id={`include-rebar-${index}`}
                                type="checkbox"
                                checked={item.include_rebar || false}
                                onChange={(e) => updateItem(index, 'include_rebar', e.target.checked)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </div>
                            {item.include_rebar && (
                              <>
                                <div className="mb-4">
                                  <Label className="text-sm font-medium text-blue-900 mb-2 block">3D Foundation Preview - Interactive (Click & Drag to Rotate)</Label>
                                  <div className="h-96 rounded-lg overflow-hidden">
                                    <Foundation3DViewer
                                      lengthInches={item.length_inches || 48}
                                      widthInches={item.width_inches || 48}
                                      depthInches={item.depth_inches || 36}
                                      rebarSize={item.rebar_size || "#4"}
                                      rebarSpacingLength={item.rebar_spacing_length || 18}
                                      rebarSpacingWidth={item.rebar_spacing_width || 18}
                                      includeRebar={item.include_rebar}
                                    />
                                  </div>
                                  <p className="text-xs text-blue-700 mt-2 text-center">
                                    <strong>Foundation:</strong> {item.length_inches}" L × {item.width_inches}" W × {item.depth_inches}" D |
                                    <strong> Rebar:</strong> {item.rebar_size} @ {item.rebar_spacing_length}" lengthwise & {item.rebar_spacing_width}" width spacing
                                    {(() => {
                                      const firstLayerOffset = 3;
                                      const layerSpacing = 18;
                                      const numLayers = Math.max(0, Math.floor((item.depth_inches - firstLayerOffset) / layerSpacing) + 1);
                                      return ` in ${numLayers} layer${numLayers !== 1 ? 's' : ''} (3" from top, 18" spacing)`;
                                    })()}
                                  </p>
                                </div>

                                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                                  <div className="mb-3">
                                    <p className="text-sm font-semibold text-blue-900 mb-1">Steel Reinforcement Grid</p>
                                    <p className="text-xs text-blue-700">Rebar bars are spaced evenly in both directions with layers at 3" from top, then every 18".</p>
                                  </div>
                                  <div className="grid grid-cols-3 gap-4">
                                    <div>
                                      <Label className="text-xs">Rebar Size</Label>
                                      <select
                                        value={item.rebar_size || "#4"}
                                        onChange={(e) => updateItem(index, 'rebar_size', e.target.value)}
                                        className="mt-1 w-full px-3 py-2 border border-blue-200 rounded-md bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      >
                                        <option value="#3">#3 (3/8")</option>
                                        <option value="#4">#4 (1/2")</option>
                                        <option value="#5">#5 (5/8")</option>
                                        <option value="#6">#6 (3/4")</option>
                                      </select>
                                    </div>
                                    <div>
                                      <Label className="text-xs">Lengthwise Spacing (inches)</Label>
                                      <Input
                                        type="number"
                                        min="6"
                                        step="1"
                                        value={item.rebar_spacing_length || 18}
                                        onChange={(e) => updateItem(index, 'rebar_spacing_length', parseFloat(e.target.value) || 18)}
                                        className="mt-1 border-blue-200 focus:ring-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Width Spacing (inches)</Label>
                                      <Input
                                        type="number"
                                        min="6"
                                        step="1"
                                        value={item.rebar_spacing_width || 18}
                                        onChange={(e) => updateItem(index, 'rebar_spacing_width', parseFloat(e.target.value) || 18)}
                                        className="mt-1 border-blue-200 focus:ring-blue-500"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        <div className="md:col-span-2 p-3 bg-blue-50 rounded-lg">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <p><strong>Concrete:</strong> {item.concrete_volume_cy.toFixed(2)} cy</p>
                            <p><strong>Excavation:</strong> {item.excavation_volume_cy.toFixed(2)} cy</p>
                            <p><strong>Forming:</strong> {item.forming_hours.toFixed(2)} hrs</p>
                            <p><strong>Pouring:</strong> {item.pouring_hours.toFixed(2)} hrs</p>
                            <p><strong>Finishing:</strong> {item.finishing_hours.toFixed(2)} hrs</p>
                          </div>
                        </div>

                        <div className="md:col-span-2 p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-slate-600">Concrete Cost</p>
                              <p className="font-semibold text-green-700">${item.concrete_cost.toFixed(2)}</p>
                            </div>
                            {item.include_rebar && (
                              <div>
                                <p className="text-slate-600">Rebar Cost</p>
                                <p className="font-semibold text-green-700">${item.rebar_cost.toFixed(2)}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-slate-600">Excavation Cost</p>
                              <p className="font-semibold text-green-700">${item.excavation_cost.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-slate-600">Total Labor</p>
                              <p className="font-semibold text-green-700">${(item.forming_cost + item.pouring_cost + item.finishing_cost).toFixed(2)}</p>
                            </div>
                            <div className="col-span-2 border-t border-green-200 pt-2 mt-2">
                              <p className="text-slate-600">Item Total</p>
                              <p className="font-bold text-green-800 text-lg">${item.item_total_cost.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
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
                    <Label>Concrete Cost ($/cy)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={project.concrete_cost_per_cy}
                      onChange={(e) => setProject(prev => ({ ...prev, concrete_cost_per_cy: parseFloat(e.target.value) || 0 }))}
                      className="mt-1"
                    />
                    <p className="text-xs text-slate-500 mt-1">Ernst Concrete pricing</p>
                  </div>
                  <div>
                    <Label>Rebar Cost ($/ft)</Label>
                    <Input
                      type="number"
                      step="0.05"
                      value={project.rebar_cost_per_ft}
                      onChange={(e) => setProject(prev => ({ ...prev, rebar_cost_per_ft: parseFloat(e.target.value) || 0 }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Excavation Cost ($/cy)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={project.excavation_cost_per_cy}
                      onChange={(e) => setProject(prev => ({ ...prev, excavation_cost_per_cy: parseFloat(e.target.value) || 0 }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Forming Rate ($/hr)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={project.forming_labor_rate}
                      onChange={(e) => setProject(prev => ({ ...prev, forming_labor_rate: parseFloat(e.target.value) || 0 }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Pouring Rate ($/hr)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={project.pouring_labor_rate}
                      onChange={(e) => setProject(prev => ({ ...prev, pouring_labor_rate: parseFloat(e.target.value) || 0 }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Finishing Rate ($/hr)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={project.finishing_labor_rate}
                      onChange={(e) => setProject(prev => ({ ...prev, finishing_labor_rate: parseFloat(e.target.value) || 0 }))}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="border-t pt-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Total Items:</span>
                    <span className="font-medium">{project.items.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Concrete:</span>
                    <span className="font-medium">${(project.total_concrete_cost || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Rebar:</span>
                    <span className="font-medium">${(project.total_rebar_cost || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Excavation:</span>
                    <span className="font-medium">${(project.total_excavation_cost || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Labor:</span>
                    <span className="font-medium">${(project.total_labor_cost || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-3">
                    <span>TOTAL:</span>
                    <span className="text-green-600">${((project.total_concrete_cost || 0) + (project.total_rebar_cost || 0) + (project.total_excavation_cost || 0) + (project.total_labor_cost || 0)).toFixed(2)}</span>
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
