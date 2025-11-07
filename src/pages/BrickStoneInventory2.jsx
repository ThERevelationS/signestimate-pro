import React, { useState, useEffect } from "react";
import { BrickStoneInventory2 } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Server, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function BrickStoneInventory2Page() {
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    material_name: "",
    material_type: "brick",
    length: 8,
    width: 4,
    height: 2.25,
    cost_per_unit: 0.65,
    color: "",
    texture: "smooth",
    supplier: "",
    notes: ""
  });

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    let filtered = [...inventory];
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.color?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredInventory(filtered);
  }, [inventory, searchTerm]);

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const data = await BrickStoneInventory2.list('-created_date');
      setInventory(data);
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
    setIsLoading(false);
  };

  const openDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({
        material_name: "",
        material_type: "brick",
        length: 8,
        width: 4,
        height: 2.25,
        cost_per_unit: 0.65,
        color: "",
        texture: "smooth",
        supplier: "",
        notes: ""
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await BrickStoneInventory2.update(editingItem.id, formData);
      } else {
        await BrickStoneInventory2.create(formData);
      }
      await loadInventory();
      closeDialog();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Error saving item. Please try again.');
    }
  };

  const deleteItem = async (id, name) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await BrickStoneInventory2.delete(id);
        await loadInventory();
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Error deleting item. Please try again.');
      }
    }
  };

  const getMaterialTypeColor = (type) => {
    const colors = {
      brick: 'bg-red-100 text-red-800',
      stone: 'bg-slate-100 text-slate-800',
      block: 'bg-orange-100 text-orange-800',
      pavers: 'bg-amber-100 text-amber-800'
    };
    return colors[type] || 'bg-slate-100 text-slate-800';
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
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Server className="w-8 h-8" />
              Brick & Stone 2 Inventory
            </h1>
            <p className="text-slate-600">Manage your brick and stone materials</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()} className="bg-pink-600 hover:bg-pink-700">
                <Plus className="w-5 h-5 mr-2" />
                Add Material
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Material' : 'Add New Material'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Material Name *</Label>
                    <Input
                      value={formData.material_name}
                      onChange={(e) => setFormData({...formData, material_name: e.target.value})}
                      placeholder="e.g., Standard Red Brick"
                      required
                    />
                  </div>
                  <div>
                    <Label>Material Type *</Label>
                    <Select 
                      value={formData.material_type} 
                      onValueChange={(value) => setFormData({...formData, material_type: value})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brick">Brick</SelectItem>
                        <SelectItem value="stone">Stone</SelectItem>
                        <SelectItem value="block">Block</SelectItem>
                        <SelectItem value="pavers">Pavers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Length (inches) *</Label>
                    <Input
                      type="number"
                      step="0.125"
                      value={formData.length}
                      onChange={(e) => setFormData({...formData, length: parseFloat(e.target.value) || 0})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Width (inches) *</Label>
                    <Input
                      type="number"
                      step="0.125"
                      value={formData.width}
                      onChange={(e) => setFormData({...formData, width: parseFloat(e.target.value) || 0})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Height (inches) *</Label>
                    <Input
                      type="number"
                      step="0.125"
                      value={formData.height}
                      onChange={(e) => setFormData({...formData, height: parseFloat(e.target.value) || 0})}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Cost Per Unit ($) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cost_per_unit}
                      onChange={(e) => setFormData({...formData, cost_per_unit: parseFloat(e.target.value) || 0})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Texture</Label>
                    <Select 
                      value={formData.texture} 
                      onValueChange={(value) => setFormData({...formData, texture: value})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="smooth">Smooth</SelectItem>
                        <SelectItem value="rough">Rough</SelectItem>
                        <SelectItem value="textured">Textured</SelectItem>
                        <SelectItem value="glazed">Glazed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Color</Label>
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      placeholder="e.g., Red, Gray, Beige"
                    />
                  </div>
                  <div>
                    <Label>Supplier</Label>
                    <Input
                      value={formData.supplier}
                      onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                      placeholder="Supplier name"
                    />
                  </div>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Additional information..."
                    className="h-20"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-pink-600 hover:bg-pink-700">
                    {editingItem ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input 
                placeholder="Search materials..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-10" 
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredInventory.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Server className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>No materials in inventory. Add your first brick or stone material!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium text-slate-700">Material</th>
                      <th className="text-left p-4 font-medium text-slate-700">Type</th>
                      <th className="text-left p-4 font-medium text-slate-700">Dimensions</th>
                      <th className="text-left p-4 font-medium text-slate-700">Color</th>
                      <th className="text-left p-4 font-medium text-slate-700">Cost/Unit</th>
                      <th className="text-left p-4 font-medium text-slate-700">Supplier</th>
                      <th className="text-right p-4 font-medium text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div>
                            <p className="font-medium text-slate-900">{item.material_name}</p>
                            {item.texture && (
                              <p className="text-xs text-slate-500 capitalize">{item.texture}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={getMaterialTypeColor(item.material_type)}>
                            {item.material_type}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-mono text-slate-700">
                            {item.length}" × {item.width}" × {item.height}"
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-slate-600">{item.color || '-'}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-medium text-slate-900">
                            ${item.cost_per_unit.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-slate-600">{item.supplier || '-'}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDialog(item)}
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteItem(item.id, item.material_name)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
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

        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <Card className="bg-pink-50 border-pink-200">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-pink-900">{inventory.length}</p>
                <p className="text-sm text-pink-700">Total Materials</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-900">
                  ${inventory.length > 0 ? (inventory.reduce((sum, item) => sum + item.cost_per_unit, 0) / inventory.length).toFixed(2) : '0.00'}
                </p>
                <p className="text-sm text-blue-700">Avg Cost/Unit</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-900">
                  {new Set(inventory.map(i => i.supplier).filter(Boolean)).size}
                </p>
                <p className="text-sm text-green-700">Suppliers</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}