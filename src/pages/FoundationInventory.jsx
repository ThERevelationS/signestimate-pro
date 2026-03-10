import React, { useState, useEffect } from "react";
import { FoundationInventory } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Edit2, Save, X, Anchor, Drill, Wrench } from "lucide-react";

export default function FoundationInventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('material');
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    material_name: "",
    material_type: "concrete_service",
    equipment_type: "",
    compatible_equipment_ids: [],
    parent_attachment_ids: [],
    supplier: "",
    rental_company: "",
    unit: "cubic yard",
    cost_per_unit: 0,
    minimum_cost: 0,
    cost_per_day: 0,
    cost_per_week: 0,
    cost_per_month: 0,
    pickup_delivery_cost: 0,
    rebar_size: "N/A",
    foundation_usage: "general",
    notes: ""
  });

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const data = await FoundationInventory.list();
      setInventory(data);
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSave = { ...formData };
      if (dataToSave.material_type === 'concrete_service' || dataToSave.material_type === 'bagged_concrete') {
        dataToSave.unit = "cubic yard";
      } else if (dataToSave.material_type === 'rebar') {
        dataToSave.unit = "per foot";
      } else if (dataToSave.material_type === 'forming_material') {
        dataToSave.unit = "sqft";
      }

      if (editingItem) {
        const updatedItem = await FoundationInventory.update(editingItem.id, dataToSave);
        setInventory(prev => prev.map(item => item.id === editingItem.id ? updatedItem : item));
      } else {
        const newItem = await FoundationInventory.create(dataToSave);
        setInventory(prev => [...prev, newItem]);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Error saving item. Please try again.');
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    if (item.material_type === 'excavation_equipment') {
      setModalType('equipment');
    } else if (item.material_type === 'attachment') {
      setModalType('attachment');
    } else if (item.material_type === 'pole') {
      setModalType('pole');
    } else {
      setModalType('material');
    }
    
    setFormData({
      material_name: item.material_name,
      material_type: item.material_type,
      equipment_type: item.equipment_type || "",
      compatible_equipment_ids: item.compatible_equipment_ids || [],
      parent_attachment_ids: item.parent_attachment_ids || [],
      supplier: item.supplier || "",
      rental_company: item.rental_company || "",
      unit: item.unit || "cubic yard",
      cost_per_unit: item.cost_per_unit || 0,
      minimum_cost: item.minimum_cost || 0,
      cost_per_day: item.cost_per_day || 0,
      cost_per_week: item.cost_per_week || 0,
      cost_per_month: item.cost_per_month || 0,
      pickup_delivery_cost: item.pickup_delivery_cost || 0,
      rebar_size: item.rebar_size || "N/A",
      foundation_usage: item.foundation_usage || "general",
      lumber_size: item.lumber_size || "custom",
      thickness_inches: item.thickness_inches || 0,
      notes: item.notes || ""
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await FoundationInventory.delete(id);
        setInventory(prev => prev.filter(item => item.id !== id));
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Error deleting item. Please try again.');
      }
    }
  };

  const openMaterialModal = () => {
    setModalType('material');
    setFormData({
      material_name: "",
      material_type: "concrete_service",
      equipment_type: "",
      compatible_equipment_ids: [],
      parent_attachment_ids: [],
      supplier: "",
      rental_company: "",
      unit: "cubic yard",
      cost_per_unit: 0,
      minimum_cost: 0,
      cost_per_day: 0,
      cost_per_week: 0,
      cost_per_month: 0,
      pickup_delivery_cost: 0,
      rebar_size: "N/A",
      foundation_usage: "general",
      lumber_size: "custom",
      thickness_inches: 0,
      notes: ""
    });
    setEditingItem(null);
    setShowModal(true);
  };

  const openEquipmentModal = () => {
    setModalType('equipment');
    setFormData({
      material_name: "",
      material_type: "excavation_equipment",
      equipment_type: "",
      compatible_equipment_ids: [],
      parent_attachment_ids: [],
      supplier: "",
      rental_company: "",
      unit: "",
      cost_per_unit: 0,
      minimum_cost: 0,
      cost_per_day: 0,
      cost_per_week: 0,
      cost_per_month: 0,
      pickup_delivery_cost: 0,
      rebar_size: "N/A",
      foundation_usage: "general",
      lumber_size: "custom",
      thickness_inches: 0,
      notes: ""
    });
    setEditingItem(null);
    setShowModal(true);
  };

  const openAttachmentModal = () => {
    setModalType('attachment');
    setFormData({
      material_name: "",
      material_type: "attachment",
      equipment_type: "",
      compatible_equipment_ids: [],
      parent_attachment_ids: [],
      supplier: "",
      rental_company: "",
      unit: "",
      cost_per_unit: 0,
      minimum_cost: 0,
      cost_per_day: 0,
      cost_per_week: 0,
      cost_per_month: 0,
      pickup_delivery_cost: 0,
      rebar_size: "N/A",
      foundation_usage: "general",
      lumber_size: "custom",
      thickness_inches: 0,
      notes: ""
    });
    setEditingItem(null);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      material_name: "",
      material_type: "concrete_service",
      equipment_type: "",
      compatible_equipment_ids: [],
      parent_attachment_ids: [],
      supplier: "",
      rental_company: "",
      unit: "cubic yard",
      cost_per_unit: 0,
      minimum_cost: 0,
      cost_per_day: 0,
      cost_per_week: 0,
      cost_per_month: 0,
      pickup_delivery_cost: 0,
      rebar_size: "N/A",
      foundation_usage: "general",
      lumber_size: "custom",
      thickness_inches: 0,
      notes: ""
    });
    setEditingItem(null);
    setShowModal(false);
    setModalType('material');
  };

  const toggleCompatibleEquipment = (equipmentId) => {
    setFormData(prev => {
      const current = prev.compatible_equipment_ids || [];
      if (current.includes(equipmentId)) {
        return { ...prev, compatible_equipment_ids: current.filter(e => e !== equipmentId) };
      } else {
        return { ...prev, compatible_equipment_ids: [...current, equipmentId] };
      }
    });
  };

  const toggleParentAttachment = (attachmentId) => {
    setFormData(prev => {
      const current = prev.parent_attachment_ids || [];
      if (current.includes(attachmentId)) {
        return { ...prev, parent_attachment_ids: current.filter(e => e !== attachmentId) };
      } else {
        return { ...prev, parent_attachment_ids: [...current, attachmentId] };
      }
    });
  };

  const isEquipment = modalType === 'equipment';
  const isAttachment = modalType === 'attachment';
  const isConcrete = formData.material_type === 'concrete_service' || formData.material_type === 'bagged_concrete';

  const concreteItems = inventory.filter(item => 
    item.material_type === 'concrete_service' || 
    item.material_type === 'bagged_concrete' ||
    item.material_type === 'rebar' ||
    item.material_type === 'forming_material'
  );
  
  const poleItems = inventory.filter(item => item.material_type === 'pole');

  const equipmentItems = inventory.filter(item => 
    item.material_type === 'excavation_equipment'
  );

  const attachmentItems = inventory.filter(item => 
    item.material_type === 'attachment' && (!item.parent_attachment_ids || item.parent_attachment_ids.length === 0)
  );

  const getSubsidiaryAttachments = (parentId) => {
    return inventory.filter(item => item.parent_attachment_ids && item.parent_attachment_ids.includes(parentId));
  };

  const getParentAttachments = () => {
    const availableParents = inventory.filter(item => 
      item.material_type === 'attachment' && 
      (!item.parent_attachment_ids || item.parent_attachment_ids.length === 0) &&
      (editingItem ? item.id !== editingItem.id : true)
    );
    return availableParents;
  };

  const getEquipmentNames = (equipmentIds) => {
    if (!equipmentIds || equipmentIds.length === 0) return 'All Equipment';
    return equipmentIds
      .map(id => {
        const equip = equipmentItems.find(e => e.id === id);
        return equip ? equip.material_name : null;
      })
      .filter(Boolean)
      .join(', ') || 'Unknown';
  };

  const getParentNames = (parentIds) => {
    if (!parentIds || parentIds.length === 0) return null;
    return parentIds
      .map(id => {
        const parent = inventory.find(p => p.id === id);
        return parent ? parent.material_name : null;
      })
      .filter(Boolean)
      .join(', ');
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading inventory...</p>
      </div>
    );
  }

  const renderInventoryTable = (items, title, icon, isAttachmentSection = false) => (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>No {title.toLowerCase()} in inventory.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 font-semibold text-slate-700">Name</th>
                  <th className="text-left p-3 font-semibold text-slate-700">Type</th>
                  {!isAttachmentSection && <th className="text-left p-3 font-semibold text-slate-700">Supplier/Company</th>}
                  <th className="text-left p-3 font-semibold text-slate-700">Details</th>
                  <th className="text-right p-3 font-semibold text-slate-700">Pricing</th>
                  <th className="text-right p-3 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const subsidiaries = isAttachmentSection ? getSubsidiaryAttachments(item.id) : [];
                  return (
                    <React.Fragment key={item.id}>
                      <tr className="border-b border-slate-100 hover:bg-slate-25">
                        <td className="p-3 font-medium">{item.material_name}</td>
                        <td className="p-3 capitalize">
                          {item.material_type === 'excavation_equipment' && item.equipment_type 
                            ? item.equipment_type 
                            : item.material_type.replace(/_/g, ' ')}
                        </td>
                        {!isAttachmentSection && (
                          <td className="p-3 text-sm text-slate-600">
                            {item.material_type === 'excavation_equipment' 
                              ? (item.rental_company || '-')
                              : (item.supplier || '-')}
                          </td>
                        )}
                        <td className="p-3">
                          {item.material_type === 'excavation_equipment' ? (
                            <span className="text-sm">
                              {item.pickup_delivery_cost > 0 && `Delivery: $${item.pickup_delivery_cost.toFixed(2)}`}
                            </span>
                          ) : item.material_type === 'attachment' ? (
                            <span className="text-sm">
                              Compatible: {getEquipmentNames(item.compatible_equipment_ids)}
                            </span>
                          ) : item.material_type === 'rebar' ? (
                            <span className="text-sm">{item.rebar_size || 'N/A'}</span>
                          ) : item.material_type === 'forming_material' ? (
                            <span className="text-sm">
                              {item.unit || 'N/A'}
                              {item.foundation_usage && item.foundation_usage !== 'general' && (
                                <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 capitalize">
                                  {item.foundation_usage.replace('_', ' ')}
                                </span>
                              )}
                              {item.thickness_inches > 0 && (
                                <span className="ml-1 text-slate-500 text-xs">
                                  ({item.thickness_inches}" thick)
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-sm">
                              {item.unit || 'N/A'}
                              {item.minimum_cost > 0 && ` • Min: $${item.minimum_cost.toFixed(2)}`}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {item.material_type === 'excavation_equipment' || item.material_type === 'attachment' ? (
                            <div className="text-sm">
                              <div>Day: ${(item.cost_per_day || 0).toFixed(2)}</div>
                              <div>Week: ${(item.cost_per_week || 0).toFixed(2)}</div>
                              <div>Month: ${(item.cost_per_month || 0).toFixed(2)}</div>
                            </div>
                          ) : (
                            <div className="text-sm">
                              <div className="font-medium text-green-600 text-lg">${(item.cost_per_unit || 0).toFixed(2)}/{item.unit}</div>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(item)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {subsidiaries.map(sub => {
                        const parentNames = getParentNames(sub.parent_attachment_ids);
                        return (
                          <tr key={sub.id} className="border-b border-slate-100 bg-slate-25">
                            <td className="p-3 pl-8">
                              <span className="text-slate-400 mr-2">└─</span>
                              {sub.material_name}
                            </td>
                            <td className="p-3 text-sm text-slate-500">Subsidiary</td>
                            <td className="p-3 text-sm text-slate-500">For: {parentNames || 'N/A'}</td>
                            <td className="p-3 text-right">
                              <div className="text-sm">
                                <div>Day: ${(sub.cost_per_day || 0).toFixed(2)}</div>
                                <div>Week: ${(sub.cost_per_week || 0).toFixed(2)}</div>
                                <div>Month: ${(sub.cost_per_month || 0).toFixed(2)}</div>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(sub)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(sub.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Anchor className="w-8 h-8" />
              Foundation Material Inventory
            </h1>
            <p className="text-slate-600">Manage pricing for concrete, rebar, equipment, and attachments</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={openMaterialModal} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Material
            </Button>
            <Button onClick={openEquipmentModal} className="bg-amber-600 hover:bg-amber-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Equipment
            </Button>
            <Button onClick={() => {
              setModalType('pole');
              setFormData({ material_name: "", material_type: "pole", pole_shape: "round", pole_width_inches: 4, cost_per_unit: 0, paint_rate_per_linear_ft: 0, supplier: "", notes: "" });
              setEditingItem(null);
              setShowModal(true);
            }} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Pole
            </Button>
            <Button onClick={openAttachmentModal} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Attachment
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {renderInventoryTable(concreteItems, "Concrete & Materials", <Anchor className="w-5 h-5" />)}
          {renderInventoryTable(poleItems, "Poles", <Wrench className="w-5 h-5 text-teal-600" />)}
          {renderInventoryTable(equipmentItems, "Excavation Equipment", <Drill className="w-5 h-5" />)}
          {renderInventoryTable(attachmentItems, "Attachments", <Wrench className="w-5 h-5" />, true)}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b">
                <div className="flex justify-between items-center">
                  <CardTitle>
                    {editingItem ? 'Edit' : 'Add'} {isEquipment ? 'Equipment' : isAttachment ? 'Attachment' : 'Material'}
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={resetForm}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="material_name">
                      {isEquipment ? 'Equipment' : isAttachment ? 'Attachment' : 'Material'} Name *
                    </Label>
                    <Input
                      id="material_name"
                      value={formData.material_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, material_name: e.target.value }))}
                      placeholder={isEquipment ? "e.g., Mini Excavator" : isAttachment ? "e.g., Auger Attachment" : "e.g., Ernst Concrete Ready-Mix"}
                      required
                      className="mt-1"
                    />
                  </div>

                  {isEquipment && (
                    <>
                      <div>
                        <Label htmlFor="equipment_type">Equipment Type</Label>
                        <Input
                          id="equipment_type"
                          value={formData.equipment_type}
                          onChange={(e) => setFormData(prev => ({ ...prev, equipment_type: e.target.value }))}
                          placeholder="e.g., Skid Steer, Auger, Excavator, Backhoe"
                          className="mt-1"
                        />
                        <p className="text-xs text-slate-500 mt-1">Enter a custom equipment type</p>
                      </div>

                      <div>
                        <Label htmlFor="rental_company">Rental Company</Label>
                        <Input
                          id="rental_company"
                          value={formData.rental_company}
                          onChange={(e) => setFormData(prev => ({ ...prev, rental_company: e.target.value }))}
                          placeholder="e.g., Sunbelt Rentals, United Rentals"
                          className="mt-1"
                        />
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="cost_per_day">Daily Rate *</Label>
                          <Input
                            id="cost_per_day"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.cost_per_day}
                            onChange={(e) => setFormData(prev => ({ ...prev, cost_per_day: parseFloat(e.target.value) || 0 }))}
                            required
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cost_per_week">Weekly Rate *</Label>
                          <Input
                            id="cost_per_week"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.cost_per_week}
                            onChange={(e) => setFormData(prev => ({ ...prev, cost_per_week: parseFloat(e.target.value) || 0 }))}
                            required
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cost_per_month">Monthly Rate *</Label>
                          <Input
                            id="cost_per_month"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.cost_per_month}
                            onChange={(e) => setFormData(prev => ({ ...prev, cost_per_month: parseFloat(e.target.value) || 0 }))}
                            required
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="pickup_delivery_cost">Pickup & Delivery Cost</Label>
                        <Input
                          id="pickup_delivery_cost"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.pickup_delivery_cost}
                          onChange={(e) => setFormData(prev => ({ ...prev, pickup_delivery_cost: parseFloat(e.target.value) || 0 }))}
                          className="mt-1"
                        />
                      </div>
                    </>
                  )}

                  {isAttachment && (
                    <>
                      <div>
                        <Label>Compatible Equipment *</Label>
                        <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                          {equipmentItems.length === 0 ? (
                            <p className="text-sm text-slate-500">No equipment available. Add equipment first.</p>
                          ) : (
                            equipmentItems.map(equip => (
                              <div key={equip.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`compat-${equip.id}`}
                                  checked={(formData.compatible_equipment_ids || []).includes(equip.id)}
                                  onCheckedChange={() => toggleCompatibleEquipment(equip.id)}
                                />
                                <Label htmlFor={`compat-${equip.id}`} className="text-sm font-normal cursor-pointer">
                                  {equip.material_name} ({equip.equipment_type || 'N/A'})
                                </Label>
                              </div>
                            ))
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Select all equipment this attachment works with. Leave unchecked for universal compatibility.
                        </p>
                      </div>

                      <div>
                        <Label>Parent Attachments (Optional)</Label>
                        <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                          {getParentAttachments().length === 0 ? (
                            <p className="text-sm text-slate-500">No parent attachments available.</p>
                          ) : (
                            getParentAttachments().map(att => (
                              <div key={att.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`parent-${att.id}`}
                                  checked={(formData.parent_attachment_ids || []).includes(att.id)}
                                  onCheckedChange={() => toggleParentAttachment(att.id)}
                                />
                                <Label htmlFor={`parent-${att.id}`} className="text-sm font-normal cursor-pointer">
                                  {att.material_name}
                                </Label>
                              </div>
                            ))
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Select all parent attachments. E.g., a drill bit can work with multiple auger types. Leave unchecked for main attachment.
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="rental_company">Rental Company</Label>
                        <Input
                          id="rental_company"
                          value={formData.rental_company}
                          onChange={(e) => setFormData(prev => ({ ...prev, rental_company: e.target.value }))}
                          placeholder="e.g., Sunbelt Rentals"
                          className="mt-1"
                        />
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="cost_per_day">Daily Rate *</Label>
                          <Input
                            id="cost_per_day"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.cost_per_day}
                            onChange={(e) => setFormData(prev => ({ ...prev, cost_per_day: parseFloat(e.target.value) || 0 }))}
                            required
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cost_per_week">Weekly Rate *</Label>
                          <Input
                            id="cost_per_week"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.cost_per_week}
                            onChange={(e) => setFormData(prev => ({ ...prev, cost_per_week: parseFloat(e.target.value) || 0 }))}
                            required
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cost_per_month">Monthly Rate *</Label>
                          <Input
                            id="cost_per_month"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.cost_per_month}
                            onChange={(e) => setFormData(prev => ({ ...prev, cost_per_month: parseFloat(e.target.value) || 0 }))}
                            required
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {!isEquipment && !isAttachment && (
                    <>
                      <div>
                        <Label htmlFor="material_type">Material Type *</Label>
                        <Select
                          value={formData.material_type}
                          onValueChange={(value) => {
                            const newUnit = (value === 'rebar') ? 'per foot' : (value === 'forming_material' ? 'sqft' : 'cubic yard');
                            setFormData(prev => ({ ...prev, material_type: value, unit: newUnit }));
                          }}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="concrete_service">Concrete Service</SelectItem>
                            <SelectItem value="bagged_concrete">Bagged Concrete</SelectItem>
                            <SelectItem value="rebar">Rebar</SelectItem>
                            <SelectItem value="forming_material">Forming Material</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="supplier">Supplier</Label>
                        <Input
                          id="supplier"
                          value={formData.supplier}
                          onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                          placeholder="e.g., Ernst Concrete, Home Depot"
                          className="mt-1"
                        />
                      </div>

                      {formData.material_type === 'rebar' && (
                        <div>
                          <Label htmlFor="rebar_size">Rebar Size</Label>
                          <Select
                            value={formData.rebar_size}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, rebar_size: value }))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="N/A">N/A</SelectItem>
                              <SelectItem value="#3">#3 (3/8")</SelectItem>
                              <SelectItem value="#4">#4 (1/2")</SelectItem>
                              <SelectItem value="#5">#5 (5/8")</SelectItem>
                              <SelectItem value="#6">#6 (3/4")</SelectItem>
                              <SelectItem value="#7">#7 (7/8")</SelectItem>
                              <SelectItem value="#8">#8 (1")</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div>
                        <Label htmlFor="cost_per_unit">
                          Cost Per {formData.material_type === 'rebar' ? 'Foot' : formData.material_type === 'forming_material' ? 'Sq. Ft.' : 'Cubic Yard'} *
                        </Label>
                        <Input
                          id="cost_per_unit"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.cost_per_unit}
                          onChange={(e) => setFormData(prev => ({ ...prev, cost_per_unit: parseFloat(e.target.value) || 0 }))}
                          required
                          className="mt-1"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          {formData.material_type === 'rebar' 
                            ? 'Price per linear foot of rebar' 
                            : formData.material_type === 'forming_material'
                            ? 'Price per square foot of forming material'
                            : 'Price per cubic yard of concrete'}
                        </p>
                      </div>

                      {formData.material_type === 'forming_material' && (
                        <div>
                          <Label htmlFor="foundation_usage">Foundation Type Usage</Label>
                          <Select
                            value={formData.foundation_usage || "general"}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, foundation_usage: value }))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="spread_foot">Spread Foot Only</SelectItem>
                              <SelectItem value="pillar">Pillar Only</SelectItem>
                              <SelectItem value="general">General / Both</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-slate-500 mt-1">Specify if this material is for a specific foundation type</p>
                        </div>
                      )}

                      {formData.material_type === 'forming_material' && formData.foundation_usage === 'spread_foot' && (
                        <div>
                          <Label htmlFor="lumber_size">Lumber Size</Label>
                          <Select
                            value={formData.lumber_size || "custom"}
                            onValueChange={(value) => {
                              let thickness = 0;
                              if (value.startsWith('2x')) thickness = 1.5;
                              else if (value === 'plywood_3/4') thickness = 0.75;
                              
                              setFormData(prev => ({ 
                                ...prev, 
                                lumber_size: value,
                                thickness_inches: thickness 
                              }));
                            }}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2x4">2x4 (1.5" x 3.5")</SelectItem>
                              <SelectItem value="2x6">2x6 (1.5" x 5.5")</SelectItem>
                              <SelectItem value="2x8">2x8 (1.5" x 7.25")</SelectItem>
                              <SelectItem value="2x10">2x10 (1.5" x 9.25")</SelectItem>
                              <SelectItem value="2x12">2x12 (1.5" x 11.25")</SelectItem>
                              <SelectItem value="plywood_3/4">Plywood 3/4"</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {formData.material_type === 'forming_material' && (
                        <div>
                          <Label htmlFor="thickness_inches">Material Thickness (inches)</Label>
                          <Input
                            id="thickness_inches"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.thickness_inches}
                            onChange={(e) => setFormData(prev => ({ ...prev, thickness_inches: parseFloat(e.target.value) || 0 }))}
                            className="mt-1"
                            disabled={formData.lumber_size && formData.lumber_size !== 'custom' && formData.foundation_usage === 'spread_foot'}
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            {formData.foundation_usage === 'pillar' 
                              ? 'Wall thickness of the form (e.g. 0.25" for Sonotube)' 
                              : 'Thickness of the board/material'}
                          </p>
                        </div>
                      )}

                      {isConcrete && (
                        <div>
                          <Label htmlFor="minimum_cost">Minimum Order Cost</Label>
                          <Input
                            id="minimum_cost"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.minimum_cost}
                            onChange={(e) => setFormData(prev => ({ ...prev, minimum_cost: parseFloat(e.target.value) || 0 }))}
                            className="mt-1"
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            Minimum charge for concrete orders (e.g., delivery minimum)
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes..."
                      className="mt-1"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      <Save className="w-4 h-4 mr-2" />
                      {editingItem ? 'Update' : 'Add'} {isEquipment ? 'Equipment' : isAttachment ? 'Attachment' : 'Material'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}