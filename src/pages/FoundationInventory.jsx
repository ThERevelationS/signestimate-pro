import React, { useState, useEffect } from "react";
import { FoundationInventory } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, Save, X, Anchor, Drill } from "lucide-react";

export default function FoundationInventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('material');
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    material_name: "",
    material_type: "concrete_service",
    equipment_type: "N/A",
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
      }

      if (editingItem) {
        await FoundationInventory.update(editingItem.id, dataToSave);
      } else {
        await FoundationInventory.create(dataToSave);
      }
      await loadInventory();
      resetForm();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Error saving item. Please try again.');
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setModalType(item.material_type === 'excavation_equipment' ? 'equipment' : 'material');
    setFormData({
      material_name: item.material_name,
      material_type: item.material_type,
      equipment_type: item.equipment_type || "N/A",
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
      notes: item.notes || ""
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await FoundationInventory.delete(id);
        await loadInventory();
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const openMaterialModal = () => {
    setModalType('material');
    setFormData({
      material_name: "",
      material_type: "concrete_service",
      equipment_type: "N/A",
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
      equipment_type: "skid_steer",
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
      notes: ""
    });
    setEditingItem(null);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      material_name: "",
      material_type: "concrete_service",
      equipment_type: "N/A",
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
      notes: ""
    });
    setEditingItem(null);
    setShowModal(false);
    setModalType('material');
  };

  const isEquipment = modalType === 'equipment';
  const isConcrete = formData.material_type === 'concrete_service' || formData.material_type === 'bagged_concrete';

  const concreteItems = inventory.filter(item => 
    item.material_type === 'concrete_service' || 
    item.material_type === 'bagged_concrete' ||
    item.material_type === 'rebar'
  );
  
  const equipmentItems = inventory.filter(item => 
    item.material_type === 'excavation_equipment'
  );

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading inventory...</p>
      </div>
    );
  }

  const renderInventoryTable = (items, title, icon) => (
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
                  <th className="text-left p-3 font-semibold text-slate-700">Supplier/Company</th>
                  <th className="text-left p-3 font-semibold text-slate-700">Details</th>
                  <th className="text-right p-3 font-semibold text-slate-700">Pricing</th>
                  <th className="text-right p-3 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  return (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-25">
                      <td className="p-3">{item.material_name}</td>
                      <td className="p-3 capitalize">{item.material_type.replace(/_/g, ' ')}</td>
                      <td className="p-3 text-sm text-slate-600">
                        {item.material_type === 'excavation_equipment' 
                          ? (item.rental_company || '-')
                          : (item.supplier || '-')}
                      </td>
                      <td className="p-3">
                        {item.material_type === 'excavation_equipment' ? (
                          <span className="text-sm">
                            {item.equipment_type?.replace(/_/g, ' ').toUpperCase() || 'N/A'}
                            {item.pickup_delivery_cost > 0 && ` • Delivery: $${item.pickup_delivery_cost.toFixed(2)}`}
                          </span>
                        ) : item.material_type === 'rebar' ? (
                          <span className="text-sm">{item.rebar_size || 'N/A'}</span>
                        ) : (
                          <span className="text-sm">
                            {item.unit || 'N/A'}
                            {item.minimum_cost > 0 && ` • Min: $${item.minimum_cost.toFixed(2)}`}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {item.material_type === 'excavation_equipment' ? (
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
            <p className="text-slate-600">Manage pricing for concrete, rebar, and excavation equipment</p>
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
          </div>
        </div>

        <div className="space-y-6">
          {renderInventoryTable(concreteItems, "Concrete & Materials", <Anchor className="w-5 h-5" />)}
          {renderInventoryTable(equipmentItems, "Excavation Equipment", <Drill className="w-5 h-5" />)}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b">
                <div className="flex justify-between items-center">
                  <CardTitle>
                    {editingItem ? 'Edit' : 'Add'} {isEquipment ? 'Equipment' : 'Material'}
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={resetForm}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="material_name">{isEquipment ? 'Equipment' : 'Material'} Name *</Label>
                    <Input
                      id="material_name"
                      value={formData.material_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, material_name: e.target.value }))}
                      placeholder={isEquipment ? "e.g., Mini Excavator" : "e.g., Ernst Concrete Ready-Mix"}
                      required
                      className="mt-1"
                    />
                  </div>

                  {!isEquipment ? (
                    <>
                      <div>
                        <Label htmlFor="material_type">Material Type *</Label>
                        <Select
                          value={formData.material_type}
                          onValueChange={(value) => {
                            const newUnit = (value === 'rebar') ? 'per foot' : 'cubic yard';
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
                          Cost Per {formData.material_type === 'rebar' ? 'Foot' : 'Cubic Yard'} *
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
                            : 'Price per cubic yard of concrete'}
                        </p>
                      </div>

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
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="equipment_type">Equipment Type *</Label>
                        <Select
                          value={formData.equipment_type}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, equipment_type: value }))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="skid_steer">Skid Steer</SelectItem>
                            <SelectItem value="auger">Auger</SelectItem>
                            <SelectItem value="excavator">Excavator</SelectItem>
                            <SelectItem value="backhoe">Backhoe</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
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
                      {editingItem ? 'Update' : 'Add'} {isEquipment ? 'Equipment' : 'Material'}
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