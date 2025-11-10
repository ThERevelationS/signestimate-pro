
import React, { useState, useEffect, useCallback } from "react";
import { FoundationProject, Settings, FoundationInventory } from "@/entities/all";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, Plus, Trash2, ArrowLeft, Anchor, ChevronDown, ChevronUp } from "lucide-react";
import Foundation3DViewer from "@/components/Foundation3DViewer";

export default function NewFoundationEstimate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [isEditing, setIsEditing] = useState(false);
  const [expandedAdvanced, setExpandedAdvanced] = useState({});

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
    notes: "",
    selected_equipment: []
  });

  const [globalSettings, setGlobalSettings] = useState({});
  const [equipment, setEquipment] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const toggleAdvanced = (index) => {
    setExpandedAdvanced(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

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
      const [settingsData, equipmentData] = await Promise.all([
        Settings.list(),
        FoundationInventory.filter({ material_type: 'excavation_equipment' })
      ]);
      
      const settingsObj = {};
      settingsData.forEach(setting => {
        settingsObj[setting.setting_name] = setting.setting_value;
      });
      setGlobalSettings(settingsObj);
      setEquipment(equipmentData);

      if (!editId) {
        const newDefaults = {
          concrete_cost_per_cy: parseFloat(settingsObj.foundation_concrete_cost_per_cy) || 135,
          rebar_cost_per_ft: parseFloat(settingsObj.foundation_rebar_cost_per_ft) || 0.75,
          excavation_cost_per_cy: parseFloat(settingsObj.foundation_excavation_cost_per_cy) || 15,
          forming_labor_rate: parseFloat(settingsObj.foundation_forming_labor_rate) || 55,
          pouring_labor_rate: parseFloat(settingsObj.foundation_pouring_labor_rate) || 60,
          finishing_labor_rate: parseFloat(settingsObj.foundation_finishing_labor_rate) || 50,
          notes: settingsObj.default_notes_template || "",
          selected_equipment: []
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

  const checkAndAddEquipment = useCallback((items) => {
    // Check if any foundation needs equipment (>= 0.5 cy excavation OR > 36" deep)
    const needsEquipment = items.some(item => 
      item.excavation_volume_cy >= 0.5 || item.depth_inches > 36
    );

    setProject(prev => {
      const currentEquipment = prev.selected_equipment || [];
      
      // If needs equipment but none added, add default equipment
      if (needsEquipment && currentEquipment.length === 0 && equipment.length > 0) {
        const defaultEquip = equipment[0]; // Use first available equipment
        // Calculate initial cost for the default equipment
        let initialCost = (defaultEquip.cost_per_day || 0); // Assuming 'day' is default rental_period for auto-added
        if (true) { // If include_delivery is true
          initialCost += (defaultEquip.pickup_delivery_cost || 0);
        }

        return {
          ...prev,
          selected_equipment: [{
            equipment_id: defaultEquip.id,
            rental_period: 'day',
            rental_duration: 1,
            include_delivery: true,
            equipment_cost: initialCost
          }]
        };
      }
      
      // As per instructions, if it doesn't need equipment, we don't auto-remove it here.
      // User might have added it manually or for future expansion.
      return prev;
    });
  }, [equipment]);


  const addItem = () => {
    const newItem = {
      foundation_type: "spread_foot",
      description: "",
      quantity: 1,
      length_inches: 12, // Changed from 48
      width_inches: 12,  // Changed from 48
      diameter: 24,
      depth_inches: 24,  // Changed from 36
      include_rebar: false, // Changed from true
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
      item_total_cost: 0,
      custom_concrete_cost_per_cy: undefined,
      custom_rebar_cost_per_ft: undefined,
    };
    setProject(prev => {
      const updatedItems = [...prev.items, newItem];
      setTimeout(() => checkAndAddEquipment(updatedItems), 0); // Defer check after potential state update
      return { ...prev, items: updatedItems };
    });
  };

  const removeItem = (index) => {
    setProject(prev => {
      const updatedItems = prev.items.filter((_, i) => i !== index);
      setTimeout(() => checkAndAddEquipment(updatedItems), 0); // Defer check after potential state update
      return {
        ...prev,
        items: updatedItems
      };
    });
  };

  const updateItem = (index, field, value) => {
    setProject(prev => {
      const updatedItems = prev.items.map((item, i) => {
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
            updated.excavation_volume_cy = updated.concrete_volume_cy; // For pillar, assume excavation volume similar to concrete volume
          }
        }

        return updated;
      });
      
      // Check if equipment should be auto-added after updating items
      setTimeout(() => checkAndAddEquipment(updatedItems), 0);
      
      return { ...prev, items: updatedItems };
    });
  };

  const addEquipment = () => {
    setProject(prev => ({
      ...prev,
      selected_equipment: [
        ...(prev.selected_equipment || []),
        {
          equipment_id: '',
          rental_period: 'day',
          rental_duration: 1,
          include_delivery: true,
          equipment_cost: 0
        }
      ]
    }));
  };

  const removeEquipment = (index) => {
    setProject(prev => ({
      ...prev,
      selected_equipment: prev.selected_equipment.filter((_, i) => i !== index)
    }));
  };

  const updateEquipmentItem = (index, field, value) => {
    setProject(prev => ({
      ...prev,
      selected_equipment: prev.selected_equipment.map((eq, i) => {
        if (i !== index) return eq;
        const updated = { ...eq, [field]: value };
        
        // Calculate cost when equipment or duration changes
        if (field === 'equipment_id' || field === 'rental_period' || field === 'rental_duration' || field === 'include_delivery') {
          const selectedEquip = equipment.find(e => e.id === updated.equipment_id);
          if (selectedEquip) {
            let rentalCost = 0;
            if (updated.rental_period === 'day') {
              rentalCost = (selectedEquip.cost_per_day || 0) * updated.rental_duration;
            } else if (updated.rental_period === 'week') {
              rentalCost = (selectedEquip.cost_per_week || 0) * updated.rental_duration;
            } else if (updated.rental_period === 'month') {
              rentalCost = (selectedEquip.cost_per_month || 0) * updated.rental_duration;
            }
            
            const deliveryCost = updated.include_delivery ? (selectedEquip.pickup_delivery_cost || 0) : 0;
            updated.equipment_cost = rentalCost + deliveryCost;
          }
          // The else branch `updated.equipment_cost = 0;` is removed as per instructions,
          // it will naturally be 0 if selectedEquip is not found or costs are 0.
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
      // Determine rates, using item-specific override if present, otherwise project default
      const concreteRate = (item.custom_concrete_cost_per_cy !== undefined && item.custom_concrete_cost_per_cy !== null)
        ? item.custom_concrete_cost_per_cy
        : project.concrete_cost_per_cy;

      const rebarRate = (item.custom_rebar_cost_per_ft !== undefined && item.custom_rebar_cost_per_ft !== null)
        ? item.custom_rebar_cost_per_ft
        : project.rebar_cost_per_ft;

      // Material costs
      const concreteCost = item.concrete_volume_cy * concreteRate * item.quantity;

      let rebarCost = 0;
      if (item.include_rebar && item.foundation_type === 'spread_foot') {
        const lengthFeet = item.length_inches / 12;
        const widthFeet = item.width_inches / 12;
        // const depthFeet = item.depth_inches / 12; // depth is not used directly for rebar length calc in this section

        // Calculate number of rebars based on spacing
        const numRebarsLengthwise = Math.floor(widthFeet * 12 / item.rebar_spacing_width) + 1; // Bars running length-wise, based on width spacing
        const numRebarsWidthwise = Math.floor(lengthFeet * 12 / item.rebar_spacing_length) + 1; // Bars running width-wise, based on length spacing

        // Calculate layers based on depth
        const firstLayerOffset = 3; // 3 inches from top
        const layerSpacing = 18; // 18 inches between layers
        const numLayers = Math.max(0, Math.floor((item.depth_inches - firstLayerOffset) / layerSpacing) + 1);

        // Total rebar: lengthwise bars + crosswise bars, multiplied by layers
        const totalLengthwiseRebarFeet = numRebarsLengthwise * lengthFeet * numLayers;
        const totalWidthwiseRebarFeet = numRebarsWidthwise * widthFeet * numLayers;
        const totalRebarFeet = (totalLengthwiseRebarFeet + totalWidthwiseRebarFeet) * item.quantity;

        rebarCost = totalRebarFeet * rebarRate;
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
    
    // Calculate equipment costs
    let totalEquipmentCost = 0;
    if (project.selected_equipment) {
      totalEquipmentCost = project.selected_equipment.reduce((sum, eq) => sum + (eq.equipment_cost || 0), 0);
    }

    return {
      items: updatedItems,
      total_concrete_cost: totalConcreteCost,
      total_rebar_cost: totalRebarCost,
      total_excavation_cost: totalExcavationCost,
      total_labor_cost: totalLaborCost,
      total_equipment_cost: totalEquipmentCost
    };
  }, [project.items, project.selected_equipment, project.concrete_cost_per_cy, project.rebar_cost_per_ft,
      project.excavation_cost_per_cy, project.forming_labor_rate,
      project.pouring_labor_rate, project.finishing_labor_rate, globalSettings, equipment]);

  useEffect(() => {
    if (!isLoading && project.items.length >= 0) {
      const calculated = calculateTotals();
      setProject(prev => ({
        ...prev,
        items: calculated.items,
        total_concrete_cost: calculated.total_concrete_cost,
        total_rebar_cost: calculated.total_rebar_cost,
        total_excavation_cost: calculated.total_excavation_cost,
        total_labor_cost: calculated.total_labor_cost,
        total_equipment_cost: calculated.total_equipment_cost
      }));
    }
    // Removed the else if block that cleared totals, as they will naturally be 0
    // if there are no items or selected equipment, based on calculateTotals() logic.
  }, [calculateTotals, isLoading, project.items.length, project.selected_equipment?.length]);

  const saveProject = async () => {
    if (!project.project_name || !project.client_name || !project.estimate_number || !project.hyperlink) {
      alert('Please fill in all required project information fields');
      return;
    }

    if (project.items.length === 0) { // Removed the condition for selected_equipment
      alert('Please add at least one foundation item');
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
        total_equipment_cost: calculated.total_equipment_cost,
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

                        {/* 3D Viewer - Now shown for both types */}
                        <div className="md:col-span-2 border-t pt-4">
                          <div className="mb-4">
                            <Label className="text-sm font-medium text-blue-900 mb-2 block">3D Foundation Preview - Interactive (Click & Drag to Rotate)</Label>
                            <div className="h-96 rounded-lg overflow-hidden">
                              <Foundation3DViewer
                                foundationType={item.foundation_type}
                                lengthInches={item.length_inches || 12}
                                widthInches={item.width_inches || 12}
                                depthInches={item.depth_inches || 24}
                                diameter={item.diameter || 24}
                                rebarSize={item.rebar_size || "#4"}
                                rebarSpacingLength={item.rebar_spacing_length || 18}
                                rebarSpacingWidth={item.rebar_spacing_width || 18}
                                includeRebar={item.include_rebar || false}
                              />
                            </div>
                            <p className="text-xs text-blue-700 mt-2 text-center">
                              <strong>Foundation:</strong> {item.foundation_type === 'spread_foot' 
                                ? `${item.length_inches}" L × ${item.width_inches}" W × ${item.depth_inches}" D`
                                : `${item.diameter}" Diameter × ${item.depth_inches}" D`}
                              {item.include_rebar && item.foundation_type === 'spread_foot' && (() => {
                                const firstLayerOffset = 3;
                                const layerSpacing = 18;
                                const numLayers = Math.max(0, Math.floor((item.depth_inches - firstLayerOffset) / layerSpacing) + 1);
                                return ` | <strong>Rebar:</strong> ${item.rebar_size} @ ${item.rebar_spacing_length}" lengthwise & ${item.rebar_spacing_width}" width spacing in ${numLayers} layer${numLayers !== 1 ? 's' : ''} (3" from top, 18" spacing)`;
                              })()}
                            </p>
                          </div>

                          {item.foundation_type === 'spread_foot' && (
                            <>
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
                              )}
                            </>
                          )}
                        </div>

                        {/* Advanced Override Section - Collapsible */}
                        <div className="md:col-span-2 border-t pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => toggleAdvanced(index)}
                            className="w-full flex items-center justify-between"
                          >
                            <span>Advanced Cost Override</span>
                            {expandedAdvanced[index] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>

                          {expandedAdvanced[index] && (
                            <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200 space-y-4">
                              <p className="text-xs text-amber-800 mb-2">Override default rates for this specific foundation (leave blank to use project default)</p>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-xs">Concrete Cost ($/cy)</Label>
                                  <Input
                                    type="number"
                                    step="1"
                                    value={item.custom_concrete_cost_per_cy !== undefined ? item.custom_concrete_cost_per_cy : ''}
                                    onChange={(e) => updateItem(index, 'custom_concrete_cost_per_cy', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                    className="mt-1"
                                    placeholder={`Default: $${project.concrete_cost_per_cy}`}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Rebar Cost ($/ft)</Label>
                                  <Input
                                    type="number"
                                    step="0.05"
                                    value={item.custom_rebar_cost_per_ft !== undefined ? item.custom_rebar_cost_per_ft : ''}
                                    onChange={(e) => updateItem(index, 'custom_rebar_cost_per_ft', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                    className="mt-1"
                                    placeholder={`Default: $${project.rebar_cost_per_ft}`}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Summary info only - no costs */}
                        <div className="md:col-span-2 p-3 bg-blue-50 rounded-lg">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <p><strong>Concrete:</strong> {item.concrete_volume_cy.toFixed(2)} cy</p>
                            <p><strong>Excavation:</strong> {item.excavation_volume_cy.toFixed(2)} cy</p>
                            <p><strong>Forming:</strong> {item.forming_hours.toFixed(2)} hrs</p>
                            <p><strong>Pouring:</strong> {item.pouring_hours.toFixed(2)} hrs</p>
                            <p><strong>Finishing:</strong> {item.finishing_hours.toFixed(2)} hrs</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Equipment Card */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-semibold text-slate-900">Excavation Equipment</CardTitle>
                  <Button onClick={addEquipment} size="sm" className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Equipment
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(!project.selected_equipment || project.selected_equipment.length === 0) ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>No equipment added. Equipment will be auto-added when excavation ≥ 0.5 cy or depth &gt; 36"</p>
                  </div>
                ) : (
                  project.selected_equipment.map((eq, index) => {
                    const selectedEquip = equipment.find(e => e.id === eq.equipment_id);
                    return (
                      <div key={index} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex justify-between items-start mb-3">
                          <h5 className="font-medium text-slate-900">Equipment #{index + 1}</h5>
                          <Button variant="ghost" size="icon" onClick={() => removeEquipment(index)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="md:col-span-2">
                            <Label>Equipment</Label>
                            <Select value={eq.equipment_id} onValueChange={(value) => updateEquipmentItem(index, 'equipment_id', value)}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select equipment" />
                              </SelectTrigger>
                              <SelectContent>
                                {equipment.map(e => (
                                  <SelectItem key={e.id} value={e.id}>
                                    {e.material_name} ({e.equipment_type?.replace(/_/g, ' ')})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>Rental Period</Label>
                            <Select value={eq.rental_period} onValueChange={(value) => updateEquipmentItem(index, 'rental_period', value)}>
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="day">Day</SelectItem>
                                <SelectItem value="week">Week</SelectItem>
                                <SelectItem value="month">Month</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>Duration</Label>
                            <Input
                              type="number"
                              min="1"
                              value={eq.rental_duration}
                              onChange={(e) => updateEquipmentItem(index, 'rental_duration', parseFloat(e.target.value) || 1)}
                              className="mt-1"
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={eq.include_delivery}
                                onChange={(e) => updateEquipmentItem(index, 'include_delivery', e.target.checked)}
                                className="w-4 h-4 text-orange-600"
                              />
                              <Label>Include Pickup & Delivery {selectedEquip && `($${(selectedEquip.pickup_delivery_cost || 0).toFixed(2)})`}</Label>
                            </div>
                          </div>
                          
                          {selectedEquip && (
                            <div className="md:col-span-2 p-3 bg-white rounded border border-orange-300">
                              <div className="flex justify-between font-semibold">
                                <span>Equipment Cost:</span>
                                <span className="text-orange-700">${(eq.equipment_cost || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div>
            <Card className="bg-white border-0 shadow-sm sticky top-8">
              <CardHeader><CardTitle>Cost Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* Materials Section - Combined */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-blue-800">Materials:</span>
                    <span className="text-lg font-bold text-blue-900">${((project.total_concrete_cost || 0) + (project.total_rebar_cost || 0)).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-blue-600">Concrete & rebar reinforcement</p>
                </div>

                {/* Labor & Excavation Section - Combined */}
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-green-800">Labor & Excavation:</span>
                    <span className="text-lg font-bold text-green-900">${((project.total_labor_cost || 0) + (project.total_excavation_cost || 0)).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-green-600">Forming, pouring, finishing & site prep</p>
                </div>

                {/* Equipment Section - Always shown */}
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-orange-800">Equipment:</span>
                    <span className="text-lg font-bold text-orange-900">${(project.total_equipment_cost || 0).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-orange-600">Excavation equipment rental & delivery</p>
                </div>

                {/* Summary */}
                <div className="border-t pt-4">
                  <div className="flex justify-between text-sm text-slate-600 mb-2">
                    <span>Total Items:</span>
                    <span className="font-medium">{project.items.length}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600 mb-2">
                    <span>Equipment Items:</span>
                    <span className="font-medium">{(project.selected_equipment || []).length}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                    <span>TOTAL:</span>
                    <span className="text-green-600">${((project.total_concrete_cost || 0) + (project.total_rebar_cost || 0) + (project.total_excavation_cost || 0) + (project.total_labor_cost || 0) + (project.total_equipment_cost || 0)).toFixed(2)}</span>
                  </div>
                </div>

                <Button onClick={saveProject} disabled={isSaving} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 mt-4">
                  {isSaving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> {isEditing ? 'Update Estimate' : 'Save Estimate'}</>}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
