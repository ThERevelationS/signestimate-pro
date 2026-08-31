import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Radio, Search } from "lucide-react";
import { ESTIMATOR_MODULES, ESTIMATOR_MODULES_BY_KEY } from "./estimatorRegistry";
import { adjustedSectionTotal } from "./aioPricing";
import LinkedEstimateRow from "./LinkedEstimateRow";

// Build tab — module launcher cards + the live sections list with search,
// module filter, sorting, inline rename and duplicate. The inline estimator
// editor renders below via editorSlot so everything stays on ONE page.
export default function AllInOneBuildTab({
  project, addingKey, grandTotal, openSection,
  onAddSection, onToggleSection, onRemoveSection, onRenameSection, onDuplicateSection,
  onUpdateSection, editorSlot,
}) {
  const completedCount = project.line_items.filter((li) => li.section_status === "complete").length;
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("added");

  const visibleItems = useMemo(() => {
    let rows = project.line_items.map((item, idx) => ({ item, idx }));
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(({ item }) =>
        (item.project_name || "").toLowerCase().includes(q) ||
        (ESTIMATOR_MODULES_BY_KEY[item.module_key]?.shortName || "").toLowerCase().includes(q)
      );
    }
    if (moduleFilter !== "all") rows = rows.filter(({ item }) => item.module_key === moduleFilter);
    if (sortBy === "name") rows = [...rows].sort((a, b) => (a.item.project_name || "").localeCompare(b.item.project_name || ""));
    if (sortBy === "total") rows = [...rows].sort((a, b) => (Number(b.item.total_snapshot) || 0) - (Number(a.item.total_snapshot) || 0));
    return rows;
  }, [project.line_items, search, moduleFilter, sortBy]);

  const usedModules = [...new Set(project.line_items.map((li) => li.module_key))];

  return (
    <div className="space-y-6">
      {/* Module launcher — rendered from the registry, future estimators appear automatically */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-lg">Add a Section</CardTitle>
          <p className="text-sm text-slate-500">
            Each section loads that module's <b>full estimator right here on this page</b> — project
            info is auto-filled from the Project Details tab, so you never re-enter it.
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ESTIMATOR_MODULES.map((mod) => {
              const Icon = mod.icon;
              const count = project.line_items.filter((li) => li.module_key === mod.key).length;
              const adding = addingKey === mod.key;
              return (
                <button
                  key={mod.key}
                  onClick={() => onAddSection(mod)}
                  disabled={!!addingKey}
                  className={`${mod.colors.bg} rounded-xl p-3 flex flex-col gap-1.5 text-left border border-transparent hover:border-slate-300 hover:shadow-sm transition-all disabled:opacity-60`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${mod.colors.text} flex-shrink-0`} />
                    <span className="text-xs font-semibold text-slate-900 leading-tight">{mod.shortName}</span>
                    {count > 0 && (
                      <span className="ml-auto text-[10px] font-bold bg-white rounded-full px-1.5 py-0.5 text-slate-700">{count}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 leading-tight">{mod.description}</span>
                  <span className={`mt-auto inline-flex items-center text-xs font-medium ${mod.colors.text}`}>
                    {adding ? (
                      <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Creating section…</>
                    ) : (
                      <><Plus className="w-3 h-3 mr-1" /> Build Estimate</>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sections list */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="border-b border-slate-100 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg">Estimate Sections ({project.line_items.length})</CardTitle>
            {project.line_items.length > 0 && (
              <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 flex items-center gap-1.5">
                <Radio className="w-3 h-3" /> Live-synced with source estimators
              </span>
            )}
          </div>
          {project.line_items.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${(completedCount / project.line_items.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 flex-shrink-0">
                {completedCount}/{project.line_items.length} sections complete
              </span>
            </div>
          )}
          {project.line_items.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input className="pl-8 h-9" placeholder="Search sections…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All modules</SelectItem>
                  {usedModules.map((k) => (
                    <SelectItem key={k} value={k}>{ESTIMATOR_MODULES_BY_KEY[k]?.shortName || k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="added">Order added</SelectItem>
                  <SelectItem value="name">By name</SelectItem>
                  <SelectItem value="total">By total</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-4">
          {project.line_items.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              No sections yet — use the module cards above to start building this estimate.
            </p>
          ) : visibleItems.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No sections match your search.</p>
          ) : (
            <div className="space-y-2">
              {visibleItems.map(({ item, idx }) => (
                <LinkedEstimateRow
                  key={`${item.module_key}-${item.project_id}-${idx}`}
                  item={item}
                  isOpen={openSection?.project_id === item.project_id}
                  percent={grandTotal > 0 ? (adjustedSectionTotal(item) / grandTotal) * 100 : 0}
                  onEdit={() => onToggleSection(item)}
                  onRemove={() => onRemoveSection(idx)}
                  onRename={(name) => onRenameSection(idx, name)}
                  onDuplicate={() => onDuplicateSection(idx)}
                  onUpdate={(patch) => onUpdateSection(idx, patch)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {editorSlot}
    </div>
  );
}