import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Type, Truck, Receipt, Info, Settings, Sparkles, ChevronDown, ArrowUp } from "lucide-react";
import LetterPurchaseRow from "./LetterPurchaseRow";
import AIScopeWriterModal from "./AIScopeWriterModal";
import { emptyLetterPurchase, LETTER_TYPE_LABELS } from "./lettersCalculator";

const fmt = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`;

const QUICK_ADD = [
  { type: "channel_raceway_mounted", label: "+ Raceway Mounted Letters", color: "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200" },
  { type: "channel_flush_mounted", label: "+ Flush Mounted Letters", color: "bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200" },
  { type: "channel_halo_lit", label: "+ Halo-Lit Letters", color: "bg-pink-50 hover:bg-pink-100 text-pink-700 border-pink-200" },
  { type: "capsule_logo_pillbox", label: "+ Capsule / Logo", color: "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200" },
  { type: "dimensional_letters", label: "+ Dimensional Letters", color: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200" },
];

export default function LettersPurchaseTab({ project, settings, onUpdateProject, incompleteDimensionalIds = [] }) {
  const purchases = project.letter_purchases || [];
  const [aiOpen, setAiOpen] = React.useState(false);
  const [feesOpen, setFeesOpen] = React.useState(false);
  const incompleteSet = React.useMemo(() => new Set(incompleteDimensionalIds || []), [incompleteDimensionalIds]);

  const addPurchase = (type) => {
    const p = emptyLetterPurchase(type);
    onUpdateProject({ letter_purchases: [...purchases, p] });
  };

  const applyAIPurchases = (aiPurchases, mode = "append") => {
    const newOnes = aiPurchases.map((ai) => {
      const base = emptyLetterPurchase(ai.letter_type || "channel_flush_mounted");
      return {
        ...base,
        description: ai.description || base.description,
        qty: parseFloat(ai.qty) || 0,
        size_value: parseFloat(ai.size_value) || 0,
        install_height_feet: parseFloat(ai.install_height_feet) || base.install_height_feet || 12,
        wall_material: ai.wall_material || base.wall_material || "eifs",
      };
    });
    onUpdateProject({
      letter_purchases: mode === "replace" ? newOnes : [...purchases, ...newOnes],
    });
  };

  const updatePurchase = (idx, next) => {
    const arr = [...purchases];
    arr[idx] = next;
    onUpdateProject({ letter_purchases: arr });
  };

  const removePurchase = (idx) => {
    const arr = [...purchases];
    arr.splice(idx, 1);
    onUpdateProject({ letter_purchases: arr });
  };

  const duplicatePurchase = (idx) => {
    const arr = [...purchases];
    const copy = JSON.parse(JSON.stringify(arr[idx]));
    copy.id = `lp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    arr.splice(idx + 1, 0, copy);
    onUpdateProject({ letter_purchases: arr });
  };

  const purchasesTotal = purchases.reduce((s, p) => s + (parseFloat(p.total_cost) || 0), 0);

  return (
    <div className="space-y-3">
      {/* Intro / quick-add */}
      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0">
              <Type className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">Letter Purchase</h3>
              <p className="text-xs text-slate-600">
                Build up the cost of the letters themselves (separate from installation labor).
                Each line auto-creates a matching item on the Installation tab.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setAiOpen(true)}
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI Scope Writer
              </Button>
              <Link to={createPageUrl("ChannelLetterInstallationSettings")}>
                <Button variant="outline" size="sm" className="bg-white">
                  <Settings className="w-3.5 h-3.5 mr-1.5" /> Letter Pricing
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {QUICK_ADD.map(qa => (
              <button
                key={qa.type}
                onClick={() => addPurchase(qa.type)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${qa.color}`}
              >
                {qa.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Purchase rows */}
      {purchases.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-300 bg-white/50">
          <CardContent className="p-10 text-center text-slate-500">
            <div className="flex items-end justify-center gap-2 mb-3 h-12 text-purple-500">
              <ArrowUp className="w-6 h-6 animate-bounce" style={{ animationDelay: "0ms" }} />
              <ArrowUp className="w-7 h-7 animate-bounce" style={{ animationDelay: "120ms" }} />
              <ArrowUp className="w-8 h-8 animate-bounce" style={{ animationDelay: "240ms" }} />
              <ArrowUp className="w-7 h-7 animate-bounce" style={{ animationDelay: "120ms" }} />
              <ArrowUp className="w-6 h-6 animate-bounce" style={{ animationDelay: "0ms" }} />
            </div>
            <p className="mb-1 font-semibold text-slate-700">Add Product</p>
            <p className="text-xs">Use the quick-add buttons above to choose a letter type.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {purchases.map((p, idx) => (
            <LetterPurchaseRow
              key={p.id || idx}
              index={idx}
              purchase={p}
              settings={settings}
              onUpdate={(next) => updatePurchase(idx, next)}
              onRemove={() => removePurchase(idx)}
              onDuplicate={() => duplicatePurchase(idx)}
              fabHighlight={incompleteSet.has(p.id)}
            />
          ))}
        </div>
      )}

      {/* Project-level fees — Advanced Settings */}
      <Card className="bg-white border-0 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setFeesOpen(o => !o)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-500" />
            <span className="text-base font-semibold text-slate-900">Advanced Settings — Project Fees</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${feesOpen ? "rotate-180" : ""}`} />
        </button>
        {feesOpen && (
          <CardContent className="border-t border-slate-100 pt-4">
            <div className="mb-4 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-900">
                These fees are prefilled based on the defaults configured by your admin in the
                {" "}<Link to={createPageUrl("ChannelLetterInstallationSettings")} className="font-semibold underline">Settings page</Link>.
                Override them here for this estimate only.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <FeeInput
                icon={Truck}
                label="Delivery / Shipping"
                value={project.letters_delivery_fee}
                onChange={(v) => onUpdateProject({ letters_delivery_fee: v })}
              />
              <FeeInput
                icon={Receipt}
                label="Other"
                value={project.letters_other_fee}
                onChange={(v) => onUpdateProject({ letters_other_fee: v })}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Rollup */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0">
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-300">Letters Subtotal</span>
            <span className="tabular-nums font-medium">{fmt(purchasesTotal)}</span>
          </div>
          {(parseFloat(project.letters_delivery_fee) || 0) > 0 && (
            <RollupRow label="Delivery / Shipping" value={project.letters_delivery_fee} />
          )}
          {(parseFloat(project.letters_other_fee) || 0) > 0 && (
            <RollupRow label="Other" value={project.letters_other_fee} />
          )}
          <div className="border-t border-white/20 pt-2 flex justify-between">
            <span className="text-slate-300 text-sm">Subtotal w/ Fees</span>
            <span className="tabular-nums font-medium">{fmt(project.letters_subtotal)}</span>
          </div>
          {(parseFloat(project.letters_markup_percent) || 0) > 0 && (
            <div className="flex justify-between text-xs text-slate-400">
              <span>Markup ({parseFloat(project.letters_markup_percent).toFixed(1)}%)</span>
              <span className="tabular-nums">
                {fmt((project.total_letters_cost || 0) - (project.letters_subtotal || 0))}
              </span>
            </div>
          )}
          <div className="border-t-2 border-white/30 pt-2 flex justify-between items-center">
            <span className="text-lg font-bold">Total Letters Cost</span>
            <span className="text-2xl font-bold tabular-nums">{fmt(project.total_letters_cost)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="text-[11px] text-slate-500 flex items-start gap-1.5 px-1">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>
          Letter pricing pulls from your Channel Letter Settings page. Click "Letter Pricing" above to adjust.
          The total above is added to the project Grand Total on the Summary tab.
        </span>
      </div>

      <AIScopeWriterModal open={aiOpen} onClose={() => setAiOpen(false)} onApply={applyAIPurchases} />
    </div>
  );
}

const FeeInput = ({ icon: Icon, label, value, onChange }) => (
  <div>
    <Label className="text-xs flex items-center gap-1">
      <Icon className="w-3 h-3 text-slate-500" />
      {label}
    </Label>
    <div className="relative mt-1">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
      <Input
        type="number"
        min="0"
        step="0.01"
        value={value ?? 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="h-9 pl-6"
      />
    </div>
  </div>
);

const RollupRow = ({ label, value }) => (
  <div className="flex justify-between text-xs text-slate-400">
    <span>{label}</span>
    <span className="tabular-nums">{`$${(parseFloat(value) || 0).toFixed(2)}`}</span>
  </div>
);