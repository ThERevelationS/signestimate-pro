
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Project, Settings } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Save, Calculator, Palette, Edit, Mail, X, ChevronDown, ChevronUp } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";

const imperialSizes = ["1/16", "1/8", "3/16", "1/4", "3/16", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8", "1", "1-1/8", "1-1/4", "1-3/8", "1-1/2", "1-5/8", "1-3/4", "1-7/8", "2", "2-1/4", "2-1/2", "2-3/4", "3", "3-1/4", "3-1/2", "3-3/4", "4"];
const coverageFactors = ["1/8", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8", "1", "1-1/8", "1-1/4", "1-3/8", "1-1/2", "1-5/8", "1-3/4", "1-7/8", "2"];

const parseImperialFraction = (fractionString) => {
  if (typeof fractionString !== 'string') {
    return parseFloat(fractionString) || 0;
  }

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
    if (denominator !== 0) {
      totalValue += numerator / denominator;
    }
  } else {
    totalValue += parseFloat(fractionString) || 0;
  }
  return totalValue;
};

const formatPaintVolume = (gallons) => {
  const totalGallons = gallons.toFixed(2);
  const totalQuarts = (gallons * 4).toFixed(2);
  const totalPints = (gallons * 8).toFixed(2);

  return `${totalGallons} gal | ${totalQuarts} qt | ${totalPints} pt`;
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
    estimate_number: "",
    hyperlink: "",
    items: [],
    paint_supplies_per_sqft: 1.25,
    notes: ""
  });
  const [globalSettings, setGlobalSettings] = useState({});

  const [panelTiers, setPanelTiers] = useState([]);
  const [complexShapesTiers, setComplexShapesTiers] = useState([]);
  const [letteringTiers, setLetteringTiers] = useState([]);

  const [expandedCostOverride, setExpandedCostOverride] = useState({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleCostOverride = (index) => {
    setExpandedCostOverride((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getLaborMultiplier = useCallback((itemType, quantity) => {
    let tiers = [];
    if (itemType === 'panel') {
      tiers = panelTiers;
    } else if (itemType === 'complex_shapes') {
      tiers = complexShapesTiers;
    } else if (itemType === 'lettering') {
      tiers = letteringTiers;
    }

    if (!tiers || tiers.length === 0) return 1.0;

    for (let tier of tiers) {
      if (quantity >= tier.min_quantity && quantity <= tier.max_quantity) {
        return tier.labor_multiplier;
      }
    }

    return 1.0;
  }, [panelTiers, complexShapesTiers, letteringTiers]);

  const getItemsWithDiscounts = useCallback(() => {
    return project.items.
    map((item, index) => {
      const multiplier = getLaborMultiplier(item.item_type, item.quantity);
      if (multiplier < 1.0) {
        const discountPercent = ((1 - multiplier) * 100).toFixed(0);
        return {
          index,
          description: item.description || `${item.item_type} item`,
          itemType: item.item_type,
          quantity: item.quantity,
          multiplier,
          discountPercent
        };
      }
      return null;
    }).
    filter((item) => item !== null);
  }, [project.items, getLaborMultiplier]);

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
    paintCostPerGallon / totalRatio * paintMixRatio +
    hardenerCostPerGallon / totalRatio * hardenerMixRatio +
    reducerCostPerGallon / totalRatio * reducerMixRatio :
    0;

    const coverageSqFtPerGallon = parseFloat(globalSettings.mixed_paint_coverage_sqft_per_gallon) || 1;
    const finalRate = coverageSqFtPerGallon > 0 ? costOfMix / coverageSqFtPerGallon : 0;

    return finalRate;
  }, [globalSettings, getCostPerGallon]);

  const loadProjectForEdit = useCallback(async (projectId) => {
    try {
      const projectToEdit = await Project.get(projectId);
      if (projectToEdit) {
        const cleanedProject = {
          ...projectToEdit,
          items: projectToEdit.items.map((item) => ({
            ...item,
            paint_sides: item.paint_sides === 'none' ? 'one_side' : item.paint_sides,
            approx_coverage_factor: item.approx_coverage_factor || "1/4",
            base_supplies_cost: item.base_supplies_cost !== undefined ? item.base_supplies_cost : 0,
            paint_gallons: item.paint_gallons !== undefined ? item.paint_gallons : 0 // Ensure paint_gallons is present
          }))
        };
        const { client_email, client_phone, estimate_number, hyperlink, supplies_rate_per_sqft, labor_rate, base_supplies_cost, ...restOfProject } = cleanedProject;
        setProject({
          ...restOfProject,
          estimate_number: estimate_number || "",
          hyperlink: hyperlink || ""
        });
        setIsEditing(true);
      } else {
        console.warn(`Project with ID ${projectId} not found.`);
        navigate(createPageUrl("PaintProjects"));
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
      settingsData.forEach((setting) => {
        settingsObj[setting.setting_name] = setting.setting_value;
      });

      setGlobalSettings(settingsObj);

      if (settingsObj.panel_labor_tiers) {
        try {
          setPanelTiers(JSON.parse(settingsObj.panel_labor_tiers));
        } catch (e) {
          console.error('Error parsing panel tiers:', e);
        }
      }

      if (settingsObj.complex_shapes_labor_tiers) {
        try {
          setComplexShapesTiers(JSON.parse(settingsObj.complex_shapes_labor_tiers));
        } catch (e) {
          console.error('Error parsing complex shapes tiers:', e);
        }
      }

      if (settingsObj.lettering_labor_tiers) {
        try {
          setLetteringTiers(JSON.parse(settingsObj.lettering_labor_tiers));
        } catch (e) {
          console.error('Error parsing lettering tiers:', e);
        }
      }

      if (!editId) {
        const newDefaults = {
          paint_supplies_per_sqft: parseFloat(settingsObj.default_paint_supplies_per_sqft) || 1.25,
          notes: settingsObj.default_notes_template || ""
        };

        setProject((prev) => ({ ...prev, ...newDefaults }));
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
    setProject((prev) => ({
      ...prev,
      items: [...prev.items, {
        item_type: "panel",
        description: "",
        thickness: "1/2",
        length: 0,
        width: 0,
        quantity: 1,
        edge_complexity_multiplier: 1.0,
        paint_sides: "one_side",
        paint_colors: [""],
        letter_size: "normal",
        paint_mask_sqft: 0,
        base_supplies_cost: 0,
        supplies_cost: 0,
        paint_cost: 0,
        paint_gallons: 0, // Initialize paint_gallons for new items
        labor_hours: 0,
        labor_cost: 0,
        approx_coverage_factor: "1/4"
      }]
    }));
  };

  const removeItem = (index) => {
    setProject((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setProject((prev) => {
      const newItems = [...prev.items];
      let item = { ...newItems[index], [field]: value };

      if (field === 'width' && item.item_type === 'lettering') {
        const height = value;
        if (height <= 4) item.letter_size = 'extra_small';else
        if (height <= 8) item.letter_size = 'small';else
        if (height <= 12) item.letter_size = 'normal';else
        if (height <= 20) item.letter_size = 'medium';else
        if (height <= 30) item.letter_size = 'large';else
        item.letter_size = 'extra_large';
      }

      if (['length', 'width', 'item_type'].includes(field) && item.length > 0 && item.width > 0) {
        if (item.item_type === 'panel' || item.item_type === 'complex_shapes') {
          const faceArea = item.length * item.width / 144;
          item.paint_mask_sqft = item.paint_sides === 'both_sides' ? faceArea * 2 : faceArea;
        } else if (item.item_type === 'lettering') {
          const letterHeight = item.width;
          const numLetters = item.length;
          const faceArea = Math.pow(letterHeight, 2) * 0.8 * numLetters / 144;
          item.paint_mask_sqft = item.paint_sides === 'both_sides' ? faceArea * 2 : faceArea;
        }
      }

      const perimFactor = parseFloat(globalSettings.letter_perimeter_factor) || 3.5;
      let paintableSqFt = 0;
      const itemThicknessDecimal = parseImperialFraction(item.thickness);

      if (item.item_type === 'panel' && item.length > 0 && item.width > 0) {
        const faceArea = item.length * item.width / 144;
        paintableSqFt = item.paint_sides === 'both_sides' ? faceArea * 2 : faceArea;
      } else if (item.item_type === 'lettering' && item.width > 0 && item.length > 0 && itemThicknessDecimal > 0) {
        const letterHeight = item.width;
        const numLetters = item.length;

        const faceArea = Math.pow(letterHeight, 2) * 0.8 * numLetters / 144;
        const perimeterInches = letterHeight * perimFactor * numLetters;
        const edgeArea = perimeterInches * itemThicknessDecimal / 144;

        paintableSqFt = item.paint_sides === 'both_sides' ? faceArea * 2 + edgeArea : faceArea + edgeArea;
      } else if (item.item_type === 'complex_shapes' && item.length > 0 && item.width > 0 && itemThicknessDecimal > 0) {
        const faceArea = item.length * item.width / 144;
        const perimeterInches = 2 * (item.length + item.width);
        const edgeArea = perimeterInches * itemThicknessDecimal * (item.edge_complexity_multiplier || 1.0) / 144;

        if (item.paint_sides === 'both_sides') {
          paintableSqFt = faceArea * 2 + edgeArea;
        } else if (item.paint_sides === 'one_side') {
          paintableSqFt = faceArea + edgeArea;
        } else {
          paintableSqFt = 0;
        }
      }

      const paintSuppliesRate = prev.paint_supplies_per_sqft;

      const paintMaskMaterialRate = parseFloat(globalSettings.paint_mask_rate_per_sqft) || 0.75;
      const paintMaskMachineRate = parseFloat(globalSettings.paint_mask_machine_cutting_rate_per_sqft) || 0.10;
      let paintMaskCost = 0;

      const numColors = item.paint_colors?.length || 0;
      if (numColors > 1 && item.paint_mask_sqft > 0) {
        const maskMaterialCost = item.paint_mask_sqft * paintMaskMaterialRate * (numColors - 1);
        const maskMachineCost = item.paint_mask_sqft * paintMaskMachineRate * (numColors - 1);
        paintMaskCost = maskMaterialCost + maskMachineCost;
      }

      let liquidPaintAndSuppliesCost = 0;
      let liquidPaintCost = 0;
      let paintApplicationSuppliesCost = 0;
      let paintGallons = 0; // Initialize paintGallons

      if (numColors > 0) {
        paintApplicationSuppliesCost = paintableSqFt * paintSuppliesRate * numColors;

        const paintWasteMultiplier = parseFloat(globalSettings.paint_waste_multiplier) || 1.25;
        const coverageSqFtPerGallon = parseFloat(globalSettings.mixed_paint_coverage_sqft_per_gallon) || 350;

        if (liquidPaintRate > 0) {
          liquidPaintCost = paintableSqFt * liquidPaintRate * paintWasteMultiplier * numColors;
        }

        // Calculate gallons needed for this item
        paintGallons = paintableSqFt * paintWasteMultiplier * numColors / coverageSqFtPerGallon;
      }

      liquidPaintAndSuppliesCost = paintApplicationSuppliesCost + liquidPaintCost + (item.base_supplies_cost || 0);

      const laborRate = parseFloat(globalSettings.default_labor_rate) || 60;
      const baseHoursPerSqFt = parseFloat(globalSettings.base_labor_hours_per_sqft) || 0.5;
      const complexityMap = {
        extra_small: 'complex',
        small: 'complex',
        normal: 'moderate',
        medium: 'moderate',
        large: 'simple',
        extra_large: 'simple'
      };
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
        baseHours *= 1 + (numColors - 1) * additionalColorMultiplier;
      }

      const maskApplicationLaborRate = parseFloat(globalSettings.paint_mask_application_labor_rate_per_sqft) || 0.25;
      const maskCuttingLaborRate = parseFloat(globalSettings.paint_mask_cutting_labor_rate_per_sqft) || 0.15;
      if (numColors > 1 && item.paint_mask_sqft > 0) {
        const maskApplicationLaborHours = item.paint_mask_sqft * maskApplicationLaborRate * (numColors - 1) / laborRate;
        const maskCuttingLaborHours = item.paint_mask_sqft * maskCuttingLaborRate * (numColors - 1) / laborRate;
        baseHours += maskApplicationLaborHours + maskCuttingLaborHours;
      }

      const quantityMultiplier = getLaborMultiplier(item.item_type, item.quantity);
      const discountedLaborHours = baseHours * quantityMultiplier;

      const laborHours = discountedLaborHours;
      const laborCost = laborHours * laborRate * item.quantity;

      item = {
        ...item,
        supplies_cost: paintMaskCost * item.quantity,
        paint_cost: liquidPaintAndSuppliesCost * item.quantity,
        paint_gallons: paintGallons * item.quantity, // Assign paint_gallons
        labor_hours: laborHours * item.quantity,
        labor_cost: laborCost
      };

      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  const handleCoverageFactorChange = (index, factorStr) => {
    const factor = parseImperialFraction(factorStr);
    const item = project.items[index];
    let faceArea = 0;

    if ((item.item_type === 'panel' || item.item_type === 'complex_shapes') && item.length > 0 && item.width > 0) {
      faceArea = item.length * item.width / 144;
    } else if (item.item_type === 'lettering' && item.width > 0 && item.length > 0) {
      const letterHeight = item.width;
      const numLetters = item.length;
      faceArea = Math.pow(letterHeight, 2) * 0.8 * numLetters / 144;
    }

    const calculatedMaskSqFt = faceArea * factor;

    setProject((prev) => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        approx_coverage_factor: factorStr,
        paint_mask_sqft: calculatedMaskSqFt
      };
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

    const laborRate = parseFloat(globalSettings.default_labor_rate) || 60;
    let totalItemLaborCost = project.items.reduce((sum, item) => sum + (item.labor_cost || 0), 0);

    // Calculate total paint gallons by summing paint_gallons from each item
    let totalPaintGallons = project.items.reduce((sum, item) => sum + (item.paint_gallons || 0), 0);

    // Number of mixes is based on total paint gallons
    const numberOfMixes = Math.ceil(totalPaintGallons);

    const mixingHoursPerGallon = parseFloat(globalSettings.paint_mixing_labor_hours) || 0;
    const mixingHours = numberOfMixes * mixingHoursPerGallon;
    const setupHours = parseFloat(globalSettings.setup_time_labor_hours) || 0;
    const fixedLaborCost = (mixingHours + setupHours) * laborRate;

    let totalLabor = totalItemLaborCost + fixedLaborCost;
    const totalLaborHours = project.items.reduce((sum, item) => sum + (item.labor_hours || 0), 0) + mixingHours + setupHours;

    const minLaborHours = parseFloat(globalSettings.min_labor_hours) || 0;
    const minPaintCost = parseFloat(globalSettings.min_paint_cost) || 0;

    if (totalLaborHours > 0 && totalLaborHours < minLaborHours) {
      totalLabor = minLaborHours * laborRate;
    }

    if (totalLiquidPaintAndSupplies > 0 && totalLiquidPaintAndSupplies < minPaintCost) {
      totalLiquidPaintAndSupplies = minPaintCost;
    }

    return {
      totalPaintMask,
      totalLiquidPaintAndSupplies,
      totalLabor,
      totalLaborHours,
      totalGallonsNeeded: totalPaintGallons, // Use the summed paint_gallons
      numberOfMixes,
      mixingHours,
      setupHours
    };
  };

  const saveProject = async () => {
    if (!project.project_name || !project.client_name) {
      alert('Please fill in project name and client name');
      return;
    }

    setIsSaving(true);
    try {
      const { totalPaintMask, totalLiquidPaintAndSupplies, totalLabor, totalGallonsNeeded } = calculateTotals();
      const finalProject = {
        ...project,
        items: project.items.map((item) => ({
          ...item,
          paint_colors: item.paint_colors ? item.paint_colors.filter((c) => c.trim() !== '') : []
        })),
        total_paint_mask_cost: totalPaintMask,
        total_liquid_paint_and_supplies_cost: totalLiquidPaintAndSupplies,
        total_labor_cost: totalLabor,
        total_paint_gallons: totalGallonsNeeded, // Save total gallons needed to project
        status: 'calculated'
      };

      if (isEditing) {
        await Project.update(editId, finalProject);
      } else {
        await Project.create(finalProject);
      }

      // Use window.location for reliable navigation
      window.location.href = createPageUrl("PaintProjects");
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
    const { totalPaintMask, totalLiquidPaintAndSupplies, totalLabor, totalLaborHours, totalGallonsNeeded } = calculateTotals();
    const totalCost = totalPaintMask + totalLiquidPaintAndSupplies + totalLabor;
    const laborRate = parseFloat(globalSettings.default_labor_rate) || 60;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Paint Estimate - ${project.project_name}</title>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin: 0;
      padding: 40px;
      color: #1e293b;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      min-height: 100vh;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    .header .subtitle {
      font-size: 16px;
      opacity: 0.95;
      font-weight: 500;
    }
    
    .project-info {
      padding: 30px 40px;
      background: #f8fafc;
      border-bottom: 3px solid #e2e8f0;
    }
    
    .project-info h2 {
      color: #475569;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 15px;
      font-weight: 600;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    
    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .info-label {
      font-weight: 600;
      color: #64748b;
      font-size: 13px;
    }
    
    .info-value {
      color: #1e293b;
      font-size: 13px;
    }
    
    .content {
      padding: 40px;
    }
    
    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 25px;
      padding-bottom: 10px;
      border-bottom: 3px solid #3b82f6;
      display: inline-block;
    }
    
    .item {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 25px;
      margin-bottom: 20px;
    }
    
    .item-header {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      margin: -25px -25px 20px -25px;
      font-weight: 600;
      font-size: 16px;
    }
    
    .item-details {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 15px;
    }
    
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    
    .detail-label {
      font-weight: 600;
      color: #64748b;
      font-size: 13px;
    }
    
    .detail-value {
      color: #1e293b;
      font-weight: 500;
      font-size: 13px;
    }
    
    .paint-volume-highlight {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      border: 2px solid #3b82f6;
      border-radius: 8px;
      padding: 12px;
      margin: 15px 0;
    }
    
    .paint-volume-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1e40af;
      font-weight: 600;
      margin-bottom: 5px;
    }
    
    .paint-volume-value {
      font-size: 16px;
      font-weight: 700;
      color: #1e40af;
    }
    
    .item-costs {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px dashed #cbd5e1;
    }
    
    .cost-box {
      background: white;
      padding: 15px;
      border-radius: 8px;
      border: 2px solid #e2e8f0;
    }
    
    .cost-box.mask {
      border-color: #8b5cf6;
      background: linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%);
    }
    
    .cost-box.paint {
      border-color: #6366f1;
      background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
    }
    
    .cost-box.labor {
      border-color: #10b981;
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    }
    
    .cost-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 5px;
    }
    
    .cost-value {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
    }
    
    .summary {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 3px solid #e2e8f0;
      border-radius: 16px;
      padding: 30px;
      margin-top: 40px;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .summary-row:last-child {
      border-bottom: none;
    }
    
    .summary-label {
      font-weight: 600;
      color: #475569;
      font-size: 15px;
    }
    
    .summary-value {
      font-weight: 700;
      color: #1e293b;
      font-size: 15px;
    }
    
    .summary-row.volume {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      border: 2px solid #3b82f6;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
    }
    
    .summary-row.volume .summary-label { color: #1e40af; font-size: 13px; }
    .summary-row.volume .summary-value { color: #1e40af; font-size: 16px; }
    
    .summary-row.mask .summary-value { color: #8b5cf6; }
    .summary-row.paint .summary-value { color: #6366f1; }
    .summary-row.labor .summary-value { color: #10b981; }
    
    .total-row {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 3px solid #3b82f6;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .total-label {
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .total-value {
      font-size: 36px;
      font-weight: 800;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .notes {
      background: #fef3c7;
      border: 2px solid #fbbf24;
      border-radius: 12px;
      padding: 25px;
      margin-top: 30px;
    }
    
    .notes h3 {
      color: #92400e;
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .notes p {
      color: #78350f;
      line-height: 1.6;
      font-size: 14px;
    }
    
    .footer {
      background: #1e293b;
      color: white;
      padding: 20px;
      text-align: center;
      font-size: 12px;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎨 Paint Estimate</h1>
      <div class="subtitle">Professional Painting Services</div>
    </div>

    <div class="project-info">
      <h2>Project Details</h2>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Project:</span>
          <span class="info-value">${project.project_name}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Client:</span>
          <span class="info-value">${project.client_name}</span>
        </div>
        ${project.estimate_number ? `
        <div class="info-item">
          <span class="info-label">Estimate #:</span>
          <span class="info-value">${project.estimate_number}</span>
        </div>
        ` : ''}
        <div class="info-item">
          <span class="info-label">Date:</span>
          <span class="info-value">${new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>

    <div class="content">
      <div class="section-title">Items Breakdown</div>

      ${project.items.map((item, i) => `
        <div class="item">
          <div class="item-header">
            Item ${i + 1}: ${item.description || `${item.item_type} item`}
          </div>

          <div class="item-details">
            <div class="detail-row">
              <span class="detail-label">Type:</span>
              <span class="detail-value">${item.item_type}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Dimensions:</span>
              <span class="detail-value">${item.length}"L × ${item.width}"H × ${item.thickness}"</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Quantity:</span>
              <span class="detail-value">${item.quantity}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Paint Sides:</span>
              <span class="detail-value">${item.paint_sides}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Colors:</span>
              <span class="detail-value">${item.paint_colors?.filter((c) => c.trim() !== '').join(', ') || 'None'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Labor Hours:</span>
              <span class="detail-value">${(item.labor_hours || 0).toFixed(1)} hrs</span>
            </div>
          </div>

          <div class="paint-volume-highlight">
            <div class="paint-volume-label">Paint Volume Required</div>
            <div class="paint-volume-value">${formatPaintVolume(item.paint_gallons || 0)}</div>
          </div>

          <div class="item-costs">
            <div class="cost-box mask">
              <div class="cost-label">Paint Mask</div>
              <div class="cost-value">$${(item.supplies_cost || 0).toFixed(2)}</div>
            </div>
            <div class="cost-box paint">
              <div class="cost-label">Paint & Supplies</div>
              <div class="cost-value">$${(item.paint_cost || 0).toFixed(2)}</div>
            </div>
            <div class="cost-box labor">
              <div class="cost-label">Labor Cost</div>
              <div class="cost-value">$${(item.labor_cost || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>
      `).join('')}

      <div class="summary">
        <div class="section-title" style="border-color: #10b981;">Cost Summary</div>

        <div class="summary-row volume">
          <span class="summary-label">Total Paint Volume Required:</span>
          <span class="summary-value">${formatPaintVolume(totalGallonsNeeded)}</span>
        </div>

        <div class="summary-row mask">
          <span class="summary-label">Total Paint Mask:</span>
          <span class="summary-value">$${totalPaintMask.toFixed(2)}</span>
        </div>
        <div class="summary-row paint">
          <span class="summary-label">Liquid Paint & Supplies:</span>
          <span class="summary-value">$${totalLiquidPaintAndSupplies.toFixed(2)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Fixed Labor (Mixing/Setup):</span>
          <span class="summary-value">$${(((parseFloat(globalSettings.paint_mixing_labor_hours) || 0) + (parseFloat(globalSettings.setup_time_labor_hours) || 0)) * laborRate).toFixed(2)}</span>
        </div>
        <div class="summary-row labor">
          <span class="summary-label">Total Labor (${totalLaborHours.toFixed(1)} hrs):</span>
          <span class="summary-value">$${totalLabor.toFixed(2)}</span>
        </div>

        <div class="total-row">
          <span class="total-label">Total Estimate</span>
          <span class="total-value">$${totalCost.toFixed(2)}</span>
        </div>
      </div>

      ${project.notes ? `
        <div class="notes">
          <h3>📝 Additional Notes</h3>
          <p>${project.notes}</p>
        </div>
      ` : ''}
    </div>

    <div class="footer">
      Generated by SignEstimate Pro - Professional Estimating Suite<br>
      © ${new Date().getFullYear()} All Rights Reserved
    </div>
  </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.project_name.replace(/\s+/g, '_')}_Paint_Estimate.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printEstimate = () => {
    const { totalPaintMask, totalLiquidPaintAndSupplies, totalLabor, totalLaborHours, totalGallonsNeeded } = calculateTotals();
    const totalCost = totalPaintMask + totalLiquidPaintAndSupplies + totalLabor;
    const laborRate = parseFloat(globalSettings.default_labor_rate) || 60;

    const printContent = `
      <html>
        <head>
          <title>Paint Estimate - ${project.project_name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

            * { margin: 0; padding: 0; box-sizing: border-box; }

            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              margin: 0;
              padding: 40px;
              color: #1e293b;
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              min-height: 100vh;
            }

            .container {
              max-width: 900px;
              margin: 0 auto;
              background: white;
              border-radius: 20px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              overflow: hidden;
            }

            .header {
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              color: white;
              padding: 40px;
              text-align: center;
            }

            .header h1 {
              font-size: 32px;
              font-weight: 700;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 2px;
            }

            .header .subtitle {
              font-size: 16px;
              opacity: 0.95;
              font-weight: 500;
            }

            .project-info {
              padding: 30px 40px;
              background: #f8fafc;
              border-bottom: 3px solid #e2e8f0;
            }

            .project-info h2 {
              color: #475569;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 15px;
              font-weight: 600;
            }

            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
            }

            .info-item {
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .info-label {
              font-weight: 600;
              color: #64748b;
              font-size: 13px;
            }

            .info-value {
              color: #1e293b;
              font-size: 13px;
            }

            .content {
              padding: 40px;
            }

            .section-title {
              font-size: 20px;
              font-weight: 700;
              color: #1e293b;
              margin-bottom: 25px;
              padding-bottom: 10px;
              border-bottom: 3px solid #3b82f6;
              display: inline-block;
            }

            .item {
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
              border: 2px solid #e2e8f0;
              border-radius: 12px;
              padding: 25px;
              margin-bottom: 20px;
            }

            .item-header {
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              color: white;
              padding: 12px 20px;
              border-radius: 8px;
              margin: -25px -25px 20px -25px;
              font-weight: 600;
              font-size: 16px;
            }

            .item-details {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
              margin-bottom: 15px;
            }

            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
            }

            .detail-label {
              font-weight: 600;
              color: #64748b;
              font-size: 13px;
            }

            .detail-value {
              color: #1e293b;
              font-weight: 500;
              font-size: 13px;
            }

            .paint-volume-highlight {
              background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
              border: 2px solid #3b82f6;
              border-radius: 8px;
              padding: 12px;
              margin: 15px 0;
            }

            .paint-volume-label {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #1e40af;
              font-weight: 600;
              margin-bottom: 5px;
            }

            .paint-volume-value {
              font-size: 16px;
              font-weight: 700;
              color: #1e40af;
            }

            .item-costs {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-top: 20px;
              padding-top: 20px;
              border-top: 2px dashed #cbd5e1;
            }

            .cost-box {
              background: white;
              padding: 15px;
              border-radius: 8px;
              border: 2px solid #e2e8f0;
            }

            .cost-box.mask {
              border-color: #8b5cf6;
              background: linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%);
            }

            .cost-box.paint {
              border-color: #6366f1;
              background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
            }

            .cost-box.labor {
              border-color: #10b981;
              background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
            }

            .cost-label {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #64748b;
              font-weight: 600;
              margin-bottom: 5px;
            }

            .cost-value {
              font-size: 20px;
              font-weight: 700;
              color: #1e293b;
            }

            .summary {
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
              border: 3px solid #e2e8f0;
              border-radius: 16px;
              padding: 30px;
              margin-top: 40px;
            }

            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 12px 0;
              border-bottom: 1px solid #e2e8f0;
            }

            .summary-row:last-child {
              border-bottom: none;
            }

            .summary-label {
              font-weight: 600;
              color: #475569;
              font-size: 15px;
            }

            .summary-value {
              font-weight: 700;
              color: #1e293b;
              font-size: 15px;
            }

            .summary-row.volume {
              background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
              border: 2px solid #3b82f6;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 15px;
            }

            .summary-row.volume .summary-label { color: #1e40af; font-size: 13px; }
            .summary-row.volume .summary-value { color: #1e40af; font-size: 16px; }

            .summary-row.mask .summary-value { color: #8b5cf6; }
            .summary-row.paint .summary-value { color: #6366f1; }
            .summary-row.labor .summary-value { color: #10b981; }

            .total-row {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 3px solid #3b82f6;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }

            .total-label {
              font-size: 24px;
              font-weight: 700;
              color: #1e293b;
              text-transform: uppercase;
              letter-spacing: 1px;
            }

            .total-value {
              font-size: 36px;
              font-weight: 800;
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }

            .notes {
              background: #fef3c7;
              border: 2px solid #fbbf24;
              border-radius: 12px;
              padding: 25px;
              margin-top: 30px;
            }

            .notes h3 {
              color: #92400e;
              font-size: 16px;
              font-weight: 700;
              margin-bottom: 15px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }

            .notes p {
              color: #78350f;
              line-height: 1.6;
              font-size: 14px;
            }

            .footer {
              background: #1e293b;
              color: white;
              padding: 20px;
              text-align: center;
              font-size: 12px;
            }

            @media print {
              body {
                background: white;
                padding: 0;
              }
              .container {
                box-shadow: none;
                border-radius: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎨 Paint Estimate</h1>
              <div class="subtitle">Professional Painting Services</div>
            </div>

            <div class="project-info">
              <h2>Project Details</h2>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Project:</span>
                  <span class="info-value">${project.project_name}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Client:</span>
                  <span class="info-value">${project.client_name}</span>
                </div>
                ${project.estimate_number ? `
                <div class="info-item">
                  <span class="info-label">Estimate #:</span>
                  <span class="info-value">${project.estimate_number}</span>
                </div>
                ` : ''}
                <div class="info-item">
                  <span class="info-label">Date:</span>
                  <span class="info-value">${new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div class="content">
              <div class="section-title">Items Breakdown</div>

              ${project.items.map((item, i) => `
                <div class="item">
                  <div class="item-header">
                    Item ${i + 1}: ${item.description || `${item.item_type} item`}
                  </div>

                  <div class="item-details">
                    <div class="detail-row">
                      <span class="detail-label">Type:</span>
                      <span class="detail-value">${item.item_type}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Dimensions:</span>
                      <span class="detail-value">${item.length}"L × ${item.width}"H × ${item.thickness}"</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Quantity:</span>
                      <span class="detail-value">${item.quantity}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Paint Sides:</span>
                      <span class="detail-value">${item.paint_sides}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Colors:</span>
                      <span class="detail-value">${item.paint_colors?.filter((c) => c.trim() !== '').join(', ') || 'None'}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Labor Hours:</span>
                      <span class="detail-value">${(item.labor_hours || 0).toFixed(1)} hrs</span>
                    </div>
                  </div>

                  <div class="paint-volume-highlight">
                    <div class="paint-volume-label">Paint Volume Required</div>
                    <div class="paint-volume-value">${formatPaintVolume(item.paint_gallons || 0)}</div>
                  </div>

                  <div class="item-costs">
                    <div class="cost-box mask">
                      <div class="cost-label">Paint Mask</div>
                      <div class="cost-value">$${(item.supplies_cost || 0).toFixed(2)}</div>
                    </div>
                    <div class="cost-box paint">
                      <div class="cost-label">Paint & Supplies</div>
                      <div class="cost-value">$${(item.paint_cost || 0).toFixed(2)}</div>
                    </div>
                    <div class="cost-box labor">
                      <div class="cost-label">Labor Cost</div>
                      <div class="cost-value">$${(item.labor_cost || 0).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              `).join('')}

              <div class="summary">
                <div class="section-title" style="border-color: #10b981;">Cost Summary</div>

                <div class="summary-row volume">
                  <span class="summary-label">Total Paint Volume Required:</span>
                  <span class="summary-value">${formatPaintVolume(totalGallonsNeeded)}</span>
                </div>

                <div class="summary-row mask">
                  <span class="summary-label">Total Paint Mask:</span>
                  <span class="summary-value">$${totalPaintMask.toFixed(2)}</span>
                </div>
                <div class="summary-row paint">
                  <span class="summary-label">Liquid Paint & Supplies:</span>
                  <span class="summary-value">$${totalLiquidPaintAndSupplies.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Fixed Labor (Mixing/Setup):</span>
                  <span class="summary-value">$${(((parseFloat(globalSettings.paint_mixing_labor_hours) || 0) + (parseFloat(globalSettings.setup_time_labor_hours) || 0)) * laborRate).toFixed(2)}</span>
                </div>
                <div class="summary-row labor">
                  <span class="summary-label">Total Labor (${totalLaborHours.toFixed(1)} hrs):</span>
                  <span class="summary-value">$${totalLabor.toFixed(2)}</span>
                </div>

                <div class="total-row">
                  <span class="total-label">Total Estimate</span>
                  <span class="total-value">$${totalCost.toFixed(2)}</span>
                </div>
              </div>

              ${project.notes ? `
                <div class="notes">
                  <h3>📝 Additional Notes</h3>
                  <p>${project.notes}</p>
                </div>
              ` : ''}
            </div>

            <div class="footer">
              Generated by SignEstimate Pro - Professional Estimating Suite<br>
              © ${new Date().getFullYear()} All Rights Reserved
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const sendEstimate = () => {
    const { totalPaintMask, totalLiquidPaintAndSupplies, totalLabor, totalLaborHours, totalGallonsNeeded } = calculateTotals();
    const totalCost = totalPaintMask + totalLiquidPaintAndSupplies + totalLabor;
    const laborRate = parseFloat(globalSettings.default_labor_rate) || 60;

    setEmailData({
      to: '',
      subject: `Paint Estimate - ${project.project_name}`,
      message: `Hello,

Please find the detailed paint estimate for ${project.project_name} attached.

PROJECT SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project: ${project.project_name}
Client: ${project.client_name}
${project.estimate_number ? `Estimate #: ${project.estimate_number}` : ''}
Date: ${new Date().toLocaleDateString()}

COST BREAKDOWN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 Total Paint Volume: ${formatPaintVolume(totalGallonsNeeded)}
💜 Paint Mask: $${totalPaintMask.toFixed(2)}
🎨 Liquid Paint & Supplies: $${totalLiquidPaintAndSupplies.toFixed(2)}
👷 Total Labor (${totalLaborHours.toFixed(1)} hrs): $${totalLabor.toFixed(2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 TOTAL ESTIMATE: $${totalCost.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ITEMS INCLUDED:
${project.items.map((item, i) => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Item ${i + 1}: ${item.description || `${item.item_type} item`}
  • Type: ${item.item_type}
  • Dimensions: ${item.length}"L × ${item.width}"H × ${item.thickness}"
  • Quantity: ${item.quantity}
  • Paint Sides: ${item.paint_sides}
  • Colors: ${item.paint_colors?.filter((c) => c.trim() !== '').join(', ') || 'None'}
  • Paint Volume: ${formatPaintVolume(item.paint_gallons || 0)}
  • Item Total: $${((item.supplies_cost || 0) + (item.paint_cost || 0) + (item.labor_cost || 0)).toFixed(2)}
`).join('')}

${project.notes ? `\nADDITIONAL NOTES:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${project.notes}\n` : ''}

For a detailed, beautifully formatted version of this estimate, please download the HTML file using the "Download Estimate" button in the app.

Best regards,
${globalSettings.company_name || 'SignEstimate Pro'}

---
Generated by SignEstimate Pro - Professional Estimating Suite
© ${new Date().getFullYear()} All Rights Reserved`
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

  const { totalPaintMask, totalLiquidPaintAndSupplies, totalLabor, totalLaborHours, totalGallonsNeeded, numberOfMixes, mixingHours, setupHours } = calculateTotals();
  const itemsWithDiscounts = getItemsWithDiscounts();

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-6 text-center">
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>);

  }

  return (
    <div className="bg-slate-50 px-6 md:p-8 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("PaintProjects")}>
            <Button variant="outline" size="icon" className="hover:bg-slate-100"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              {isEditing ? <Edit className="w-8 h-8" /> : <Calculator className="w-8 h-8" />}
              {isEditing ? 'Edit Paint Estimate' : 'New Paint Estimate'}
            </h1>
            <p className="text-slate-600">{isEditing ? 'Update your paint estimate' : 'Create a detailed estimate for painting dimensional letters and panels'}</p>
          </div>
          {isEditing &&
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteProject}
            disabled={isDeleting}
            className="ml-auto text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300">

              {isDeleting ? 'Deleting...' : <><Trash2 className="w-4 h-4 mr-2" /> Delete Project</>}
            </Button>
          }
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="px-6 flex flex-col space-y-1.5"><CardTitle className="text-lg font-semibold text-slate-900">Project Information</CardTitle></CardHeader>
              <CardContent className="px-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client_name">Client Name *</Label>
                    <Input
                      id="client_name"
                      value={project.client_name}
                      onChange={(e) => setProject((prev) => ({ ...prev, client_name: e.target.value }))}
                      placeholder="Enter client name"
                      className="mt-1" />

                  </div>
                  <div>
                    <Label htmlFor="project_name">Project Name *</Label>
                    <Input
                      id="project_name"
                      value={project.project_name}
                      onChange={(e) => setProject((prev) => ({ ...prev, project_name: e.target.value }))}
                      placeholder="Enter project name"
                      className="mt-1" />

                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="estimate_number">Estimate Number</Label>
                    <Input
                      id="estimate_number"
                      value={project.estimate_number || ""}
                      onChange={(e) => setProject((prev) => ({ ...prev, estimate_number: e.target.value }))}
                      placeholder="e.g., EST-2024-001"
                      className="mt-1" />

                  </div>
                  <div>
                    <Label htmlFor="hyperlink">Project Link</Label>
                    <Input
                      id="hyperlink"
                      value={project.hyperlink || ""}
                      onChange={(e) => setProject((prev) => ({ ...prev, hyperlink: e.target.value }))}
                      placeholder="https://..."
                      className="mt-1" />

                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Project Notes</Label>
                  <Textarea
                    id="notes"
                    value={project.notes}
                    onChange={(e) => setProject((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional project details..."
                    className="mt-1 h-20" />

                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="px-8 flex flex-col space-y-1.5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-900">Project Items</CardTitle>
                  <Button onClick={addItem} size="sm" className="bg-slate-800 hover:bg-slate-900"><Plus className="w-4 h-4 mr-2" />Add Item</Button>
                </div>
              </CardHeader>
              <CardContent className="px-6">
                {project.items.length === 0 ?
                <div className="text-center py-12 text-slate-500">
                    <Calculator className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>No items added yet. Click "Add Item" to start.</p>
                  </div> :

                <div className="space-y-6">
                    {project.items.map((item, index) =>
                  <div key={index} className="p-6 border border-slate-200 rounded-xl bg-slate-25">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-medium text-slate-900">Item {index + 1}</h4>
                          <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                        </div>

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
                          <div>
                            <Label>Thickness</Label>
                            <Select value={item.thickness} onValueChange={(value) => updateItem(index, 'thickness', value)}>
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {imperialSizes.map((size) =>
                            <SelectItem key={size} value={size}>{size}"</SelectItem>
                            )}
                              </SelectContent>
                            </Select>
                          </div>
                           {item.item_type === 'panel' || item.item_type === 'complex_shapes' ?
                      <>
                              <div>
                                <Label>Quantity</Label>
                                <Input
                            type="number"
                            min="1"
                            value={item.quantity || ""}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="mt-1" />

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
                            className="mt-1" />

                              </div>
                              <div>
                                <Label>Length (in)</Label>
                                <Input
                            type="number"
                            min="0"
                            step="0.25"
                            value={item.length || ""}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateItem(index, 'length', parseFloat(e.target.value) || 0)}
                            className="mt-1" />

                              </div>
                              {item.item_type === 'complex_shapes' &&
                        <div>
                                  <Label>Edge Complexity Multiplier</Label>
                                  <Input
                            type="number"
                            min="1.0"
                            step="0.1"
                            value={item.edge_complexity_multiplier || ""}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateItem(index, 'edge_complexity_multiplier', parseFloat(e.target.value) || 1.0)}
                            className="mt-1" />

                                  <p className="text-xs text-slate-500 mt-1">Multiplier for additional edge paint area (1.0 = standard, 2.0 = double edge paint)</p>
                                </div>
                        }
                            </> :

                      <>
                              <div>
                                <Label>Quantity</Label>
                                <Input
                            type="number"
                            min="1"
                            value={item.quantity || ""}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="mt-1" />

                              </div>
                              <div>
                                <Label>Letter Height (in)</Label>
                                <Input
                            type="number"
                            min="0"
                            step="0.25"
                            value={item.width || ""}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateItem(index, 'width', parseFloat(e.target.value) || 0)}
                            className="mt-1" />

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
                            className="mt-1" />

                              </div>
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
                            </>
                      }
                        </div>

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
                              {item.paint_colors && item.paint_colors.length > 0 ?
                          item.paint_colors.map((color, cIndex) =>
                          <div key={cIndex} className="flex items-center gap-2">
                                    <Input
                              value={color}
                              onChange={(e) => updateItemColor(index, cIndex, e.target.value)}
                              placeholder="e.g., PMS 186C, Black, White"
                              className="mt-1" />

                                    <Button variant="ghost" size="icon" onClick={() => removeColor(index, cIndex)} className="text-red-500 hover:bg-red-50 shrink-0">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                          ) :

                          <div className="text-sm text-slate-500 p-3 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                                  No colors added yet. Click "Add Color" to specify paint colors.
                                  <br />
                                  <span className="text-xs">Suggestions: PMS 186C, Black, White, PMS 285C, Gold</span>
                                </div>
                          }
                              <Button variant="outline" size="sm" onClick={() => addColor(index)}>
                                <Palette className="w-3 h-3 mr-2" />Add Color
                              </Button>
                            </div>
                          </div>

                          {item.paint_colors && item.paint_colors.length > 1 &&
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
                              className="mt-1" />

                                        <p className="text-xs text-slate-500 mt-1">Manually enter sqft or use the helper.</p>
                                    </div>
                                    <div>
                                        <Label>Approx. Coverage Helper</Label>
                                        <Select value={item.approx_coverage_factor || '1/4'} onValueChange={(value) => handleCoverageFactorChange(index, value)}>
                                            <SelectTrigger className="mt-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {coverageFactors.map((size) =>
                                <SelectItem key={size} value={size}>{size}</SelectItem>
                                )}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-slate-500 mt-1">Calculates mask sqft based on face area.</p>
                                    </div>
                                </div>
                            </div>
                      }
                        </div>

                        <div className="mt-4 border-t pt-4">
                          <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggleCostOverride(index)}
                        className="w-full text-xs h-8">

                            Cost Override
                            {expandedCostOverride[index] ? <ChevronUp className="w-3 h-3 ml-2" /> : <ChevronDown className="w-3 h-3 ml-2" />}
                          </Button>

                          {expandedCostOverride[index] &&
                      <div className="mt-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                              <div>
                                <Label htmlFor={`base_supplies_${index}`} className="text-xs">Base Supplies Cost (for this item)</Label>
                                <Input
                            id={`base_supplies_${index}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.base_supplies_cost || 0}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateItem(index, 'base_supplies_cost', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="mt-1 h-8 text-xs" />

                                <p className="text-xs text-amber-700 mt-1">Override base supplies for this item (e.g., special masking tape, cleaners)</p>
                              </div>
                            </div>
                      }
                        </div>

                        <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div>
                              <span className="text-slate-500">Paint Volume:</span>
                              <p className="font-medium text-blue-600 leading-tight">{formatPaintVolume(item.paint_gallons || 0)}</p>
                            </div>
                            <div><span className="text-slate-500">Paint Mask:</span><p className="font-medium">${(item.supplies_cost || 0).toFixed(2)}</p></div>
                            <div><span className="text-slate-500">Paint & Supplies:</span><p className="font-medium">${(item.paint_cost || 0).toFixed(2)}</p></div>
                            <div><span className="text-slate-500">Labor Hrs:</span><p className="font-medium">{(item.labor_hours || 0).toFixed(1)}</p></div>
                            <div><span className="font-semibold text-slate-900">Labor Cost:</span><p className="font-semibold text-slate-900">${(item.labor_cost || 0).toFixed(2)}</p></div>
                          </div>
                        </div>
                      </div>
                  )}
                  </div>
                }
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-white border-0 shadow-sm sticky top-8">
              <CardHeader><CardTitle className="text-lg font-semibold text-slate-900">Cost Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-blue-800">Paint Volume:</span>
                    <span className="text-lg font-bold text-blue-900 text-right leading-tight">{formatPaintVolume(totalGallonsNeeded)}</span>
                  </div>
                  <p className="text-xs text-blue-600">Total liquid paint needed across all items</p>
                  {totalGallonsNeeded > 1 &&
                  <div className="mt-2 pt-2 border-t border-blue-300">
                      <p className="text-xs text-blue-700 font-medium">
                        → {numberOfMixes} mix{numberOfMixes > 1 ? 'es' : ''} required
                      </p>
                    </div>
                  }
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-purple-800">Paint Mask:</span>
                    <span className="text-lg font-bold text-purple-900">${totalPaintMask.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-purple-600">Masking materials & machine cutting for multi-color jobs</p>
                </div>

                <div className="p-4 bg-indigo-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-indigo-800">Liquid Paint & Supplies:</span>
                    <span className="text-lg font-bold text-indigo-900">${totalLiquidPaintAndSupplies.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-indigo-600">Liquid paint, application materials, waste, and base supplies</p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-green-800">Total Labor:</span>
                    <span className="text-lg font-bold text-green-900">${totalLabor.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-green-600">{totalLaborHours.toFixed(1)} hours total</p>
                  <div className="mt-2 pt-2 border-t border-green-200 text-xs text-green-700 space-y-0.5">
                    <p>• Item labor: {(totalLaborHours - mixingHours - setupHours).toFixed(1)} hrs</p>
                    <p>• Mixing ({numberOfMixes} mix{numberOfMixes > 1 ? 'es' : ''}): {mixingHours.toFixed(1)} hrs</p>
                    <p>• Setup: {setupHours.toFixed(1)} hrs</p>
                  </div>

                  {itemsWithDiscounts.length > 0 &&
                  <div className="mt-2 pt-2 border-t border-green-200">
                      <p className="text-xs font-semibold text-amber-700 mb-1">✓ Discounts Applied:</p>
                      <div className="space-y-0.5">
                        {itemsWithDiscounts.map((discountedItem) =>
                      <p key={discountedItem.index} className="text-xs text-amber-600">
                            • Item #{discountedItem.index + 1}: {discountedItem.quantity} {discountedItem.itemType} → {discountedItem.discountPercent}% off
                          </p>
                      )}
                      </div>
                    </div>
                  }
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

        {showEmailModal &&
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
                  onChange={(e) => setEmailData((prev) => ({ ...prev, to: e.target.value }))}
                  placeholder="client@example.com"
                  className="mt-1" />

                </div>
                <div>
                  <Label htmlFor="email_subject">Subject *</Label>
                  <Input
                  id="email_subject"
                  value={emailData.subject}
                  onChange={(e) => setEmailData((prev) => ({ ...prev, subject: e.target.value }))}
                  className="mt-1" />

                </div>
                <div>
                  <Label htmlFor="email_message">Message *</Label>
                  <Textarea
                  id="email_message"
                  value={emailData.message}
                  onChange={(e) => setEmailData((prev) => ({ ...prev, message: e.target.value }))}
                  className="mt-1 h-64" />

                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowEmailModal(false)}>
                    Cancel
                  </Button>
                  <Button
                  onClick={handleSendEmail}
                  disabled={!emailData.to || !emailData.subject || !emailData.message}
                  className="bg-blue-600 hover:bg-blue-700">

                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        }
      </div>
    </div>);

}
