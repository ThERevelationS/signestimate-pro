import React, { useState, useEffect, useCallback, useMemo } from "react";
import { User } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Search, Boxes, Lock } from "lucide-react";

import { INVENTORY_SOURCES, SOURCE_BY_KEY } from "@/components/masterInventory/inventorySources";
import InventoryFormModal from "@/components/masterInventory/InventoryFormModal";
import InventoryTable from "@/components/masterInventory/InventoryTable";
import MasterEquipmentTab from "@/components/masterInventory/MasterEquipmentTab";
import MasterSuppliesTab from "@/components/masterInventory/MasterSuppliesTab";
import VinylInventoryTab from "@/components/vinylInventory/VinylInventoryTab";

export default function MasterInventory() {
  const [user, setUser] = useState(null);
  const [activeKey, setActiveKey] = useState(INVENTORY_SOURCES[0].key);
  const [itemsBySource, setItemsBySource] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const activeSource = SOURCE_BY_KEY[activeKey];
  const isAdmin = user?.role === "admin";
  const isCustomTab = !!activeSource?.custom;

  // Load current user once
  useEffect(() => {
    User.me().then(setUser).catch(() => setUser(null));
  }, []);

  // Load items for the active declarative source (skip for custom tabs)
  const loadActive = useCallback(async () => {
    if (!activeSource || isCustomTab) return;
    setIsLoading(true);
    try {
      const items = await activeSource.entity.list();
      setItemsBySource((prev) => ({ ...prev, [activeKey]: items }));
    } catch (err) {
      console.error("Failed to load inventory:", err);
      setItemsBySource((prev) => ({ ...prev, [activeKey]: [] }));
    }
    setIsLoading(false);
  }, [activeKey, activeSource, isCustomTab]);

  useEffect(() => {
    loadActive();
  }, [loadActive]);

  const items = itemsBySource[activeKey] || [];

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((it) =>
      Object.values(it).some(
        (v) => v !== null && v !== undefined && String(v).toLowerCase().includes(q)
      )
    );
  }, [items, search]);

  const handleEdit = (item) => {
    if (!isAdmin) return;
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = async (item) => {
    if (!isAdmin) return;
    const label = item[activeSource.nameField] || "this item";
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    try {
      await activeSource.entity.delete(item.id);
      await loadActive();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete item.");
    }
  };

  const handleAdd = () => {
    if (!isAdmin) return;
    setEditingItem(null);
    setShowForm(true);
  };

  const handleSaved = async () => {
    setShowForm(false);
    setEditingItem(null);
    await loadActive();
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Boxes className="w-8 h-8 text-slate-700" />
              Master Inventory
            </h1>
            <p className="text-slate-600 mt-1">
              Unified view of every inventory item.{" "}
              {isAdmin ? (
                <span className="text-green-700 font-medium">You can add, edit, and delete items.</span>
              ) : (
                <span className="text-slate-500 inline-flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> View only — only admins can make changes.
                </span>
              )}
            </p>
          </div>
          {isAdmin && !isCustomTab && (
            <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          )}
        </div>

        {/* Source tabs */}
        <Tabs value={activeKey} onValueChange={setActiveKey}>
          <div className="bg-white rounded-xl shadow-sm border p-2 mb-4 overflow-x-auto">
            <TabsList className="bg-transparent gap-1 flex-wrap h-auto">
              {INVENTORY_SOURCES.map((s) => {
                const Icon = s.icon;
                return (
                  <TabsTrigger
                    key={s.key}
                    value={s.key}
                    className="data-[state=active]:bg-slate-900 data-[state=active]:text-white gap-2"
                  >
                    <Icon className={`w-4 h-4 ${activeKey === s.key ? "text-white" : s.color}`} />
                    <span>{s.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {INVENTORY_SOURCES.map((s) => (
            <TabsContent key={s.key} value={s.key} className="mt-0">
              {/* Custom tabs own their own card / search / counts */}
              {s.custom === "equipment" && <MasterEquipmentTab isAdmin={isAdmin} />}
              {s.custom === "supplies"  && <MasterSuppliesTab isAdmin={isAdmin} />}
              {s.custom === "vinyl"     && <VinylInventoryTab scope="master" />}

              {/* Declarative tabs */}
              {!s.custom && (
                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader className="border-b">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <CardTitle className="flex items-center gap-2">
                        <s.icon className={`w-5 h-5 ${s.color}`} />
                        {s.label}
                        <Badge variant="outline" className="ml-2 font-normal">
                          {filteredItems.length} of {items.length}
                        </Badge>
                      </CardTitle>
                      <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          placeholder="Search items..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {isLoading ? (
                      <div className="p-12 text-center text-slate-500">Loading…</div>
                    ) : (
                      <InventoryTable
                        source={s}
                        items={filteredItems}
                        canEdit={isAdmin}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onInlineToggle={(itemId, fieldName, next) => {
                          setItemsBySource((prev) => {
                            const list = (prev[activeKey] || []).map((it) =>
                              it.id === itemId ? { ...it, [fieldName]: next } : it
                            );
                            return { ...prev, [activeKey]: list };
                          });
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {showForm && activeSource && !isCustomTab && (
        <InventoryFormModal
          source={activeSource}
          editingItem={editingItem}
          onCancel={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}