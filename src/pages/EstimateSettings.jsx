import React, { useEffect, useState } from "react";
import { EstimateOption, TaxGroup } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Settings2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import OptionListEditor from "@/components/estimateDetails/OptionListEditor";

// Admin control panel for every dropdown used in Step 1: Estimate Details and
// the customer dialogs. Non-admins can view the lists but not change them.
const LISTS = [
  { type: "salesperson", title: "Salespeople", withEmail: true, description: "Selectable in the Salesperson dropdown." },
  { type: "sales_center", title: "Sales Centers / Locations", description: "Selectable as Sales Center on an estimate and Location on a customer." },
  { type: "terms", title: "Payment Terms", description: "e.g. Net 30, 50% deposit / balance on completion." },
  { type: "customer_origination", title: "Customer Origination", description: "How the customer found you." },
  { type: "industry_type", title: "Industry Types" },
  { type: "contact_status", title: "Contact Statuses" },
  { type: "job_authority", title: "Job Authority Levels" },
  { type: "master_account", title: "Master Accounts" },
  { type: "phone_type", title: "Phone Types", description: "Used by the additional phone selector." },
];

export default function EstimateSettings() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin";
  const [options, setOptions] = useState([]);
  const [taxGroups, setTaxGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTax, setNewTax] = useState({ group_name: "", tax_percent: 0 });

  const load = async () => {
    const [opts, taxes] = await Promise.all([
      EstimateOption.list("sort_order", 500),
      TaxGroup.list("sort_order", 200),
    ]);
    setOptions(opts || []);
    setTaxGroups(taxes || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addTax = async () => {
    if (!newTax.group_name.trim()) return;
    await TaxGroup.create({ ...newTax, sort_order: taxGroups.length });
    setNewTax({ group_name: "", tax_percent: 0 });
    load();
  };

  const removeTax = async (t) => {
    if (!confirm(`Delete tax group "${t.group_name}"?`)) return;
    await TaxGroup.delete(t.id);
    load();
  };

  if (loading) return <div className="p-8 text-slate-600">Loading settings…</div>;

  return (
    <div className="p-4 md:p-6 bg-slate-100 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="bg-white border border-slate-300 rounded-sm px-4 py-3">
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-lime-600" /> Estimate Settings
          </h1>
          <p className="text-xs text-slate-500">
            Controls every dropdown on Step 1: Estimate Details and the customer dialogs.
            {!canEdit && " You have view-only access — ask an admin to change these lists."}
          </p>
        </div>

        {/* Tax groups */}
        <div className="bg-white border border-slate-300 rounded-sm p-4">
          <p className="text-sm font-bold text-slate-800">Tax Groups</p>
          <p className="text-xs text-slate-500 mb-2">Selecting a tax group on an estimate sets its sales tax %, which the pricing waterfall applies to the taxable base.</p>
          {canEdit && (
            <div className="flex flex-wrap items-end gap-2 mb-3">
              <Input className="h-8 rounded-sm w-72" placeholder="e.g. Ohio - Hamilton County"
                value={newTax.group_name} onChange={(e) => setNewTax({ ...newTax, group_name: e.target.value })} />
              <Input type="number" step="0.01" className="h-8 rounded-sm w-24" placeholder="%"
                value={newTax.tax_percent} onChange={(e) => setNewTax({ ...newTax, tax_percent: parseFloat(e.target.value) || 0 })} />
              <Button size="sm" className="h-8 rounded-sm bg-zinc-700 hover:bg-zinc-800 text-white" onClick={addTax}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Tax Group
              </Button>
            </div>
          )}
          <div className="divide-y divide-slate-100">
            {taxGroups.length === 0 && <p className="text-xs text-slate-500 py-2">No tax groups yet.</p>}
            {taxGroups.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-1.5 text-sm">
                <span className={`flex-1 ${t.is_active === false ? "text-slate-400 line-through" : "text-slate-800"}`}>
                  {t.group_name} <span className="text-slate-500">({t.tax_percent}%)</span>
                </span>
                {canEdit && (
                  <>
                    <Switch checked={t.is_active !== false} onCheckedChange={(v) => TaxGroup.update(t.id, { is_active: v }).then(load)} />
                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-red-500 hover:bg-red-50" onClick={() => removeTax(t)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {LISTS.map((l) => (
            <OptionListEditor
              key={l.type}
              title={l.title}
              description={l.description}
              optionType={l.type}
              withEmail={l.withEmail}
              canEdit={canEdit}
              rows={options.filter((o) => o.option_type === l.type)}
              onChanged={load}
            />
          ))}
        </div>
      </div>
    </div>
  );
}