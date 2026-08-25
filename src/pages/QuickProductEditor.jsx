import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QuickProduct, QuickProductCategory } from "@/entities/all";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowLeft, Save } from "lucide-react";
import { fmtCurrency } from "@/lib/formatters";
import QuickProductPartRow from "@/components/quickProducts/QuickProductPartRow";
import { priceQuickProduct } from "@/components/quickProducts/quickProductPricing";

const EMPTY = {
  product_name: "",
  product_group: "my",
  categories: [],
  product_quantity: 1,
  is_vended: false,
  is_active: true,
  setup_fee: 0,
  discount: 0,
  price_override: null,
  product_notes: "",
  parts: [],
};

const newPart = (i) => ({
  part_label: `Part ${i}`,
  part_name: "",
  part_type: "fabrication",
  part_qty: 1,
  modifiers: [],
  part_price: 0,
  modifier_price: 0,
  price_override: null,
});

export default function QuickProductEditor() {
  const navigate = useNavigate();
  const productId = new URLSearchParams(window.location.search).get("id");
  const [product, setProduct] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [selectedParts, setSelectedParts] = useState([]);
  const [showNotes, setShowNotes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const cats = await QuickProductCategory.list("category_name", 500);
      setCategories(cats || []);
      if (productId) {
        const p = await QuickProduct.get(productId);
        setProduct({ ...EMPTY, ...p });
      }
      setLoading(false);
    })();
  }, [productId]);

  const set = (k, v) => setProduct((p) => ({ ...p, [k]: v }));
  const pricing = useMemo(() => priceQuickProduct(product), [product]);

  const updatePart = (i, updated) => {
    const parts = [...(product.parts || [])];
    parts[i] = updated;
    set("parts", parts);
  };

  const addPart = () => set("parts", [...(product.parts || []), newPart((product.parts || []).length + 1)]);

  const clonePart = (i) => {
    const parts = [...(product.parts || [])];
    parts.splice(i + 1, 0, { ...parts[i], part_label: `${parts[i].part_label || "Part"} (copy)` });
    set("parts", parts);
  };

  const removePart = (i) => set("parts", (product.parts || []).filter((_, x) => x !== i));

  const groupSelected = () => {
    if (selectedParts.length < 2) {
      alert("Select at least two parts to group.");
      return;
    }
    const parts = product.parts || [];
    const picked = selectedParts.map((i) => parts[i]).filter(Boolean);
    const grouped = {
      ...newPart(1),
      part_label: "Grouped Parts",
      part_name: picked.map((p) => p.part_label || p.part_name).join(" + "),
      part_price: picked.reduce((s, p) => s + (parseFloat(p.part_price) || 0), 0),
      modifier_price: picked.reduce((s, p) => s + (parseFloat(p.modifier_price) || 0), 0),
    };
    const remaining = parts.filter((_, i) => !selectedParts.includes(i));
    set("parts", [...remaining, grouped]);
    setSelectedParts([]);
  };

  const save = async () => {
    if (!product.product_name.trim()) {
      alert("Product name is required.");
      return;
    }
    setSaving(true);
    const payload = { ...product, total_price: pricing.total };
    delete payload.id; delete payload.created_date; delete payload.updated_date; delete payload.created_by_id; delete payload.created_by;
    if (productId) await QuickProduct.update(productId, payload);
    else await QuickProduct.create(payload);
    setSaving(false);
    navigate(createPageUrl("QuickProducts"));
  };

  if (loading) return <div className="p-8 text-slate-600">Loading product…</div>;

  return (
    <div className="bg-slate-200 min-h-screen py-4">
      <div className="max-w-5xl mx-auto bg-slate-100 border border-slate-300 shadow-sm">
        {/* Title bar */}
        <div className="flex items-center justify-between bg-white border-b border-slate-300 px-3 py-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => navigate(createPageUrl("QuickProducts"))}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold text-slate-800">{product.product_name || "New Quick Product"}</span>
          </div>
          <Button size="sm" className="h-7 rounded-sm bg-white border border-amber-400 text-amber-700 hover:bg-amber-50"
            onClick={save} disabled={saving}>
            <Save className="w-3.5 h-3.5 mr-1" /> {saving ? "Saving…" : "Save Quick Product"}
          </Button>
        </div>

        {/* Product header fields */}
        <div className="p-3 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs w-28 text-right">Product Name:</Label>
                <Input className="h-7 rounded-sm bg-white text-xs flex-1" value={product.product_name}
                  onChange={(e) => set("product_name", e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 rounded-sm text-xs bg-zinc-700 text-white hover:bg-zinc-600 border-zinc-700"
                  onClick={groupSelected}>
                  Group Selected Parts
                </Button>
                <Button variant="outline" size="sm" className="h-7 rounded-sm text-xs bg-zinc-700 text-white hover:bg-zinc-600 border-zinc-700"
                  onClick={() => setShowNotes(!showNotes)}>
                  Manage Product Notes
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs w-32 text-right">Product Quantity:</Label>
                <Input type="number" className="h-7 rounded-sm bg-white text-xs w-20" value={product.product_quantity}
                  onChange={(e) => set("product_quantity", parseFloat(e.target.value) || 0)} />
                <Checkbox id="vended" checked={!!product.is_vended} onCheckedChange={(v) => set("is_vended", !!v)} />
                <Label htmlFor="vended" className="text-xs cursor-pointer">Is Vended</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs w-32 text-right">Product Category:</Label>
                <Select
                  value={(product.categories || [])[0] || ""}
                  onValueChange={(v) => set("categories", [v])}
                >
                  <SelectTrigger className="h-7 rounded-sm bg-white text-xs flex-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.category_name}>{c.category_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs w-32 text-right">Product Group:</Label>
                <Select value={product.product_group || "my"} onValueChange={(v) => set("product_group", v)}>
                  <SelectTrigger className="h-7 rounded-sm bg-white text-xs w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="my">My Products</SelectItem>
                    <SelectItem value="global">Global Products</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {showNotes && (
            <div>
              <Label className="text-xs">Product Notes</Label>
              <Textarea className="bg-white text-xs" rows={3} value={product.product_notes || ""}
                onChange={(e) => set("product_notes", e.target.value)} />
            </div>
          )}

          {/* Parts */}
          <div>
            {(product.parts || []).map((part, i) => (
              <QuickProductPartRow
                key={i}
                part={part}
                index={i}
                selected={selectedParts.includes(i)}
                onToggleSelect={(v) => setSelectedParts(v ? [...selectedParts, i] : selectedParts.filter((x) => x !== i))}
                onChange={(updated) => updatePart(i, updated)}
                onClone={() => clonePart(i)}
                onRemove={() => removePart(i)}
              />
            ))}
            {(product.parts || []).length === 0 && (
              <p className="text-xs text-slate-500 py-4">No parts yet — add the first part to start pricing this product.</p>
            )}
          </div>

          {/* Footer: add part + product summary */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <Button size="sm" className="h-8 rounded-sm bg-zinc-700 hover:bg-zinc-800 text-white" onClick={addPart}>
              <Plus className="w-4 h-4 mr-1" /> Add Part
            </Button>
            <div className="bg-white border border-slate-300 rounded-sm p-3 text-xs min-w-[320px]">
              <p className="font-bold text-slate-700 mb-1">Product Summary</p>
              <div className="flex justify-between py-0.5"><span>Parts Total:</span><span>{fmtCurrency(pricing.partsTotal)}</span></div>
              <div className="flex items-center justify-between py-0.5">
                <span>Product Setup Fee:</span>
                <Input type="number" step="0.01" className="h-6 rounded-sm w-24 text-xs text-right" value={product.setup_fee ?? 0}
                  onChange={(e) => set("setup_fee", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span>Product Discount:</span>
                <Input type="number" step="0.01" className="h-6 rounded-sm w-24 text-xs text-right" value={product.discount ?? 0}
                  onChange={(e) => set("discount", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span>Override Retail:</span>
                <Input type="number" step="0.01" placeholder="calc" className="h-6 rounded-sm w-24 text-xs text-right"
                  value={product.price_override ?? ""}
                  onChange={(e) => set("price_override", e.target.value === "" ? null : parseFloat(e.target.value) || 0)} />
              </div>
              <div className="flex justify-between border-t border-slate-300 mt-1 pt-1 font-bold text-slate-900">
                <span>Product Retail Price:</span>
                <span>{fmtCurrency(pricing.total)} <span className="font-normal text-slate-500">({fmtCurrency(pricing.retailEach)} ea)</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}