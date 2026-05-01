import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Copy } from 'lucide-react';

export default function FoundationItemRow({ item, index, onUpdate, onRemove, onDuplicate, poles, concreteServices, formingInventory, costs, excavationMethod, excavationEquipment }) {
  const [expanded, setExpanded] = useState(true);

  const selectedConcrete = concreteServices.find(c => c.id === item.selected_concrete_id);
  const isConcreteService = selectedConcrete?.material_type === 'concrete_service';

  return (
    <Card className="border border-blue-200 shadow-sm overflow-hidden mb-4">
      <CardHeader className="py-3 px-4 bg-blue-50/60 border-b border-blue-100">
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
            {onDuplicate && (
              <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50" onClick={onDuplicate} title="Duplicate this foundation">
                <Copy className="w-3 h-3" />
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-red-500" onClick={onRemove}><Trash2 className="w-3 h-3" /></Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-4 pb-4 space-y-4">
          {/* Basic */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div id={`foundation-type-${index}`}>
              <Label className="text-xs">Foundation Type</Label>
              <Select value={item.foundation_type} onValueChange={v => {
                  onUpdate('foundation_type', v);
                  onUpdate('grade_offset_inches', v === 'pillar' ? -3 : 2);
                }}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="spread_foot">Spread Foot</SelectItem>
                  <SelectItem value="pillar">Pillar / Drilled Pier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div id={`foundation-quantity-${index}`}>
              <Label className="text-xs">Quantity</Label>
              <Input type="number" className="h-8" value={item.quantity} onChange={e => onUpdate('quantity', parseInt(e.target.value) || 1)} min={1} />
            </div>
          </div>

          {/* Dimensions & Materials */}
          <div id={`foundation-dimensions-${index}`} className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {item.foundation_type === 'spread_foot' ? (
              <>
                <div>
                  <Label className="text-xs">Length (inches)</Label>
                  <Input type="number" className="h-8" value={item.length_inches} onChange={e => onUpdate('length_inches', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Width (inches)</Label>
                  <Input type="number" className="h-8" value={item.width_inches} onChange={e => onUpdate('width_inches', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Depth (inches)</Label>
                  <Input type="number" className="h-8" value={item.depth_inches} onChange={e => {
                    const val = e.target.value;
                    onUpdate('depth_inches', val);
                    const depth = parseFloat(val) || 0;
                    if (item.include_rebar && item.rebar_layer_separation_inches) {
                      onUpdate('rebar_layers', Math.floor(depth / (parseFloat(item.rebar_layer_separation_inches)||1)) || 1);
                    }
                  }} />
                </div>
                <div>
                  <Label className="text-xs">Height relative to grade (inches)</Label>
                  <Input type="number" className="h-8" value={item.grade_offset_inches} onChange={e => onUpdate('grade_offset_inches', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Rotation (°)</Label>
                  <Input type="number" className="h-8" value={item.rotation_degrees || 0} onChange={e => onUpdate('rotation_degrees', parseFloat(e.target.value) || 0)} />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-xs">Diameter (inches)</Label>
                  <Input type="number" className="h-8" value={item.diameter} onChange={e => onUpdate('diameter', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Depth (inches)</Label>
                  <Input type="number" className="h-8" value={item.depth_inches} onChange={e => {
                    const val = e.target.value;
                    onUpdate('depth_inches', val);
                    const depth = parseFloat(val) || 0;
                    if (item.include_rebar && item.rebar_layer_separation_inches) {
                      onUpdate('rebar_layers', Math.floor(depth / (parseFloat(item.rebar_layer_separation_inches)||1)) || 1);
                    }
                  }} />
                </div>
                <div>
                  <Label className="text-xs">Height relative to grade (inches)</Label>
                  <Input type="number" className="h-8" value={item.grade_offset_inches ?? 0} onChange={e => onUpdate('grade_offset_inches', e.target.value)} />
                </div>
              </>
            )}
          </div>

          {/* Options */}
          <div id={`foundation-toggles-${index}`} className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Checkbox checked={item.include_rebar} onCheckedChange={v => {
                onUpdate('include_rebar', v);
                if (v && item.depth_inches && item.rebar_layer_separation_inches) {
                  onUpdate('rebar_layers', Math.floor(item.depth_inches / item.rebar_layer_separation_inches) || 1);
                }
              }} id={`rebar-${index}`} />
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
            <div id={`foundation-forming-${index}`} className="bg-amber-50 border border-amber-100 rounded-lg p-3">
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
            <div id={`foundation-rebar-${index}`} className="grid grid-cols-3 gap-3 bg-amber-50 rounded-lg p-3">
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
                <Input type="number" className="h-8" value={item.rebar_layer_separation_inches || 12} onChange={e => {
                  const sep = parseFloat(e.target.value) || 0;
                  onUpdate('rebar_layer_separation_inches', sep);
                  if (item.include_rebar && item.depth_inches && sep) {
                    onUpdate('rebar_layers', Math.floor(item.depth_inches / sep) || 1);
                  }
                }} />
              </div>
            </div>
          )}

          {/* Pillar rebar spacing */}
          {item.include_rebar && item.foundation_type === 'pillar' && (
            <div id={`foundation-rebar-${index}`} className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-amber-50 rounded-lg p-3">
              <div>
                <Label className="text-xs">Rebar Size</Label>
                <Select value={item.pillar_rebar_size || '#4'} onValueChange={v => onUpdate('pillar_rebar_size', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['#3', '#4', '#5', '#6'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Hoop Diameter (in)</Label>
                <Input type="number" className="h-8" value={item.pillar_rebar_hoop_diameter || Math.max(0, (item.diameter || 0) - 4)} onChange={e => {
                  let val = parseFloat(e.target.value) || 0;
                  const maxDia = Math.max(0, (item.diameter || 0) - 4);
                  if (val > maxDia) val = maxDia;
                  onUpdate('pillar_rebar_hoop_diameter', val);
                }} max={Math.max(0, (item.diameter || 0) - 4)} />
                <p className="text-[10px] text-slate-500 mt-1">Max: {Math.max(0, (item.diameter || 0) - 4)}" (2" clearance)</p>
              </div>
              <div>
                <Label className="text-xs">Vertical Pieces</Label>
                <Input type="number" className="h-8" value={item.pillar_vertical_rebar_count || 4} onChange={e => onUpdate('pillar_vertical_rebar_count', parseInt(e.target.value) || 1)} min={1} />
              </div>
              <div>
                <Label className="text-xs">Hoop Layers</Label>
                <Input type="number" className="h-8" value={item.pillar_rebar_layers || 1} onChange={e => onUpdate('pillar_rebar_layers', parseInt(e.target.value) || 1)} min={1} />
              </div>
              <div>
                <Label className="text-xs">Layer Separation (in)</Label>
                <Input type="number" className="h-8" value={item.pillar_rebar_layer_separation_inches || 12} onChange={e => {
                  const sep = parseFloat(e.target.value) || 0;
                  onUpdate('pillar_rebar_layer_separation_inches', sep);
                  if (item.include_rebar && item.depth_inches && sep) {
                    onUpdate('pillar_rebar_layers', Math.floor(item.depth_inches / sep) || 1);
                  }
                }} />
              </div>
            </div>
          )}

          {/* Excavation & Concrete Type */}
          <div id={`foundation-excavation-${index}`} className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 grid grid-cols-1 gap-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-indigo-800 uppercase tracking-wide">Excavation Method</Label>
                <Select value={item.excavation_method || 'hand_dig'} onValueChange={v => onUpdate('excavation_method', v)}>
                  <SelectTrigger className="h-8 mt-1 bg-white max-w-[300px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hand_dig">Hand Dig</SelectItem>
                    <SelectItem value="equipment_excavation">Equipment Excavation</SelectItem>
                  </SelectContent>
                </Select>
                {item.excavation_method === 'equipment_excavation' && (
                  <p className="text-sm text-red-600 mt-1 font-medium">See Equipment Tab to Select Equipment for the Project.</p>
                )}
              </div>
              <div id={`foundation-concrete-${index}`}>
                <Label className="text-xs font-semibold text-indigo-800 uppercase tracking-wide">Concrete Type</Label>
                <Select value={item.selected_concrete_id || ''} onValueChange={v => onUpdate('selected_concrete_id', v)}>
                  <SelectTrigger className="h-8 mt-1 bg-white"><SelectValue placeholder="Select concrete..." /></SelectTrigger>
                  <SelectContent>
                    {concreteServices.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex flex-col text-left py-1 max-w-[300px]">
                           <span className="font-medium">{c.material_name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Additional sign location - only shown if index > 0 and concrete service selected */}
            {index > 0 && isConcreteService && (
              <div className="pt-2 mt-2 border-t border-indigo-100">
                <div className="flex items-center gap-2">
                  <Checkbox checked={item.is_new_sign_location || false} onCheckedChange={v => onUpdate('is_new_sign_location', v)} id={`new-location-${index}`} />
                  <Label htmlFor={`new-location-${index}`} className="text-sm cursor-pointer text-indigo-900 font-bold">Additional Sign Location for Concrete (+$100 stop fee)</Label>
                </div>
              </div>
            )}
          </div>

          {/* Excavation display */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs mt-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col justify-center">
                <span className="font-semibold text-amber-800 uppercase tracking-wide mb-1">Excavation</span>
                <div className="text-slate-500">
                  Volume: ~{((item.foundation_type === 'spread_foot'
                    ? ((parseFloat(item.length_inches)||0) / 12) * ((parseFloat(item.width_inches)||0) / 12) * ((parseFloat(item.depth_inches)||0) / 12)
                    : Math.PI * (((parseFloat(item.diameter)||0) / 2) / 12) ** 2 * ((parseFloat(item.depth_inches)||0) / 12)) / 27 * (parseInt(item.quantity) || 1) * 1.25).toFixed(2)} CY
                  &nbsp;·&nbsp; Cost: <span className="font-semibold text-slate-700">${costs?.excavationCost?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                  {item.excavation_method === 'equipment_excavation' && excavationEquipment && <Badge variant="secondary" className="text-xs">{excavationEquipment.material_name}</Badge>}
              </div>
            </div>
          </div>

          {/* Cost breakdown */}
          {costs && (
            <div id={`foundation-costs-${index}`} className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-4">
              {costs.concreteCost > 0 && <div><p className="text-emerald-700/70">Concrete {costs.concreteBags ? `(${costs.concreteBags} bags)` : ''}</p><p className="font-medium text-emerald-900">${costs.concreteCost.toFixed(2)}</p></div>}
              <div><p className="text-emerald-700/70">Rebar</p><p className="font-medium text-emerald-900">${costs.rebarCost.toFixed(2)}</p></div>
              <div><p className="text-emerald-700/70">Forming</p><p className="font-medium text-emerald-900">${costs.formingCost.toFixed(2)}</p></div>
              <div><p className="text-emerald-700/70">Pouring</p><p className="font-medium text-emerald-900">${costs.pouringCost.toFixed(2)}</p></div>
              <div><p className="text-emerald-700/70">Finishing</p><p className="font-medium text-emerald-900">${costs.finishingCost.toFixed(2)}</p></div>
              <div><p className="text-emerald-700/70">Excavation</p><p className="font-medium text-emerald-900">${costs.excavationCost.toFixed(2)}</p></div>
              {costs.concreteCost === 0 && (
                <div className="col-span-2 md:col-span-4 border-t border-emerald-100 pt-2 mt-1">
                  <p className="text-emerald-700/70 font-semibold italic text-center">Concrete material & truck costs are aggregated for the entire project.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}