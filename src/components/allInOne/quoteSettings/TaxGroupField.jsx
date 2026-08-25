import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Tax group selector for the quote panel. Picking a group sets the estimate's
// tax_percent (the value the pricing waterfall multiplies the taxable base by).
// "Find by address" asks the AI to look up the local sales tax rate for the
// job site / company address and matches it to the closest configured group.
export default function TaxGroupField({ project, updateField }) {
  const { toast } = useToast();
  const [groups, setGroups] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    base44.entities.TaxGroup.list("sort_order", 200).then((r) => setGroups((r || []).filter((g) => g.is_active !== false)));
  }, []);

  const select = (name) => {
    const g = groups.find((x) => x.group_name === name);
    updateField("tax_group", name);
    if (g) updateField("tax_percent", g.tax_percent || 0);
  };

  const address = project.site_address || project.company_address || "";

  const findByAddress = async () => {
    if (!address) return toast({ title: "No address to search", description: "Add a site or company address first." });
    setBusy(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `What is the total combined sales tax rate (state + county + local) for this US address: "${address}"? ` +
          `Return the numeric percent and the state/county it applies to. ` +
          `Then choose the single closest match from this list of configured tax groups (or null if none is close): ` +
          JSON.stringify(groups.map((g) => ({ group_name: g.group_name, tax_percent: g.tax_percent }))),
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: {
          type: "object",
          properties: {
            tax_percent: { type: "number" },
            jurisdiction: { type: "string" },
            matched_group_name: { type: "string" },
            notes: { type: "string" },
          },
        },
      });
      const matched = groups.find((g) => g.group_name === res?.matched_group_name);
      if (matched) {
        select(matched.group_name);
        toast({ title: `Matched ${matched.group_name}`, description: `${matched.tax_percent}% applied.` });
      } else if (typeof res?.tax_percent === "number") {
        updateField("tax_group", res.jurisdiction || "AI lookup");
        updateField("tax_percent", res.tax_percent);
        toast({ title: `${res.tax_percent}% applied`, description: res.jurisdiction || res.notes || "From AI address lookup." });
      } else {
        toast({ title: "Couldn't determine a rate", description: "Pick a tax group manually." });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Tax Group</Label>
        <button type="button" onClick={findByAddress} disabled={busy}
          className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 disabled:opacity-50">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
          {busy ? "Searching…" : "Find by address"}
        </button>
      </div>
      <Select value={project.tax_group || ""} onValueChange={select}>
        <SelectTrigger className="h-8"><SelectValue placeholder="Select a tax group" /></SelectTrigger>
        <SelectContent>
          {groups.length === 0 && <div className="px-2 py-1.5 text-xs text-slate-400">No tax groups configured.</div>}
          {groups.map((g) => (
            <SelectItem key={g.id} value={g.group_name}>{g.group_name} — {g.tax_percent || 0}%</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-slate-400 mt-0.5">Applied tax rate: {project.tax_percent || 0}%</p>
    </div>
  );
}