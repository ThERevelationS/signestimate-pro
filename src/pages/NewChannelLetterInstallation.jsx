import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ChannelLetterInstallation, Settings, ChannelLetterInstallInventory, ChannelLetterInstallEquipment } from "@/entities/all";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, ArrowLeft, Wrench, Package, FileText, ListChecks, Boxes, Calculator, MapPin, Copy, DollarSign, Check, HardHat } from "lucide-react";
import { useUnsavedChanges } from "@/components/UnsavedChangesContext";
import ClientSearchInput from "@/components/ClientSearchInput";
import InstallLineItem from "@/components/channelLetterInstall/InstallLineItem";
import InstallSummaryCard from "@/components/channelLetterInstall/InstallSummaryCard";
import ItemsList from "@/components/channelLetterInstall/ItemsList";
import CrewEquipmentHint from "@/components/channelLetterInstall/CrewEquipmentHint";
import ValidationWarnings from "@/components/channelLetterInstall/ValidationWarnings";
import EquipmentSelector from "@/components/channelLetterInstall/EquipmentSelector";
import PersonnelSelector from "@/components/channelLetterInstall/PersonnelSelector";
import {
  calcLineItem,
  calcProjectTotals,
  defaultMaterialsForItem,
  emptyLineItem,
} from "@/components/channelLetterInstall/installCalculator";
import { buildSummaryText, downloadCSV } from "@/components/channelLetterInstall/installExport";

