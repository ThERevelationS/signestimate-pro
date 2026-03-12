import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Plus, Edit, Package, Drill, Truck, Columns, Layers, Building2 } from 'lucide-react';

const FoundationInventoryEntity = base44.entities.FoundationInventory;

const WALL_SUBTYPES = [
  { value: 'brick', label: 'Brick' },
  { value: 'cinderblock', label: 'Cinderblock / CMU' },
  { value: 'stone', label: 'Stone' },
  { value: 'concrete', label: 'Concrete (poured/cast)' },
];

const TEXTURE_OPTIONS = [
  { value: 'smooth', label: 'Smooth' },
  { value: 'rough', label: 'Rough / Natural' },
  { value: 'textured', label: 'Textured' },
  { value: 'glazed', label: 'Glazed' },
];

const PRESET_COLORS = [
  { label: 'Red Brick', value: '#b5451b' },
  { label: 'Tan Brick', value: '#c8a97e' },
  { label: 'Gray Concrete', value: '#9ca3af' },
  { label: 'Dark Charcoal', value: '#4b5563' },
  { label: 'Sandstone', value: '#d4a76a' },
  { label: 'Limestone', value: '#e5d9c3' },
  { label: 'Slate Gray', value: '#708090' },
  { label: 'Cream', value: '#f5e6c8' },
  { label: 'Brown', value: '#795548' },
  { label: 'White', value: '#f5f5f5' },
];

