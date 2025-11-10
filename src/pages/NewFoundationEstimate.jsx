
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
    selected_equipment: [],
    selected_concrete_id: null
  });

  const [globalSettings, setGlobalSettings] = useState({});
  const [equipment, setEquipment] = useState([]);
  const [concreteOptions, setConcreteOptions] = useState([]);
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
      const [settingsData, equipmentData, allInventory] = await Promise.all([
        Settings.list(),
        FoundationInventory.filter({ material_type: 'excavation_equipment' }),
        FoundationInventory.list()
      ]);
      
      const settingsObj = {};
      settingsData.forEach(setting => {
        settingsObj[setting.setting_name] = setting.setting_value;
      });
      setGlobalSettings(settingsObj);
      setEquipment(equipmentData);
      
      // Filter concrete materials only
      const concreteItems = allInventory.filter(item => 
        item.material_type === 'concrete_service' || item.material_type === 'bagged_concrete'
      );
      setConcreteOptions(concreteItems);

      if (!editId) {
        const newDefaults = {
          concrete_cost_per_cy: parseFloat(settingsObj.foundation_concrete_cost_per_cy) || 135,
          rebar_cost_per_ft: parseFloat(settingsObj.foundation_rebar_cost_per_ft) || 0.75,
          excavation_cost_per_cy: parseFloat(settingsObj.foundation_excavation_cost_per_cy) || 15,
          forming_labor_rate: parseFloat(settingsObj.foundation_forming_labor_rate) || 55,
          pouring_labor_rate: parseFloat(settingsObj.foundation_pouring_labor_rate) || 60,
          finishing_labor_rate: parseFloat(settingsObj.foundation_finishing_labor_rate) || 50,
          notes: settingsObj.default_notes_template || "",
          selected_equipment: [],
          selected_concrete_id: null
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

  const handleConcreteSelection = (concreteId) => {
    if (concreteId === "default") {
      setProject(prev => ({
        ...prev,
        selected_concrete_id: null,
        concrete_cost_per_cy: parseFloat(globalSettings.foundation_concrete_cost_per_cy) || 135
      }));
      return;
    }

    const selectedConcrete = concreteOptions.find(c => c.id === concreteId);
    if (selectedConcrete) {
      // Calculate cost per cubic yard
      const costPerCY = selectedConcrete.cubic_yards_per_unit > 0 
        ? selectedConcrete.cost_per_unit / selectedConcrete.cubic_yards_per_unit
        : selectedConcrete.cost_per_unit; // Assuming if cubic_yards_per_unit is 0 or not set, cost_per_unit is already per cy
      
      setProject(prev => ({
        ...prev,
        selected_concrete_id: concreteId,
        concrete_cost_per_cy: costPerCY
      }));
    }
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
      project.pouring_labor_rate, project.finishing_labor_rate, globalSettings]);

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

  // Get selected concrete for display
  const selectedConcrete = concreteOptions.find(c => c.id === project.selected_concrete_id);

  return (
    <div className="p-2 md:p-4 bg-slate-50 min-h-screen">
      <div className="w-full mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 mb-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Anchor className="w-6 h-6" />
              {isEditing ? 'Edit' : 'New'} Foundation Estimate
            </h1>
            <p className="text-sm text-slate-600">Create detailed foundation estimates</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(createPageUrl("FoundationProjects"))}>
              <ArrowLeft className="w-3 h-3 mr-1" />
              Back
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Project Info - Condensed */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Client Name *</Label>
                    <Input
                      value={project.client_name}
                      onChange={(e) => setProject(prev => ({ ...prev, client_name: e.target.value }))}
                      placeholder="Enter client"
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Project Name *</Label>
                    <Input
                      value={project.project_name}
                      onChange={(e) => setProject(prev => ({ ...prev, project_name: e.target.value }))}
                      placeholder="Enter project"
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Estimate Number *</Label>
                    <Input
                      value={project.estimate_number}
                      onChange={(e) => setProject(prev => ({ ...prev, estimate_number: e.target.value }))}
                      placeholder="FOUND-2024-001"
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Project Link *</Label>
                    <Input
                      value={project.hyperlink}
                      onChange={(e) => setProject(prev => ({ ...prev, hyperlink: e.target.value }))}
                      placeholder="https://..."
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Concrete Material</Label>
                    <Select 
                      value={project.selected_concrete_id || "default"} 
                      onValueChange={handleConcreteSelection}
                    >
                      <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue placeholder="Select concrete material" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default (${project.concrete_cost_per_cy.toFixed(2)}/cy)</SelectItem>
                        {concreteOptions.map(concrete => {
                          const costPerCY = concrete.cubic_yards_per_unit > 0 
                            ? (concrete.cost_per_unit / concrete.cubic_yards_per_unit).toFixed(2)
                            : concrete.cost_per_unit.toFixed(2);
                          return (
                            <SelectItem key={concrete.id} value={concrete.id}>
                              {concrete.material_name} - ${costPerCY}/cy ({concrete.material_type.replace(/_/g, ' ')})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {selectedConcrete && (
                      <p className="text-xs text-green-600 mt-1 font-medium">
                        Using: {selectedConcrete.material_name} @ ${project.concrete_cost_per_cy.toFixed(2)}/cy
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    value={project.notes}
                    onChange={(e) => setProject(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes..."
                    className="mt-1 h-16 text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Items - Condensed */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base font-semibold">Foundations</CardTitle>
                  <Button onClick={addItem} size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 text-xs">
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.items.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    <p>No foundations. Click "Add" to start.</p>
                  </div>
                ) : (
                  project.items.map((item, index) => (
                    <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-sm">Foundation #{index + 1}</h4>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 h-6 w-6">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="grid md:grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Type</Label>
                          <Select value={item.foundation_type} onValueChange={(value) => updateItem(index, 'foundation_type', value)}>
                            <SelectTrigger className="mt-1 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="spread_foot">Spread Foot</SelectItem>
                              <SelectItem value="pillar">Pillar</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                            className="mt-1 h-8 text-xs"
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder="Brief desc"
                            className="mt-1 h-8 text-xs"
                          />
                        </div>

                        {item.foundation_type === 'spread_foot' ? (
                          <>
                            <div>
                              <Label className="text-xs">Length (in)</Label>
                              <Input
                                type="number"
                                step="1"
                                value={item.length_inches}
                                onChange={(e) => updateItem(index, 'length_inches', parseFloat(e.target.value) || 0)}
                                className="mt-1 h-8 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Width (in)</Label>
                              <Input
                                type="number"
                                step="1"
                                value={item.width_inches}
                                onChange={(e) => updateItem(index, 'width_inches', parseFloat(e.target.value) || 0)}
                                className="mt-1 h-8 text-xs"
                              />
                            </div>
                          </>
                        ) : (
                          <div>
                            <Label className="text-xs">Diameter (in)</Label>
                            <Input
                              type="number"
                              step="1"
                              value={item.diameter}
                              onChange={(e) => updateItem(index, 'diameter', parseFloat(e.target.value) || 0)}
                              className="mt-1 h-8 text-xs"
                            />
                          </div>
                        )}

                        <div>
                          <Label className="text-xs">Depth (in)</Label>
                          <Input
                            type="number"
                            step="1"
                            value={item.depth_inches}
                            onChange={(e) => updateItem(index, 'depth_inches', parseFloat(e.target.value) || 0)}
                            className="mt-1 h-8 text-xs"
                          />
                        </div>
                      </div>

                      {/* 3D Viewer - Compact */}
                      <div className="border-t pt-3">
                        <div className="h-64 rounded-lg overflow-hidden">
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
                        <p className="text-xs text-blue-700 mt-1 text-center">
                          {item.foundation_type === 'spread_foot' 
                            ? `${item.length_inches}" L × ${item.width_inches}" W × ${item.depth_inches}" D`
                            : `Ø${item.diameter}" × ${item.depth_inches}" D`}
                        </p>
                      </div>

                      {item.foundation_type === 'spread_foot' && (
                        <>
                          <div className="flex items-center justify-between py-2">
                            <Label htmlFor={`rebar-${index}`} className="text-xs font-medium">Include Rebar</Label>
                            <input
                              id={`rebar-${index}`}
                              type="checkbox"
                              checked={item.include_rebar || false}
                              onChange={(e) => updateItem(index, 'include_rebar', e.target.checked)}
                              className="w-4 h-4 text-blue-600"
                            />
                          </div>

                          {item.include_rebar && (
                            <div className="p-3 bg-blue-50 rounded border border-blue-200">
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-xs">Size</Label>
                                  <select
                                    value={item.rebar_size || "#4"}
                                    onChange={(e) => updateItem(index, 'rebar_size', e.target.value)}
                                    className="mt-1 w-full px-2 py-1 border border-blue-200 rounded text-xs"
                                  >
                                    <option value="#3">#3</option>
                                    <option value="#4">#4</option>
                                    <option value="#5">#5</option>
                                    <option value="#6">#6</option>
                                  </select>
                                </div>
                                <div>
                                  <Label className="text-xs">Length Sp.</Label>
                                  <Input
                                    type="number"
                                    min="6"
                                    value={item.rebar_spacing_length || 18}
                                    onChange={(e) => updateItem(index, 'rebar_spacing_length', parseFloat(e.target.value) || 18)}
                                    className="mt-1 h-8 text-xs"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Width Sp.</Label>
                                  <Input
                                    type="number"
                                    min="6"
                                    value={item.rebar_spacing_width || 18}
                                    onChange={(e) => updateItem(index, 'rebar_spacing_width', parseFloat(e.target.value) || 18)}
                                    className="mt-1 h-8 text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Advanced Override - Compact */}
                      <div className="border-t pt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAdvanced(index)}
                          className="w-full text-xs h-7"
                        >
                          <span>Cost Override</span>
                          {expandedAdvanced[index] ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                        </Button>

                        {expandedAdvanced[index] && (
                          <div className="mt-2 p-3 bg-amber-50 rounded border border-amber-200">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Concrete ($/cy)</Label>
                                <Input
                                  type="number"
                                  step="1"
                                  value={item.custom_concrete_cost_per_cy !== undefined ? item.custom_concrete_cost_per_cy : ''}
                                  onChange={(e) => updateItem(index, 'custom_concrete_cost_per_cy', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                  className="mt-1 h-8 text-xs"
                                  placeholder={`$${project.concrete_cost_per_cy}`}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Rebar ($/ft)</Label>
                                <Input
                                  type="number"
                                  step="0.05"
                                  value={item.custom_rebar_cost_per_ft !== undefined ? item.custom_rebar_cost_per_ft : ''}
                                  onChange={(e) => updateItem(index, 'custom_rebar_cost_per_ft', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                  className="mt-1 h-8 text-xs"
                                  placeholder={`$${project.rebar_cost_per_ft}`}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Summary - Compact */}
                      <div className="p-2 bg-blue-50 rounded text-xs">
                        <div className="grid grid-cols-3 gap-1">
                          <p><strong>Concrete:</strong> {item.concrete_volume_cy.toFixed(2)} cy</p>
                          <p><strong>Excavation:</strong> {item.excavation_volume_cy.toFixed(2)} cy</p>
                          <p><strong>Form:</strong> {item.forming_hours.toFixed(1)} hrs</p>
                          <p><strong>Pour:</strong> {item.pouring_hours.toFixed(1)} hrs</p>
                          <p><strong>Finish:</strong> {item.finishing_hours.toFixed(1)} hrs</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Equipment - Condensed */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base font-semibold">Equipment</CardTitle>
                  <Button onClick={addEquipment} size="sm" className="bg-orange-600 hover:bg-orange-700 h-8 text-xs">
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(!project.selected_equipment || project.selected_equipment.length === 0) ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    <p>Auto-adds when excavation ≥ 0.5 cy or depth &gt; 36"</p>
                  </div>
                ) : (
                  project.selected_equipment.map((eq, index) => {
                    const selectedEquip = equipment.find(e => e.id === eq.equipment_id);
                    return (
                      <div key={index} className="p-3 bg-orange-50 rounded border border-orange-200">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium text-sm">Equipment #{index + 1}</h5>
                          <Button variant="ghost" size="icon" onClick={() => removeEquipment(index)} className="text-red-500 h-6 w-6">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-2">
                            <Label className="text-xs">Equipment</Label>
                            <Select value={eq.equipment_id} onValueChange={(value) => updateEquipmentItem(index, 'equipment_id', value)}>
                              <SelectTrigger className="mt-1 h-8 text-xs">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {equipment.map(e => (
                                  <SelectItem key={e.id} value={e.id}>
                                    {e.material_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label className="text-xs">Period</Label>
                            <Select value={eq.rental_period} onValueChange={(value) => updateEquipmentItem(index, 'rental_period', value)}>
                              <SelectTrigger className="mt-1 h-8 text-xs">
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
                            <Label className="text-xs">Duration</Label>
                            <Input
                              type="number"
                              min="1"
                              value={eq.rental_duration}
                              onChange={(e) => updateEquipmentItem(index, 'rental_duration', parseFloat(e.target.value) || 1)}
                              className="mt-1 h-8 text-xs"
                            />
                          </div>
                          
                          <div className="col-span-2 flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={eq.include_delivery}
                              onChange={(e) => updateEquipmentItem(index, 'include_delivery', e.target.checked)}
                              className="w-3 h-3 text-orange-600"
                            />
                            <Label className="text-xs">Delivery {selectedEquip && `(${(selectedEquip.pickup_delivery_cost || 0).toFixed(2)})`}</Label>
                          </div>
                          
                          {selectedEquip && (
                            <div className="col-span-2 p-2 bg-white rounded border border-orange-300 text-xs">
                              <div className="flex justify-between font-semibold">
                                <span>Cost:</span>
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

          {/* Sidebar - Compact */}
          <div>
            <Card className="bg-white border-0 shadow-sm sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cost Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-blue-800">Materials</span>
                    <span className="text-base font-bold text-blue-900">${((project.total_concrete_cost || 0) + (project.total_rebar_cost || 0)).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-0.5">Concrete & rebar</p>
                </div>

                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-green-800">Labor & Excavation</span>
                    <span className="text-base font-bold text-green-900">${((project.total_labor_cost || 0) + (project.total_excavation_cost || 0)).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-green-600 mt-0.5">Forming, pouring, finishing</p>
                </div>

                <div className="p-3 bg-orange-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-orange-800">Equipment</span>
                    <span className="text-base font-bold text-orange-900">${(project.total_equipment_cost || 0).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-orange-600 mt-0.5">Rental & delivery</p>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>Items:</span>
                    <span className="font-medium">{project.items.length}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600 mb-2">
                    <span>Equipment:</span>
                    <span className="font-medium">{(project.selected_equipment || []).length}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t pt-2">
                    <span>TOTAL:</span>
                    <span className="text-green-600">${((project.total_concrete_cost || 0) + (project.total_rebar_cost || 0) + (project.total_excavation_cost || 0) + (project.total_labor_cost || 0) + (project.total_equipment_cost || 0)).toFixed(2)}</span>
                  </div>
                </div>

                <Button onClick={saveProject} disabled={isSaving} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 mt-3 text-sm">
                  {isSaving ? 'Saving...' : <><Save className="w-3 h-3 mr-1" /> {isEditing ? 'Update' : 'Save'}</>}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
