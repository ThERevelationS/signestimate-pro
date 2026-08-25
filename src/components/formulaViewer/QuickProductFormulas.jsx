import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FormulaSection, FormulaLine } from "./FormulaSection";
import { priceQuickProduct } from "@/components/quickProducts/quickProductPricing";

// Quick Products pricing (mirrors components/quickProducts/quickProductPricing):
//   part line  = override ?? ((part_price + modifier_price) × part_qty)
//   parts tot  = Σ part lines
//   retail ea  = product override ?? (parts total + setup fee − discount)
//   total      = retail each × product quantity
export default function QuickProductFormulas() {
  const [product, setProduct] = useState({
    product_quantity: 1,
    setup_fee: 0,
    discount: 0,
    price_override: "",
    parts: [
      { part_label: "Channel Letters", part_qty: 1, part_price: 5603, modifier_price: 1503 },
      { part_label: "Layout and Production", part_qty: 1, part_price: 405, modifier_price: 0 },
      { part_label: "Installation - Bucket Truck", part_qty: 1, part_price: 0, modifier_price: 0 },
    ],
  });

  const set = (k, v) => setProduct((p) => ({ ...p, [k]: v }));
  const setPart = (i, k, v) => setProduct((p) => {
    const parts = [...p.parts];
    parts[i] = { ...parts[i], [k]: v };
    return { ...p, parts };
  });

  const r = priceQuickProduct(product);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h3 className="font-semibold text-slate-900 mb-4">Demo Values (Editable)</h3>
        <div className="space-y-3">
          {product.parts.map((part, i) => (
            <div key={i} className="border border-slate-200 rounded p-2 space-y-2">
              <Input value={part.part_label} onChange={(e) => setPart(i, "part_label", e.target.value)} />
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Qty</Label><Input type="number" value={part.part_qty} onChange={(e) => setPart(i, "part_qty", parseFloat(e.target.value) || 0)} /></div>
                <div><Label className="text-xs">Part $</Label><Input type="number" value={part.part_price} onChange={(e) => setPart(i, "part_price", parseFloat(e.target.value) || 0)} /></div>
                <div><Label className="text-xs">Modifier $</Label><Input type="number" value={part.modifier_price} onChange={(e) => setPart(i, "modifier_price", parseFloat(e.target.value) || 0)} /></div>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => set("parts", [...product.parts, { part_label: `Part ${product.parts.length + 1}`, part_qty: 1, part_price: 0, modifier_price: 0 }])}>
            Add Part
          </Button>
          <div className="grid grid-cols-3 gap-2">
            <div><Label className="text-xs">Product Qty</Label><Input type="number" value={product.product_quantity} onChange={(e) => set("product_quantity", parseFloat(e.target.value) || 0)} /></div>
            <div><Label className="text-xs">Setup Fee</Label><Input type="number" value={product.setup_fee} onChange={(e) => set("setup_fee", parseFloat(e.target.value) || 0)} /></div>
            <div><Label className="text-xs">Discount</Label><Input type="number" value={product.discount} onChange={(e) => set("discount", parseFloat(e.target.value) || 0)} /></div>
          </div>
          <div><Label className="text-xs">Product Price Override (blank = calculated)</Label><Input type="number" value={product.price_override} onChange={(e) => set("price_override", e.target.value)} /></div>
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-lg space-y-3">
        <h3 className="font-semibold text-slate-900">Live Calculations</h3>
        <FormulaSection title="Part Line Totals" color="blue">
          {product.parts.map((part, i) => (
            <FormulaLine
              key={i}
              label={part.part_label || `Part ${i + 1}`}
              formula={`($${(part.part_price || 0).toFixed(2)} + $${(part.modifier_price || 0).toFixed(2)}) × ${part.part_qty || 1}`}
              result={`$${r.partTotals[i].toFixed(2)}`}
            />
          ))}
        </FormulaSection>
        <FormulaSection title="Product Summary" color="green">
          <FormulaLine label="Parts Total" formula="Σ part line totals" result={`$${r.partsTotal.toFixed(2)}`} />
          <FormulaLine label="Product Setup Fee" result={`$${r.setupFee.toFixed(2)}`} />
          <FormulaLine label="Product Discount" result={`−$${r.discount.toFixed(2)}`} />
          <FormulaLine label="Product Retail (each)" formula="parts total + setup fee − discount" result={`$${r.retailEach.toFixed(2)}`} />
          <FormulaLine label="Extended Total" formula={`$${r.retailEach.toFixed(2)} × ${r.quantity}`} result={`$${r.total.toFixed(2)}`} />
        </FormulaSection>
      </div>
    </div>
  );
}