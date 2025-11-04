
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Project, Settings } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Save, Calculator, Palette, Edit, Mail, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";

const imperialSizes = ["1/16", "1/8", "3/16", "1/4", "3/16", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8", "1", "1-1/8", "1-1/4", "1-3/8", "1-1/2", "1-5/8", "1-3/4", "1-7/8", "2", "2-1/4", "2-1/2", "2-3/4", "3", "3-1/4", "3-1/2", "3-3/4", "4"];
const coverageFactors = ["1/8", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8", "1", "1-1/8", "1-1/4", "1-3/8", "1-1/2", "1-5/8", "1-3/4", "1-7/8", "2"];

// Helper function to parse imperial fractions (e.g., "1/2", "1-1/4", "2")
const parseImperialFraction = (fractionString) => {
  if (typeof fractionString !== 'string') {
    return parseFloat(fractionString) || 0; // Handle initial numeric values or invalid inputs gracefully
  }

  let totalValue = 0;
  const wholeAndFraction = fractionString.split('-'); // Split for "whole-fraction" like "1-1/4"

  if (wholeAndFraction.length === 2) {
    totalValue += parseFloat(wholeAndFraction[0]); // Add the whole number part
    fractionString = wholeAndFraction[1]; // Now process the fraction part
  } else {
    fractionString = wholeAndFraction[0]; // No whole number, just a fraction or whole number string
  }

  const parts = fractionString.split('/');
  if (parts.length === 2) {
    const numerator = parseFloat(parts[0]);
    const denominator = parseFloat(parts[1]);
    if (denominator !== 0) {
      totalValue += numerator / denominator;
    }
  } else {
    totalValue += parseFloat(fractionString) || 0; // Handle whole numbers or invalid fractions
  }
  return totalValue;
};

export default function NewPaintEstimate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [isEditing, setIsEditing] = useState(false);
  
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    message: ''
  });

  const [project, setProject] = useState({
    project_name: "",
    client_name: "",
    estimate_number: "", // Added new field
    hyperlink: "",       // Added new field
    items: [],
    base_supplies_cost: 50, // Changed from supplies_rate_per_sqft
    paint_supplies_per_sqft: 1.25,
    notes: ""
  });
  const [globalSettings, setGlobalSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); // New state for deletion

  // Calculate liquidPaintRate here at the top so it's available for updateItem
  const getCostPerGallon = useCallback((cost, unit) => {
    const unitFactors = { oz: 128, pint: 8, quart: 4, liter: 3.78541, gallon: 1 };
    const parsedCost = parseFloat(cost);
    if (isNaN(parsedCost) || !unit || !unitFactors[unit]) return 0;
    return parsedCost * unitFactors[unit];
  }, []);

  const liquidPaintRate = useMemo(() => {
    
    const paintCostPerGallon = getCostPerGallon(globalSettings.paint_cost_per_unit, globalSettings.paint_unit);
    const hardenerCostPerGallon = getCostPerGallon(globalSettings.hardener_cost_per_unit, globalSettings.hardener_unit);
    const reducerCostPerGallon = getCostPerGallon(globalSettings.reducer_cost_per_unit, globalSettings.reducer_unit);
    
    
    const paintMixRatio = parseFloat(globalSettings.paint_mix_ratio) || 3;
    const hardenerMixRatio = parseFloat(globalSettings.hardener_mix_ratio) || 1;
    const reducerMixRatio = parseFloat(globalSettings.reducer_mix_ratio) || 1;

    const totalRatio = paintMixRatio + hardenerMixRatio + reducerMixRatio;
    
    const costOfMix = totalRatio > 0 ?
        (paintCostPerGallon / totalRatio) * paintMixRatio +
        (hardenerCostPerGallon / totalRatio) * hardenerMixRatio +
        (reducerCostPerGallon / totalRatio) * reducerMixRatio
        : 0;

    const coverageSqFtPerGallon = parseFloat(globalSettings.mixed_paint_coverage_sqft_per_gallon) || 1;
    const finalRate = coverageSqFtPerGallon > 0 ? costOfMix / coverageSqFtPerGallon : 0;
    
    
    return finalRate;
  }, [globalSettings, getCostPerGallon]);

  const loadProjectForEdit = useCallback(async (projectId) => {
    try {
      const projectToEdit = await Project.get(projectId); // Use get() for a single record
      if (projectToEdit) {
        // Clean up 'none' paint_sides value if it exists from older data, default to 'one_side'
        const cleanedProject = {
          ...projectToEdit,
          items: projectToEdit.items.map(item => ({
            ...item,
            paint_sides: item.paint_sides === 'none' ? 'one_side' : item.paint_sides, // Changed fallback to 'one_side'
            approx_coverage_factor: item.approx_coverage_factor || "1/4" // Ensure field exists on load
          }))
        };
        // Ensure client_email and client_phone are not set from old data, and add new fields if missing
        // Also removed labor_rate as it's now global
        const { client_email, client_phone, estimate_number, hyperlink, supplies_rate_per_sqft, labor_rate, ...restOfProject } = cleanedProject;
        setProject({
          ...restOfProject,
          estimate_number: estimate_number || "", // Ensure new fields are initialized if not present in old data
          hyperlink: hyperlink || "",
          base_supplies_cost: supplies_rate_per_sqft || (parseFloat(globalSettings.base_supplies_per_job) || 50) // Use old field if exists, otherwise new default
        });
        setIsEditing(true);
      } else {
        console.warn(`Project with ID ${projectId} not found.`);
        navigate(createPageUrl("PaintProjects")); // Redirect if project not found
      }
    } catch (error) {
      console.error('Error loading project for edit:', error);
      alert('Error loading project for edit. Please try again.');
    }
  }, [navigate, globalSettings.base_supplies_per_job]);

  const loadPrerequisites = useCallback(async () => {
    try {
      const settingsData = await Settings.list();
      
      const settingsObj = {};
      settingsData.forEach(setting => {
        settingsObj[setting.setting_name] = setting.setting_value;
      });
      
      setGlobalSettings(settingsObj);
      
      // Only set default project values if not editing an existing project
      if (!editId) {
        const newDefaults = {
          base_supplies_cost: parseFloat(settingsObj.base_supplies_per_job) || 50, // Updated
          paint_supplies_per_sqft: parseFloat(settingsObj.default_paint_supplies_per_sqft) || 1.25,
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
    setProject(prev => ({
      ...prev,
      items: [...prev.items, {
        item_type: "panel",
        description: "",
        thickness: "1/2", // Default to '1/2' inch
        length: 0,
        width: 0,
        quantity: 1,
        edge_complexity_multiplier: 1.0, // Added for complex shapes
        paint_sides: "one_side", // Changed default to one_side
        paint_colors: [""], // Default with one empty color string
        letter_size: "normal",
        paint_mask_sqft: 0, 
        supplies_cost: 0, // This will now represent Paint Mask Material + Machine Cost
        paint_cost: 0,    // This will now represent Liquid Paint & Paint App Supplies Cost
        labor_hours: 0,
        labor_cost: 0,
        approx_coverage_factor: "1/4" // Add default for the new helper
      }]
    }));
  };

  const removeItem = (index) => {
    setProject(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setProject(prev => {
      const newItems = [...prev.items];
      let item = { ...newItems[index], [field]: value };
      
      // Auto-set letter size based on height
      if (field === 'width' && item.item_type === 'lettering') {
          const height = value;
          if (height <= 4) item.letter_size = 'extra_small';
          else if (height <= 8) item.letter_size = 'small';
          else if (height <= 12) item.letter_size = 'normal';
          else if (height <= 20) item.letter_size = 'medium';
          else if (height <= 30) item.letter_size = 'large';
          else item.letter_size = 'extra_large';
      }

      // Auto-set paint mask square footage when dimensions change (for face area)
      // This calculation is based on item dimensions and paint_sides.
      // The 'Approx. Coverage Helper' provides an alternative calculation if used.
      if (['length', 'width', 'item_type'].includes(field) && item.length > 0 && item.width > 0) {
        if (item.item_type === 'panel' || item.item_type === 'complex_shapes') {
          const faceArea = (item.length * item.width) / 144;
          // For panels and complex shapes, paint mask sqft is typically just face area for color separation
          item.paint_mask_sqft = item.paint_sides === 'both_sides' ? faceArea * 2 : faceArea;
        } else if (item.item_type === 'lettering') {
          const letterHeight = item.width;
          const numLetters = item.length;
          const faceArea = (Math.pow(letterHeight, 2) * 0.8 * numLetters) / 144;
          item.paint_mask_sqft = item.paint_sides === 'both_sides' ? faceArea * 2 : faceArea;
        }
      }

      
      // --- Start Recalculation ---
      const perimFactor = parseFloat(globalSettings.letter_perimeter_factor) || 3.5;
      let paintableSqFt = 0;
      const itemThicknessDecimal = parseImperialFraction(item.thickness);

      if (item.item_type === 'panel' && item.length > 0 && item.width > 0) {
        const faceArea = (item.length * item.width) / 144;
        paintableSqFt = item.paint_sides === 'both_sides' ? faceArea * 2 : faceArea;
      } else if (item.item_type === 'lettering' && item.width > 0 && item.length > 0 && itemThicknessDecimal > 0) {
        const letterHeight = item.width; // Using width field for letter height
        const numLetters = item.length; // Using length field for number of letters
        
        const faceArea = (Math.pow(letterHeight, 2) * 0.8 * numLetters) / 144;
        const perimeterInches = letterHeight * perimFactor * numLetters;
        const edgeArea = (perimeterInches * itemThicknessDecimal) / 144;
        
        paintableSqFt = item.paint_sides === 'both_sides' ? (faceArea * 2) + edgeArea : faceArea + edgeArea;
      } else if (item.item_type === 'complex_shapes' && item.length > 0 && item.width > 0 && itemThicknessDecimal > 0) {
        const faceArea = (item.length * item.width) / 144;
        const perimeterInches = 2 * (item.length + item.width); // Perimeter of a rectangle
        const edgeArea = (perimeterInches * itemThicknessDecimal * (item.edge_complexity_multiplier || 1.0)) / 144; // Apply multiplier
        
        if (item.paint_sides === 'both_sides') {
            paintableSqFt = (faceArea * 2) + edgeArea;
        } else if (item.paint_sides === 'one_side') {
            paintableSqFt = faceArea + edgeArea;
        } else { // This branch should theoretically not be hit due to loadProjectForEdit cleanup, but provides a fallback
            paintableSqFt = 0;
        }
      }
      
      // Calculate Costs - REORGANIZED
      const paintSuppliesRate = prev.paint_supplies_per_sqft;

      // Paint mask cost (material + machine cutting)
      const paintMaskMaterialRate = parseFloat(globalSettings.paint_mask_rate_per_sqft) || 0.75;
      const paintMaskMachineRate = parseFloat(globalSettings.paint_mask_machine_cutting_rate_per_sqft) || 0.10;
      let paintMaskCost = 0;
      
      const numColors = item.paint_colors?.length || 0;
      if (numColors > 1 && item.paint_mask_sqft > 0) {
        const maskMaterialCost = item.paint_mask_sqft * paintMaskMaterialRate * (numColors - 1);
        const maskMachineCost = item.paint_mask_sqft * paintMaskMachineRate * (numColors - 1);
        paintMaskCost = maskMaterialCost + maskMachineCost;
      }

      // Liquid paint and paint application supplies cost (combined)
      let liquidPaintAndSuppliesCost = 0;
      
      let liquidPaintCost = 0;
      let paintApplicationSuppliesCost = 0;
      if (numColors > 0) { 
        // Paint application supplies
        paintApplicationSuppliesCost = paintableSqFt * paintSuppliesRate * numColors;
        
        // Liquid paint cost
        const paintWasteMultiplier = parseFloat(globalSettings.paint_waste_multiplier) || 1.25;
        if (liquidPaintRate > 0) {
            liquidPaintCost = paintableSqFt * liquidPaintRate * paintWasteMultiplier * numColors;
        }
      }
      
      liquidPaintAndSuppliesCost = paintApplicationSuppliesCost + liquidPaintCost;
      
      // Calculate Labor Cost
      const laborRate = parseFloat(globalSettings.default_labor_rate) || 60; // Get labor rate from global settings
      const baseHoursPerSqFt = parseFloat(globalSettings.base_labor_hours_per_sqft) || 0.5;
      const complexityMap = {
        extra_small: 'complex',
        small: 'complex',
        normal: 'moderate',
        medium: 'moderate',
        large: 'simple',
        extra_large: 'extra_large', // Should be 'simple' like large
      };
      // item.complexity doesn't exist for panels/complex_shapes, use 'moderate' as a default if not lettering
      const itemComplexity = item.item_type === 'lettering' ? complexityMap[item.letter_size] || 'moderate' : 'moderate'; 

      const complexityMultipliers = {
        simple: parseFloat(globalSettings.simple_complexity_multiplier) || 0.7,
        moderate: parseFloat(globalSettings.moderate_complexity_multiplier) || 1.0,
        complex: parseFloat(globalSettings.complex_complexity_multiplier) || 1.5
      };
      const paintMultipliers = {
        one_side: parseFloat(globalSettings.one_side_paint_multiplier) || 0.8,
        both_sides: parseFloat(globalSettings.both_sides_paint_multiplier) || 1.0
      };
      const additionalColorMultiplier = parseFloat(globalSettings.additional_color_multiplier) || 0.3;
      
      let baseHours = paintableSqFt * baseHoursPerSqFt * (complexityMultipliers[itemComplexity] || 1) * (paintMultipliers[item.paint_sides] || 1);
      if (numColors > 1) {
        baseHours *= (1 + (numColors - 1) * additionalColorMultiplier);
      }
      
      // Add paint mask application & cutting labor
      const maskApplicationLaborRate = parseFloat(globalSettings.paint_mask_application_labor_rate_per_sqft) || 0.25;
      const maskCuttingLaborRate = parseFloat(globalSettings.paint_mask_cutting_labor_rate_per_sqft) || 0.15;
      if (numColors > 1 && item.paint_mask_sqft > 0) {
        const maskApplicationLaborHours = (item.paint_mask_sqft * maskApplicationLaborRate * (numColors - 1)) / laborRate;
        const maskCuttingLaborHours = (item.paint_mask_sqft * maskCuttingLaborRate * (numColors - 1)) / laborRate;
        baseHours += maskApplicationLaborHours + maskCuttingLaborHours;
      }
      
      const laborHours = baseHours; // Labor hours are now per-item (for one unit), not multiplied by quantity yet
      const laborCost = laborHours * laborRate * item.quantity; // Use the derived laborRate

      item = {
        ...item,
        supplies_cost: paintMaskCost * item.quantity, // Now stores Paint Mask Material + Machine Cost
        paint_cost: liquidPaintAndSuppliesCost * item.quantity, // Now stores Liquid Paint + Paint App Supplies Cost
        labor_hours: laborHours * item.quantity, // Storing total hours for the line item
        labor_cost: laborCost,
      };

      newItems[index] = item;
      // --- End Recalculation ---
      
      return { ...prev, items: newItems };
    });
  };
  
  const handleCoverageFactorChange = (index, factorStr) => {
    const factor = parseImperialFraction(factorStr);
    const item = project.items[index];
    let faceArea = 0;

    if ((item.item_type === 'panel' || item.item_type === 'complex_shapes') && item.length > 0 && item.width > 0) {
      faceArea = (item.length * item.width) / 144;
    } else if (item.item_type === 'lettering' && item.width > 0 && item.length > 0) {
      const letterHeight = item.width;
      const numLetters = item.length;
      faceArea = (Math.pow(letterHeight, 2) * 0.8 * numLetters) / 144;
    }

    const calculatedMaskSqFt = faceArea * factor;
    
    // Update both the factor and the calculated sqft
    setProject(prev => {
        const newItems = [...prev.items];
        newItems[index] = {
            ...newItems[index],
            approx_coverage_factor: factorStr,
            paint_mask_sqft: calculatedMaskSqFt
        };
        // Trigger a full item update to ensure costs are recalculated based on new paint_mask_sqft
        // We pass a dummy 'field' and 'value' for the updateItem, as the main change is the paint_mask_sqft
        // which updateItem will observe and trigger cost recalculations.
        return { ...prev, items: newItems };
    });
  };

  const updateItemColor = (itemIndex, colorIndex, value) => {
    const newColors = [...project.items[itemIndex].paint_colors];
    newColors[colorIndex] = value;
    updateItem(itemIndex, 'paint_colors', newColors);
  };
  
  const addColor = (itemIndex) => {
    const newColors = [...project.items[itemIndex].paint_colors, ""];
    updateItem(itemIndex, 'paint_colors', newColors);
  };
  
  const removeColor = (itemIndex, colorIndex) => {
    const newColors = project.items[itemIndex].paint_colors.filter((_, i) => i !== colorIndex);
    updateItem(itemIndex, 'paint_colors', newColors);
  };

  const calculateTotals = () => {
    const totalPaintMask = project.items.reduce((sum, item) => sum + (item.supplies_cost || 0), 0);
    let totalLiquidPaintAndSupplies = project.items.reduce((sum, item) => sum + (item.paint_cost || 0), 0);
    
    // Add flat base supplies cost
    totalLiquidPaintAndSupplies += project.base_supplies_cost || 0; // This now includes base supplies

    const laborRate = parseFloat(globalSettings.default_labor_rate) || 60; // Use global labor rate
    let totalItemLaborCost = project.items.reduce((sum, item) => sum + (item.labor_cost || 0), 0);
    
    // Add fixed labor hours (mixing, setup)
    const mixingHours = parseFloat(globalSettings.paint_mixing_labor_hours) || 0;
    const setupHours = parseFloat(globalSettings.setup_time_labor_hours) || 0;
    const fixedLaborCost = (mixingHours + setupHours) * laborRate; // Use global labor rate

    let totalLabor = totalItemLaborCost + fixedLaborCost;
    const totalLaborHours = project.items.reduce((sum, item) => sum + (item.labor_hours || 0), 0) + mixingHours + setupHours;

    const minLaborHours = parseFloat(globalSettings.min_labor_hours) || 0;
    const minPaintCost = parseFloat(globalSettings.min_paint_cost) || 0;
    
    if (totalLaborHours > 0 && totalLaborHours < minLaborHours) {
        totalLabor = minLaborHours * laborRate; // Use global labor rate
    }
    
    if (totalLiquidPaintAndSupplies > 0 && totalLiquidPaintAndSupplies < minPaintCost) {
        totalLiquidPaintAndSupplies = minPaintCost;
    }

    return { totalPaintMask, totalLiquidPaintAndSupplies, totalLabor, totalLaborHours };
  };

  const saveProject = async () => {
    if (!project.project_name || !project.client_name) {
      alert('Please fill in project name and client name');
      return;
    }
    
    setIsSaving(true);
    try {
      const { totalPaintMask, totalLiquidPaintAndSupplies, totalLabor } = calculateTotals();
      const finalProject = {
        ...project,
        // Clean empty color strings from paint_colors array
        items: project.items.map(item => ({
          ...item, 
          paint_colors: item.paint_colors ? item.paint_colors.filter(c => c.trim() !== '') : []
        })),
        total_paint_mask_cost: totalPaintMask,             // Updated field name
        total_liquid_paint_and_supplies_cost: totalLiquidPaintAndSupplies, // Updated field name
        total_labor_cost: totalLabor,
        status: 'calculated'
      };
      
      if (isEditing) {
        await Project.update(editId, finalProject); // Update existing project
      } else {
        await Project.create(finalProject); // Create new project
      }
      
      navigate(createPageUrl("PaintProjects"));
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Error saving project. Please try again.');
    }
    setIsSaving(false);
  };

  const handleDeleteProject = async () => {
    if (!editId) {
      alert('Cannot delete a project that has not been saved.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      setIsDeleting(true);
      try {
        await Project.delete(editId);
        alert('Project deleted successfully!');
        navigate(createPageUrl("PaintProjects"));
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Error deleting project. Please try again.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const downloadEstimate = () => {
    const { totalPaintMask, totalLiquidPaintAndSupplies, totalLabor, totalLaborHours } = calculateTotals();
    const totalCost = totalPaintMask + totalLiquidPaintAndSupplies + totalLabor;
    const laborRate = parseFloat(globalSettings.default_labor_rate) || 60; // Use global labor rate
    
    // Create estimate content
    const estimateContent = `
PAINT ESTIMATE

Project: ${project.project_name}
Client: ${project.client_name}
${project.estimate_number ? `Estimate #: ${project.estimate_number}` : ''}
${project.hyperlink ? `Link: ${project.hyperlink}` : ''}
Date: ${new Date().toLocaleDateString()}

ITEMS:
${project.items.map((item, i) => `
Item ${i + 1}: ${item.description || `${item.item_type} item`}
Type: ${item.item_type}
Dimensions: ${item.length}"L × ${item.width}"H × ${item.thickness}"
Quantity: ${item.quantity}
Paint Sides: ${item.paint_sides}
Colors: ${item.paint_colors?.filter(c => c.trim() !== '').join(', ') || 'None'}
Paint Mask Cost: $${(item.supplies_cost || 0).toFixed(2)}
Liquid Paint & Supplies: $${(item.paint_cost || 0).toFixed(2)}
Labor Hours: ${(item.labor_hours || 0).toFixed(1)}
Labor Cost: $${(item.labor_cost || 0).toFixed(2)}
`).join('\n')}

TOTALS:
Paint Mask: $${totalPaintMask.toFixed(2)}
Liquid Paint & Application Supplies: $${totalLiquidPaintAndSupplies.toFixed(2)}
Fixed Labor (Mixing/Setup): $${(((parseFloat(globalSettings.paint_mixing_labor_hours) || 0) + (parseFloat(globalSettings.setup_time_labor_hours) || 0)) * laborRate).toFixed(2)}
Total Labor: $${totalLabor.toFixed(2)} (${totalLaborHours.toFixed(1)} hours)
TOTAL ESTIMATE: $${totalCost.toFixed(2)}

Notes: ${project.notes || 'None'}
`;
    
    // Create and download file
    const blob = new Blob([estimateContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.project_name.replace(/\s+/g, '_')}_Estimate.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printEstimate = () => {
    const { totalPaintMask, totalLiquidPaintAndSupplies, totalLabor, totalLaborHours } = calculateTotals();
    const totalCost = totalPaintMask + totalLiquidPaintAndSupplies + totalLabor;
    const laborRate = parseFloat(globalSettings.default_labor_rate) || 60; // Use global labor rate
    
    const printContent = `
      <html>
        <head>
          <title>Paint Estimate - ${project.project_name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            h1 { color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px; }
            h2 { color: #475569; margin-top: 30px; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
            h3 { color: #1e293b; margin-top: 20px; margin-bottom: 10px; }
            p { margin-bottom: 5px; line-height: 1.5; }
            .header { margin-bottom: 30px; }
            .item { margin-bottom: 20px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 5px; background-color: #fdfdfd; }
            .item p { margin: 0 0 3px 0; }
            .item-cost-details { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e2e8f0; }
            .item-cost-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .totals { margin-top: 30px; padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .final-total { font-weight: bold; font-size: 20px; border-top: 2px solid #374151; padding-top: 15px; margin-top: 15px; }
            .notes { margin-top: 30px; padding: 15px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Paint Estimate</h1>
            <p><strong>Project:</strong> ${project.project_name}</p>
            <p><strong>Client:</strong> ${project.client_name}</p>
            ${project.estimate_number ? `<p><strong>Estimate #:</strong> ${project.estimate_number}</p>` : ''}
            ${project.hyperlink ? `<p><strong>Link:</strong> <a href="${project.hyperlink}" target="_blank">${project.hyperlink}</a></p>` : ''}
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <h2>Items</h2>
          ${project.items.map((item, i) => `
            <div class="item">
              <h3>Item ${i + 1}: ${item.description || `${item.item_type} item`}</h3>
              <p><strong>Type:</strong> ${item.item_type}</p>
              <p><strong>Dimensions:</strong> ${item.length}"L × ${item.width}"H × ${item.thickness}"</p>
              <p><strong>Quantity:</strong> ${item.quantity}</p>
              <p><strong>Paint Sides:</strong> ${item.paint_sides}</p>
              <p><strong>Colors:</strong> ${item.paint_colors?.filter(c => c.trim() !== '').join(', ') || 'None'}</p>
              <div class="item-cost-details">
                <div class="item-cost-row">
                  <span>Paint Mask Cost:</span><span>$${(item.supplies_cost || 0).toFixed(2)}</span>
                </div>
                <div class="item-cost-row">
                  <span>Liquid Paint & Supplies:</span><span>$${(item.paint_cost || 0).toFixed(2)}</span>
                </div>
                <div class="item-cost-row">
                  <span>Labor (${(item.labor_hours || 0).toFixed(1)} hrs):</span><span>$${(item.labor_cost || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          `).join('')}
          
          <div class="totals">
            <h2>Summary</h2>
            <div class="total-row">
              <span>Total Paint Mask:</span><span>$${totalPaintMask.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Liquid Paint & Application Supplies:</span><span>$${totalLiquidPaintAndSupplies.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Fixed Labor (Mixing/Setup):</span><span>$${(((parseFloat(globalSettings.paint_mixing_labor_hours) || 0) + (parseFloat(globalSettings.setup_time_labor_hours) || 0)) * laborRate).toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Total Labor (${totalLaborHours.toFixed(1)} hrs):</span><span>$${totalLabor.toFixed(2)}</span>
            </div>
            <div class="total-row final-total">
              <span>TOTAL ESTIMATE:</span><span>$${totalCost.toFixed(2)}</span>
            </div>
          </div>
          
          ${project.notes ? `<div class="notes"><h2>Notes</h2><p>${project.notes}</p></div>` : ''}
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const sendEstimate = () => {
    const { totalPaintMask, totalLiquidPaintAndSupplies, totalLabor, totalLaborHours } = calculateTotals();
    const totalCost = totalPaintMask + totalLiquidPaintAndSupplies + totalLabor;
    const laborRate = parseFloat(globalSettings.default_labor_rate) || 60; // Use global labor rate
    
    setEmailData({
      to: '',
      subject: `Paint Estimate - ${project.project_name}`,
      message: `Hello,

Please find the paint estimate for ${project.project_name}:
${project.estimate_number ? `Estimate Number: ${project.estimate_number}` : ''}
${project.hyperlink ? `Reference Link: ${project.hyperlink}` : ''}

ESTIMATE SUMMARY:
Paint Mask: $${totalPaintMask.toFixed(2)}
Liquid Paint & Application Supplies: $${totalLiquidPaintAndSupplies.toFixed(2)}
Fixed Labor (Mixing/Setup): $${(((parseFloat(globalSettings.paint_mixing_labor_hours) || 0) + (parseFloat(globalSettings.setup_time_labor_hours) || 0)) * laborRate).toFixed(2)}
Total Labor: $${totalLabor.toFixed(2)} (${totalLaborHours.toFixed(1)} hours)
TOTAL ESTIMATE: $${totalCost.toFixed(2)}

ITEMS BREAKDOWN:
${project.items.map((item, i) => `
Item ${i + 1}: ${item.description || `${item.item_type} item`}
- Type: ${item.item_type}
- Dimensions: ${item.length}"L × ${item.width}"H × ${item.thickness}"
- Quantity: ${item.quantity}
- Paint Sides: ${item.paint_sides}
- Colors: ${item.paint_colors?.filter(c => c.trim() !== '').join(', ') || 'None'}
- Item Total: $${((item.supplies_cost || 0) + (item.paint_cost || 0) + (item.labor_cost || 0)).toFixed(2)}
`).join('\n')}

${project.notes ? `\nAdditional Notes:\n${project.notes}` : ''}

Best regards,
${globalSettings.company_name || 'Your Sign Company'}`
    });
    setShowEmailModal(true);
  };

  const handleSendEmail = () => {
    if (!emailData.to || !emailData.subject || !emailData.message) {
      alert('Please fill in all email fields (To, Subject, Message).');
      return;
    }
    const mailtoUrl = `mailto:${emailData.to}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.message)}`;
    window.location.href = mailtoUrl;
    setShowEmailModal(false);
  };

  const { totalPaintMask, totalLiquidPaintAndSupplies, totalLabor, totalLaborHours } = calculateTotals();

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-6 text-center">
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("PaintProjects")}> {/* Changed link to PaintProjects */}
            <Button variant="outline" size="icon" className="hover:bg-slate-100"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              {isEditing ? <Edit className="w-8 h-8" /> : <Calculator className="w-8 h-8" />}
              {isEditing ? 'Edit Paint Estimate' : 'New Paint Estimate'}
            </h1>
            <p className="text-slate-600">{isEditing ? 'Update your paint estimate' : 'Create a detailed estimate for painting dimensional letters and panels'}</p>
          </div>
          {isEditing && ( // Delete button
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDeleteProject} 
              disabled={isDeleting} 
              className="ml-auto text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              {isDeleting ? 'Deleting...' : <><Trash2 className="w-4 h-4 mr-2" /> Delete Project</>}
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Project Info Card */}
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
                    <Label htmlFor="estimate_number">Estimate Number</Label>
                    <Input 
                      id="estimate_number" 
                      value={project.estimate_number || ""} 
                      onChange={(e) => setProject(prev => ({ ...prev, estimate_number: e.target.value }))} 
                      placeholder="e.g., EST-2024-001" 
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="hyperlink">Project Link</Label>
                    <Input 
                      id="hyperlink" 
                      value={project.hyperlink || ""} 
                      onChange={(e) => setProject(prev => ({ ...prev, hyperlink: e.target.value }))} 
                      placeholder="https://..." 
                      className="mt-1" 
                    />
                  </div>
                </div>
                <div> {/* Moved base_supplies_cost out of the grid and into its own div */}
                  <Label htmlFor="base_supplies_cost">Base Supplies Cost (per Job)</Label>
                  <Input 
                    id="base_supplies_cost" 
                    type="number"
                    min="0"
                    step="0.01"
                    value={project.base_supplies_cost || ""} 
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setProject(prev => ({ ...prev, base_supplies_cost: parseFloat(e.target.value) || 0 }))} 
                    placeholder="e.g., 50" 
                    className="mt-1" 
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Project Notes</Label>
                  <Textarea 
                    id="notes" 
                    value={project.notes} 
                    onChange={(e) => setProject(prev => ({ ...prev, notes: e.target.value }))} 
                    placeholder="Additional project details..." 
                    className="mt-1 h-20" 
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-900">Project Items</CardTitle>
                  <Button onClick={addItem} size="sm" className="bg-slate-800 hover:bg-slate-900"><Plus className="w-4 h-4 mr-2" />Add Item</Button>
                </div>
              </CardHeader>
              <CardContent>
                {project.items.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Calculator className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>No items added yet. Click "Add Item" to start.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {project.items.map((item, index) => (
                      <div key={index} className="p-6 border border-slate-200 rounded-xl bg-slate-25">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-medium text-slate-900">Item {index + 1}</h4>
                          <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                        
                        {/* Item Form */}
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <Label>Description</Label>
                            <Input value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} placeholder="e.g., Dimensional letters - ACME CORP" className="mt-1" />
                          </div>
                          <div>
                            <Label>Item Type</Label>
                            <Select value={item.item_type} onValueChange={(value) => updateItem(index, 'item_type', value)}>
                              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="panel">Panel</SelectItem>
                                <SelectItem value="lettering">Lettering</SelectItem>
                                <SelectItem value="complex_shapes">Complex Shapes</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                           { item.item_type === 'panel' || item.item_type === 'complex_shapes' ? (
                            <>
                              <div>
                                <Label>Length (in)</Label>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  step="0.25" 
                                  value={item.length || ""}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => updateItem(index, 'length', parseFloat(e.target.value) || 0)} 
                                  className="mt-1" 
                                />
                              </div>
                              <div>
                                <Label>Quantity</Label>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  value={item.quantity || ""}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)} 
                                  className="mt-1" 
                                />
                              </div>
                              <div>
                                <Label>Height (in)</Label>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  step="0.25" 
                                  value={item.width || ""}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => updateItem(index, 'width', parseFloat(e.target.value) || 0)} 
                                  className="mt-1" 
                                />
                              </div>
                              {item.item_type === 'complex_shapes' && (
                                <div>
                                  <Label>Edge Complexity Multiplier</Label>
                                  <Input 
                                    type="number" 
                                    min="1.0" 
                                    step="0.1" 
                                    value={item.edge_complexity_multiplier || ""}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => updateItem(index, 'edge_complexity_multiplier', parseFloat(e.target.value) || 1.0)} 
                                    className="mt-1" 
                                  />
                                  <p className="text-xs text-slate-500 mt-1">Multiplier for additional edge paint area (1.0 = standard, 2.0 = double edge paint)</p>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div>
                                <Label>Letter Height (in)</Label>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  step="0.25" 
                                  value={item.width || ""}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => updateItem(index, 'width', parseFloat(e.target.value) || 0)} 
                                  className="mt-1" 
                                />
                              </div>
                              <div>
                                <Label>Quantity</Label>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  value={item.quantity || ""}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)} 
                                  className="mt-1" 
                                />
                              </div>
                              <div>
                                <Label>Number of Letters</Label>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  step="1" 
                                  value={item.length || ""}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => updateItem(index, 'length', parseInt(e.target.value) || 0)} 
                                  className="mt-1" 
                                />
                              </div>
                            </>
                          )}
                          <div>
                            <Label>Thickness</Label>
                            <Select value={item.thickness} onValueChange={(value) => updateItem(index, 'thickness', value)}>
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
                          {item.item_type === 'lettering' && (
                            <div>
                                <Label>Letter Size</Label>
                                <Select value={item.letter_size} onValueChange={(value) => updateItem(index, 'letter_size', value)}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="extra_small">Extra Small (≤4")</SelectItem>
                                    <SelectItem value="small">Small (4-8")</SelectItem>
                                    <SelectItem value="normal">Normal (8-12")</SelectItem>
                                    <SelectItem value="medium">Medium (12-20")</SelectItem>
                                    <SelectItem value="large">Large (20-30")</SelectItem>
                                    <SelectItem value="extra_large">Extra Large (30"+)</SelectItem>
                                </SelectContent>
                                </Select>
                            </div>
                          )}
                        </div>

                        {/* Paint Section */}
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <Label>Paint Sides</Label>
                              <Select value={item.paint_sides} onValueChange={(value) => updateItem(index, 'paint_sides', value)}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="one_side">One Side</SelectItem>
                                  <SelectItem value="both_sides">Both Sides</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                             <div className="space-y-2">
                              <Label>Paint Colors</Label>
                              {item.paint_colors && item.paint_colors.length > 0 ? (
                                item.paint_colors.map((color, cIndex) => (
                                  <div key={cIndex} className="flex items-center gap-2">
                                    <Input 
                                      value={color} 
                                      onChange={(e) => updateItemColor(index, cIndex, e.target.value)} 
                                      placeholder="e.g., PMS 186C, Black, White" 
                                      className="mt-1" 
                                    />
                                    <Button variant="ghost" size="icon" onClick={() => removeColor(index, cIndex)} className="text-red-500 hover:bg-red-50 shrink-0">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))
                              ) : (
                                <div className="text-sm text-slate-500 p-3 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                                  No colors added yet. Click "Add Color" to specify paint colors.
                                  <br />
                                  <span className="text-xs">Suggestions: PMS 186C, Black, White, PMS 285C, Gold</span>
                                </div>
                              )}
                              <Button variant="outline" size="sm" onClick={() => addColor(index)}>
                                <Palette className="w-3 h-3 mr-2" />Add Color
                              </Button>
                            </div>
                          </div>
                          
                          {/* Paint Mask Section - Only show for multiple colors */}
                          {item.paint_colors && item.paint_colors.length > 1 && (
                            <div className="mt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                    <div>
                                        <Label>Paint Mask Square Feet</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.25"
                                            value={item.paint_mask_sqft || ""}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => updateItem(index, 'paint_mask_sqft', parseFloat(e.target.value) || 0)}
                                            className="mt-1"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">Manually enter sqft or use the helper.</p>
                                    </div>
                                    <div>
                                        <Label>Approx. Coverage Helper</Label>
                                        <Select value={item.approx_coverage_factor || '1/4'} onValueChange={(value) => handleCoverageFactorChange(index, value)}>
                                            <SelectTrigger className="mt-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {coverageFactors.map(size => (
                                                <SelectItem key={size} value={size}>{size}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-slate-500 mt-1">Calculates mask sqft based on face area.</p>
                                    </div>
                                </div>
                            </div>
                          )}
                        </div>

                        {/* Totals Section */}
                        <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div><span className="text-slate-500">Paint Mask:</span><p className="font-medium">${(item.supplies_cost || 0).toFixed(2)}</p></div>
                            <div><span className="text-slate-500">Paint & Supplies:</span><p className="font-medium">${(item.paint_cost || 0).toFixed(2)}</p></div>
                            <div><span className="text-slate-500">Labor Hrs:</span><p className="font-medium">{(item.labor_hours || 0).toFixed(1)}</p></div>
                            <div><span className="font-semibold text-slate-900">Labor Cost:</span><p className="font-semibold text-slate-900">${(item.labor_cost || 0).toFixed(2)}</p></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {/* Cost Summary Column */}
          <div className="space-y-6">
            <Card className="bg-white border-0 shadow-sm sticky top-8">
              <CardHeader><CardTitle className="text-lg font-semibold text-slate-900">Cost Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-purple-800">Paint Mask:</span>
                    <span className="text-lg font-bold text-purple-900">${totalPaintMask.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-purple-600">Masking materials & machine cutting for multi-color jobs</p>
                </div>
                 {/* Combined Base Supplies into Liquid Paint & Supplies total */}
                 <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-blue-800">Liquid Paint & Supplies:</span>
                    <span className="text-lg font-bold text-blue-900">${totalLiquidPaintAndSupplies.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-blue-600">Includes liquid paint, base job supplies, application materials, and waste.</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-green-800">Total Labor:</span>
                    <span className="text-lg font-bold text-green-900">${totalLabor.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-green-600">{totalLaborHours.toFixed(1)} hours total (includes item labor, mixing, setup)</p>
                </div>
                
                <div className="space-y-2 pt-4 border-t">
                  <Button onClick={downloadEstimate} variant="outline" className="w-full">
                    Download Estimate
                  </Button>
                  <Button onClick={printEstimate} variant="outline" className="w-full">
                    Print Estimate
                  </Button>
                  <Button onClick={sendEstimate} variant="outline" className="w-full">
                    Email Estimate
                  </Button>
                </div>

                <Button onClick={saveProject} disabled={isSaving} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 mt-4">
                  {isSaving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> {isEditing ? 'Update Estimate' : 'Save Estimate'}</>}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Email Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b">
                <div className="flex justify-between items-center">
                  <CardTitle>Send Estimate via Email</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setShowEmailModal(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label htmlFor="email_to">To Email Address *</Label>
                  <Input
                    id="email_to"
                    type="email"
                    value={emailData.to}
                    onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                    placeholder="client@example.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email_subject">Subject *</Label>
                  <Input
                    id="email_subject"
                    value={emailData.subject}
                    onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email_message">Message *</Label>
                  <Textarea
                    id="email_message"
                    value={emailData.message}
                    onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                    className="mt-1 h-64"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowEmailModal(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSendEmail}
                    disabled={!emailData.to || !emailData.subject || !emailData.message}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
