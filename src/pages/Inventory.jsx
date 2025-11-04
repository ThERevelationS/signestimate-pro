
import React, { useState, useEffect, useCallback } from "react";
import { Inventory as InventoryEntity } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
    Plus, 
    Search, 
    Edit, 
    Trash2, 
    Package, 
    Filter,
    Save,
    X
} from "lucide-react";

const materialTypes = ["Aluminum", "Steel", "Stainless_Steel", "Galvanized_Steel", "Brass", "Copper", "Plastic", "Other"];
const productTypes = ["Angle", "Channel", "Tube_Square", "Tube_Round", "Flat_Bar", "Round_Bar", "Sheet", "Plate", "I_Beam", "H_Beam", "Pipe", "Other"];
const unitTypes = ["per_foot", "per_piece", "per_pound", "per_sqft"];

export default function Inventory() {
    const [inventory, setInventory] = useState([]);
    const [filteredInventory, setFilteredInventory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({
        material_type: "all",
        product_type: "all",
    });
    const [sortBy, setSortBy] = useState("material_type");
    const [sortOrder, setSortOrder] = useState("asc");

    const [formData, setFormData] = useState({
        material_type: "",
        product_type: "",
        size: "",
        thickness_gauge: "",
        standard_length: "",
        cost_per_unit: "",
        unit_type: "per_foot",
        supplier: "",
        notes: ""
    });

    useEffect(() => {
        loadInventory();
    }, []);

    const filterAndSortInventory = useCallback(() => {
        let filtered = [...inventory];

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(item => 
                item.size?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.notes?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply filters
        if (filters.material_type !== "all") {
            filtered = filtered.filter(item => item.material_type === filters.material_type);
        }

        if (filters.product_type !== "all") {
            filtered = filtered.filter(item => item.product_type === filters.product_type);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aVal = a[sortBy] || "";
            let bVal = b[sortBy] || "";

            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (sortOrder === "asc") {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        setFilteredInventory(filtered);
    }, [inventory, searchTerm, filters, sortBy, sortOrder]);

    useEffect(() => {
        filterAndSortInventory();
    }, [filterAndSortInventory]);

    const loadInventory = async () => {
        setIsLoading(true);
        try {
            const items = await InventoryEntity.list();
            setInventory(items);
        } catch (error) {
            console.error('Error loading inventory:', error);
        }
        setIsLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.material_type || !formData.product_type || !formData.size || !formData.cost_per_unit) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            const data = {
                ...formData,
                standard_length: parseFloat(formData.standard_length) || 0,
                cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
            };

            if (editingItem) {
                await InventoryEntity.update(editingItem.id, data);
            } else {
                await InventoryEntity.create(data);
            }

            resetForm();
            loadInventory();
        } catch (error) {
            console.error('Error saving inventory item:', error);
            alert('Error saving inventory item. Please try again.');
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            material_type: item.material_type || "",
            product_type: item.product_type || "",
            size: item.size || "",
            thickness_gauge: item.thickness_gauge || "",
            standard_length: item.standard_length?.toString() || "",
            cost_per_unit: item.cost_per_unit?.toString() || "",
            unit_type: item.unit_type || "per_foot",
            supplier: item.supplier || "",
            notes: item.notes || ""
        });
        setShowForm(true);
    };

    const handleDelete = async (item) => {
        if (window.confirm(`Are you sure you want to delete ${item.material_type} ${item.product_type} ${item.size}?`)) {
            try {
                await InventoryEntity.delete(item.id);
                loadInventory();
            } catch (error) {
                console.error('Error deleting inventory item:', error);
                alert('Error deleting item. Please try again.');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            material_type: "",
            product_type: "",
            size: "",
            thickness_gauge: "",
            standard_length: "",
            cost_per_unit: "",
            unit_type: "per_foot",
            supplier: "",
            notes: ""
        });
        setEditingItem(null);
        setShowForm(false);
    };

    const updateFormData = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const formatMaterialType = (type) => {
        return type.replace(/_/g, ' ');
    };

    const formatProductType = (type) => {
        return type.replace(/_/g, ' ');
    };

    const formatUnitType = (type) => {
        return type.replace(/_/g, ' ');
    };

    if (isLoading) {
        return (
            <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
                <p className="text-slate-600">Loading material price list...</p>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <Package className="w-8 h-8" />
                            Material Pricing
                        </h1>
                        <p className="text-slate-600">Manage material costs for project estimates</p>
                    </div>
                    <Button 
                        onClick={() => setShowForm(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Material
                    </Button>
                </div>

                {/* Search and Filters */}
                <Card className="bg-white border-0 shadow-sm mb-6">
                    <CardContent className="pt-6">
                        <div className="flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-64">
                                <Label>Search</Label>
                                <div className="relative mt-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search by size, supplier, or notes..."
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <Label>Material Type</Label>
                                <Select 
                                    value={filters.material_type} 
                                    onValueChange={(value) => setFilters(prev => ({ ...prev, material_type: value }))}
                                >
                                    <SelectTrigger className="w-40 mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        {materialTypes.map(type => (
                                            <SelectItem key={type} value={type}>
                                                {formatMaterialType(type)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Product Type</Label>
                                <Select 
                                    value={filters.product_type} 
                                    onValueChange={(value) => setFilters(prev => ({ ...prev, product_type: value }))}
                                >
                                    <SelectTrigger className="w-40 mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Products</SelectItem>
                                        {productTypes.map(type => (
                                            <SelectItem key={type} value={type}>
                                                {formatProductType(type)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Sort By</Label>
                                <Select value={sortBy} onValueChange={setSortBy}>
                                    <SelectTrigger className="w-40 mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="material_type">Material</SelectItem>
                                        <SelectItem value="product_type">Product</SelectItem>
                                        <SelectItem value="size">Size</SelectItem>
                                        <SelectItem value="cost_per_unit">Cost</SelectItem>
                                        <SelectItem value="supplier">Supplier</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                variant="outline"
                                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                            >
                                {sortOrder === "asc" ? "↑" : "↓"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Inventory Table */}
                <Card className="bg-white border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle>
                            Material Price List ({filteredInventory.length} of {inventory.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {filteredInventory.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <Package className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                <p>No materials found. Add some to get started.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b">
                                        <tr className="text-left">
                                            <th className="pb-3 font-medium text-slate-600">Material</th>
                                            <th className="pb-3 font-medium text-slate-600">Product</th>
                                            <th className="pb-3 font-medium text-slate-600">Size</th>
                                            <th className="pb-3 font-medium text-slate-600">Thickness</th>
                                            <th className="pb-3 font-medium text-slate-600">Cost</th>
                                            <th className="pb-3 font-medium text-slate-600">Supplier</th>
                                            <th className="pb-3 font-medium text-slate-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredInventory.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50">
                                                <td className="py-3">
                                                    <span className="font-medium">
                                                        {formatMaterialType(item.material_type)}
                                                    </span>
                                                </td>
                                                <td className="py-3">
                                                    {formatProductType(item.product_type)}
                                                </td>
                                                <td className="py-3 font-mono text-sm">
                                                    {item.size}
                                                </td>
                                                <td className="py-3 font-mono text-sm">
                                                    {item.thickness_gauge || '-'}
                                                </td>
                                                <td className="py-3">
                                                    <span className="font-medium">
                                                        ${item.cost_per_unit?.toFixed(2)}
                                                    </span>
                                                    <span className="text-slate-500 text-sm ml-1">
                                                        {formatUnitType(item.unit_type)}
                                                    </span>
                                                </td>
                                                <td className="py-3">
                                                    {item.supplier || '-'}
                                                </td>
                                                <td className="py-3">
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleEdit(item)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(item)}
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

                {/* Add/Edit Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <Card className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <CardHeader className="border-b">
                                <div className="flex justify-between items-center">
                                    <CardTitle>
                                        {editingItem ? 'Edit' : 'Add'} Material
                                    </CardTitle>
                                    <Button variant="ghost" size="icon" onClick={resetForm}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <Label>Material Type *</Label>
                                            <Select 
                                                value={formData.material_type} 
                                                onValueChange={(value) => updateFormData('material_type', value)}
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue placeholder="Select material" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {materialTypes.map(type => (
                                                        <SelectItem key={type} value={type}>
                                                            {formatMaterialType(type)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label>Product Type *</Label>
                                            <Select 
                                                value={formData.product_type} 
                                                onValueChange={(value) => updateFormData('product_type', value)}
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue placeholder="Select product" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {productTypes.map(type => (
                                                        <SelectItem key={type} value={type}>
                                                            {formatProductType(type)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label>Size *</Label>
                                            <Input
                                                value={formData.size}
                                                onChange={(e) => updateFormData('size', e.target.value)}
                                                placeholder="e.g., 2x2x1/4, 4x8"
                                                className="mt-1"
                                            />
                                        </div>

                                        <div>
                                            <Label>Thickness/Gauge</Label>
                                            <Input
                                                value={formData.thickness_gauge}
                                                onChange={(e) => updateFormData('thickness_gauge', e.target.value)}
                                                placeholder="e.g., 1/8, 14ga"
                                                className="mt-1"
                                            />
                                        </div>

                                        <div>
                                            <Label>Standard Length (ft)</Label>
                                            <Input
                                                type="number"
                                                step="0.5"
                                                value={formData.standard_length}
                                                onChange={(e) => updateFormData('standard_length', e.target.value)}
                                                placeholder="20"
                                                className="mt-1"
                                            />
                                        </div>

                                        <div>
                                            <Label>Cost Per Unit *</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={formData.cost_per_unit}
                                                onChange={(e) => updateFormData('cost_per_unit', e.target.value)}
                                                placeholder="0.00"
                                                className="mt-1"
                                            />
                                        </div>

                                        <div>
                                            <Label>Unit Type</Label>
                                            <Select 
                                                value={formData.unit_type} 
                                                onValueChange={(value) => updateFormData('unit_type', value)}
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {unitTypes.map(type => (
                                                        <SelectItem key={type} value={type}>
                                                            {formatUnitType(type)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label>Supplier</Label>
                                            <Input
                                                value={formData.supplier}
                                                onChange={(e) => updateFormData('supplier', e.target.value)}
                                                placeholder="Supplier name"
                                                className="mt-1"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label>Notes</Label>
                                        <Textarea
                                            value={formData.notes}
                                            onChange={(e) => updateFormData('notes', e.target.value)}
                                            placeholder="Additional information..."
                                            className="mt-1 h-20"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t">
                                        <Button type="button" variant="outline" onClick={resetForm}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                            <Save className="w-4 h-4 mr-2" />
                                            {editingItem ? 'Update' : 'Add'} Item
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
