import React, { useState, useEffect, useContext } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Save, ArrowLeft, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import WallSection from '@/components/WallSection';
import FoundationWalls3DViewer from '@/components/FoundationWalls3DViewer';
import { UnsavedChangesContext } from '@/components/UnsavedChangesContext';
import SummaryTab from '@/components/foundation/SummaryTab';
import BOMTab from '@/components/foundation/BOMTab';
import EquipmentTab from '@/components/foundation/EquipmentTab';
import PolePlacer from '@/components/PolePlacer';
import BeautifyCanvas from '@/components/BeautifyCanvas';
import AIEngineeringCalculatorModal from '@/components/foundation/AIEngineeringCalculatorModal';
import { Bot } from 'lucide-react';

const FoundationProjectEntity = base44.entities.FoundationProject;
const FoundationInventoryEntity = base44.entities.FoundationInventory;
const SettingsEntity = base44.entities.Settings;

const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get('id');

function newItem() {
  return {
    _id: Date.now() + Math.random(),
    foundation_type: 'spread_foot',
    description: '',
    quantity: 1,
    length_inches: 48,
    width_inches: 48,
    diameter: 24,
    depth_inches: 36,
    grade_offset_inches: 0,
    include_rebar: false,
    include_forming: false,
    include_finishing: false,
    rebar_size: '#4',
    rebar_spacing_length: 12,
    rebar_spacing_width: 12,
    rebar_layers: 1,
    rebar_layer_separation_inches: 12,
    selected_pole_id: '',
    pole_offset_from_bottom_inches: 0,
    pole_total_height_inches: 0,
    include_pole_painting: false,
    custom_concrete_cost_per_cy: null,
    custom_rebar_cost_per_ft: null,
  };
}

function newWall() {
  return {
    _id: Date.now() + Math.random(),
    name: '',
    heightInches: 24,
    materialId: '',
    selectedMaterial: null,
    useExistingFoundation: false,
    mortarGapInches: 0.375,
    offsetFraction: 0.5,
    shape: null,
    calculatedCosts: null,
  };
}

