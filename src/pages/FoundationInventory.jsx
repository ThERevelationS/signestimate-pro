import React, { useState, useEffect } from "react";
import { FoundationInventory } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, Save, X, Anchor } from "lucide-react";

export default function FoundationInventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    material_name: "",
    material_type: "rebar",
    unit: "per foot",
    cost_per_unit: 0,
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
      unit: item.unit || "",
      cost_per_unit: item.cost_per_unit,
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
      unit: "per foot",
      cost_per_unit: 0,
      rebar_size: "N/A",
      notes: ""
    });
    setEditingItem(null);
    setShowModal(false);
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading inventory...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Anchor className="w-8 h-8" />
              Foundation Material Inventory
            </h1>
            <p className="text-slate-600">Manage pricing for rebar, concrete, and other materials</p>
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Material
          </Button>
        </div>

        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Material Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            {inventory.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p>No materials in inventory. Click "Add Material" to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left p-3 font-semibold text-slate-700">Material Name</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Type</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Unit</th>
                      <th className="text-right p-3 font-semibold text-slate-700">Cost/Unit</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Rebar Size</th>
                      <th className="text-right p-3 font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-25">
                        <td className="p-3">{item.material_name}</td>
                        <td className="p-3 capitalize">{item.material_type.replace('_', ' ')}</td>
                        <td className="p-3">{item.unit}</td>
                        <td className="p-3 text-right font-medium">${item.cost_per_unit.toFixed(2)}</td>
                        <td className="p-3">{item.rebar_size || 'N/A'}</td>
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="bg-white w-full max-w-2xl">
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
                    <Label htmlFor="material_name">Material Name *</Label>
                    <Input
                      id="material_name"
                      value={formData.material_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, material_name: e.target.value }))}
                      placeholder="e.g., Standard Rebar #4"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="material_type">Material Type *</Label>
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
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="unit">Unit of Measurement</Label>
                      <Input
                        id="unit"
                        value={formData.unit}
                        onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                        placeholder="e.g., per foot, per cy, per bag"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
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
                  </div>

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