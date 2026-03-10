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
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Plus, Trash2, ArrowLeft, Anchor, ChevronDown, ChevronUp, Wrench, X, AlertCircle } from "lucide-react";
import Foundation3DViewer from "@/components/Foundation3DViewer";
import FoundationItemCard from "@/components/FoundationItemCard";

export default function NewFoundationEstimate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [isEditing, setIsEditing] = useState(false);
  const [expandedAdvanced, setExpandedAdvanced] = useState({});
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [currentEquipmentIndex, setCurrentEquipmentIndex] = useState(null);
  const [availableAttachments, setAvailableAttachments] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingSubsidiary, setPendingSubsidiary] = useState(null);
  const [showRebarError, setShowRebarError] = useState(false);
  const [rebarErrorMessage, setRebarErrorMessage] = useState('');

  const [project, setProject] = useState({
    project_name: "",
    client_name: "",
    estimate_number: "",
    hyperlink: "",
    items: [],
    // concrete_cost_per_cy removed - strictly from inventory now
    rebar_cost_per_ft: 0.75,
    forming_materials_cost_spread_foot: 0.50,
    forming_materials_cost_pillar: 0.75,
    min_excavation_time_hours: 1.0,
    hand_dig_excavation_cost_per_cy: 10, 
    equipment_excavation_cost_per_cy: 15, 
    forming_labor_rate: 55,
    pouring_labor_rate: 60,
    finishing_labor_rate: 50,
    hand_dig_labor_rate: 45, 
    equipment_excavation_labor_rate: 35, 
    excavation_method: "", 
    notes: "",
    selected_equipment: [],
    selected_concrete_id: null
  });

  const [globalSettings, setGlobalSettings] = useState({});
  const [equipment, setEquipment] = useState([]);
  const [allAttachments, setAllAttachments] = useState([]);
  const [concreteOptions, setConcreteOptions] = useState([]);
  const [formingMaterials, setFormingMaterials] = useState([]);
  const [poleInventory, setPoleInventory] = useState([]);
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
      
      const concreteItems = allInventory.filter(item => 
        item.material_type === 'concrete_service' || item.material_type === 'bagged_concrete'
      );
      setConcreteOptions(concreteItems);

      const formingItems = allInventory.filter(item => item.material_type === 'forming_material');
      setFormingMaterials(formingItems);

      const attachmentItems = allInventory.filter(item => item.material_type === 'attachment');
      setAllAttachments(attachmentItems);

      const poleItems = allInventory.filter(item => item.material_type === 'pole');
      setPoleInventory(poleItems);

      if (!editId) {
        const newDefaults = {
          // foundation_concrete_cost_per_cy removed from settings
          rebar_cost_per_ft: parseFloat(settingsObj.foundation_rebar_cost_per_ft) || 0.75,
          forming_materials_cost_spread_foot: parseFloat(settingsObj.foundation_forming_materials_cost_spread_foot) || 0.50,
          forming_materials_cost_pillar: parseFloat(settingsObj.foundation_forming_materials_cost_pillar) || 0.75,
          min_excavation_time_hours: parseFloat(settingsObj.foundation_min_excavation_time_hours) || 1.0,
          hand_dig_excavation_cost_per_cy: parseFloat(settingsObj.foundation_hand_dig_excavation_cost_per_cy) || 10,
          equipment_excavation_cost_per_cy: parseFloat(settingsObj.foundation_equipment_excavation_cost_per_cy) || 15,
          forming_labor_rate: parseFloat(settingsObj.foundation_forming_labor_rate) || 55,
          pouring_labor_rate: parseFloat(settingsObj.foundation_pouring_labor_rate) || 60,
          finishing_labor_rate: parseFloat(settingsObj.foundation_finishing_labor_rate) || 50,
          hand_dig_labor_rate: parseFloat(settingsObj.foundation_hand_dig_labor_rate) || 45,
          equipment_excavation_labor_rate: parseFloat(settingsObj.foundation_equipment_excavation_labor_rate) || 35,
          excavation_method: settingsObj.foundation_default_excavation_method || "",
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

  const recalculateEquipmentCosts = useCallback((equipmentIndex) => {
    setProject(prevProject => {
      const updatedSelectedEquipment = prevProject.selected_equipment.map((eq, idx) => {
        if (idx !== equipmentIndex) return eq;

        const selectedEquip = equipment.find(e => e.id === eq.equipment_id);
        if (!selectedEquip) {
          // If no main equipment selected, cost is 0, and clear attachment costs too
          return { ...eq, equipment_cost: 0, attachments: (eq.attachments || []).map(att => ({...att, attachment_cost: 0, subsidiaries: (att.subsidiaries || []).map(sub => ({...sub, subsidiary_cost: 0}))})) };
        }

        let baseRentalCost = 0;
        if (eq.rental_period === 'day') {
          baseRentalCost = (selectedEquip.cost_per_day || 0) * eq.rental_duration;
        } else if (eq.rental_period === 'week') {
          baseRentalCost = (selectedEquip.cost_per_week || 0) * eq.rental_duration;
        } else if (eq.rental_period === 'month') {
          baseRentalCost = (selectedEquip.cost_per_month || 0) * eq.rental_duration;
        }
        const deliveryCost = eq.include_delivery ? (selectedEquip.pickup_delivery_cost || 0) : 0;

        let totalAttachmentsAndSubsidiariesCost = 0;
        const updatedAttachments = (eq.attachments || []).map(att => {
          const attachment = allAttachments.find(a => a.id === att.attachment_id);
          if (!attachment) {
            return { ...att, attachment_cost: 0, subsidiaries: (att.subsidiaries || []).map(sub => ({...sub, subsidiary_cost: 0})) };
          }

          let currentAttCost = 0;
          if (eq.rental_period === 'day') {
            currentAttCost = (attachment.cost_per_day || 0) * eq.rental_duration;
          } else if (eq.rental_period === 'week') {
            currentAttCost = (attachment.cost_per_week || 0) * eq.rental_duration;
          } else if (eq.rental_period === 'month') {
            currentAttCost = (attachment.cost_per_month || 0) * eq.rental_duration;
          }
          totalAttachmentsAndSubsidiariesCost += currentAttCost;

          const updatedSubsidiaries = (att.subsidiaries || []).map(sub => {
            const subsidiary = allAttachments.find(a => a.id === sub.subsidiary_id);
            if (!subsidiary) {
              return { ...sub, subsidiary_cost: 0 };
            }

            let currentSubCost = 0;
            if (eq.rental_period === 'day') {
              currentSubCost = (subsidiary.cost_per_day || 0) * eq.rental_duration;
            } else if (eq.rental_period === 'week') {
              currentSubCost = (subsidiary.cost_per_week || 0) * eq.rental_duration;
            } else if (eq.rental_period === 'month') {
              currentSubCost = (subsidiary.cost_per_month || 0) * eq.rental_duration;
            }
            totalAttachmentsAndSubsidiariesCost += currentSubCost;
            return { ...sub, subsidiary_cost: currentSubCost };
          });
          return { ...att, attachment_cost: currentAttCost, subsidiaries: updatedSubsidiaries };
        });

        return {
          ...eq,
          equipment_cost: baseRentalCost + deliveryCost + totalAttachmentsAndSubsidiariesCost,
          attachments: updatedAttachments
        };
      });
      return { ...prevProject, selected_equipment: updatedSelectedEquipment };
    });
  }, [equipment, allAttachments]);

  const checkAndAddEquipment = useCallback((items) => {
    // If excavation method is 'hand_dig', we explicitly don't auto-add equipment based on items.
    // However, if equipment was already added manually or by a previous state, we don't remove it here.
    // The user controls removal.
    if (project.excavation_method === 'hand_dig') {
      return;
    }

    const needsEquipment = items.some(item => 
      item.excavation_volume_cy >= 0.5 || item.depth_inches > 36
    );

    setProject(prev => {
      const currentEquipment = prev.selected_equipment || [];
      
      // Only auto-add if needs equipment AND no equipment is currently selected AND excavation method is equipment_excavation
      if (needsEquipment && currentEquipment.length === 0 && equipment.length > 0 && prev.excavation_method === 'equipment_excavation') {
        const defaultEquip = equipment[0]; // Use first available equipment
        // Calculate initial cost for the default equipment
        let initialCost = (defaultEquip.cost_per_day || 0); // Assuming 'day' is default rental_period for auto-added
        if (true) { // If include_delivery is true (default for auto-added)
          initialCost += (defaultEquip.pickup_delivery_cost || 0);
        }

        return {
          ...prev,
          selected_equipment: [{
            equipment_id: defaultEquip.id,
            rental_period: 'day',
            rental_duration: 1,
            include_delivery: true,
            equipment_cost: initialCost,
            attachments: []
          }]
        };
      }
      
      // If needsEquipment is false but equipment exists, we don't auto-remove.
      // If needsEquipment is true but equipment is already present, do nothing.
      // If excavation method is hand_dig, do nothing (handled at the start).
      return prev;
    });
  }, [equipment, project.excavation_method]);


  const addItem = () => {
    const newItem = {
      foundation_type: "spread_foot",
      description: "",
      quantity: 1,
      length_inches: 12,
      width_inches: 12,
      diameter: 24,
      depth_inches: 24,
      grade_offset_inches: 0, // New field for above/below grade adjustment
      include_rebar: false,
      include_forming: true,
      include_finishing: true,
      rebar_size: "#4",
      rebar_spacing_length: 18,
      rebar_spacing_width: 18,
      concrete_volume_cy: 0,
      excavation_volume_cy: 0,
      concrete_cost: 0,
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
      selected_forming_material_id: null,
      selected_pole_id: null,
      pole_offset_from_bottom_inches: 0,
      pole_total_height_inches: 0,
      include_pole_painting: false,
      pole_cost: 0,
      pole_painting_cost: 0
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

        // When foundation type changes, set default forming/finishing
        if (field === 'foundation_type') {
          if (value === 'spread_foot') {
            updated.include_forming = true;
            updated.include_finishing = true;
          } else if (value === 'pillar') {
            updated.include_forming = false;
            updated.include_finishing = false;
          }
        }

        // Validate rebar spacing when include_rebar is set to true
        if (field === 'include_rebar' && value === true && updated.foundation_type === 'spread_foot') {
          const lengthInches = updated.length_inches;
          const widthInches = updated.width_inches;
          const rebarSpacingLength = parseFloat(updated.rebar_spacing_length) || 0;
          const rebarSpacingWidth = parseFloat(updated.rebar_spacing_width) || 0;
          
          const edgeClearanceInches = 6; // 3 inches on each side means 6 inches total reduction
          const effectiveLengthInches = lengthInches - edgeClearanceInches;
          const effectiveWidthInches = widthInches - edgeClearanceInches;

          let validationFailed = false;
          let message = '';

          if (lengthInches <= edgeClearanceInches || widthInches <= edgeClearanceInches) {
              validationFailed = true;
              message = `Foundation dimensions (${lengthInches}" L × ${widthInches}" W) are too small to include rebar. At least ${edgeClearanceInches + 1}" in both length and width is required for rebar with 3" edge clearance.`;
          } else if (rebarSpacingLength <= 0 || rebarSpacingWidth <= 0) {
              validationFailed = true;
              message = `Rebar spacing must be a positive number.`;
          } else if (effectiveLengthInches < rebarSpacingLength || effectiveWidthInches < rebarSpacingWidth) {
              validationFailed = true;
              message = `Rebar spacing is too large for this foundation size.\n\nFoundation: ${lengthInches}" L × ${widthInches}" W\nEffective area (with 3" clearance): ${effectiveLengthInches.toFixed(1)}" L × ${effectiveWidthInches.toFixed(1)}" W\n\nPlease reduce spacing or increase foundation dimensions.`;
          }

          if (validationFailed) {
            setRebarErrorMessage(message);
            setShowRebarError(true);
            updated.include_rebar = false; // Prevent it from being checked
          }
        }

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

        // If rebar spacing or dimensions change, validate and disable rebar if needed
        // This check runs AFTER the `include_rebar` field change logic.
        // It applies if rebar is currently enabled and dimensions/spacing change.
        if ((field === 'length_inches' || field === 'width_inches' || 
             field === 'rebar_spacing_length' || field === 'rebar_spacing_width') && 
            updated.include_rebar && updated.foundation_type === 'spread_foot') {
          const lengthInches = updated.length_inches;
          const widthInches = updated.width_inches;
          const rebarSpacingLength = parseFloat(updated.rebar_spacing_length) || 0;
          const rebarSpacingWidth = parseFloat(updated.rebar_spacing_width) || 0;
          
          const edgeClearanceInches = 6; // 3 inches on each side means 6 inches total reduction
          const effectiveLengthInches = lengthInches - edgeClearanceInches;
          const effectiveWidthInches = widthInches - edgeClearanceInches;
          
          // Conditions where rebar cannot be placed with 3" clearance
          if (lengthInches <= edgeClearanceInches || widthInches <= edgeClearanceInches ||
              rebarSpacingLength <= 0 || rebarSpacingWidth <= 0 ||
              effectiveLengthInches < rebarSpacingLength || effectiveWidthInches < rebarSpacingWidth) {
            updated.include_rebar = false; // Silently disable rebar if it no longer fits
          }
        }

        return updated;
      });
      
      setTimeout(() => checkAndAddEquipment(updatedItems), 0);
      
      return { ...prev, items: updatedItems };
    });
  };

  const addAttachmentToEquipment = useCallback((equipmentIdx, attachmentId) => { // Changed signature to accept equipmentIdx
    const attachment = allAttachments.find(a => a.id === attachmentId);
    if (!attachment) return;

    setProject(prev => {
      const newSelectedEquipment = prev.selected_equipment.map((eq, idx) => {
        if (idx !== equipmentIdx) return eq; // Use equipmentIdx
        
        const existingAttachments = eq.attachments || [];
        // Prevent adding duplicate attachments
        if (existingAttachments.some(a => a.attachment_id === attachmentId)) {
          return eq;
        }

        const newAttachment = {
          attachment_id: attachmentId,
          // rental_period, rental_duration, attachment_cost will be set/updated by recalculateEquipmentCosts
          subsidiaries: []
        };

        return {
          ...eq,
          attachments: [...existingAttachments, newAttachment]
        };
      });
      return { ...prev, selected_equipment: newSelectedEquipment };
    });

    // Defer recalculation to ensure setProject has updated the state
    setTimeout(() => recalculateEquipmentCosts(equipmentIdx), 0); // Use equipmentIdx
  }, [allAttachments, recalculateEquipmentCosts]);

  const openAttachmentModal = (equipmentIndex) => {
    const eq = project.selected_equipment[equipmentIndex];
    const selectedEquip = equipment.find(e => e.id === eq.equipment_id);
    
    if (selectedEquip) {
      const compatible = allAttachments.filter(att => 
        (!att.compatible_equipment_ids || // If the field doesn't exist
        att.compatible_equipment_ids.length === 0 || // or is empty, it's universally compatible
        att.compatible_equipment_ids.includes(selectedEquip.id)) && // otherwise, check for equipment ID match
        (!att.parent_attachment_ids || att.parent_attachment_ids.length === 0) // Exclude subsidiaries from top level
      );
      setAvailableAttachments(compatible);
      setCurrentEquipmentIndex(equipmentIndex);
      setShowAttachmentModal(true);
    } else {
      alert("Please select a base equipment first to add attachments.");
    }
  };

  const removeAttachmentFromEquipment = (equipmentIndex, attachmentIndex) => {
    setProject(prev => {
      const newSelectedEquipment = prev.selected_equipment.map((eq, idx) => {
        if (idx !== equipmentIndex) return eq;
        return {
          ...eq,
          attachments: (eq.attachments || []).filter((_, aIdx) => aIdx !== attachmentIndex)
        };
      });
      return { ...prev, selected_equipment: newSelectedEquipment };
    });
    setTimeout(() => recalculateEquipmentCosts(equipmentIndex), 0);
  };

  const addSubsidiaryToAttachment = useCallback((equipmentIndex, attachmentIndex, subsidiaryId) => {
    const subsidiary = allAttachments.find(a => a.id === subsidiaryId);
    if (!subsidiary) return;

    setProject(prev => {
      const newSelectedEquipment = prev.selected_equipment.map((eq, eIdx) => {
        if (eIdx !== equipmentIndex) return eq;
        return {
          ...eq,
          attachments: (eq.attachments || []).map((att, aIdx) => {
            if (aIdx !== attachmentIndex) return att; // Ensure we modify the correct parent attachment

            const existingSubs = att.subsidiaries || [];
            // Prevent adding duplicate subsidiaries
            if (existingSubs.some(s => s.subsidiary_id === subsidiaryId)) {
              return att;
            }
            return {
              ...att,
              subsidiaries: [...existingSubs, { subsidiary_id: subsidiaryId }]
            };
          })
        };
      });
      return { ...prev, selected_equipment: newSelectedEquipment };
    });
    setTimeout(() => recalculateEquipmentCosts(equipmentIndex), 0);
  }, [allAttachments, recalculateEquipmentCosts]);

  const handleConfirmAddParentAndSub = useCallback(() => {
    if (!pendingSubsidiary) return;
    
    const { equipmentIndex, subsidiaryId, parentInfo } = pendingSubsidiary;
    
    // 1. Add the parent attachment
    // This will trigger a setProject and its own recalculateEquipmentCosts.
    addAttachmentToEquipment(equipmentIndex, parentInfo.id); 
    
    // 2. Then, after the state update for the parent is complete, add the subsidiary to it.
    // Use a setTimeout to allow the state update from addAttachmentToEquipment to propagate.
    setTimeout(() => {
      setProject(prev => {
        const newSelectedEquipment = prev.selected_equipment.map((eq, eIdx) => {
          if (eIdx !== equipmentIndex) return eq; // Match equipment from pendingSubsidiary
          
          // Find the parent attachment we just added within the updated attachments array
          const parentAttachmentIndex = (eq.attachments || []).findIndex(a => a.attachment_id === parentInfo.id);
          
          if (parentAttachmentIndex === -1) {
            console.error("Parent attachment not found after adding it during confirmation.");
            return eq;
          }

          // Directly modify the found parent attachment to add the subsidiary
          return {
            ...eq,
            attachments: (eq.attachments || []).map((att, aIdx) => {
              if (aIdx !== parentAttachmentIndex) return att;
              const existingSubs = att.subsidiaries || [];
              if (existingSubs.some(s => s.subsidiary_id === subsidiaryId)) {
                return att;
              }
              return {
                ...att,
                subsidiaries: [...existingSubs, { subsidiary_id: subsidiaryId }]
              };
            })
          };
        });
        return { ...prev, selected_equipment: newSelectedEquipment };
      });
      // This recalculation accounts for both the parent and the subsidiary just added.
      setTimeout(() => recalculateEquipmentCosts(equipmentIndex), 0); 
    }, 100); // Delay for addAttachmentToEquipment to update state
    
    setShowConfirmDialog(false);
    setPendingSubsidiary(null);
  }, [pendingSubsidiary, addAttachmentToEquipment, recalculateEquipmentCosts, setProject, setShowConfirmDialog, setPendingSubsidiary]);


  const removeSubsidiary = (equipmentIndex, attachmentIndex, subsidiaryIndex) => {
    setProject(prev => {
      const newSelectedEquipment = prev.selected_equipment.map((eq, eIdx) => {
        if (eIdx !== equipmentIndex) return eq;
        return {
          ...eq,
          attachments: (eq.attachments || []).map((att, aIdx) => {
            if (aIdx !== attachmentIndex) return att;
            return {
              ...att,
              subsidiaries: (att.subsidiaries || []).filter((_, sIdx) => sIdx !== subsidiaryIndex)
            };
          })
        };
      });
      return { ...prev, selected_equipment: newSelectedEquipment };
    });
    setTimeout(() => recalculateEquipmentCosts(equipmentIndex), 0);
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
          equipment_cost: 0,
          attachments: [] // New: initialize attachments array for manually added equipment
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
    setProject(prev => {
      const newSelectedEquipment = prev.selected_equipment.map((eq, i) => {
        if (i !== index) return eq;
        let updated = { ...eq, [field]: value };
        
        // Clear attachments if equipment_id changes as compatibility might change
        if (field === 'equipment_id') {
          updated.attachments = [];
        }
        
        // Auto-switch to week rental if 3+ days
        if (field === 'rental_duration' || field === 'rental_period') {
          // Ensure rental_duration is a number for comparison
          const currentDuration = parseFloat(updated.rental_duration);
          if (updated.rental_period === 'day' && currentDuration >= 3) {
            // Convert to weeks, rounding up
            const weeks = Math.ceil(currentDuration / 7);
            updated.rental_period = 'week';
            updated.rental_duration = weeks;
          }
        }
        
        return updated;
      });
      return { ...prev, selected_equipment: newSelectedEquipment };
    });
    
    // Recalculate full cost including attachments after state has been updated
    // This timeout is crucial to read the latest state from the previous setProject call
    if (['equipment_id', 'rental_period', 'rental_duration', 'include_delivery'].includes(field)) {
      setTimeout(() => recalculateEquipmentCosts(index), 0);
    }
  };

  const handleConcreteSelection = (concreteId) => {
    if (!concreteId) { // Check for empty string, which indicates no selection
      setProject(prev => ({
        ...prev,
        selected_concrete_id: null,
        concrete_cost_per_cy: 0 // No default fallback
      }));
      return;
    }

    const selectedConcrete = concreteOptions.find(c => c.id === concreteId);
    if (selectedConcrete) {
      // For concrete materials, cost_per_unit is already per cubic yard
      setProject(prev => ({
        ...prev,
        selected_concrete_id: concreteId,
        concrete_cost_per_cy: selectedConcrete.cost_per_unit
      }));
    }
  };

  const calculateTotals = useCallback(() => {
    const formingHoursPerSqFt = parseFloat(globalSettings.foundation_forming_hours_per_sqft) || 0.15;
    const pouringHoursPerCy = parseFloat(globalSettings.foundation_pouring_hours_per_cy) || 0.5;
    const finishingHoursPerSqFt = parseFloat(globalSettings.foundation_finishing_hours_per_sqft) || 0.10;
    const excavationHoursPerCy = parseFloat(globalSettings.foundation_excavation_hours_per_cy) || 0.5; // Default if no setting

    const handDigLaborRate = project.hand_dig_labor_rate;
    const equipmentExcavationLaborRate = project.equipment_excavation_labor_rate;

    let totalConcreteCost = 0;
    let totalRebarCost = 0;
    let totalNonLaborExcavationCost = 0; 
    let totalLaborCost = 0;
    let totalFormingMaterialsCost = 0;
    let totalPoleCost = 0;
    let totalPolePaintingCost = 0;

    const updatedItems = project.items.map(item => {
      // Determine rates, using item-specific override if present, otherwise project default
      const concreteRate = (item.custom_concrete_cost_per_cy !== undefined && item.custom_concrete_cost_per_cy !== null)
        ? item.custom_concrete_cost_per_cy
        : (project.concrete_cost_per_cy || 0);

      const rebarRate = (item.custom_rebar_cost_per_ft !== undefined && item.custom_rebar_cost_per_ft !== null)
        ? item.custom_rebar_cost_per_ft
        : project.rebar_cost_per_ft;

      // Material costs
      const concreteCost = item.concrete_volume_cy * concreteRate * item.quantity;

      let rebarCost = 0;
      if (item.include_rebar && item.foundation_type === 'spread_foot') {
        const lengthFeet = item.length_inches / 12;
        const widthFeet = item.width_inches / 12;

        // Calculate number of rebars based on spacing and 3" clearance
        const edgeClearanceInches = 3;
        const effectiveLengthInches = item.length_inches - 2 * edgeClearanceInches;
        const effectiveWidthInches = item.width_inches - 2 * edgeClearanceInches;

        const numRebarsLengthwise = Math.floor(effectiveWidthInches / item.rebar_spacing_width) + 1;
        const numRebarsWidthwise = Math.floor(effectiveLengthInches / item.rebar_spacing_length) + 1;

        // Assuming one layer for spread footings for this calculator
        const numLayers = 1; 

        // Total rebar: lengthwise bars + crosswise bars, multiplied by layers
        const totalLengthwiseRebarFeet = numRebarsLengthwise * lengthFeet * numLayers;
        const totalWidthwiseRebarFeet = numRebarsWidthwise * widthFeet * numLayers;
        const totalRebarFeet = (totalLengthwiseRebarFeet + totalWidthwiseRebarFeet) * item.quantity;

        rebarCost = totalRebarFeet * rebarRate;
      }

      // Non-labor excavation cost
      let currentNonLaborExcavationRate = 0;
      if (project.excavation_method === 'hand_dig') {
        currentNonLaborExcavationRate = project.hand_dig_excavation_cost_per_cy;
      } else if (project.excavation_method === 'equipment_excavation') {
        currentNonLaborExcavationRate = project.equipment_excavation_cost_per_cy;
      }
      const nonLaborExcavationCost = item.excavation_volume_cy * currentNonLaborExcavationRate * item.quantity;

      // Labor calculations for forming, pouring, finishing
      let formingSqFt = 0;
      let finishingSqFt = 0;
      let formingMaterialsRate = 0;

      if (item.foundation_type === 'spread_foot') {
        const lengthFeet = item.length_inches / 12;
        const widthFeet = item.width_inches / 12;
        const depthFeet = item.depth_inches / 12;

        const perimeter = 2 * (lengthFeet + widthFeet);
        formingSqFt = perimeter * depthFeet;
        finishingSqFt = lengthFeet * widthFeet;
        formingMaterialsRate = project.forming_materials_cost_spread_foot || 0;
      } else if (item.foundation_type === 'pillar') {
        const depthFeet = item.depth_inches / 12;
        const circumference = Math.PI * (item.diameter / 12);
        formingSqFt = circumference * depthFeet;

        const radiusFeet = (item.diameter / 12) / 2;
        finishingSqFt = Math.PI * Math.pow(radiusFeet, 2);
        formingMaterialsRate = project.forming_materials_cost_pillar || 0;
      }

      // Only calculate forming/finishing if enabled
      const formingHoursPerItem = item.include_forming ? formingSqFt * formingHoursPerSqFt : 0;
      const pouringHoursPerItem = item.concrete_volume_cy * pouringHoursPerCy;
      const finishingHoursPerItem = item.include_finishing ? finishingSqFt * finishingHoursPerSqFt : 0;

      // Calculate Forming Materials Cost if forming is included
      let formingMaterialsCost = 0;
      let selectedFormingMaterial = null;
      if (item.include_forming) {
        if (item.selected_forming_material_id) {
          selectedFormingMaterial = formingMaterials.find(fm => fm.id === item.selected_forming_material_id);
          if (selectedFormingMaterial) {
            // If cost_per_unit is per sqft
            formingMaterialsCost = formingSqFt * (selectedFormingMaterial.cost_per_unit || 0) * item.quantity;
          } else {
            // Fallback
            formingMaterialsCost = formingSqFt * formingMaterialsRate * item.quantity;
          }
        } else {
          // Use default rates from settings if no material selected
          formingMaterialsCost = formingSqFt * formingMaterialsRate * item.quantity;
        }
      }

      const formingCost = formingHoursPerItem * project.forming_labor_rate * item.quantity;
      const pouringCost = pouringHoursPerItem * project.pouring_labor_rate * item.quantity;
      const finishingCost = finishingHoursPerItem * project.finishing_labor_rate * item.quantity;

      // Excavation Labor Cost with Minimum Time
      let excavationLaborCost = 0;
      let rawExcavationHours = item.excavation_volume_cy * excavationHoursPerCy * item.quantity;
      
      // Apply minimum time logic PER ITEM or PER PROJECT? 
      // Usually min time is per project/visit. But here we are calculating item lines.
      // Let's calculate raw hours here, and apply min time to the TOTAL if needed, 
      // OR apply it per item if that's the intention. 
      // However, the user said "Give me a minimum time option for excavating".
      // Usually this means for the whole job.
      // BUT, the current structure sums up item costs.
      // Let's adhere to the existing per-item structure for now but maybe apply min time check at the end?
      // No, let's just sum up the raw hours first, then apply min time to the total labor calculation below.
      
      // Wait, the current code calculates cost per item.
      // If I change it to per project, I need to track total hours.
      // Let's change the logic to sum hours first.
      
      // For now, let's just calculate the raw cost per item, and handle min time at the aggregate level?
      // The `updatedItems` map returns `excavation_cost` which currently includes labor.
      // I should separate them or adjust the last item?
      // Actually, a "Minimum Time" usually applies to the total excavation labor hours for the project.
      // So I should sum up all excavation hours, apply the min, and then recalculate the cost.
      // But I also need to attribute cost to items for the breakdown.
      // This is tricky with the current structure.
      // Let's just calculate raw hours here and store them.
      
      // REVISION: The user asked for a minimum time option. 
      // I will accumulate total excavation hours and apply the minimum at the end, 
      // then distribute the difference or just add it as a separate line item?
      // Or just ensure the total labor cost reflects the minimum.
      // But the items need to sum up to the total.
      
      // Simpler approach: Calculate raw hours per item.
      // At the end, check if total hours < min hours. 
      // If so, add the difference to the total labor cost.
      // But `updatedItems` need to reflect this.
      // I will calculate the `excavationLaborCost` here simply as hours * rate.
      // Then after the loop, I'll check the total and adjust.
      
      let excavationLaborRate = (project.excavation_method === 'hand_dig') ? handDigLaborRate : equipmentExcavationLaborRate;
      let itemExcavationLaborCost = rawExcavationHours * excavationLaborRate;

      // Pole costs
      let poleCost = 0;
      let polePaintingCost = 0;
      if (item.selected_pole_id && item.pole_total_height_inches > 0) {
        const poleItem = poleInventory.find(p => p.id === item.selected_pole_id);
        if (poleItem) {
          const poleLinearFt = item.pole_total_height_inches / 12;
          poleCost = poleLinearFt * (poleItem.cost_per_unit || 0) * item.quantity;
          if (item.include_pole_painting && poleItem.paint_rate_per_linear_ft > 0) {
            polePaintingCost = poleLinearFt * poleItem.paint_rate_per_linear_ft * item.quantity;
          }
        }
      }
      totalPoleCost += poleCost;
      totalPolePaintingCost += polePaintingCost;

      const itemTotalCost = concreteCost + rebarCost + nonLaborExcavationCost + formingCost + pouringCost + finishingCost + itemExcavationLaborCost + formingMaterialsCost + poleCost + polePaintingCost;

      totalConcreteCost += concreteCost;
      totalRebarCost += rebarCost;
      totalNonLaborExcavationCost += nonLaborExcavationCost;
      totalFormingMaterialsCost += formingMaterialsCost;
      
      // We'll sum labor components separately to apply min time correctly later
      // But wait, forming/pouring/finishing are also labor. 
      // Min time likely applies only to excavation.
      // Let's track excavation hours separately.
      
      return {
        ...item,
        concrete_cost: concreteCost,
        rebar_cost: rebarCost,
        excavation_cost: nonLaborExcavationCost + itemExcavationLaborCost, 
        forming_materials_cost: formingMaterialsCost,
        forming_material_details: selectedFormingMaterial,
        pole_cost: poleCost,
        pole_painting_cost: polePaintingCost,
        forming_hours: formingHoursPerItem,
        forming_cost: formingCost,
        pouring_hours: pouringHoursPerItem,
        pouring_cost: pouringCost,
        finishing_hours: finishingHoursPerItem,
        finishing_cost: finishingCost,
        item_total_cost: itemTotalCost,
        raw_excavation_hours: rawExcavationHours // Store for total calc
      };
    });

    // Calculate total excavation hours
    const totalExcavationHours = updatedItems.reduce((sum, item) => sum + (item.raw_excavation_hours || 0), 0);
    const minExcavationHours = project.min_excavation_time_hours || 0;
    
    let finalExcavationLaborCost = 0;
    let excavationLaborRate = (project.excavation_method === 'hand_dig') ? handDigLaborRate : equipmentExcavationLaborRate;

    if (totalExcavationHours < minExcavationHours && totalExcavationHours > 0) {
        // Apply minimum
        finalExcavationLaborCost = minExcavationHours * excavationLaborRate;
        
        // We need to distribute the extra cost back to items or just keep it in total.
        // To keep items summing to total, we should distribute.
        // Or easier: just add the difference to the first item or distribute proportionally.
        const extraCost = finalExcavationLaborCost - (totalExcavationHours * excavationLaborRate);
        if (updatedItems.length > 0) {
            // Add to first item for simplicity, or mark it as "Minimum Charge Adjustment"
            updatedItems[0].excavation_cost += extraCost;
            updatedItems[0].item_total_cost += extraCost;
            // Note: this slightly skews the first item's data but keeps totals correct.
        }
    } else {
        finalExcavationLaborCost = totalExcavationHours * excavationLaborRate;
    }

    // Now sum up all labor costs again
    updatedItems.forEach(item => {
        totalLaborCost += item.forming_cost + item.pouring_cost + item.finishing_cost;
    });
    totalLaborCost += finalExcavationLaborCost;

    // Recalculate total non-labor excavation cost just to be safe (it was summed in map)
    // But we modified updatedItems[0].excavation_cost which includes labor. 
    // We need to be careful. `totalNonLaborExcavationCost` was summed correctly in the map (it's purely non-labor).
    // `excavation_cost` on item is (non-labor + labor). 
    // So updating `excavation_cost` on item is correct for display.
    // We just need to ensure `totalLaborCost` is correct.
    
    // Re-sum total excavation cost from items for consistency?
    // The `totalNonLaborExcavationCost` variable holds the non-labor part.
    // The `finalExcavationLaborCost` holds the labor part (including min charge).
    // So Total Excavation Cost shown in summary (if it combines both) should be sum of these.
    // In the current UI, "Excavation" summary card shows `total_excavation_cost` which seems to be NON-LABOR only based on previous code:
    // `total_excavation_cost: totalNonLaborExcavationCost`
    // And labor is in "Labor" card.
    // So my logic for `totalLaborCost` (summing forming/pouring/finish + finalExcavation) is correct.
    // And `totalNonLaborExcavationCost` remains as is.
    
    // Just need to make sure `item.excavation_cost` updates didn't mess anything else up.
    // `item.excavation_cost` is for per-item display.
    
    // Remove raw_excavation_hours from items before returning if not needed, but it's harmless.
    
    // Calculate equipment costs
    let totalEquipmentCost = 0;
    if (project.selected_equipment) {
      totalEquipmentCost = project.selected_equipment.reduce((sum, eq) => sum + (eq.equipment_cost || 0), 0);
    }

    // Apply minimum concrete cost if applicable
    if (project.selected_concrete_id) {
      const selectedConcrete = concreteOptions.find(c => c.id === project.selected_concrete_id);
      if (selectedConcrete && selectedConcrete.minimum_cost && totalConcreteCost > 0 && totalConcreteCost < selectedConcrete.minimum_cost) {
        totalConcreteCost = selectedConcrete.minimum_cost;
      }
    }

    return {
      items: updatedItems,
      total_concrete_cost: totalConcreteCost,
      total_rebar_cost: totalRebarCost,
      total_forming_materials_cost: totalFormingMaterialsCost,
      total_excavation_cost: totalNonLaborExcavationCost,
      total_labor_cost: totalLaborCost,
      total_equipment_cost: totalEquipmentCost,
      total_pole_cost: totalPoleCost,
      total_pole_painting_cost: totalPolePaintingCost
    };
  }, [project.items, project.selected_equipment, project.concrete_cost_per_cy, project.rebar_cost_per_ft, poleInventory,
      project.forming_materials_cost_spread_foot, project.forming_materials_cost_pillar, project.min_excavation_time_hours,
      project.hand_dig_excavation_cost_per_cy, project.equipment_excavation_cost_per_cy,
      project.forming_labor_rate, project.pouring_labor_rate,
      project.finishing_labor_rate, project.hand_dig_labor_rate, project.equipment_excavation_labor_rate,
      project.excavation_method, project.selected_concrete_id, globalSettings, concreteOptions, formingMaterials]);

  useEffect(() => {
    if (!isLoading && project.items.length >= 0) {
      const calculated = calculateTotals();
      setProject(prev => ({
        ...prev,
        items: calculated.items,
        total_concrete_cost: calculated.total_concrete_cost,
        total_rebar_cost: calculated.total_rebar_cost,
        total_forming_materials_cost: calculated.total_forming_materials_cost,
        total_excavation_cost: calculated.total_excavation_cost,
        total_labor_cost: calculated.total_labor_cost,
        total_equipment_cost: calculated.total_equipment_cost,
        total_pole_cost: calculated.total_pole_cost,
        total_pole_painting_cost: calculated.total_pole_painting_cost
      }));
    }
  }, [calculateTotals, isLoading, project.items.length, project.selected_equipment?.length, 
      project.excavation_method, project.hand_dig_labor_rate, project.equipment_excavation_labor_rate,
      project.hand_dig_excavation_cost_per_cy, project.equipment_excavation_cost_per_cy,
      project.forming_materials_cost_spread_foot, project.forming_materials_cost_pillar, project.min_excavation_time_hours
    ]);

  const saveProject = async () => {
    if (!project.project_name || !project.client_name || !project.estimate_number || !project.hyperlink || !project.excavation_method) {
      alert('Please fill in all required project information fields, including excavation method.');
      return;
    }

    if (!project.selected_concrete_id) {
        alert('Please select a concrete material.');
        return;
    }

    if (project.items.length === 0) {
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
        total_forming_materials_cost: calculated.total_forming_materials_cost,
        total_excavation_cost: calculated.total_excavation_cost,
        total_labor_cost: calculated.total_labor_cost,
        total_equipment_cost: calculated.total_equipment_cost,
        total_pole_cost: calculated.total_pole_cost,
        total_pole_painting_cost: calculated.total_pole_painting_cost,
        status: 'calculated'
      };

      if (isEditing && editId) {
        await FoundationProject.update(editId, dataToSave);
        alert('Project updated successfully!');
      } else {
        await FoundationProject.create(dataToSave);
        alert('Project saved successfully!');
      }
      
      // Use window.location for reliable navigation
      window.location.href = createPageUrl("FoundationProjects");
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
                    <Label className="text-xs">Concrete Material *</Label>
                    <Select 
                      value={project.selected_concrete_id || ""} 
                      onValueChange={handleConcreteSelection}
                    >
                      <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue placeholder="Select concrete material" />
                      </SelectTrigger>
                      <SelectContent>
                        {concreteOptions.map(concrete => {
                          const costPerCY = concrete.cost_per_unit.toFixed(2);
                          return (
                            <SelectItem key={concrete.id} value={concrete.id}>
                              {concrete.material_name} - ${costPerCY}/cy ({concrete.material_type.replace(/_/g, ' ')})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {!project.selected_concrete_id && (
                      <p className="text-xs text-red-600 mt-1 font-medium">
                        Please select a concrete material
                      </p>
                    )}
                    {selectedConcrete && (
                      <p className="text-xs text-green-600 mt-1 font-medium">
                        Using: {selectedConcrete.material_name} @ ${project.concrete_cost_per_cy.toFixed(2)}/cy
                      </p>
                    )}
                  </div>
                </div>
                {/* NEW: Excavation Method - REMOVED labor rate inputs */}
                <div>
                  <Label className="text-xs">Excavation Method *</Label>
                  <Select 
                    value={project.excavation_method} 
                    onValueChange={(value) => setProject(prev => ({ ...prev, excavation_method: value }))}
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hand_dig">Hand Dig</SelectItem>
                      <SelectItem value="equipment_excavation">Equipment Excavation</SelectItem>
                    </SelectContent>
                  </Select>
                  {!project.excavation_method && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      Please select an excavation method
                    </p>
                  )}
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
                    <FoundationItemCard
                      key={index}
                      item={item}
                      index={index}
                      expandedAdvanced={expandedAdvanced}
                      toggleAdvanced={toggleAdvanced}
                      updateItem={updateItem}
                      removeItem={removeItem}
                      formingMaterials={formingMaterials}
                      poleInventory={poleInventory}
                      project={project}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Equipment - Conditionally Rendered */}
            {project.excavation_method === 'equipment_excavation' && (
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-semibold">Equipment & Attachments</CardTitle>
                    <Button onClick={addEquipment} size="sm" className="bg-orange-600 hover:bg-orange-700 h-8 text-xs">
                      <Plus className="w-3 h-3 mr-1" />
                      Add Equipment
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(!project.selected_equipment || project.selected_equipment.length === 0) ? (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      <p>Click "Add Equipment" to add excavation equipment</p>
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
                                      {e.material_name} {e.equipment_type ? `(${e.equipment_type})` : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {selectedEquip && selectedEquip.notes && (
                                <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                                  <p className="text-xs text-amber-800">
                                    <strong>Notes:</strong> {selectedEquip.notes}
                                  </p>
                                </div>
                              )}
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
                              <Checkbox
                                checked={eq.include_delivery}
                                onCheckedChange={(checked) => updateEquipmentItem(index, 'include_delivery', checked)}
                                className="w-3 h-3 text-orange-600"
                              />
                              <Label className="text-xs">Delivery {selectedEquip && `(${(selectedEquip.pickup_delivery_cost || 0).toFixed(2)})`}</Label>
                            </div>

                            {/* Attachments Section */}
                            {selectedEquip && (
                              <div className="col-span-2 mt-2 p-2 bg-purple-50 rounded border border-purple-200">
                                <div className="flex justify-between items-center mb-2">
                                  <Label className="text-xs font-semibold text-purple-800">Attachments</Label>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => openAttachmentModal(index)}
                                    className="bg-purple-600 hover:bg-purple-700 h-6 text-xs"
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add
                                  </Button>
                                </div>
                                
                                {(eq.attachments || []).length === 0 ? (
                                  <p className="text-xs text-purple-600 text-center py-2">No attachments selected</p>
                                ) : (
                                  <div className="space-y-1">
                                    {(eq.attachments || []).map((att, attIdx) => {
                                      const attachment = allAttachments.find(a => a.id === att.attachment_id);
                                      return (
                                        <div key={attIdx} className="bg-white p-2 rounded border border-purple-300">
                                          <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                              <p className="text-xs font-medium">{attachment?.material_name}</p>
                                              <p className="text-xs text-purple-600">${(att.attachment_cost || 0).toFixed(2)}</p>
                                            </div>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => removeAttachmentFromEquipment(index, attIdx)}
                                              className="h-5 w-5 text-red-500"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          </div>
                                          
                                          {/* Subsidiaries */}
                                          {(att.subsidiaries || []).length > 0 && (
                                            <div className="mt-1 ml-2 pl-2 border-l-2 border-purple-200">
                                              {att.subsidiaries.map((sub, subIdx) => {
                                                const subsidiary = allAttachments.find(a => a.id === sub.subsidiary_id);
                                                return (
                                                  <div key={subIdx} className="flex justify-between items-center py-1">
                                                    <p className="text-xs text-slate-600">└ {subsidiary?.material_name} (${(sub.subsidiary_cost || 0).toFixed(2)})</p>
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="icon"
                                                      onClick={() => removeSubsidiary(index, attIdx, subIdx)}
                                                      className="h-4 w-4 text-red-500"
                                                    >
                                                      <X className="w-2 h-2" />
                                                    </Button>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {selectedEquip && (
                              <div className="col-span-2 p-2 bg-white rounded border border-orange-300 text-xs">
                                <div className="flex justify-between font-semibold">
                                  <span>Total Cost:</span>
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
            )}
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
                    <span className="text-base font-bold text-blue-900">${((project.total_concrete_cost || 0) + (project.total_rebar_cost || 0) + (project.total_forming_materials_cost || 0)).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-0.5">Concrete, rebar & forms</p>
                  {(project.total_forming_materials_cost > 0) && (
                    <div className="flex justify-between items-center mt-1 text-xs text-blue-700 border-t border-blue-200 pt-1">
                      <span>Forms:</span>
                      <span>${project.total_forming_materials_cost.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-amber-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-amber-800">Excavation</span>
                    <span className="text-base font-bold text-amber-900">${(project.total_excavation_cost || 0).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-amber-600 mt-0.5">Non-labor excavation costs</p>
                </div>

                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-green-800">Labor</span>
                    <span className="text-base font-bold text-green-900">${(project.total_labor_cost || 0).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-green-600 mt-0.5">
                    {project.excavation_method === 'hand_dig' ? 'Hand dig, forming, pouring, finishing' : 'Excavation operator, forming, pouring, finishing'}
                  </p>
                </div>

                {project.excavation_method === 'equipment_excavation' && (
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-orange-800">Equipment</span>
                      <span className="text-base font-bold text-orange-900">${(project.total_equipment_cost || 0).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-orange-600 mt-0.5">Rental & delivery</p>
                  </div>
                )}

                {((project.total_pole_cost || 0) + (project.total_pole_painting_cost || 0)) > 0 && (
                  <div className="p-3 bg-teal-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-teal-800">Poles</span>
                      <span className="text-base font-bold text-teal-900">${((project.total_pole_cost || 0) + (project.total_pole_painting_cost || 0)).toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-teal-600 mt-0.5 space-y-0.5">
                      {(project.total_pole_cost || 0) > 0 && <div className="flex justify-between"><span>Material:</span><span>${(project.total_pole_cost || 0).toFixed(2)}</span></div>}
                      {(project.total_pole_painting_cost || 0) > 0 && <div className="flex justify-between"><span>Painting:</span><span>${(project.total_pole_painting_cost || 0).toFixed(2)}</span></div>}
                    </div>
                  </div>
                )}

                <div className="border-t pt-3">
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>Items:</span>
                    <span className="font-medium">{project.items.length}</span>
                  </div>
                  {project.excavation_method === 'equipment_excavation' && (
                    <div className="flex justify-between text-xs text-slate-600 mb-2">
                      <span>Equipment:</span>
                      <span className="font-medium">{(project.selected_equipment || []).length}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold border-t pt-2">
                    <span>TOTAL:</span>
                    <span className="text-green-600">${((project.total_concrete_cost || 0) + (project.total_rebar_cost || 0) + (project.total_forming_materials_cost || 0) + (project.total_excavation_cost || 0) + (project.total_labor_cost || 0) + (project.total_equipment_cost || 0)).toFixed(2)}</span>
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

      {/* Attachment Selection Modal */}
      {showAttachmentModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAttachmentModal(false);
            }
          }}
        >
          <Card className="bg-white w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Select Attachments</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowAttachmentModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {availableAttachments.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No compatible attachments available for this equipment</p>
              ) : (
                <div className="space-y-2">
                  {availableAttachments.map(att => {
                    const subsidiaries = allAttachments.filter(a => a.parent_attachment_ids && a.parent_attachment_ids.includes(att.id));
                    // Check if this attachment is already added to the current equipment
                    const isAttachmentAdded = project.selected_equipment[currentEquipmentIndex]?.attachments?.some(a => a.attachment_id === att.id);
                    
                    const compatibleEquipNames = att.compatible_equipment_ids && att.compatible_equipment_ids.length > 0
                      ? att.compatible_equipment_ids.map(id => {
                          const eq = equipment.find(e => e.id === id);
                          return eq ? eq.material_name : null;
                        }).filter(Boolean).join(', ')
                      : 'All Equipment';

                    return (
                      <div key={att.id} className="p-3 border rounded-lg hover:bg-slate-50">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">{att.material_name}</h4>
                            <p className="text-xs text-slate-600">
                              Day: ${(att.cost_per_day || 0).toFixed(2)} | 
                              Week: ${(att.cost_per_week || 0).toFixed(2)} | 
                              Month: ${(att.cost_per_month || 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-purple-600 mt-1">
                              Compatible with: {compatibleEquipNames}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addAttachmentToEquipment(currentEquipmentIndex, att.id)}
                            className="bg-purple-600 hover:bg-purple-700"
                            disabled={isAttachmentAdded}
                          >
                            {isAttachmentAdded ? 'Added' : 'Add'}
                          </Button>
                        </div>
                        
                        {subsidiaries.length > 0 && (
                          <div className="ml-4 pl-3 border-l-2 border-purple-200 mt-2 space-y-1">
                            {subsidiaries.map(sub => {
                              const subsidiaryInfo = allAttachments.find(a => a.id === sub.id);
                              const currentEquipment = project.selected_equipment[currentEquipmentIndex];
                              const currentAttachment = (currentEquipment.attachments || []).find(a => a.attachment_id === att.id); // 'att' from outer loop

                              const isSubsidiaryAdded = currentAttachment?.subsidiaries?.some(s => s.subsidiary_id === sub.id);

                              return (
                                <div key={sub.id} className="flex justify-between items-center py-1">
                                  <div>
                                    <p className="text-sm">└ {sub.material_name}</p>
                                    <p className="text-xs text-slate-500">
                                      Day: ${(sub.cost_per_day || 0).toFixed(2)}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const parentRequired = subsidiaryInfo.parent_attachment_ids && subsidiaryInfo.parent_attachment_ids.length > 0;
                                      
                                      let hasRequiredParentAlready = false;
                                      
                                      if (parentRequired) {
                                        const selectedEquipmentAttachments = project.selected_equipment[currentEquipmentIndex]?.attachments || [];
                                        const foundParentAttachment = selectedEquipmentAttachments.find(
                                          selectedAtt => subsidiaryInfo.parent_attachment_ids.includes(selectedAtt.attachment_id)
                                        );
                                        if (foundParentAttachment) {
                                          hasRequiredParentAlready = true;
                                        }
                                      }

                                      if (parentRequired && !hasRequiredParentAlready) {
                                        const parentInfoToSuggest = allAttachments.find(a => subsidiaryInfo.parent_attachment_ids.includes(a.id));
                                        if (parentInfoToSuggest) {
                                          setPendingSubsidiary({
                                            equipmentIndex: currentEquipmentIndex,
                                            subsidiaryId: sub.id,
                                            parentInfo: parentInfoToSuggest
                                          });
                                          setShowConfirmDialog(true);
                                        } else {
                                            console.error("Required parent for subsidiary not found in allAttachments:", subsidiaryInfo.parent_attachment_ids);
                                        }
                                      } else {
                                        const parentAttachmentIdInModal = att.id; // 'att' is the parent in the modal's current loop
                                        const actualParentAttachmentIndex = project.selected_equipment[currentEquipmentIndex].attachments.findIndex(
                                            selectedAtt => selectedAtt.attachment_id === parentAttachmentIdInModal
                                        );

                                        if (actualParentAttachmentIndex !== -1) {
                                          addSubsidiaryToAttachment(currentEquipmentIndex, actualParentAttachmentIndex, sub.id);
                                        } else {
                                          console.warn("Cannot find target parent attachment in selected_equipment to add subsidiary directly.");
                                        }
                                      }
                                    }}
                                    className="text-xs"
                                    disabled={isSubsidiaryAdded}
                                  >
                                    {isSubsidiaryAdded ? 'Added' : 'Add Sub'}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {showConfirmDialog && pendingSubsidiary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="bg-white w-full max-w-md">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Parent Attachment Required</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-slate-700">
                This subsidiary attachment requires the parent attachment <strong>"{pendingSubsidiary.parentInfo.material_name}"</strong> to be selected first.
              </p>
              <p className="text-slate-600 text-sm">
                Would you like to add both the parent attachment and this subsidiary?
              </p>
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setPendingSubsidiary(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmAddParentAndSub}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Yes, Add Both
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rebar Error Modal */}
      {showRebarError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="bg-white w-full max-w-md">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <CardTitle className="text-lg">Rebar Spacing Too Large</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-slate-700 whitespace-pre-line text-sm leading-relaxed">
                  {rebarErrorMessage}
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-800">
                  <strong>💡 Tip:</strong> Rebar needs a 3" clearance from all edges. The effective area for rebar placement is smaller than the foundation size.
                </p>
              </div>
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => setShowRebarError(false)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Got It
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}