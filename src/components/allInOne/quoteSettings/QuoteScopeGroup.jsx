import React from "react";
import { Button } from "@/components/ui/button";
import { ListChecks, Sparkles } from "lucide-react";
import { SettingsGroup, ToggleRow } from "./quoteSettingsUi";
import ScopePicker from "./ScopePicker";
import { applyAutoScopes, autoScopeMatches } from "./autoScopes";
import { useToast } from "@/components/ui/use-toast";

// Scope lists: library dropdowns + auto-scope control.
export default function QuoteScopeGroup({ project, updateField, library }) {
  const { toast } = useToast();
  const autoCount =
    autoScopeMatches(project, library, "inclusion").length + autoScopeMatches(project, library, "exclusion").length;

  const runAuto = () => {
    const { patch, addedCount } = applyAutoScopes(project, library);
    Object.entries(patch).forEach(([k, v]) => updateField(k, v));
    toast({
      title: addedCount ? `${addedCount} scope line${addedCount === 1 ? "" : "s"} added` : "Nothing to add",
      description: addedCount ? "Auto-scope lines matched to this estimate's products." : "All matching auto-scope lines are already on this quote.",
    });
  };

  return (
    <SettingsGroup title="Scope of Work" icon={ListChecks} count={autoCount ? `${autoCount} auto` : undefined} defaultOpen>
      <ToggleRow
        label="Auto-add scope lines"
        hint="Adds library lines as matching products are added"
        checked={project.scope_auto_apply !== false}
        onChange={(v) => updateField("scope_auto_apply", v)}
      />
      <ToggleRow
        label="Show scope lists on quote"
        checked={project.show_scope_lists !== false}
        onChange={(v) => updateField("show_scope_lists", v)}
      />
      <Button type="button" variant="outline" size="sm" className="h-7 w-full text-xs" onClick={runAuto}>
        <Sparkles className="w-3 h-3 mr-1.5 text-amber-500" /> Apply auto scopes now
      </Button>

      <ScopePicker
        label="Included in Scope"
        kind="inclusion"
        project={project}
        library={library}
        value={project.scope_inclusions}
        onChange={(v) => updateField("scope_inclusions", v)}
      />
      <ScopePicker
        label="Excluded from Scope"
        kind="exclusion"
        project={project}
        library={library}
        value={project.scope_exclusions}
        onChange={(v) => updateField("scope_exclusions", v)}
      />
    </SettingsGroup>
  );
}