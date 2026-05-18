import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Project, Settings } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Save, Calculator, Palette, Edit, Mail, X, ChevronDown, ChevronUp, FileText, ListChecks } from "lucide-react";
import { Tabs, TabsList, TabsContent } from "@/components/ui/tabs";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useUnsavedChanges } from "@/components/UnsavedChangesContext";
import ClientSearchInput from "@/components/ClientSearchInput";
import { generatePaintEstimateHTML } from "@/components/paintEstimate/generatePaintHTML";
import { upsertCustomerSummaryForEstimate } from "@/components/customerSummary/upsertCustomerSummary";
import TabBadgeTrigger from "@/components/channelLetterInstall/TabBadgeTrigger";
import CustomerPricingTab from "@/components/markup/CustomerPricingTab";
import { categorizePaintProject } from "@/components/markup/projectCategorizer";
import PaintCoverageHelper from "@/components/channelLetterInstall/PaintCoverageHelper";
import { TrendingUp } from "lucide-react";

const imperialSizes = ["1/16", "1/8", "3/16", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8", "1", "1-1/8", "1-1/4", "1-3/8", "1-1/2", "1-5/8", "1-3/4", "1-7/8", "2", "2-1/4", "2-1/2", "2-3/4", "3", "3-1/4", "3-1/2", "3-3/4", "4"];
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
  const { setIsDirty } = useUnsavedChanges();
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("project");
  useEffect(() => { if (!isLoading) setHasLoaded(true); }, [isLoading]);
  useEffect(() => { if (hasLoaded) setIsDirty(true); }, [project]);

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

  const calculateItemCosts = useCallback((item, settings, rate, multiplierCallback, projectPaintSuppliesRate) => {
    const perimFactor = parseFloat(settings.letter_perimeter_factor) || 3.5;
    let paintableSqFt = 0;
    const itemThicknessDecimal = parseImperialFraction(item.thickness);

    if (item.item_type === 'panel' && item.length > 0 && item.width > 0) {
      const faceArea = item.length * item.width / 144;
      const perimeterInches = 2 * (item.length + item.width);
      const edgeArea = itemThicknessDecimal > 0 ? perimeterInches * itemThicknessDecimal / 144 : 0;
      paintableSqFt = item.paint_sides === 'both_sides' ? faceArea * 2 + edgeArea : faceArea + edgeArea;
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
      paintableSqFt = item.paint_sides === 'both_sides' ? faceArea * 2 + edgeArea : item.paint_sides === 'one_side' ? faceArea + edgeArea : 0;
    }

    const paintSuppliesRate = projectPaintSuppliesRate;
    const paintMaskMaterialRate = parseFloat(settings.paint_mask_rate_per_sqft) || 0.75;
    const paintMaskMachineRate = parseFloat(settings.paint_mask_machine_cutting_rate_per_sqft) || 0.10;
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
    let paintGallons = 0;

    if (numColors > 0) {
      paintApplicationSuppliesCost = paintableSqFt * paintSuppliesRate * numColors;
      const paintWasteMultiplier = parseFloat(settings.paint_waste_multiplier) || 1.25;
      const coverageSqFtPerGallon = parseFloat(settings.mixed_paint_coverage_sqft_per_gallon) || 350;

      if (rate > 0) {
        liquidPaintCost = paintableSqFt * rate * paintWasteMultiplier * numColors;
      }
      paintGallons = paintableSqFt * paintWasteMultiplier * numColors / coverageSqFtPerGallon;
    }

    // Add fixed waste per item
    const itemFixedWasteGallons = parseFloat(item.fixed_waste_gallons) || 0;
    paintGallons += itemFixedWasteGallons;
    
    const coverageSqFtPerGallon = parseFloat(settings.mixed_paint_coverage_sqft_per_gallon) || 350;
    const costPerGallon = rate * coverageSqFtPerGallon;
    const itemFixedWasteCost = itemFixedWasteGallons * costPerGallon;
    
    liquidPaintCost += itemFixedWasteCost;

    liquidPaintAndSuppliesCost = paintApplicationSuppliesCost + liquidPaintCost + (item.base_supplies_cost || 0);

    const laborRate = parseFloat(settings.default_labor_rate) || 60;
    const baseHoursPerSqFt = parseFloat(settings.base_labor_hours_per_sqft) || 0.05;
    const complexityMap = {
      extra_small: 'complex', small: 'complex', normal: 'moderate',
      medium: 'moderate', large: 'simple', extra_large: 'simple'
    };
    const itemComplexity = item.item_type === 'lettering' ? complexityMap[item.letter_size] || 'moderate' : 'moderate';

    const complexityMultipliers = {
      simple: parseFloat(settings.simple_complexity_multiplier) || 0.7,
      moderate: parseFloat(settings.moderate_complexity_multiplier) || 1.0,
      complex: parseFloat(settings.complex_complexity_multiplier) || 1.5
    };
    const paintMultipliers = {
      one_side: parseFloat(settings.one_side_paint_multiplier) || 0.8,
      both_sides: parseFloat(settings.both_sides_paint_multiplier) || 1.0
    };
    const additionalColorMultiplier = parseFloat(settings.additional_color_multiplier) || 0.3;

    let baseHours = paintableSqFt * baseHoursPerSqFt * (complexityMultipliers[itemComplexity] || 1) * (paintMultipliers[item.paint_sides] || 1);
    if (numColors > 1) {
      baseHours *= 1 + (numColors - 1) * additionalColorMultiplier;
    }

    const maskApplicationLaborRate = parseFloat(settings.paint_mask_application_labor_rate_per_sqft) || 0.25;
    const maskCuttingLaborRate = parseFloat(settings.paint_mask_cutting_labor_rate_per_sqft) || 0.15;
    if (numColors > 1 && item.paint_mask_sqft > 0) {
      const maskApplicationLaborHours = item.paint_mask_sqft * maskApplicationLaborRate * (numColors - 1) / laborRate;
      const maskCuttingLaborHours = item.paint_mask_sqft * maskCuttingLaborRate * (numColors - 1) / laborRate;
      baseHours += maskApplicationLaborHours + maskCuttingLaborHours;
    }

    const quantityMultiplier = multiplierCallback(item.item_type, item.quantity);
    const discountedLaborHours = baseHours * quantityMultiplier;
    const laborHours = discountedLaborHours;
    const laborCost = laborHours * laborRate * item.quantity;

    return {
      ...item,
      supplies_cost: paintMaskCost * item.quantity,
      paint_cost: liquidPaintAndSuppliesCost * item.quantity,
      paint_gallons: paintGallons * item.quantity,
      labor_hours: laborHours * item.quantity,
      labor_cost: laborCost
    };
  }, []);

  const recalculateAllItems = useCallback(() => {
    setProject((prev) => {
      const newItems = prev.items.map((item) => calculateItemCosts(item, globalSettings, liquidPaintRate, getLaborMultiplier, prev.paint_supplies_per_sqft));
      return { ...prev, items: newItems };
    });
  }, [globalSettings, liquidPaintRate, getLaborMultiplier, calculateItemCosts]);

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
            paint_gallons: item.paint_gallons !== undefined ? item.paint_gallons : 0
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

  // Recalculate all items when project is loaded or when global settings change
  useEffect(() => {
    if (!isLoading && project.items.length > 0 && Object.keys(globalSettings).length > 0) {
      recalculateAllItems();
    }
  }, [isLoading, globalSettings, recalculateAllItems, project.id]);

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
        approx_coverage_factor: "1/4",
        fixed_waste_gallons: 0
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

      // For lettering items, "Number of Letters" IS the quantity — keep qty=1
      // so per-item math (which multiplies by quantity) doesn't double-count letters.
      if (field === 'item_type' && value === 'lettering') {
        item.quantity = 1;
      }
      if (item.item_type === 'lettering') {
        item.quantity = 1;
      }

      if (field === 'width' && item.item_type === 'lettering') {
        const height = value;
        if (height <= 4) item.letter_size = 'extra_small';else
        if (height <= 8) item.letter_size = 'small';else
        if (height <= 12) item.letter_size = 'normal';else
        if (height <= 20) item.letter_size = 'medium';else
        if (height <= 30) item.letter_size = 'large';else
        item.letter_size = 'extra_large';
      }

      if (['length', 'width', 'item_type', 'thickness'].includes(field) && item.length > 0 && item.width > 0) {
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
        const perimeterInches = 2 * (item.length + item.width);
        const edgeArea = itemThicknessDecimal > 0 ? perimeterInches * itemThicknessDecimal / 144 : 0;
        paintableSqFt = item.paint_sides === 'both_sides' ? faceArea * 2 + edgeArea : faceArea + edgeArea;
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
      const baseHoursPerSqFt = parseFloat(globalSettings.base_labor_hours_per_sqft) || 0.05;
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
      const updatedItem = calculateItemCosts(item, globalSettings, liquidPaintRate, getLaborMultiplier, prev.paint_supplies_per_sqft);
      newItems[index] = updatedItem;
      return { ...prev, items: newItems };
    });
  };

  // Compute the face area in sqft for an item (single side, no mirroring).
  // Used by the Approx Coverage Helper.
  const getItemFaceAreaSqft = (item) => {
    if (!item) return 0;
    if ((item.item_type === 'panel' || item.item_type === 'complex_shapes') && item.length > 0 && item.width > 0) {
      return (item.length * item.width) / 144;
    }
    if (item.item_type === 'lettering' && item.width > 0 && item.length > 0) {
      const letterHeight = item.width;
      const numLetters = item.length;
      return (Math.pow(letterHeight, 2) * 0.8 * numLetters) / 144;
    }
    return 0;
  };

  // Apply paint mask helper changes (manual sqft or coverage-factor pick).
  // Runs the full item recompute so cost totals stay in sync.
  const applyPaintMaskPatch = (index, patch) => {
    setProject((prev) => {
      const newItems = [...prev.items];
      const merged = { ...newItems[index], ...patch };
      newItems[index] = calculateItemCosts(merged, globalSettings, liquidPaintRate, getLaborMultiplier, prev.paint_supplies_per_sqft);
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
    // Note: Item paint_gallons ALREADY INCLUDES the item-specific fixed waste because calculateItemCosts adds it.
    // So we just need to sum item.paint_gallons.
    let totalPaintGallons = project.items.reduce((sum, item) => sum + (item.paint_gallons || 0), 0);

    // Add GLOBAL fixed waste gallons from settings (this is separate from item-level overrides)
    const globalFixedWasteGallons = parseFloat(globalSettings.fixed_paint_waste_gallons) || 0;
    totalPaintGallons += globalFixedWasteGallons;

    // Add cost of GLOBAL fixed waste to total supplies
    const coverageSqFtPerGallon = parseFloat(globalSettings.mixed_paint_coverage_sqft_per_gallon) || 350;
    const globalFixedWasteCost = globalFixedWasteGallons * liquidPaintRate * coverageSqFtPerGallon;
    
    if (globalFixedWasteCost > 0) {
      totalLiquidPaintAndSupplies += globalFixedWasteCost;
    }

    // Calculate total item-level fixed waste for display purposes
    const totalItemFixedWaste = project.items.reduce((sum, item) => sum + (parseFloat(item.fixed_waste_gallons) || 0), 0);
    
    // Total displayed waste is global + sum of all item overrides
    const totalFixedWasteGallons = globalFixedWasteGallons + totalItemFixedWaste;

    // Number of mixes is based on total paint gallons
    const numberOfMixes = Math.ceil(totalPaintGallons);

    const mixingHoursPerGallon = parseFloat(globalSettings.paint_mixing_labor_hours) || 0.25;
    const mixingHours = numberOfMixes * mixingHoursPerGallon;
    const setupHours = parseFloat(globalSettings.setup_time_labor_hours) || 0.5;
    
    const uniqueColors = new Set();
    project.items.forEach(item => {
      if (item.paint_colors && Array.isArray(item.paint_colors)) {
        item.paint_colors.forEach(color => {
          const trimmedColor = color.trim().toLowerCase();
          if (trimmedColor) {
            uniqueColors.add(trimmedColor);
          }
        });
      }
    });
    const uniqueColorCount = uniqueColors.size;
    
    const colorChangeSetupHours = parseFloat(globalSettings.color_change_setup_hours) || 0.25;
    const totalColorChangeHours = uniqueColorCount > 1 ? (uniqueColorCount - 1) * colorChangeSetupHours : 0;
    
    const paintGunCleaningHours = parseFloat(globalSettings.paint_gun_cleaning_hours) || 0.15;
    const totalPaintGunCleaningHours = uniqueColorCount > 0 ? uniqueColorCount * paintGunCleaningHours : 0;
    
    const fixedLaborCost = (mixingHours + setupHours + totalColorChangeHours + totalPaintGunCleaningHours) * laborRate;

    let totalLabor = totalItemLaborCost + fixedLaborCost;
    const totalLaborHours = project.items.reduce((sum, item) => sum + (item.labor_hours || 0), 0) + mixingHours + setupHours + totalColorChangeHours + totalPaintGunCleaningHours;

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
      totalGallonsNeeded: totalPaintGallons,
      numberOfMixes,
      mixingHours,
      setupHours,
      uniqueColorCount,
      totalColorChangeHours,
      totalPaintGunCleaningHours,
      fixedWasteGallons: totalFixedWasteGallons // Return the combined total for display
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

      let savedId = editId;
      if (isEditing) {
        await Project.update(editId, finalProject);
      } else {
        const created = await Project.create(finalProject);
        savedId = created?.id;
      }
      await upsertCustomerSummaryForEstimate({
        module: "paint",
        client_name: project.client_name,
        project_id: savedId,
        project_name: project.project_name,
        estimate_number: project.estimate_number,
      });

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
    const totals = calculateTotals();
    const html = generatePaintEstimateHTML({ ...project, globalLaborRate: parseFloat(globalSettings.default_labor_rate) || 60 }, totals, formatPaintVolume);
    const blob = new Blob([html], { type: 'text/html' });
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
    const totals = calculateTotals();
    const html = generatePaintEstimateHTML({ ...project, globalLaborRate: parseFloat(globalSettings.default_labor_rate) || 60 }, totals, formatPaintVolume);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const sendEstimate = () => {
    const { totalPaintMask, totalLiquidPaintAndSupplies, totalLabor, totalLaborHours, totalGallonsNeeded, numberOfMixes, mixingHours, setupHours, uniqueColorCount, totalColorChangeHours, totalPaintGunCleaningHours, fixedWasteGallons } = calculateTotals();
    const totalCost = totalPaintMask + totalLiquidPaintAndSupplies + totalLabor;
    const laborRate = parseFloat(globalSettings.default_labor_rate) || 60;

    // Generate HTML email content
    const htmlEmailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
    .container { background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .header p { margin: 5px 0 0; font-size: 14px; opacity: 0.9; }
    .content { padding: 30px; }
    .info-box { background: #f8f9fa; padding: 20px; margin-bottom: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; }
    .info-box h2 { margin-top: 0; color: #2563eb; font-size: 18px; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px; margin-bottom: 15px; }
    .info-box p { margin: 5px 0; font-size: 14px; }
    .info-box strong { color: #555; }
    .item { background: #ffffff; padding: 15px; margin-bottom: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .item h3 { margin-top: 0; color: #1e293b; font-size: 16px; border-bottom: 1px dotted #ccc; padding-bottom: 8px; margin-bottom: 10px; }
    .item p { margin: 3px 0; font-size: 13px; }
    .cost-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 15px; }
    .cost-box { background: #f1f5f9; padding: 10px; border-radius: 6px; text-align: center; border: 1px solid #e2e8f0; }
    .cost-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold; }
    .cost-value { font-size: 16px; font-weight: bold; color: #1e293b; margin-top: 5px; }
    .summary { background: #ffffff; padding: 20px; border-radius: 8px; margin-top: 20px; border: 1px solid #e0e0e0; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e0e0e0; font-size: 14px; }
    .summary-row:last-of-type { border-bottom: none; }
    .summary-row.total { border-top: 2px solid #3b82f6; margin-top: 15px; padding-top: 15px; font-size: 20px; font-weight: bold; color: #2563eb; }
    .summary-row.total span:first-child { text-transform: uppercase; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎨 Paint Estimate</h1>
      <p>Professional Painting Services</p>
    </div>

    <div class="content">
      <div class="info-box">
        <h2>Project Details</h2>
        <p><strong>Project:</strong> ${project.project_name}</p>
        <p><strong>Client:</strong> ${project.client_name}</p>
        ${project.estimate_number ? `<p><strong>Estimate #:</strong> ${project.estimate_number}</p>` : ''}
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>

      <div class="info-box">
        <h2>Cost Summary</h2>
        <div class="summary">
          <div class="summary-row">
            <span>Total Paint Volume:</span>
            <span>
              <strong>${formatPaintVolume(totalGallonsNeeded)}</strong>
              ${fixedWasteGallons > 0 ? `<br><span style="font-size: 12px; font-weight: normal; color: #666;">(Includes ${formatPaintVolume(fixedWasteGallons)} fixed waste)</span>` : ''}
            </span>
          </div>
          <div class="summary-row">
            <span>Paint Mask:</span>
            <span>$${totalPaintMask.toFixed(2)}</span>
          </div>
          <div class="summary-row">
            <span>Liquid Paint & Supplies:</span>
            <span>$${totalLiquidPaintAndSupplies.toFixed(2)}</span>
          </div>
          <div class="summary-row">
            <span>Fixed Labor (Mixing/Setup):</span>
            <span>$${((mixingHours + setupHours + totalColorChangeHours + totalPaintGunCleaningHours) * laborRate).toFixed(2)}</span>
          </div>
          <div class="summary-row">
            <span>Total Labor (${totalLaborHours.toFixed(1)} hrs):</span>
            <span>$${totalLabor.toFixed(2)}</span>
          </div>
          <div class="summary-row total">
            <span>TOTAL ESTIMATE:</span>
            <span>$${totalCost.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div class="info-box">
        <h2>Items Breakdown (${project.items.length} items)</h2>
        ${project.items.map((item, i) => `
          <div class="item">
            <h3>Item ${i + 1}: ${item.description || `${item.item_type} item`}</h3>
            <p><strong>Type:</strong> ${item.item_type} | <strong>Dimensions:</strong> ${item.length}"L × ${item.width}"H × ${item.thickness}" | <strong>Qty:</strong> ${item.quantity}</p>
            <p><strong>Paint Sides:</strong> ${item.paint_sides} | <strong>Colors:</strong> ${item.paint_colors?.filter((c) => c.trim() !== '').join(', ') || 'None'}</p>
            <p><strong>Paint Volume:</strong> ${formatPaintVolume(item.paint_gallons || 0)}</p>
            <div class="cost-grid">
              <div class="cost-box">
                <div class="cost-label">Paint Mask</div>
                <div class="cost-value">$${(item.supplies_cost || 0).toFixed(2)}</div>
              </div>
              <div class="cost-box">
                <div class="cost-label">Paint & Supplies</div>
                <div class="cost-value">$${(item.paint_cost || 0).toFixed(2)}</div>
              </div>
              <div class="cost-box">
                <div class="cost-label">Labor</div>
                <div class="cost-value">$${(item.labor_cost || 0).toFixed(2)}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      ${project.notes ? `
      <div class="info-box">
        <h2>Additional Notes</h2>
        <p>${project.notes}</p>
      </div>
      ` : ''}
    </div>

    <div class="footer">
      <p>Generated by SignEstimate Pro - Professional Estimating Suite</p>
      <p>© ${new Date().getFullYear()} All Rights Reserved</p>
    </div>
  </div>
</body>
</html>
    `;

    // For the modal, show the HTML content as the message
    setEmailData({
      to: '',
      subject: `Paint Estimate - ${project.project_name}`,
      message: htmlEmailContent
    });
    setShowEmailModal(true);
  };

  const handleSendEmail = () => {
    if (!emailData.to || !emailData.subject) {
      alert('Please fill in the recipient email address and subject.');
      return;
    }

    // Attempt to use the Clipboard API to copy HTML content
    if (navigator.clipboard && window.isSecureContext) { // window.isSecureContext ensures clipboard.writeText is available
      navigator.clipboard.writeText(emailData.message).then(() => {
        alert('Estimate HTML has been copied to your clipboard! You can paste it into your email client.\n\nNow, your email client will open. Please paste the copied HTML into the email body (often using "Paste as HTML" or switching to HTML/Rich Text mode).');
        // Open mailto link after successful copy
        window.location.href = `mailto:${emailData.to}?subject=${encodeURIComponent(emailData.subject)}`;
      }).catch((err) => {
        console.error('Failed to copy HTML to clipboard:', err);
        alert('Failed to copy HTML to clipboard. Please manually copy the content from the text area in the modal and paste it into your email client in HTML mode.\n\nYour email client will now open with the To/Subject filled.');
        // Open mailto link even if copy failed, for convenience
        window.location.href = `mailto:${emailData.to}?subject=${encodeURIComponent(emailData.subject)}`;
      });
    } else {
      // Fallback for non-secure contexts or older browsers
      alert('Your browser does not support automatic clipboard copying for HTML. Please manually copy the content from the text area in the modal and paste it into your email client in HTML mode.\n\nYour email client will now open with the To/Subject filled.');
      window.location.href = `mailto:${emailData.to}?subject=${encodeURIComponent(emailData.subject)}`;
    }

    setShowEmailModal(false);
  };

  const { totalPaintMask, totalLiquidPaintAndSupplies, totalLabor, totalLaborHours, totalGallonsNeeded, numberOfMixes, mixingHours, setupHours, uniqueColorCount, totalColorChangeHours, totalPaintGunCleaningHours, fixedWasteGallons } = calculateTotals();
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
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="sticky top-[64px] z-30 -mx-2 px-2 py-2 bg-slate-50/95 backdrop-blur-md border-b border-slate-200/60">
                <TabsList className="grid grid-cols-4 w-full bg-white shadow-md border border-slate-200 h-auto p-1 gap-1">
                  <TabBadgeTrigger value="project" icon={FileText} label="Project" color="blue" />
                  <TabBadgeTrigger value="items" icon={ListChecks} label="Items" amount={totalPaintMask + totalLiquidPaintAndSupplies + totalLabor} count={project.items.length} color="blue" />
                  <TabBadgeTrigger value="summary" icon={Calculator} label="Summary" amount={totalPaintMask + totalLiquidPaintAndSupplies + totalLabor} color="blue" />
                  <TabBadgeTrigger value="pricing" icon={TrendingUp} label="Customer Pricing" accent color="blue" />
                </TabsList>
              </div>

              <TabsContent value="project" className="mt-4 space-y-6">
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="px-6 flex flex-col space-y-1.5"><CardTitle className="text-lg font-semibold text-slate-900">Project Information</CardTitle></CardHeader>
              <CardContent className="px-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client_name">Client Name *</Label>
                    <ClientSearchInput
                      value={project.client_name}
                      onChange={(val) => setProject((prev) => ({ ...prev, client_name: val }))}
                      onSelectProject={(data) => {
                        setProject((prev) => ({
                          ...prev,
                          client_name: data.client_name || prev.client_name,
                          project_name: data.project_name || prev.project_name,
                          estimate_number: data.estimate_number || prev.estimate_number,
                          hyperlink: data.hyperlink || prev.hyperlink
                        }));
                      }}
                      className="mt-1"
                      placeholder="Enter client name"
                    />
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
              </TabsContent>

              <TabsContent value="items" className="mt-4 space-y-6">
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
                              {/* Quantity field intentionally hidden for lettering — "Number of Letters" IS the quantity. */}
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
                      <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                <p className="text-xs font-semibold text-purple-900 mb-2">Paint Mask (multi-color)</p>
                                <PaintCoverageHelper
                                  faceAreaSqft={getItemFaceAreaSqft(item)}
                                  bothSides={item.paint_sides === 'both_sides'}
                                  value={item.paint_mask_sqft || 0}
                                  factor={item.approx_coverage_factor || '1/4'}
                                  onChange={(patch) => applyPaintMaskPatch(index, patch)}
                                />
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
                              <div className="mt-3 pt-3 border-t border-amber-300/50">
                                <Label htmlFor={`fixed_waste_${index}`} className="text-xs">Additional Waste (Gallons)</Label>
                                <Input
                                  id={`fixed_waste_${index}`}
                                  type="number"
                                  min="0"
                                  step="0.05"
                                  value={item.fixed_waste_gallons || 0}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => updateItem(index, 'fixed_waste_gallons', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  className="mt-1 h-8 text-xs" />
                                <p className="text-xs text-amber-700 mt-1">Add extra paint waste volume specifically for this item</p>
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
              </TabsContent>

              <TabsContent value="summary" className="mt-4 space-y-6">
                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader className="pb-3"><CardTitle className="text-lg font-semibold text-slate-900">Estimate Breakdown</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600 text-xs">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium w-8">#</th>
                          <th className="text-left px-4 py-2 font-medium">Description</th>
                          <th className="text-left px-4 py-2 font-medium">Type</th>
                          <th className="text-right px-4 py-2 font-medium">Paint Mask</th>
                          <th className="text-right px-4 py-2 font-medium">Paint &amp; Supplies</th>
                          <th className="text-right px-4 py-2 font-medium">Labor</th>
                          <th className="text-right px-4 py-2 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {project.items.map((it, i) => {
                          const mask = it.supplies_cost || 0;
                          const paint = it.paint_cost || 0;
                          const labor = it.labor_cost || 0;
                          return (
                            <tr key={i} className="border-t border-slate-100">
                              <td className="px-4 py-2 text-slate-500">{i + 1}</td>
                              <td className="px-4 py-2 font-medium">{it.description || `Item ${i + 1}`}</td>
                              <td className="px-4 py-2 capitalize text-xs text-slate-600">{(it.item_type || '').replace(/_/g, ' ')}</td>
                              <td className="px-4 py-2 text-right tabular-nums">${mask.toFixed(2)}</td>
                              <td className="px-4 py-2 text-right tabular-nums">${paint.toFixed(2)}</td>
                              <td className="px-4 py-2 text-right tabular-nums">${labor.toFixed(2)}</td>
                              <td className="px-4 py-2 text-right tabular-nums font-semibold">${(mask + paint + labor).toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-sm">
                        <tr>
                          <td colSpan="3" className="px-4 py-2 text-right font-medium">Totals</td>
                          <td className="px-4 py-2 text-right tabular-nums font-medium">${totalPaintMask.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right tabular-nums font-medium">${totalLiquidPaintAndSupplies.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right tabular-nums font-medium">${totalLabor.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right tabular-nums font-bold">${(totalPaintMask + totalLiquidPaintAndSupplies + totalLabor).toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pricing" className="mt-4 space-y-6">
                <CustomerPricingTab
                  project={{
                    ...project,
                    total_paint_mask_cost: totalPaintMask,
                    total_liquid_paint_and_supplies_cost: totalLiquidPaintAndSupplies,
                    total_labor_cost: totalLabor,
                  }}
                  categorize={categorizePaintProject}
                  accentColor="blue"
                />
              </TabsContent>
            </Tabs>
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
                  {fixedWasteGallons > 0 &&
                    <div className="mt-1 pt-1 border-t border-blue-300/50">
                      <p className="text-xs text-blue-700">
                        + {formatPaintVolume(fixedWasteGallons)} fixed waste
                      </p>
                    </div>
                  }
                  {totalGallonsNeeded > 1 &&
                  <div className="mt-2 pt-2 border-t border-blue-300">
                      <p className="text-xs text-blue-700 font-medium">
                        → {numberOfMixes} mix{numberOfMixes > 1 ? 'es' : ''} required
                      </p>
                    </div>
                  }
                  {uniqueColorCount > 0 && (
                    <div className="mt-2 pt-2 border-t border-blue-300">
                      <p className="text-xs text-blue-700 font-medium">
                        → {uniqueColorCount} unique color{uniqueColorCount > 1 ? 's' : ''} ({(totalColorChangeHours + totalPaintGunCleaningHours).toFixed(2)} hrs setup)
                      </p>
                    </div>
                  )}
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
                    <p>• Item labor: {(totalLaborHours - mixingHours - setupHours - totalColorChangeHours - totalPaintGunCleaningHours).toFixed(1)} hrs</p>
                    <p>• Mixing ({numberOfMixes} mix{numberOfMixes > 1 ? 'es' : ''}): {mixingHours.toFixed(1)} hrs</p>
                    <p>• Setup: {setupHours.toFixed(1)} hrs</p>
                    {uniqueColorCount > 1 && (
                      <p>• Color changes ({uniqueColorCount - 1} change{uniqueColorCount > 2 ? 's' : ''}): {totalColorChangeHours.toFixed(1)} hrs</p>
                    )}
                    {uniqueColorCount > 0 && (
                      <p>• Gun cleaning ({uniqueColorCount} color{uniqueColorCount > 1 ? 's' : ''}): {totalPaintGunCleaningHours.toFixed(1)} hrs</p>
                    )}
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
            <Card className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b">
                <div className="flex justify-between items-center">
                  <CardTitle>Send Estimate via Email</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setShowEmailModal(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> This estimate is formatted as HTML. Click "Copy & Open Email" to copy the HTML content to your clipboard, then paste it into your email client in HTML/Rich Text mode for the best appearance.
                  </p>
                </div>
                <div>
                  <Label htmlFor="email_to">To Email Address *</Label>
                  <Input
                    id="email_to"
                    type="email"
                    value={emailData.to}
                    onChange={(e) => setEmailData((prev) => ({ ...prev, to: e.target.value }))}
                    placeholder="client@example.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email_subject">Subject *</Label>
                  <Input
                    id="email_subject"
                    value={emailData.subject}
                    onChange={(e) => setEmailData((prev) => ({ ...prev, subject: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email_message">HTML Email Content (Preview Below)</Label>
                  <Textarea
                    id="email_message"
                    value={emailData.message}
                    onChange={(e) => setEmailData((prev) => ({ ...prev, message: e.target.value }))}
                    className="mt-1 h-32 font-mono text-xs"
                  />
                </div>
                <div className="border rounded-lg p-4 bg-white max-h-96 overflow-y-auto">
                  <Label className="mb-2 block text-sm font-medium">Email Preview:</Label>
                  <div dangerouslySetInnerHTML={{ __html: emailData.message }} />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowEmailModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendEmail}
                    disabled={!emailData.to || !emailData.subject}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Copy & Open Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        }
      </div>
    </div>);

}