function WallMaterialForm({ item, onSave, onCancel }) {
  const [form, setForm] = useState({
    material_name: '',
    material_type: 'wall_material',
    wall_material_subtype: 'brick',
    wall_unit_length_inches: 8,
    wall_unit_width_inches: 4,
    wall_unit_height_inches: 2.25,
    wall_color: '#b5451b',
    wall_texture: 'rough',
    cost_per_unit: 0.75,
    supplier: '',
    notes: '',
    ...item,
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const isConcrete = form.wall_material_subtype === 'concrete';

  // Preset dimensions
  const applyPreset = (subtype) => {
    set('wall_material_subtype', subtype);
    if (subtype === 'brick') {
      set('wall_unit_length_inches', 8);
      set('wall_unit_width_inches', 3.75);
      set('wall_unit_height_inches', 2.25);
    } else if (subtype === 'cinderblock') {
      set('wall_unit_length_inches', 16);
      set('wall_unit_width_inches', 8);
      set('wall_unit_height_inches', 8);
    } else if (subtype === 'stone') {
      set('wall_unit_length_inches', 12);
      set('wall_unit_width_inches', 6);
      set('wall_unit_height_inches', 4);
    } else if (subtype === 'concrete') {
      set('wall_unit_length_inches', 0);
      set('wall_unit_width_inches', 8);
      set('wall_unit_height_inches', 0);
      set('wall_color', '#9ca3af');
      set('wall_texture', 'smooth');
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs">Material Name *</Label>
          <Input className="h-8" value={form.material_name} onChange={e => set('material_name', e.target.value)} placeholder="e.g. Standard Red Brick" />
        </div>
        <div>
          <Label className="text-xs">Material Subtype</Label>
          <Select value={form.wall_material_subtype} onValueChange={v => applyPreset(v)}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WALL_SUBTYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Cost Per Unit ($)</Label>
          <Input type="number" className="h-8" value={form.cost_per_unit} onChange={e => set('cost_per_unit', parseFloat(e.target.value) || 0)} step="0.01" min="0" />
        </div>
      </div>

      {!isConcrete && (
        <>
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide pt-1">Unit Dimensions</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Length (inches)</Label>
              <Input type="number" className="h-8" value={form.wall_unit_length_inches} onChange={e => set('wall_unit_length_inches', parseFloat(e.target.value) || 0)} step="0.125" min="0.1" />
            </div>
            <div>
              <Label className="text-xs">Width / Depth (inches)</Label>
              <Input type="number" className="h-8" value={form.wall_unit_width_inches} onChange={e => set('wall_unit_width_inches', parseFloat(e.target.value) || 0)} step="0.125" min="0.1" />
            </div>
            <div>
              <Label className="text-xs">Height (inches)</Label>
              <Input type="number" className="h-8" value={form.wall_unit_height_inches} onChange={e => set('wall_unit_height_inches', parseFloat(e.target.value) || 0)} step="0.125" min="0.1" />
            </div>
          </div>
        </>
      )}

      {isConcrete && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Wall Depth / Width (inches)</Label>
            <Input type="number" className="h-8" value={form.wall_unit_width_inches} onChange={e => set('wall_unit_width_inches', parseFloat(e.target.value) || 0)} step="0.5" min="1" />
          </div>
        </div>
      )}

      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide pt-1">Visual / 3D Appearance</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Color</Label>
          <div className="flex gap-2 mt-1 flex-wrap">
            {PRESET_COLORS.map(c => (
              <button
                key={c.value}
                title={c.label}
                className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${form.wall_color === c.value ? 'border-blue-500 scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c.value }}
                onClick={() => set('wall_color', c.value)}
              />
            ))}
            <input
              type="color"
              value={form.wall_color || '#b5451b'}
              onChange={e => set('wall_color', e.target.value)}
              className="w-6 h-6 rounded border cursor-pointer"
              title="Custom color"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Texture</Label>
          <Select value={form.wall_texture || 'rough'} onValueChange={v => set('wall_texture', v)}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEXTURE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Supplier</Label>
          <Input className="h-8" value={form.supplier || ''} onChange={e => set('supplier', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Notes</Label>
          <Input className="h-8" value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => onSave(form)} disabled={!form.material_name}>Save</Button>
      </div>
    </div>
  );
}

export default function FoundationInventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('wall_material');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showFillForm, setShowFillForm] = useState(false);
  const [fillEditItem, setFillEditItem] = useState(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    const data = await FoundationInventoryEntity.list('-created_date', 200);
    setItems(data);
    setLoading(false);
  };

  const wallMaterials = items.filter(i => i.material_type === 'wall_material');
  const legacyItems = items.filter(i => i.material_type !== 'wall_material');

  const handleSaveWall = async (form) => {
    if (editItem?.id) {
      await FoundationInventoryEntity.update(editItem.id, form);
    } else {
      await FoundationInventoryEntity.create(form);
    }
    setShowForm(false);
    setEditItem(null);
    loadItems();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    await FoundationInventoryEntity.delete(id);
    loadItems();
  };

  const openEdit = (item) => {
    setEditItem(item);
    setShowForm(true);
  };

  // Legacy material types for the other tabs
  const legacyConcrete = legacyItems.filter(i => i.material_type === 'concrete_service' || i.material_type === 'bagged_concrete');
  const legacyRebar = legacyItems.filter(i => i.material_type === 'rebar');
  const legacyForming = legacyItems.filter(i => i.material_type === 'forming_material');
  const legacyEquipment = legacyItems.filter(i => i.material_type === 'excavation_equipment' || i.material_type === 'attachment');
  const legacyPoles = legacyItems.filter(i => i.material_type === 'pole');
  const legacyBrick = legacyItems.filter(i => i.material_type === 'brick_stone');
  const legacyFill = legacyItems.filter(i => i.material_type === 'fill_material');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Foundation Inventory</h1>
          <p className="text-slate-500 text-sm">Manage materials, equipment, and wall units for foundation projects</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="wall_material" className="flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Wall Materials
          </TabsTrigger>
          <TabsTrigger value="concrete">Concrete</TabsTrigger>
          <TabsTrigger value="rebar">Rebar</TabsTrigger>
          <TabsTrigger value="forming">Forming</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="poles">Poles</TabsTrigger>
          <TabsTrigger value="brick_fill">Wall Fill Materials</TabsTrigger>
        </TabsList>

        {/* WALL MATERIALS TAB */}
        <TabsContent value="wall_material" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">Brick, cinderblock, stone, and concrete units for building walls above the foundation.</p>
            <Button size="sm" onClick={() => { setEditItem(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Add Wall Material
            </Button>
          </div>

          {loading ? (
            <div className="text-center text-slate-400 py-8">Loading...</div>
          ) : wallMaterials.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-slate-400">
                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No wall materials yet. Add brick, stone, cinderblock, or concrete units.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wallMaterials.map(m => (
                <Card key={m.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded border border-slate-300 flex-shrink-0"
                          style={{ backgroundColor: m.wall_color || '#cc9966' }}
                        />
                        <div>
                          <CardTitle className="text-sm font-semibold">{m.material_name}</CardTitle>
                          <Badge variant="outline" className="text-xs capitalize">{m.wall_material_subtype}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(m)}><Edit className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(m.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 text-xs text-slate-600 space-y-1">
                    {m.wall_material_subtype !== 'concrete' && (
                      <div>Size: {m.wall_unit_length_inches}"L × {m.wall_unit_width_inches}"W × {m.wall_unit_height_inches}"H</div>
                    )}
                    {m.wall_material_subtype === 'concrete' && (
                      <div>Wall depth: {m.wall_unit_width_inches}"</div>
                    )}
                    <div>Cost: ${parseFloat(m.cost_per_unit || 0).toFixed(2)} / unit</div>
                    <div>Texture: <span className="capitalize">{m.wall_texture}</span></div>
                    {m.supplier && <div>Supplier: {m.supplier}</div>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* CONCRETE TAB */}
        <TabsContent value="concrete">
          <LegacyItemsTable items={legacyConcrete} onDelete={handleDelete} label="Concrete Services & Bagged Concrete" />
        </TabsContent>

        {/* REBAR TAB */}
        <TabsContent value="rebar">
          <LegacyItemsTable items={legacyRebar} onDelete={handleDelete} label="Rebar" />
        </TabsContent>

        {/* FORMING TAB */}
        <TabsContent value="forming">
          <LegacyItemsTable items={legacyForming} onDelete={handleDelete} label="Forming Materials" />
        </TabsContent>

        {/* EQUIPMENT TAB */}
        <TabsContent value="equipment">
          <LegacyItemsTable items={legacyEquipment} onDelete={handleDelete} label="Equipment & Attachments" />
        </TabsContent>

        {/* POLES TAB */}
        <TabsContent value="poles">
          <LegacyItemsTable items={legacyPoles} onDelete={handleDelete} label="Poles" />
        </TabsContent>

        {/* WALL FILL MATERIALS TAB */}
        <TabsContent value="brick_fill" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">Brick/stone and fill materials used inside foundation walls (gravel, foam, poured concrete, etc.).</p>
            <Button size="sm" onClick={() => { setFillEditItem(null); setShowFillForm(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Add Fill Material
            </Button>
          </div>
          {loading ? (
            <div className="text-center text-slate-400 py-8">Loading...</div>
          ) : [...legacyBrick, ...legacyFill].length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-slate-400">
                <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No fill materials yet. Add brick/stone or fill types to use in foundation estimates.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {[...legacyBrick, ...legacyFill].map(item => (
                <Card key={item.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.material_name}</p>
                      <p className="text-xs text-slate-500 capitalize">{item.material_type?.replace(/_/g, ' ')} · {item.unit || ''}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.cost_per_unit && <span className="text-sm font-medium">${parseFloat(item.cost_per_unit).toFixed(2)}</span>}
                      <Button size="sm" variant="ghost" onClick={() => { setFillEditItem(item); setShowFillForm(true); }}><Edit className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Wall Material Form Dialog */}
      <Dialog open={showForm} onOpenChange={open => { if (!open) { setShowForm(false); setEditItem(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Wall Material' : 'Add Wall Material'}</DialogTitle>
          </DialogHeader>
          <WallMaterialForm
            item={editItem}
            onSave={handleSaveWall}
            onCancel={() => { setShowForm(false); setEditItem(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Fill Material Form Dialog */}
      <Dialog open={showFillForm} onOpenChange={open => { if (!open) { setShowFillForm(false); setFillEditItem(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{fillEditItem ? 'Edit Fill Material' : 'Add Fill Material'}</DialogTitle>
          </DialogHeader>
          <FillMaterialForm
            item={fillEditItem}
            onSave={async (form) => {
              if (fillEditItem?.id) {
                await FoundationInventoryEntity.update(fillEditItem.id, form);
              } else {
                await FoundationInventoryEntity.create(form);
              }
              setShowFillForm(false);
              setFillEditItem(null);
              loadItems();
            }}
            onCancel={() => { setShowFillForm(false); setFillEditItem(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LegacyItemsTable({ items, onDelete, label }) {
  if (items.length === 0) {
    return (
      <Card className="border-dashed mt-4">
        <CardContent className="py-10 text-center text-slate-400">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No {label.toLowerCase()} items in inventory.</p>
          <p className="text-xs mt-1">Add items via the Foundation Inventory to use them in estimates.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm font-medium text-slate-700">{label} ({items.length})</p>
      <div className="space-y-2">
        {items.map(item => (
          <Card key={item.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{item.material_name}</p>
                <p className="text-xs text-slate-500 capitalize">{item.material_type?.replace(/_/g, ' ')} · {item.unit || ''}</p>
              </div>
              <div className="flex items-center gap-3">
                {item.cost_per_unit && <span className="text-sm font-medium">${parseFloat(item.cost_per_unit).toFixed(2)}</span>}
                {item.cost_per_day && <span className="text-xs text-slate-500">${item.cost_per_day}/day</span>}
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => onDelete(item.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}