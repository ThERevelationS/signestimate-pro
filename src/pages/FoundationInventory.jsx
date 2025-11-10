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
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    material_name: "",
    material_type: "rebar",
    equipment_type: "N/A",
    unit: "per foot",
    cost_per_unit: 0,
    cubic_yards_per_unit: 1,
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
      if (editingItem) {
        await FoundationInventory.update(editingItem.id, formData);
      } else {
        await FoundationInventory.create(formData);
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
    setFormData({
      material_name: item.material_name,
      material_type: item.material_type,
      equipment_type: item.equipment_type || "N/A",
      unit: item.unit || "",
      cost_per_unit: item.cost_per_unit || 0,
      cubic_yards_per_unit: item.cubic_yards_per_unit || 1,
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

  const resetForm = () => {
    setFormData({
      material_name: "",
      material_type: "rebar",
      equipment_type: "N/A",
      unit: "per foot",
      cost_per_unit: 0,
      cubic_yards_per_unit: 1,
      cost_per_day: 0,
      cost_per_week: 0,
      cost_per_month: 0,
      pickup_delivery_cost: 0,
      rebar_size: "N/A",
      notes: ""
    });
    setEditingItem(null);
    setShowModal(false);
  };

  const isEquipment = formData.material_type === 'excavation_equipment';
  const isConcreteMaterial = formData.material_type === 'concrete_service' || formData.material_type === 'bagged_concrete';

  // Calculate cost per cubic yard for display
  const calculateCostPerCubicYard = (item) => {
    if (item.material_type === 'concrete_service' || item.material_type === 'bagged_concrete') {
      if (item.cubic_yards_per_unit && item.cubic_yards_per_unit > 0) {
        return (item.cost_per_unit / item.cubic_yards_per_unit).toFixed(2);
      }
    }
    return null;
  };

  // Separate concrete and equipment items
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
                  <th className="text-left p-3 font-semibold text-slate-700">Details</th>
                  <th className="text-right p-3 font-semibold text-slate-700">Pricing</th>
                  <th className="text-right p-3 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const costPerCY = calculateCostPerCubicYard(item);
                  return (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-25">
                      <td className="p-3">{item.material_name}</td>
                      <td className="p-3 capitalize">{item.material_type.replace(/_/g, ' ')}</td>
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
                            {item.cubic_yards_per_unit ? `${item.cubic_yards_per_unit} cy per ${item.unit}` : item.unit || 'N/A'}
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
                            <div className="font-medium">${(item.cost_per_unit || 0).toFixed(2)} / {item.unit}</div>
                            {costPerCY && (
                              <div className="text-green-600 font-semibold">${costPerCY} / cy</div>
                            )}
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
          <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Material
          </Button>
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
                  <CardTitle>{editingItem ? 'Edit Material' : 'Add Material'}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={resetForm}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="material_name">Material/Equipment Name *</Label>
                    <Input
                      id="material_name"
                      value={formData.material_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, material_name: e.target.value }))}
                      placeholder="e.g., Standard Rebar #4 or Mini Excavator"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="material_type">Type *</Label>
                      <Select
                        value={formData.material_type}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, material_type: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rebar">Rebar</SelectItem>
                          <SelectItem value="concrete_service">Concrete Service</SelectItem>
                          <SelectItem value="bagged_concrete">Bagged Concrete</SelectItem>
                          <SelectItem value="excavation_equipment">Excavation Equipment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {isEquipment && (
                      <div>
                        <Label htmlFor="equipment_type">Equipment Type</Label>
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
                    )}

                    {!isEquipment && (
                      <div>
                        <Label htmlFor="unit">Unit of Measurement *</Label>
                        <Input
                          id="unit"
                          value={formData.unit}
                          onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                          placeholder="e.g., per foot, per bag, per cy"
                          required
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>

                  {!isEquipment ? (
                    <>
                      <div>
                        <Label htmlFor="cost_per_unit">Cost Per Unit *</Label>
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
                      </div>
                      
                      {isConcreteMaterial && (
                        <div>
                          <Label htmlFor="cubic_yards_per_unit">Cubic Yards Per Unit *</Label>
                          <Input
                            id="cubic_yards_per_unit"
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={formData.cubic_yards_per_unit}
                            onChange={(e) => setFormData(prev => ({ ...prev, cubic_yards_per_unit: parseFloat(e.target.value) || 1 }))}
                            required
                            className="mt-1"
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            For concrete service: typically 1.0 cy per unit<br/>
                            For bagged concrete: e.g., 60lb bag = 0.0167 cy, 80lb bag = 0.022 cy
                          </p>
                          {formData.cost_per_unit > 0 && formData.cubic_yards_per_unit > 0 && (
                            <p className="text-sm font-semibold text-green-600 mt-2">
                              = ${(formData.cost_per_unit / formData.cubic_yards_per_unit).toFixed(2)} per cubic yard
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
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
                        </SelectContent>
                      </Select>
                    </div>
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
                      {editingItem ? 'Update Material' : 'Add Material'}
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