const fmt = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`;

const blankProject = () => ({
  project_name: "",
  client_name: "",
  estimate_number: "",
  hyperlink: "",
  site_address: "",
  items: [],
  selected_equipment: [],
  personnel: [],
  base_supplies_cost: 0,
  extra_supplies_cost: 0,
  markup_percent: 0,
  notes: "",
});

export default function NewChannelLetterInstallation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const [isEditing, setIsEditing] = useState(false);
  const { setIsDirty } = useUnsavedChanges();

  const [project, setProject] = useState(blankProject());
  const [settings, setSettings] = useState({});
  const [inventory, setInventory] = useState([]);
  const [equipmentInventory, setEquipmentInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("project");

  useEffect(() => { if (!isLoading) setHasLoaded(true); }, [isLoading]);
  useEffect(() => { if (hasLoaded) setIsDirty(true); }, [project, hasLoaded, setIsDirty]);

  // Load settings + inventory + (maybe) existing project
  const loadEverything = useCallback(async () => {
    try {
      const [settingsList, inv, equipInv] = await Promise.all([
        Settings.list(),
        ChannelLetterInstallInventory.list("sort_order"),
        ChannelLetterInstallEquipment.list("sort_order"),
      ]);
      const settingsObj = {};
      settingsList.forEach(s => { settingsObj[s.setting_name] = s.setting_value; });
      setSettings(settingsObj);
      setInventory(inv);
      setEquipmentInventory(equipInv);

      if (editId) {
        const existing = await ChannelLetterInstallation.get(editId);
        if (existing) {
          if ((!existing.items || existing.items.length === 0) && existing.installation_type) {
            existing.items = [{
              description: "",
              installation_type: existing.installation_type,
              qty_letters: existing.qty_letters || 0,
              letter_size: existing.letter_size || "medium",
              letter_height_inches: existing.letter_height_inches || 24,
              installation_height_feet: existing.installation_height_feet || 12,
              raceway_length_feet: existing.raceway_length_feet || 0,
              thick_hollow_walls: !!existing.thick_hollow_walls,
              parapet: !!existing.parapet,
              poor_electrical_access: !!existing.poor_electrical_access,
              materials: [],
            }];
          }
          setProject({ ...blankProject(), ...existing, items: existing.items || [] });
          setIsEditing(true);
        } else {
          navigate(createPageUrl("ChannelLetterInstallationProjects"));
        }
      } else {
        setProject(prev => ({
          ...prev,
          base_supplies_cost: parseFloat(settingsObj.install_base_supplies) || 0,
          items: [emptyLineItem()],
        }));
      }
    } catch (e) {
      console.error("Load error:", e);
    }
    setIsLoading(false);
  }, [editId, navigate]);

  useEffect(() => { loadEverything(); }, [loadEverything]);

  // Recalc on every change
  const recalculated = useMemo(() => {
    if (!settings || Object.keys(settings).length === 0) return project;
    const recalcItems = (project.items || []).map(it => calcLineItem(it, settings, inventory));
    const totals = calcProjectTotals({ ...project, items: recalcItems });
    return { ...project, items: recalcItems, ...totals };
  }, [project, settings, inventory]);

  // Aggregate materials across items for the Materials tab
  const aggregatedMaterials = useMemo(() => {
    const map = new Map();
    (recalculated.items || []).forEach(it => {
      (it.materials || []).forEach(m => {
        const key = m.inventory_item_id || `manual:${m.item_name}`;
        const existing = map.get(key);
        if (existing) {
          existing.quantity += parseFloat(m.quantity) || 0;
          existing.total_cost += parseFloat(m.total_cost) || 0;
        } else {
          map.set(key, {
            item_name: m.item_name,
            quantity: parseFloat(m.quantity) || 0,
            unit_cost: parseFloat(m.unit_cost) || 0,
            total_cost: parseFloat(m.total_cost) || 0,
          });
        }
      });
    });
    return Array.from(map.values());
  }, [recalculated]);

  // Mutators
  const updateProject = (patch) => setProject(prev => ({ ...prev, ...patch }));

  const updateItem = (idx, updated) => {
    const next = [...project.items];
    next[idx] = updated;
    setProject(prev => ({ ...prev, items: next }));
  };

  const addItem = () => {
    const newItem = emptyLineItem();
    newItem.materials = defaultMaterialsForItem(newItem, inventory);
    setProject(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setActiveTab("items");
  };

  const removeItem = (idx) => {
    const next = [...project.items];
    next.splice(idx, 1);
    setProject(prev => ({ ...prev, items: next }));
  };

  const duplicateItem = (idx) => {
    const copy = JSON.parse(JSON.stringify(project.items[idx]));
    const next = [...project.items];
    next.splice(idx + 1, 0, copy);
    setProject(prev => ({ ...prev, items: next }));
  };

  const reorderItems = (from, to) => {
    const next = [...project.items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setProject(prev => ({ ...prev, items: next }));
  };

  // Keyboard shortcuts: Ctrl/Cmd+S = save, Ctrl/Cmd+N = new item
  useEffect(() => {
    const handler = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === "s") {
        e.preventDefault();
        saveProject();
      } else if (e.key === "i") {
        e.preventDefault();
        addItem();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, recalculated]);

  // Save / Export
  const saveProject = async () => {
    if (!project.project_name || !project.client_name || !project.estimate_number || !project.hyperlink) {
      alert("Please fill in Project Name, Client Name, Estimate Number, and Project Link.");
      setActiveTab("project");
      return;
    }
    if (!project.selected_equipment || project.selected_equipment.length === 0) {
      alert("Please select at least one piece of equipment before saving.");
      setActiveTab("crew");
      return;
    }
    setIsSaving(true);
    setIsDirty(false);
    try {
      const dataToSave = { ...recalculated, status: "calculated" };
      if (isEditing && editId) {
        await ChannelLetterInstallation.update(editId, dataToSave);
      } else {
        await ChannelLetterInstallation.create(dataToSave);
      }
      navigate(createPageUrl("ChannelLetterInstallationProjects"));
    } catch (e) {
      console.error(e);
      alert("Save failed: " + e.message);
    }
    setIsSaving(false);
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildSummaryText(recalculated));
      alert("Summary copied to clipboard!");
    } catch (e) {
      alert("Copy failed: " + e.message);
    }
  };

  const exportCSV = () => downloadCSV(recalculated);

  // --- Copy materials list helpers ---
  const [materialsCopied, setMaterialsCopied] = useState(null); // "plain" | "priced" | null
  const flashCopied = (which) => {
    setMaterialsCopied(which);
    setTimeout(() => setMaterialsCopied(null), 1800);
  };

  const buildPlainMaterialsList = () => {
    if (aggregatedMaterials.length === 0) return "";
    const sorted = [...aggregatedMaterials].sort((a, b) => a.item_name.localeCompare(b.item_name));
    const qtyWidth = Math.max(3, ...sorted.map(m => m.quantity.toFixed(2).length));
    const lines = sorted.map(m => `${m.quantity.toFixed(2).padStart(qtyWidth)}  ${m.item_name}`);
    return [
      "MATERIALS LIST",
      `${project.project_name || "Untitled Project"}${project.estimate_number ? ` — ${project.estimate_number}` : ""}`,
      "─".repeat(40),
      ...lines,
    ].join("\n");
  };

  const buildPricedMaterialsList = () => {
    if (aggregatedMaterials.length === 0) return "";
    const sorted = [...aggregatedMaterials].sort((a, b) => a.item_name.localeCompare(b.item_name));
    const nameWidth = Math.max(4, ...sorted.map(m => m.item_name.length));
    const qtyWidth = Math.max(3, ...sorted.map(m => m.quantity.toFixed(2).length));
    const unitWidth = Math.max(6, ...sorted.map(m => `$${m.unit_cost.toFixed(2)}`.length));
    const totalWidth = Math.max(6, ...sorted.map(m => `$${m.total_cost.toFixed(2)}`.length));

    const header = `${"Item".padEnd(nameWidth)}  ${"Qty".padStart(qtyWidth)}  ${"Unit".padStart(unitWidth)}  ${"Total".padStart(totalWidth)}`;
    const divider = "─".repeat(header.length);
    const rows = sorted.map(m =>
      `${m.item_name.padEnd(nameWidth)}  ${m.quantity.toFixed(2).padStart(qtyWidth)}  ${`$${m.unit_cost.toFixed(2)}`.padStart(unitWidth)}  ${`$${m.total_cost.toFixed(2)}`.padStart(totalWidth)}`
    );
    const totalLine = `${"MATERIALS TOTAL".padEnd(nameWidth + qtyWidth + unitWidth + 4)}  ${fmt(recalculated.total_materials_cost).padStart(totalWidth)}`;

    return [
      "MATERIALS LIST (WITH PRICING)",
      `${project.project_name || "Untitled Project"}${project.estimate_number ? ` — ${project.estimate_number}` : ""}`,
      divider,
      header,
      divider,
      ...rows,
      divider,
      totalLine,
    ].join("\n");
  };

  const copyMaterialsPlain = async () => {
    try {
      await navigator.clipboard.writeText(buildPlainMaterialsList());
      flashCopied("plain");
    } catch (e) { alert("Copy failed: " + e.message); }
  };

  const copyMaterialsPriced = async () => {
    try {
      await navigator.clipboard.writeText(buildPricedMaterialsList());
      flashCopied("priced");
    } catch (e) { alert("Copy failed: " + e.message); }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Wrench className="w-8 h-8 text-purple-600" />
              {isEditing ? "Edit" : "New"} Channel Letter Installation
            </h1>
            <p className="text-slate-600">Multi-item installation estimate</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to={createPageUrl("ChannelLetterInstallInventory")}>
              <Button variant="outline" className="bg-white">
                <Package className="w-4 h-4 mr-2" /> Inventory
              </Button>
            </Link>
            <Button variant="outline" onClick={() => navigate(createPageUrl("ChannelLetterInstallationProjects"))}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-4 w-full bg-white shadow-sm border border-slate-200 h-12">
                <TabsTrigger value="project" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  <FileText className="w-4 h-4 mr-2" /> Project
                </TabsTrigger>
                <TabsTrigger value="items" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  <ListChecks className="w-4 h-4 mr-2" /> Items
                  <span className="ml-1.5 text-xs bg-slate-200 data-[state=active]:bg-white/20 rounded-full px-1.5 py-0.5">
                    {recalculated.items.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="crew" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white relative">
                  <HardHat className="w-4 h-4 mr-2" /> Crew & Equipment
                  {(recalculated.selected_equipment?.length || 0) === 0 && (
                    <span className="ml-1.5 w-2 h-2 rounded-full bg-red-500" title="Equipment required" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="summary" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  <Calculator className="w-4 h-4 mr-2" /> Summary
                </TabsTrigger>
              </TabsList>

              {/* PROJECT TAB */}
              <TabsContent value="project" className="mt-4 space-y-4">
                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Project Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="client_name">Client Name *</Label>
                        <ClientSearchInput
                          value={project.client_name}
                          onChange={(val) => updateProject({ client_name: val })}
                          onSelectProject={(data) => updateProject({
                            client_name: data.client_name || project.client_name,
                            project_name: data.project_name || project.project_name,
                            estimate_number: data.estimate_number || project.estimate_number,
                            hyperlink: data.hyperlink || project.hyperlink,
                          })}
                          className="mt-1"
                          placeholder="Enter client name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="project_name">Project Name *</Label>
                        <Input
                          id="project_name"
                          value={project.project_name}
                          onChange={(e) => updateProject({ project_name: e.target.value })}
                          placeholder="Enter project name"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="estimate_number">Estimate Number *</Label>
                        <Input
                          id="estimate_number"
                          value={project.estimate_number}
                          onChange={(e) => updateProject({ estimate_number: e.target.value })}
                          placeholder="e.g., INST-2024-001"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="hyperlink">Project Link *</Label>
                        <Input
                          id="hyperlink"
                          value={project.hyperlink}
                          onChange={(e) => updateProject({ hyperlink: e.target.value })}
                          placeholder="https://..."
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="site_address" className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-purple-600" />
                        Site Address
                        <span className="text-xs font-normal text-slate-500">(used for travel mileage)</span>
                      </Label>
                      <Input
                        id="site_address"
                        value={project.site_address || ""}
                        onChange={(e) => updateProject({ site_address: e.target.value })}
                        placeholder="e.g., 123 Main St, Cincinnati, OH 45202"
                        className="mt-1"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Travel cost will be calculated from your shop (
                        <Link to={createPageUrl("ChannelLetterInstallationSettings")} className="underline hover:text-purple-700">
                          Travel settings
                        </Link>
                        ) to this address.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={project.notes}
                      onChange={(e) => updateProject({ notes: e.target.value })}
                      placeholder="Add any additional notes or special considerations..."
                      className="h-32"
                    />
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={() => setActiveTab("items")} className="bg-purple-600 hover:bg-purple-700 text-white">
                    Continue to Line Items →
                  </Button>
                </div>
              </TabsContent>

              {/* ITEMS TAB */}
              <TabsContent value="items" className="mt-4 space-y-3">
                <div className="flex items-center justify-end bg-white rounded-lg border border-slate-200 px-3 py-2 shadow-sm">
                  <Button onClick={addItem} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus className="w-4 h-4 mr-1" /> Add Item
                  </Button>
                </div>

                {recalculated.items.length === 0 ? (
                  <Card className="border-2 border-dashed border-slate-300 bg-white/50">
                    <CardContent className="p-12 text-center text-slate-500">
                      <ListChecks className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="mb-3 font-medium">No line items yet</p>
                      <p className="text-xs mb-4">Add your first installation item to get started</p>
                      <Button onClick={addItem} className="bg-purple-600 hover:bg-purple-700 text-white">
                        <Plus className="w-4 h-4 mr-2" /> Add Line Item
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <ItemsList
                    items={recalculated.items}
                    inventory={inventory}
                    compact={false}
                    onUpdate={updateItem}
                    onRemove={removeItem}
                    onDuplicate={duplicateItem}
                    onReorder={reorderItems}
                  />
                )}
              </TabsContent>

              {/* CREW & EQUIPMENT TAB */}
              <TabsContent value="crew" className="mt-4 space-y-3">
                <EquipmentSelector
                  selectedEquipment={recalculated.selected_equipment || []}
                  onChange={(next) => updateProject({ selected_equipment: next })}
                  equipmentInventory={equipmentInventory}
                  items={recalculated.items}
                  projectLaborHours={recalculated.labor_hours || 0}
                />
                <PersonnelSelector
                  personnel={recalculated.personnel || []}
                  onChange={(next) => updateProject({ personnel: next })}
                  projectLaborHours={recalculated.labor_hours || 0}
                  defaultLaborRate={parseFloat(settings.install_labor_rate) || 65}
                  items={recalculated.items}
                />
                {equipmentInventory.length === 0 && (
                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="p-3 text-xs text-amber-900">
                      Your equipment inventory is empty.{" "}
                      <Link to={createPageUrl("ChannelLetterInstallInventory")} className="underline font-medium">
                        Add equipment in Inventory
                      </Link>{" "}
                      to enable selection.
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* SUMMARY TAB */}
              <TabsContent value="summary" className="mt-4 space-y-3">
                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Estimate Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600 text-xs">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium w-8">#</th>
                          <th className="text-left px-4 py-2 font-medium">Description</th>
                          <th className="text-left px-4 py-2 font-medium">Type</th>
                          <th className="text-right px-4 py-2 font-medium">Labor</th>
                          <th className="text-right px-4 py-2 font-medium">Materials</th>
                          <th className="text-right px-4 py-2 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recalculated.items.map((it, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-4 py-2 text-slate-500">{i + 1}</td>
                            <td className="px-4 py-2 font-medium">{it.description || `Item ${i + 1}`}</td>
                            <td className="px-4 py-2 capitalize text-xs text-slate-600">{it.installation_type?.replace("_", " ")}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{fmt(it.labor_cost)}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{fmt(it.materials_cost)}</td>
                            <td className="px-4 py-2 text-right tabular-nums font-semibold">{fmt(it.item_total_cost)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-sm">
                        <tr>
                          <td colSpan="3" className="px-4 py-2 text-right font-medium">Subtotals</td>
                          <td className="px-4 py-2 text-right tabular-nums font-medium">{fmt(recalculated.labor_cost)}</td>
                          <td className="px-4 py-2 text-right tabular-nums font-medium">{fmt(recalculated.total_materials_cost)}</td>
                          <td className="px-4 py-2 text-right tabular-nums font-bold">{fmt((recalculated.labor_cost || 0) + (recalculated.total_materials_cost || 0))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Boxes className="w-5 h-5 text-purple-600" />
                        Materials (Pick List)
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-1">Combined materials across all line items — your shopping list.</p>
                    </div>
                    {aggregatedMaterials.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyMaterialsPlain}
                          className="h-8 text-xs"
                          title="Copy materials list without pricing"
                        >
                          {materialsCopied === "plain"
                            ? <><Check className="w-3.5 h-3.5 mr-1 text-green-600" /> Copied!</>
                            : <><Copy className="w-3.5 h-3.5 mr-1" /> Copy List</>}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyMaterialsPriced}
                          className="h-8 text-xs"
                          title="Copy materials list with pricing"
                        >
                          {materialsCopied === "priced"
                            ? <><Check className="w-3.5 h-3.5 mr-1 text-green-600" /> Copied!</>
                            : <><DollarSign className="w-3.5 h-3.5 mr-1" /> Copy with Pricing</>}
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-0">
                    {aggregatedMaterials.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-sm">
                        No materials yet. Add line items to populate this list.
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600 text-xs">
                          <tr>
                            <th className="text-left px-4 py-2 font-medium">Item</th>
                            <th className="text-right px-4 py-2 font-medium">Qty</th>
                            <th className="text-right px-4 py-2 font-medium">Unit $</th>
                            <th className="text-right px-4 py-2 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aggregatedMaterials.map((m, i) => (
                            <tr key={i} className="border-t border-slate-100">
                              <td className="px-4 py-2">{m.item_name}</td>
                              <td className="px-4 py-2 text-right tabular-nums">{m.quantity.toFixed(2)}</td>
                              <td className="px-4 py-2 text-right tabular-nums text-slate-500">{fmt(m.unit_cost)}</td>
                              <td className="px-4 py-2 text-right tabular-nums font-medium">{fmt(m.total_cost)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                          <tr>
                            <td colSpan="3" className="px-4 py-2 text-right font-semibold">Materials Total</td>
                            <td className="px-4 py-2 text-right font-bold tabular-nums">{fmt(recalculated.total_materials_cost)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sticky summary card on right */}
          <div className="space-y-3">
            <InstallSummaryCard
              project={recalculated}
              onUpdate={updateProject}
              onSave={saveProject}
              isSaving={isSaving}
              isEditing={isEditing}
              onCopySummary={copySummary}
              onExportCSV={exportCSV}
            />
            <CrewEquipmentHint items={recalculated.items} />
            <ValidationWarnings project={recalculated} />
            <div className="text-[10px] text-slate-400 text-center px-2">
              Shortcuts: <kbd className="px-1 bg-slate-100 rounded">⌘S</kbd> Save · <kbd className="px-1 bg-slate-100 rounded">⌘I</kbd> Add Item
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}