export default function NewFoundationEstimate() {
  const navigate = useNavigate();
  const { setIsDirty } = useContext(UnsavedChangesContext) || { setIsDirty: () => {} };

  const [project, setProject] = useState({
    project_name: '',
    client_name: '',
    estimate_number: '',
    hyperlink: '',
    status: 'draft',
    notes: '',
    items: [],
    walls: [],
    poles: [],
    excavation_method: 'hand_dig',
    selected_concrete_id: '',
    beautify_data_url: '',
  });
  const [polesData, setPolesData] = useState([]);
  const [items, setItems] = useState([newItem()]);
  const [walls, setWalls] = useState([]);
  const [selectedEquipmentList, setSelectedEquipmentList] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [wallMaterials, setWallMaterials] = useState([]);
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [inv, rawSettings] = await Promise.all([
      FoundationInventoryEntity.list('-created_date', 200),
      SettingsEntity.filter({ category: ['foundation_pricing', 'foundation_labor', 'foundation_calc'] }),
    ]);
    setInventory(inv);
    setWallMaterials(inv.filter(i => i.material_type === 'wall_material'));
    const sMap = {};
    rawSettings.forEach(s => { sMap[s.setting_name] = s.setting_value; });
    setSettings(sMap);

    if (editId) {
      const proj = await FoundationProjectEntity.filter({ id: editId });
      if (proj && proj[0]) {
        const p = proj[0];
        setProject(p);
        setItems(p.items?.length ? p.items.map(i => ({ ...i, _id: i._id || Date.now() + Math.random() })) : [newItem()]);
        setWalls(p.walls?.length ? p.walls.map(w => ({ ...w, _id: w._id || Date.now() + Math.random() })) : []);
        setPolesData(p.poles || []);
        setSelectedEquipmentList(p.selected_equipment?.length ? p.selected_equipment.map(e => ({ ...e, _id: e._id || Date.now() + Math.random() })) : []);
      }
    }
    setLoading(false);
  };

  const markDirty = () => setIsDirty(true);
  const updateProject = (field, value) => { setProject(prev => ({ ...prev, [field]: value })); markDirty(); };
  const addItem = () => { setItems(prev => [...prev, newItem()]); markDirty(); };
  const removeItem = (idx) => { setItems(prev => prev.filter((_, i) => i !== idx)); markDirty(); };
  const updateItem = (idx, field, value) => {
    setItems(prev => { const arr = [...prev]; arr[idx] = { ...arr[idx], [field]: value }; return arr; });
    markDirty();
  };
  const addWall = () => { setWalls(prev => [...prev, newWall()]); markDirty(); };
  const removeWall = (idx) => { setWalls(prev => prev.filter((_, i) => i !== idx)); markDirty(); };
  const updateWall = (idx, wallData) => {
    setWalls(prev => { const arr = [...prev]; arr[idx] = wallData; return arr; });
    markDirty();
  };

  const firstFoundation = items[0];
  const foundationLengthInches = firstFoundation?.length_inches || 0;
  const foundationWidthInches = firstFoundation?.width_inches || 0;

  const getSetting = (key, def) => parseFloat(settings[key] || def);

  const calcItemCost = (item) => {
    const selectedConcrete = inventory.find(c => c.id === project.selected_concrete_id);
    const conc_cost = item.custom_concrete_cost_per_cy || selectedConcrete?.cost_per_unit || getSetting('foundation_concrete_cost_per_cy', 135);
    const rebar_cost = item.custom_rebar_cost_per_ft || getSetting('foundation_rebar_cost_per_ft', 0.75);
    const forming_labor = getSetting('foundation_forming_labor_rate', 55);
    const finishing_labor = getSetting('foundation_finishing_labor_rate', 50);
    const forming_mult = item.foundation_type === 'spread_foot'
      ? getSetting('foundation_forming_materials_spread_foot', 0.5)
      : getSetting('foundation_forming_materials_pillar', 0.75);

    let volumeCY = 0;
    if (item.foundation_type === 'spread_foot') {
      volumeCY = ((item.length_inches / 12) * (item.width_inches / 12) * (item.depth_inches / 12)) / 27;
    } else {
      const r = (item.diameter / 2) / 12;
      volumeCY = (Math.PI * r * r * (item.depth_inches / 12)) / 27;
    }
    volumeCY = volumeCY * (item.quantity || 1);

    let concreteCost = 0;
    if (selectedConcrete?.material_type === 'bagged_concrete') {
      const bags = Math.ceil(volumeCY * 45); // ~45 80lb bags per CY
      concreteCost = bags * (selectedConcrete.cost_per_unit || 5); // Fallback to $5/bag if not set
    } else {
      concreteCost = volumeCY * conc_cost;
    }

    let rebarCost = 0;
    if (item.include_rebar && item.foundation_type === 'spread_foot') {
      const nBarsL = Math.floor(item.width_inches / (item.rebar_spacing_width || 12)) + 1;
      const nBarsW = Math.floor(item.length_inches / (item.rebar_spacing_length || 12)) + 1;
      const layers = item.rebar_layers || 1;
      const totalFt = (nBarsL * (item.length_inches / 12) + nBarsW * (item.width_inches / 12)) * layers * (item.quantity || 1);
      rebarCost = totalFt * rebar_cost;
    }

    let formingCost = 0;
    if (item.include_forming) {
      const perim = item.foundation_type === 'spread_foot'
        ? 2 * (item.length_inches + item.width_inches) / 12
        : Math.PI * item.diameter / 12;
      formingCost = perim * 0.25 * (item.quantity || 1) * forming_labor + concreteCost * forming_mult;
    }

    let finishingCost = 0;
    if (item.include_finishing) {
      const topArea = item.foundation_type === 'spread_foot'
        ? (item.length_inches * item.width_inches) / 144
        : Math.PI * ((item.diameter / 2 / 12) ** 2);
      finishingCost = topArea * 0.1 * (item.quantity || 1) * finishing_labor;
    }

    let excavationCost = 0;
    const excVol = volumeCY * 1.25;
    if (project.excavation_method === 'hand_dig') {
      excavationCost = excVol * (getSetting('foundation_hand_dig_excavation_cost_per_cy', 10) + getSetting('foundation_hand_dig_labor_rate', 45) * 0.3);
    } else {
      excavationCost = excVol * getSetting('foundation_equipment_excavation_cost_per_cy', 15);
    }

    return { 
      concreteCost, 
      concreteBags: selectedConcrete?.material_type === 'bagged_concrete' ? Math.ceil(volumeCY * 45) : null,
      volumeCY,
      rebarCost, 
      formingCost, 
      finishingCost, 
      excavationCost, 
      total: concreteCost + rebarCost + formingCost + finishingCost + excavationCost 
    };
  };

  const totals = (() => {
    const itemsTotal = items.reduce((s, item) => s + calcItemCost(item).total, 0);
    const wallTotal = walls.reduce((s, w) => s + (w.calculatedCosts?.totalCost || 0), 0);
    const polesTotal = polesData.reduce((sum, p) => {
        const inv = inventory.find(i => i.id === p.pole_id);
        if (!inv) return sum;
        if (inv.pole_pricing_mode === 'stock_price') {
            const stockLen = (inv.pole_stock_length_ft || 20) * 12;
            const pieces = Math.ceil(p.height_inches / stockLen);
            return sum + (pieces * (inv.pole_stock_price || 0));
        } else {
            return sum + ((p.height_inches / 12) * (inv.cost_per_unit || 0));
        }
    }, 0);

    return { itemsTotal, wallTotal, polesTotal, grand: itemsTotal + wallTotal + polesTotal };
  })();

  const handleSave = async () => {
    if (!project.project_name || !project.client_name) { alert('Please fill in Project Name and Client Name.'); return; }
    setSaving(true);
    const data = {
      ...project,
      items: items.map(({ _id, ...rest }) => rest),
      walls: walls.map(({ _id, ...rest }) => rest),
      poles: polesData.map(({ id, ...rest }) => rest),
      selected_equipment: selectedEquipmentList.map(({ _id, ...rest }) => rest),
      total_labor_cost: totals.grand,
    };
    if (editId) { await FoundationProjectEntity.update(editId, data); }
    else { await FoundationProjectEntity.create(data); }
    setIsDirty(false);
    setSaving(false);
    navigate(createPageUrl('FoundationProjects'));
  };

  const poles = inventory.filter(i => i.material_type === 'pole');
  const concreteServices = inventory.filter(i => i.material_type === 'concrete_service' || i.material_type === 'bagged_concrete');
  const formingInventory = inventory.filter(i => i.material_type === 'forming_material');

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white flex-shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl('FoundationProjects')}>
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{editId ? 'Edit Foundation Estimate' : 'New Foundation Estimate'}</h1>
            <p className="text-xs text-slate-500">Foundation, excavation & wall estimating</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1">Total: ${totals.grand.toFixed(2)}</Badge>
          <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white" size="sm">
            <Save className="w-4 h-4 mr-1" />{saving ? 'Saving...' : 'Save Estimate'}
          </Button>
        </div>
      </div>

      {/* Two-panel body */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Tabs / Forms */}
        <div className="flex flex-col flex-1 overflow-y-auto min-w-0">
          <div className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="info">Project Info</TabsTrigger>
                <TabsTrigger value="foundation">Foundation ({items.length})</TabsTrigger>
                <TabsTrigger value="walls">Walls ({walls.length})</TabsTrigger>
                <TabsTrigger value="poles">Poles ({polesData.length})</TabsTrigger>
                <TabsTrigger value="beautify">Beautify</TabsTrigger>
                {project.excavation_method === 'equipment_excavation' && (
                  <TabsTrigger value="equipment">Equipment {selectedEquipmentList.length > 0 ? `(${selectedEquipmentList.length})` : ''}</TabsTrigger>
                )}
                <TabsTrigger value="summary">Cost Summary</TabsTrigger>
                <TabsTrigger value="bom">Bill of Materials</TabsTrigger>
              </TabsList>

              {/* PROJECT INFO */}
              <TabsContent value="info" className="space-y-4 pt-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Project Information</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Project Name *</Label>
                      <Input className="h-9" value={project.project_name} onChange={e => updateProject('project_name', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Client Name *</Label>
                      <Input className="h-9" value={project.client_name} onChange={e => updateProject('client_name', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Estimate Number</Label>
                      <Input className="h-9" value={project.estimate_number} onChange={e => updateProject('estimate_number', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Reference Link</Label>
                      <Input className="h-9" value={project.hyperlink} onChange={e => updateProject('hyperlink', e.target.value)} placeholder="https://" />
                    </div>
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select value={project.status} onValueChange={v => updateProject('status', v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="calculated">Calculated</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <Label className="text-xs">Notes</Label>
                      <Textarea className="min-h-[70px]" value={project.notes} onChange={e => updateProject('notes', e.target.value)} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* FOUNDATION ITEMS */}
              <TabsContent value="foundation" className="space-y-4 pt-4">
                
                {/* AI Engineering Calculator */}
                <div className="flex flex-col items-start gap-4 w-full">
                  <div className="w-full bg-indigo-50 border-2 border-indigo-200 border-dashed rounded-xl p-5 flex flex-col md:flex-row items-center justify-between text-left gap-4 shadow-sm">
                    <div>
                      <h3 className="text-base font-bold text-indigo-900 flex items-center gap-2"><Bot className="w-5 h-5 text-indigo-600"/> AI Engineering Assistant</h3>
                      <p className="text-sm text-indigo-700 mt-1">Generate concise wind load calculations and sizing recommendations for your foundation and poles.</p>
                    </div>
                    <AIEngineeringCalculatorModal onSave={(recommendation) => updateProject('ai_engineering_recommendation', recommendation)} />
                  </div>
                  
                  {project.ai_engineering_recommendation && (
                    <details className="w-full group" open>
                      <summary className="list-none w-full border border-indigo-200 bg-white shadow-sm rounded-lg py-3 px-4 flex flex-row items-center justify-between cursor-pointer hover:bg-slate-50 font-semibold text-indigo-900 text-sm transition-colors">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-indigo-600" />
                          AI Engineering Recommendations
                        </div>
                        <span className="group-open:rotate-180 transition-transform duration-200">▼</span>
                      </summary>
                      <div className="p-5 border border-t-0 border-indigo-200 bg-indigo-50/30 rounded-b-lg -mt-1 text-sm text-indigo-950 whitespace-pre-wrap font-medium leading-relaxed">
                        {project.ai_engineering_recommendation}
                      </div>
                    </details>
                  )}
                </div>

                {/* Excavation Settings Card */}
                <Card className="border-slate-200 bg-slate-50 mt-4">
                  <CardContent className="py-3 px-4">
                    <div className="flex flex-wrap items-end gap-4">
                      <div className="min-w-[200px]">
                        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Excavation Method</Label>
                        <Select value={project.excavation_method} onValueChange={v => updateProject('excavation_method', v)}>
                          <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hand_dig">Hand Dig</SelectItem>
                            <SelectItem value="equipment_excavation">Equipment Excavation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="min-w-[200px]">
                        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Concrete Type</Label>
                        <Select value={project.selected_concrete_id} onValueChange={v => updateProject('selected_concrete_id', v)}>
                          <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Select concrete..." /></SelectTrigger>
                          <SelectContent>
                            {concreteServices.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                <div className="flex flex-col text-left py-1 max-w-[400px]">
                                   <span className="font-medium">{c.material_name}</span>
                                   {(c.material_description || c.notes) && (
                                       <span className="text-xs text-slate-500 whitespace-normal mt-0.5">{c.material_description || c.notes}</span>
                                   )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {items.map((item, idx) => (
                  <FoundationItemRow
                    key={item._id}
                    item={item}
                    index={idx}
                    onUpdate={(field, value) => updateItem(idx, field, value)}
                    onRemove={() => removeItem(idx)}
                    poles={poles}
                    concreteServices={concreteServices}
                    formingInventory={formingInventory}
                    costs={calcItemCost(item)}
                    excavationMethod={project.excavation_method}
                    excavationEquipment={inventory.find(i => i.id === project.selected_equipment_id)}
                  />
                ))}
                <Button variant="outline" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-1" /> Add Foundation Item
                </Button>
              </TabsContent>

              {/* WALLS */}
              <TabsContent value="walls" className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Design walls built above the foundation using brick, stone, cinderblock, or concrete.</p>
                    {wallMaterials.length === 0 && (
                      <p className="text-xs text-amber-700 mt-1">
                        No wall materials in inventory.{' '}
                        <Link to={createPageUrl('FoundationInventory')} className="underline font-medium">Add wall materials →</Link>
                      </p>
                    )}
                  </div>
                  <Button onClick={addWall} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                    <Plus className="w-4 h-4 mr-1" /> {walls.length === 0 ? 'Add Wall' : 'Add Additional Wall Type'}
                  </Button>
                </div>

                {walls.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="py-10 text-center text-slate-400">
                      <div className="text-4xl mb-2">🧱</div>
                      <p className="font-medium">No walls added yet</p>
                      <p className="text-sm mt-1">Click "Add Wall" to draw a wall outline and configure materials.</p>
                    </CardContent>
                  </Card>
                )}

                {walls.map((wall, idx) => (
                  <WallSection
                    key={wall._id}
                    wall={wall}
                    index={idx}
                    walls={walls}
                    wallMaterials={wallMaterials}
                    foundationItems={items}
                    settings={settings}
                    onChange={(updated) => updateWall(idx, updated)}
                    onDelete={() => removeWall(idx)}
                    onFoundationUpdate={updateItem}
                  />
                ))}

                {walls.length > 0 && (
                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="py-3 px-4 flex items-center justify-between">
                      <span className="font-medium text-amber-800">Total Wall Cost</span>
                      <span className="text-lg font-bold text-amber-700">${totals.wallTotal.toFixed(2)}</span>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* POLES */}
              <TabsContent value="poles" className="space-y-4 pt-4">
                <PolePlacer 
                    polesData={polesData} 
                    polesInventory={poles} 
                    foundationItems={items} 
                    onChange={v => { setPolesData(v); markDirty(); }} 
                />
              </TabsContent>

              {/* BEAUTIFY */}
              <TabsContent value="beautify" className="space-y-4 pt-4">
                <BeautifyCanvas
                  dataUrl={project.beautify_data_url}
                  foundationItems={items}
                  onChange={v => updateProject('beautify_data_url', v)}
                />
              </TabsContent>

              {/* EQUIPMENT */}
              {project.excavation_method === 'equipment_excavation' && (
              <TabsContent value="equipment" className="space-y-4 pt-4">
                <EquipmentTab
                  inventory={inventory}
                  selectedEquipmentList={selectedEquipmentList}
                  onUpdate={setSelectedEquipmentList}
                  markDirty={markDirty}
                />
              </TabsContent>
              )}

              {/* SUMMARY */}
              <TabsContent value="summary" className="space-y-4 pt-4">
                <SummaryTab items={items} walls={walls} totals={totals} calcItemCost={calcItemCost} project={project} />
              </TabsContent>

              {/* BOM */}
              <TabsContent value="bom" className="space-y-4 pt-4">
                <BOMTab items={items} walls={walls} project={project} inventory={inventory} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* RIGHT: Persistent 3D Viewer */}
        <div className="hidden lg:flex flex-col flex-1 min-w-0 border-l bg-slate-100">
          <div className="px-4 py-2 border-b bg-white flex items-center justify-between flex-shrink-0">
            <span className="text-sm font-semibold text-slate-700">3D Preview</span>
            <span className="text-xs text-slate-400">Updates live as you edit</span>
          </div>
          <div className="flex-1 p-3 overflow-hidden">
            <FoundationWalls3DViewer 
               items={items} 
               walls={walls} 
               polesData={polesData} 
               polesInventory={poles} 
               formingInventory={formingInventory} 
               beautifyDataUrl={project.beautify_data_url} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Foundation Item Row ──
function FoundationItemRow({ item, index, onUpdate, onRemove, poles, concreteServices, formingInventory, costs, excavationMethod, excavationEquipment }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card className="border border-slate-200">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-sm font-semibold">
              Foundation #{index + 1}{item.description ? ` — ${item.description}` : ''}
            </CardTitle>
            <Badge variant="outline" className="text-xs capitalize">{item.foundation_type?.replace('_', ' ')}</Badge>
            {costs && <Badge variant="secondary" className="text-xs">${costs.total.toFixed(2)}</Badge>}
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setExpanded(s => !s)}>{expanded ? '▲' : '▼'}</Button>
            <Button size="sm" variant="ghost" className="text-red-500" onClick={onRemove}><Trash2 className="w-3 h-3" /></Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-4 pb-4 space-y-4">
          {/* Basic */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Description</Label>
              <Input className="h-8" value={item.description} onChange={e => onUpdate('description', e.target.value)} placeholder="e.g. Main post base" />
            </div>
            <div>
              <Label className="text-xs">Foundation Type</Label>
              <Select value={item.foundation_type} onValueChange={v => onUpdate('foundation_type', v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="spread_foot">Spread Foot</SelectItem>
                  <SelectItem value="pillar">Pillar / Drilled Pier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Quantity</Label>
              <Input type="number" className="h-8" value={item.quantity} onChange={e => onUpdate('quantity', parseInt(e.target.value) || 1)} min={1} />
            </div>
            <div>
              <Label className="text-xs">Depth (inches)</Label>
              <Input type="number" className="h-8" value={item.depth_inches} onChange={e => onUpdate('depth_inches', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Dimensions */}
          {item.foundation_type === 'spread_foot' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Length (inches)</Label>
                <Input type="number" className="h-8" value={item.length_inches} onChange={e => onUpdate('length_inches', parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Width (inches)</Label>
                <Input type="number" className="h-8" value={item.width_inches} onChange={e => onUpdate('width_inches', parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Grade Offset (inches)</Label>
                <Input type="number" className="h-8" value={item.grade_offset_inches} onChange={e => onUpdate('grade_offset_inches', parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Draw Offset X (in)</Label>
                <Input type="number" className="h-8" value={item.offset_x_inches || 0} onChange={e => onUpdate('offset_x_inches', parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Draw Offset Y (in)</Label>
                <Input type="number" className="h-8" value={item.offset_z_inches || 0} onChange={e => onUpdate('offset_z_inches', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Diameter (inches)</Label>
                <Input type="number" className="h-8" value={item.diameter} onChange={e => onUpdate('diameter', parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Draw Offset X (in)</Label>
                <Input type="number" className="h-8" value={item.offset_x_inches || 0} onChange={e => onUpdate('offset_x_inches', parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Draw Offset Y (in)</Label>
                <Input type="number" className="h-8" value={item.offset_z_inches || 0} onChange={e => onUpdate('offset_z_inches', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          )}

          {/* Options */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Checkbox checked={item.include_rebar} onCheckedChange={v => onUpdate('include_rebar', v)} id={`rebar-${index}`} />
              <Label htmlFor={`rebar-${index}`} className="text-xs cursor-pointer">Include Rebar</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={item.include_forming} onCheckedChange={v => onUpdate('include_forming', v)} id={`forming-${index}`} />
              <Label htmlFor={`forming-${index}`} className="text-xs cursor-pointer">Include Forming</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={item.include_finishing} onCheckedChange={v => onUpdate('include_finishing', v)} id={`finishing-${index}`} />
              <Label htmlFor={`finishing-${index}`} className="text-xs cursor-pointer">Include Finishing</Label>
            </div>
          </div>

          {/* Forming selection */}
          {item.include_forming && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
              <Label className="text-xs">Forming Material</Label>
              <Select value={item.selected_forming_id || ''} onValueChange={v => onUpdate('selected_forming_id', v)}>
                <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Select forming material..." /></SelectTrigger>
                <SelectContent>
                  {formingInventory?.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      <div className="flex flex-col text-left py-1 max-w-[400px]">
                         <span className="font-medium">{f.material_name}</span>
                         {(f.material_description || f.notes) && <span className="text-xs text-slate-500 whitespace-normal mt-0.5">{f.material_description || f.notes}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Rebar spacing — only shown when rebar is checked */}
          {item.include_rebar && item.foundation_type === 'spread_foot' && (
            <div className="grid grid-cols-3 gap-3 bg-amber-50 rounded-lg p-3">
              <div>
                <Label className="text-xs">Rebar Size</Label>
                <Select value={item.rebar_size || '#4'} onValueChange={v => onUpdate('rebar_size', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['#3', '#4', '#5', '#6'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Spacing Along Length (in)</Label>
                <Input type="number" className="h-8" value={item.rebar_spacing_length} onChange={e => onUpdate('rebar_spacing_length', parseFloat(e.target.value) || 12)} />
              </div>
              <div>
                <Label className="text-xs">Spacing Along Width (in)</Label>
                <Input type="number" className="h-8" value={item.rebar_spacing_width} onChange={e => onUpdate('rebar_spacing_width', parseFloat(e.target.value) || 12)} />
              </div>
              <div>
                <Label className="text-xs">Layers</Label>
                <Input type="number" className="h-8" value={item.rebar_layers || 1} onChange={e => onUpdate('rebar_layers', parseInt(e.target.value) || 1)} min={1} />
              </div>
              <div>
                <Label className="text-xs">Layer Separation (in)</Label>
                <Input type="number" className="h-8" value={item.rebar_layer_separation_inches || 12} onChange={e => onUpdate('rebar_layer_separation_inches', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          )}

          {/* Excavation display */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-600 uppercase tracking-wide">Excavation</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs capitalize">{excavationMethod?.replace('_', ' ')}</Badge>
                {excavationEquipment && <Badge variant="secondary" className="text-xs">{excavationEquipment.material_name}</Badge>}
              </div>
            </div>
            <div className="text-slate-500">
              Volume: ~{((item.foundation_type === 'spread_foot'
                ? (item.length_inches / 12) * (item.width_inches / 12) * (item.depth_inches / 12)
                : Math.PI * ((item.diameter / 2) / 12) ** 2 * (item.depth_inches / 12)) / 27 * (item.quantity || 1) * 1.25).toFixed(2)} CY
              &nbsp;·&nbsp; Cost: <span className="font-semibold text-slate-700">${costs?.excavationCost?.toFixed(2) || '0.00'}</span>
            </div>
          </div>

          {/* Cost breakdown */}
          {costs && (
            <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
              <div>
                <p className="text-slate-400">Concrete {costs.concreteBags ? `(${costs.concreteBags} bags)` : ''}</p>
                <p className="font-medium">${costs.concreteCost.toFixed(2)}</p>
              </div>
              <div><p className="text-slate-400">Rebar</p><p className="font-medium">${costs.rebarCost.toFixed(2)}</p></div>
              <div><p className="text-slate-400">Forming</p><p className="font-medium">${costs.formingCost.toFixed(2)}</p></div>
              <div><p className="text-slate-400">Finishing</p><p className="font-medium">${costs.finishingCost.toFixed(2)}</p></div>
              <div><p className="text-slate-400">Excavation</p><p className="font-medium">${costs.excavationCost.toFixed(2)}</p></div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}