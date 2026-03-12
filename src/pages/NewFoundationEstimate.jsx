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
import { Plus, Save, ArrowLeft, Trash2, Calculator } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import WallSection from '@/components/WallSection';
import { UnsavedChangesContext } from '@/components/UnsavedChangesContext';

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
    diameter: 0,
    depth_inches: 36,
    grade_offset_inches: 0,
    include_rebar: false,
    include_forming: true,
    include_finishing: true,
    rebar_size: '#4',
    rebar_spacing_length: 12,
    rebar_spacing_width: 12,
    selected_pole_id: '',
    pole_offset_from_bottom_inches: 0,
    pole_total_height_inches: 0,
    include_pole_painting: false,
    include_wall_material: false,
    wall_length_inches: 0,
    wall_width_inches: 8,
    wall_height_inches: 0,
    selected_brick_id: '',
    mortar_gap_inches: 0.375,
    brick_layer_offset_inches: 0,
    include_fill_material: false,
    selected_fill_material_id: '',
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
    excavation_method: 'hand_dig',
    selected_concrete_id: '',
  });
  const [items, setItems] = useState([newItem()]);
  const [walls, setWalls] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [wallMaterials, setWallMaterials] = useState([]);
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

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
      }
    }
    setLoading(false);
  };

  const markDirty = () => setIsDirty(true);

  const updateProject = (field, value) => {
    setProject(prev => ({ ...prev, [field]: value }));
    markDirty();
  };

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

  // Get first foundation's dimensions for wall constraint
  const firstFoundation = items[0];
  const foundationLengthInches = firstFoundation?.length_inches || 0;
  const foundationWidthInches = firstFoundation?.width_inches || 0;

  // Simple foundation cost calculations
  const getSetting = (key, def) => parseFloat(settings[key] || def);
  
  const calcItemCost = (item) => {
    const conc_cost_per_cy = item.custom_concrete_cost_per_cy || getSetting('foundation_concrete_cost_per_cy', 135);
    const rebar_cost_per_ft = item.custom_rebar_cost_per_ft || getSetting('foundation_rebar_cost_per_ft', 0.75);
    const forming_labor = getSetting('foundation_forming_labor_rate', 55);
    const pouring_labor = getSetting('foundation_pouring_labor_rate', 60);
    const finishing_labor = getSetting('foundation_finishing_labor_rate', 50);
    const forming_mult = item.foundation_type === 'spread_foot'
      ? getSetting('foundation_forming_materials_spread_foot', 0.5)
      : getSetting('foundation_forming_materials_pillar', 0.75);

    let volumeCY = 0;
    if (item.foundation_type === 'spread_foot') {
      const vol = (item.length_inches / 12) * (item.width_inches / 12) * (item.depth_inches / 12);
      volumeCY = vol / 27;
    } else {
      const r = (item.diameter / 2) / 12;
      const d = item.depth_inches / 12;
      volumeCY = (Math.PI * r * r * d) / 27;
    }
    volumeCY = volumeCY * (item.quantity || 1);

    const concreteCost = volumeCY * conc_cost_per_cy;

    let rebarCost = 0;
    if (item.include_rebar && item.foundation_type === 'spread_foot') {
      const numBarsL = Math.floor(item.width_inches / (item.rebar_spacing_width || 12)) + 1;
      const numBarsW = Math.floor(item.length_inches / (item.rebar_spacing_length || 12)) + 1;
      const totalFt = (numBarsL * (item.length_inches / 12) + numBarsW * (item.width_inches / 12)) * (item.quantity || 1);
      rebarCost = totalFt * rebar_cost_per_ft;
    }

    let formingCost = 0;
    if (item.include_forming) {
      const perim = item.foundation_type === 'spread_foot'
        ? 2 * (item.length_inches + item.width_inches) / 12
        : Math.PI * item.diameter / 12;
      const formingHours = perim * 0.25 * (item.quantity || 1);
      formingCost = formingHours * forming_labor + (concreteCost * forming_mult);
    }

    let finishingCost = 0;
    if (item.include_finishing) {
      const topArea = item.foundation_type === 'spread_foot'
        ? (item.length_inches * item.width_inches) / 144
        : Math.PI * ((item.diameter / 2 / 12) ** 2);
      const finHours = topArea * 0.1 * (item.quantity || 1);
      finishingCost = finHours * finishing_labor;
    }

    let excavationCost = 0;
    const excVol = volumeCY * 1.2;
    if (project.excavation_method === 'hand_dig') {
      const handRate = getSetting('foundation_hand_dig_excavation_cost_per_cy', 10);
      const handLaborRate = getSetting('foundation_hand_dig_labor_rate', 45);
      excavationCost = excVol * (handRate + handLaborRate * 0.3);
    } else {
      const eqRate = getSetting('foundation_equipment_excavation_cost_per_cy', 15);
      excavationCost = excVol * eqRate;
    }

    return {
      concreteCost,
      rebarCost,
      formingCost,
      finishingCost,
      excavationCost,
      total: concreteCost + rebarCost + formingCost + finishingCost + excavationCost,
    };
  };

  const totals = (() => {
    const itemTotals = items.map(calcItemCost);
    const wallTotal = walls.reduce((s, w) => s + (w.calculatedCosts?.totalCost || 0), 0);
    const itemsTotal = itemTotals.reduce((s, t) => s + t.total, 0);
    return { itemsTotal, wallTotal, grand: itemsTotal + wallTotal };
  })();

  const handleSave = async () => {
    if (!project.project_name || !project.client_name) {
      alert('Please fill in Project Name and Client Name.');
      return;
    }
    setSaving(true);
    const data = {
      ...project,
      items: items.map(({ _id, ...rest }) => rest),
      walls: walls.map(({ _id, ...rest }) => rest),
      total_labor_cost: totals.grand,
    };
    if (editId) {
      await FoundationProjectEntity.update(editId, data);
    } else {
      await FoundationProjectEntity.create(data);
    }
    setIsDirty(false);
    setSaving(false);
    navigate(createPageUrl('FoundationProjects'));
  };

  const poles = inventory.filter(i => i.material_type === 'pole');
  const concreteServices = inventory.filter(i => i.material_type === 'concrete_service' || i.material_type === 'bagged_concrete');
  const brickItems = inventory.filter(i => i.material_type === 'brick_stone');
  const fillItems = inventory.filter(i => i.material_type === 'fill_material');

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl('FoundationProjects')}>
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{editId ? 'Edit Foundation Estimate' : 'New Foundation Estimate'}</h1>
            <p className="text-sm text-slate-500">Foundation, excavation & wall estimating</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-base px-3 py-1">
            Total: ${totals.grand.toFixed(2)}
          </Badge>
          <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white">
            <Save className="w-4 h-4 mr-1" />
            {saving ? 'Saving...' : 'Save Estimate'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info">Project Info</TabsTrigger>
          <TabsTrigger value="foundation">Foundation ({items.length})</TabsTrigger>
          <TabsTrigger value="walls">Walls ({walls.length})</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        {/* PROJECT INFO */}
        <TabsContent value="info" className="space-y-4 pt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Project Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Project Name *</Label>
                <Input className="h-9" value={project.project_name} onChange={e => updateProject('project_name', e.target.value)} placeholder="e.g. Smith Property Sign Foundation" />
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
                <Label className="text-xs">Excavation Method</Label>
                <Select value={project.excavation_method} onValueChange={v => updateProject('excavation_method', v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hand_dig">Hand Dig</SelectItem>
                    <SelectItem value="equipment_excavation">Equipment Excavation</SelectItem>
                  </SelectContent>
                </Select>
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
                <Textarea className="min-h-[80px]" value={project.notes} onChange={e => updateProject('notes', e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FOUNDATION ITEMS */}
        <TabsContent value="foundation" className="space-y-4 pt-4">
          {items.map((item, idx) => (
            <FoundationItemRow
              key={item._id}
              item={item}
              index={idx}
              onUpdate={(field, value) => updateItem(idx, field, value)}
              onRemove={() => removeItem(idx)}
              poles={poles}
              brickItems={brickItems}
              fillItems={fillItems}
              concreteServices={concreteServices}
              costs={calcItemCost(item)}
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
              <p className="text-sm text-slate-600">Design and cost walls built above the foundation using brick, stone, cinderblock, or concrete.</p>
              {wallMaterials.length === 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  No wall materials in inventory. <Link to={createPageUrl('FoundationInventory')} className="underline font-medium">Add wall materials →</Link>
                </p>
              )}
            </div>
            <Button onClick={addWall} className="bg-amber-600 hover:bg-amber-700 text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Wall
            </Button>
          </div>

          {walls.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-slate-400">
                <div className="text-4xl mb-3">🧱</div>
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
              wallMaterials={wallMaterials}
              foundationLengthInches={foundationLengthInches}
              foundationWidthInches={foundationWidthInches}
              settings={settings}
              onChange={(updated) => updateWall(idx, updated)}
              onDelete={() => removeWall(idx)}
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

        {/* SUMMARY */}
        <TabsContent value="summary" className="space-y-4 pt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Cost Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-600">Foundation & Excavation</span>
                <span className="font-semibold">${totals.itemsTotal.toFixed(2)}</span>
              </div>
              {walls.map((w, i) => (
                <div key={w._id} className="flex justify-between py-1 text-sm">
                  <span className="text-slate-500 ml-4">Wall #{i + 1}: {w.name || 'Untitled'}</span>
                  <span>${(w.calculatedCosts?.totalCost || 0).toFixed(2)}</span>
                </div>
              ))}
              {walls.length > 0 && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-600">Total Walls</span>
                  <span className="font-semibold">${totals.wallTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between py-3">
                <span className="text-lg font-bold text-slate-900">Grand Total</span>
                <span className="text-lg font-bold text-amber-700">${totals.grand.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Simple foundation item row (inline)
function FoundationItemRow({ item, index, onUpdate, onRemove, poles, brickItems, fillItems, concreteServices, costs }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card className="border border-slate-200">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold">
              Foundation #{index + 1}
              {item.description ? ` - ${item.description}` : ''}
            </CardTitle>
            <Badge variant="outline" className="text-xs capitalize">{item.foundation_type?.replace('_', ' ')}</Badge>
            {costs && <Badge variant="secondary" className="text-xs">${costs.total.toFixed(2)}</Badge>}
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setExpanded(s => !s)}>
              {expanded ? '▲' : '▼'}
            </Button>
            <Button size="sm" variant="ghost" className="text-red-500" onClick={onRemove}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-4 pb-4 space-y-4">
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
                <Label className="text-xs">Grade Offset (in)</Label>
                <Input type="number" className="h-8" value={item.grade_offset_inches} onChange={e => onUpdate('grade_offset_inches', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Diameter (inches)</Label>
                <Input type="number" className="h-8" value={item.diameter} onChange={e => onUpdate('diameter', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={item.include_rebar}
                onCheckedChange={v => onUpdate('include_rebar', v)}
                id={`rebar-${index}`}
              />
              <Label htmlFor={`rebar-${index}`} className="text-xs cursor-pointer">Include Rebar</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={item.include_forming}
                onCheckedChange={v => onUpdate('include_forming', v)}
                id={`forming-${index}`}
              />
              <Label htmlFor={`forming-${index}`} className="text-xs cursor-pointer">Include Forming</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={item.include_finishing}
                onCheckedChange={v => onUpdate('include_finishing', v)}
                id={`finishing-${index}`}
              />
              <Label htmlFor={`finishing-${index}`} className="text-xs cursor-pointer">Include Finishing</Label>
            </div>
          </div>

          {costs && (
            <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
              <div><p className="text-slate-400">Concrete</p><p className="font-medium">${costs.concreteCost.toFixed(2)}</p></div>
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