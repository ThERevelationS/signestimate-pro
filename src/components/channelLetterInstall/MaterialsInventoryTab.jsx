import React, { useState, useEffect, useMemo } from "react";
import { ChannelLetterInstallInventory } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Save, Search, Package2, X } from "lucide-react";
import MaterialItemCard from "./MaterialItemCard";
import { CATEGORIES, CATEGORY_MAP, emptyMaterialItem } from "./materialsConstants";

const APPLIES_TO_FILTER = [
  { value: "all", label: "All Types" },
  { value: "flush_mount", label: "Flush Mount" },
  { value: "halo_lit", label: "Halo-Lit" },
  { value: "raceway", label: "Raceway" },
  { value: "dimensional_lettering", label: "Dimensional Lettering" },
];

export default function MaterialsInventoryTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [appliesFilter, setAppliesFilter] = useState("all");
  const [dirtyIds, setDirtyIds] = useState(new Set()); // indices that have unsaved changes

  const load = async () => {
    setLoading(true);
    const data = await ChannelLetterInstallInventory.list("sort_order");
    setItems(data);
    setDirtyIds(new Set());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markDirty = (i) => {
    setDirtyIds(prev => {
      const next = new Set(prev);
      next.add(i);
      return next;
    });
  };

  const update = (i, patch) => {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    setItems(next);
    markDirty(i);
  };

  const addItem = () => {
    const next = [...items, { ...emptyMaterialItem(), _new: true, _localKey: Date.now() }];
    setItems(next);
    markDirty(next.length - 1);
  };

  const removeItem = async (i) => {
    const item = items[i];
    if (item.id) {
      if (!confirm(`Delete "${item.item_name || "this item"}"?`)) return;
      await ChannelLetterInstallInventory.delete(item.id);
    }
    const next = [...items];
    next.splice(i, 1);
    setItems(next);
    // re-index dirty set
    const newDirty = new Set();
    dirtyIds.forEach(idx => {
      if (idx < i) newDirty.add(idx);
      else if (idx > i) newDirty.add(idx - 1);
    });
    setDirtyIds(newDirty);
  };

  const saveAll = async () => {
    setSaving(true);
    for (const it of items) {
      const { _new, _localKey, id, ...payload } = it;
      if (id) await ChannelLetterInstallInventory.update(id, payload);
      else await ChannelLetterInstallInventory.create(payload);
    }
    await load();
    setSaving(false);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .map((it, idx) => ({ it, idx }))
      .filter(({ it }) => {
        if (categoryFilter !== "all" && it.category !== categoryFilter) return false;
        if (appliesFilter !== "all") {
          const list = Array.isArray(it.applies_to_list) && it.applies_to_list.length > 0
            ? it.applies_to_list
            : (it.applies_to && it.applies_to !== "all" ? [it.applies_to] : []);
          // If list is empty, item applies to all types — so it should match any filter
          if (list.length > 0 && !list.includes(appliesFilter)) return false;
        }
        if (q) {
          const haystack = `${it.item_name || ""} ${it.supplier || ""} ${it.notes || ""}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      });
  }, [items, search, categoryFilter, appliesFilter]);

  // Group by category for display
  const grouped = useMemo(() => {
    const map = new Map();
    for (const { it, idx } of filtered) {
      const key = it.category || "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ it, idx });
    }
    // preserve CATEGORIES order
    return CATEGORIES
      .map(c => ({ category: c, rows: map.get(c.value) || [] }))
      .filter(g => g.rows.length > 0);
  }, [filtered]);

  const hasFilters = search || categoryFilter !== "all" || appliesFilter !== "all";
  const clearFilters = () => { setSearch(""); setCategoryFilter("all"); setAppliesFilter("all"); };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-purple-600 rounded-full animate-spin mr-3" />
        Loading materials...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, supplier, or notes..."
              className="pl-9 h-10"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-10 w-[200px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={appliesFilter} onValueChange={setAppliesFilter}>
            <SelectTrigger className="h-10 w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              {APPLIES_TO_FILTER.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500">
              <X className="w-3.5 h-3.5 mr-1" /> Clear
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button onClick={addItem} variant="outline" className="h-10">
              <Plus className="w-4 h-4 mr-1" /> Add Material
            </Button>
            <Button
              onClick={saveAll}
              disabled={saving || dirtyIds.size === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white h-10"
            >
              <Save className="w-4 h-4 mr-1" />
              {saving ? "Saving..." : dirtyIds.size > 0 ? `Save ${dirtyIds.size} Change${dirtyIds.size !== 1 ? "s" : ""}` : "Saved"}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
          <span><strong className="text-slate-700">{items.length}</strong> total materials</span>
          {hasFilters && (
            <span>
              · Showing <strong className="text-slate-700">{filtered.length}</strong> filtered
            </span>
          )}
          {dirtyIds.size > 0 && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
              {dirtyIds.size} unsaved
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl py-16 text-center">
          <Package2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700 mb-1">No materials yet</h3>
          <p className="text-sm text-slate-500 mb-4">
            Add your first material to start building your installation inventory.
          </p>
          <Button onClick={addItem} className="bg-purple-600 hover:bg-purple-700 text-white">
            <Plus className="w-4 h-4 mr-1" /> Add Your First Material
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-12 text-center">
          <p className="text-slate-500 mb-3">No materials match your filters.</p>
          <Button variant="outline" onClick={clearFilters}>
            <X className="w-3.5 h-3.5 mr-1" /> Clear Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ category, rows }) => (
            <div key={category.value}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <Badge variant="outline" className={`${category.color} text-xs`}>
                  {category.label}
                </Badge>
                <span className="text-xs text-slate-400">
                  {rows.length} item{rows.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-2">
                {rows.map(({ it, idx }) => (
                  <MaterialItemCard
                    key={it.id || it._localKey || idx}
                    item={it}
                    isDirty={dirtyIds.has(idx)}
                    isNew={!!it._new}
                    defaultExpanded={!!it._new}
                    onChange={(patch) => update(idx, patch)}
                    onRemove={() => removeItem(idx)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}