import React, { useState } from "react";
import { QuickProductCategory } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

// Quick Product Categories manager — create categories (optionally as a
// subcategory of an existing one) per product group, and delete selected ones.
export default function QuickProductCategoriesDialog({ categories, onClose, onChanged }) {
  const [group, setGroup] = useState("my");
  const [name, setName] = useState("");
  const [isSub, setIsSub] = useState(false);
  const [parent, setParent] = useState("");
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);

  const groupCats = categories.filter((c) => (c.product_group || "my") === group);

  const addCategory = async () => {
    if (!name.trim()) return;
    setBusy(true);
    await QuickProductCategory.create({
      category_name: name.trim(),
      product_group: group,
      parent_category: isSub ? parent : "",
    });
    setName("");
    setIsSub(false);
    setParent("");
    setBusy(false);
    onChanged();
  };

  const deleteSelected = async () => {
    if (selected.length === 0) return;
    if (!confirm(`Delete ${selected.length} category(ies)?`)) return;
    setBusy(true);
    for (const id of selected) await QuickProductCategory.delete(id);
    setSelected([]);
    setBusy(false);
    onChanged();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto py-10">
      <div className="absolute inset-0 bg-slate-600/60" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl mx-4 p-6 shadow-2xl rounded-sm">
        <button onClick={onClose} className="absolute top-3 right-3 text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
        <h2 className="text-sm font-bold uppercase tracking-wider text-lime-600 mb-4">Quick Product Categories</h2>

        <p className="font-bold text-sm text-slate-800">Create Product Category</p>
        <p className="text-sm text-slate-700 mt-2 mb-1">1. Select Product Group</p>
        <div className="flex gap-2 mb-4">
          {[{ v: "my", l: "My Products" }, { v: "global", l: "Global Products" }].map((g) => (
            <button key={g.v} onClick={() => setGroup(g.v)}
              className={`px-4 py-1.5 text-xs font-bold rounded-sm ${group === g.v ? "bg-zinc-700 text-lime-400" : "bg-zinc-700 text-white"}`}>
              {g.l}
            </button>
          ))}
        </div>

        <p className="text-sm text-slate-700 mb-1">2. Add Category Name</p>
        <div className="flex items-center gap-2 mb-1">
          <Checkbox id="is-sub" checked={isSub} onCheckedChange={(v) => setIsSub(!!v)} />
          <Label htmlFor="is-sub" className="text-xs cursor-pointer">is a subcategory of</Label>
        </div>
        <div className="flex flex-wrap items-end gap-2 mb-4">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">Category Name</Label>
            <Input className="h-8 rounded-sm" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="w-52">
            <Select value={parent} onValueChange={setParent} disabled={!isSub}>
              <SelectTrigger className="h-8 rounded-sm"><SelectValue placeholder="Parent category" /></SelectTrigger>
              <SelectContent>
                {groupCats.filter((c) => !c.parent_category).map((c) => (
                  <SelectItem key={c.id} value={c.category_name}>{c.category_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" className="h-8 rounded-sm" onClick={addCategory} disabled={busy}>Add Category</Button>
        </div>

        <hr className="my-4" />

        <p className="font-bold text-sm text-slate-800 mb-2">Current Categories</p>
        <div className="max-h-72 overflow-y-auto space-y-1 mb-3">
          {groupCats.length === 0 && <p className="text-xs text-slate-500">No categories yet.</p>}
          {groupCats.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <Checkbox
                checked={selected.includes(c.id)}
                onCheckedChange={(v) => setSelected(v ? [...selected, c.id] : selected.filter((x) => x !== c.id))}
              />
              {c.parent_category ? <span className="pl-3 text-slate-600">↳ {c.category_name} <span className="text-xs text-slate-400">({c.parent_category})</span></span> : c.category_name}
            </label>
          ))}
        </div>
        <Button variant="outline" size="sm" className="h-8 rounded-sm" onClick={deleteSelected} disabled={busy || !selected.length}>
          Delete Selected
        </Button>

        <div className="flex justify-end mt-6">
          <Button size="sm" className="h-8 rounded-sm bg-zinc-700 hover:bg-zinc-800 text-white" onClick={onClose}>Finish &amp; Close</Button>
        </div>
      </div>
    </div>
  );
}