import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Info, Wrench } from 'lucide-react';

function EquipmentCard({ equipment, selectedEquipment, onUpdate, onRemove, allAttachments }) {
  const eq = equipment; // the inventory item
  const [showInfo, setShowInfo] = useState(false);

  const compatibleAttachments = allAttachments.filter(a => {
    if (!a.compatible_equipment_ids || a.compatible_equipment_ids.length === 0) return true;
    return a.compatible_equipment_ids.includes(eq.id);
  });

  const selectedAttachmentIds = selectedEquipment.attachment_ids || [];

  const toggleAttachment = (attId) => {
    const current = selectedAttachmentIds;
    const updated = current.includes(attId)
      ? current.filter(id => id !== attId)
      : [...current, attId];
    onUpdate({ ...selectedEquipment, attachment_ids: updated });
  };

  const attachmentCost = compatibleAttachments
    .filter(a => selectedAttachmentIds.includes(a.id))
    .reduce((sum, a) => sum + (a.cost_per_unit || 0), 0);

  const rentalPeriod = selectedEquipment.rental_period || 'day';
  const rentalDuration = selectedEquipment.rental_duration || 1;

  const baseRentalCost = (() => {
    if (rentalPeriod === 'day') return (eq.cost_per_day || 0) * rentalDuration;
    if (rentalPeriod === 'week') return (eq.cost_per_week || 0) * rentalDuration;
    if (rentalPeriod === 'month') return (eq.cost_per_month || 0) * rentalDuration;
    return 0;
  })();

  const deliveryCost = selectedEquipment.include_delivery ? (eq.pickup_delivery_cost || 0) : 0;
  const totalCost = baseRentalCost + deliveryCost + attachmentCost;

  return (
    <Card className="border border-slate-200">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-sm font-semibold">{eq.material_name}</CardTitle>
            {eq.equipment_type && <Badge variant="outline" className="text-xs">{eq.equipment_type}</Badge>}
            {eq.rental_company && <span className="text-xs text-slate-500">{eq.rental_company}</span>}
            <Badge variant="secondary" className="text-xs">Total: ${totalCost.toFixed(2)}</Badge>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setShowInfo(s => !s)}>
              <Info className="w-3.5 h-3.5 text-slate-400" />
            </Button>
            <Button size="sm" variant="ghost" className="text-red-500" onClick={onRemove}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-4">
        {/* Info panel */}
        {showInfo && eq.notes && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            {eq.notes}
          </div>
        )}

        {/* Rental config */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Rental Period</Label>
            <Select value={rentalPeriod} onValueChange={v => onUpdate({ ...selectedEquipment, rental_period: v })}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eq.cost_per_day && <SelectItem value="day">Daily (${eq.cost_per_day}/day)</SelectItem>}
                {eq.cost_per_week && <SelectItem value="week">Weekly (${eq.cost_per_week}/wk)</SelectItem>}
                {eq.cost_per_month && <SelectItem value="month">Monthly (${eq.cost_per_month}/mo)</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Duration</Label>
            <input
              type="number"
              className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={rentalDuration}
              min={1}
              onChange={e => onUpdate({ ...selectedEquipment, rental_duration: parseFloat(e.target.value) || 1 })}
            />
          </div>
          {eq.pickup_delivery_cost > 0 && (
            <div className="flex items-end pb-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedEquipment.include_delivery || false}
                  onCheckedChange={v => onUpdate({ ...selectedEquipment, include_delivery: v })}
                  id={`delivery-${eq.id}`}
                />
                <Label htmlFor={`delivery-${eq.id}`} className="text-xs cursor-pointer">
                  Include Delivery (${eq.pickup_delivery_cost})
                </Label>
              </div>
            </div>
          )}
          <div className="bg-amber-50 rounded-lg p-2 flex flex-col justify-center">
            <p className="text-xs text-slate-500">Rental Cost</p>
            <p className="font-semibold text-sm">${baseRentalCost.toFixed(2)}</p>
          </div>
        </div>

        {/* Attachments */}
        {compatibleAttachments.length > 0 && (
          <div>
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
              <Wrench className="w-3 h-3 inline mr-1" />
              Attachments
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {compatibleAttachments.map(att => (
                <div
                  key={att.id}
                  className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                    selectedAttachmentIds.includes(att.id)
                      ? 'bg-amber-50 border-amber-300'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                  onClick={() => toggleAttachment(att.id)}
                >
                  <Checkbox
                    checked={selectedAttachmentIds.includes(att.id)}
                    onCheckedChange={() => toggleAttachment(att.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{att.material_name}</p>
                    {att.notes && <p className="text-slate-500 mt-0.5">{att.notes}</p>}
                    <p className="text-amber-700 font-semibold mt-0.5">${att.cost_per_unit || 0}</p>
                  </div>
                </div>
              ))}
            </div>
            {attachmentCost > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                Attachment cost: <span className="font-semibold text-slate-700">${attachmentCost.toFixed(2)}</span>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function EquipmentTab({ inventory, selectedEquipmentList, onUpdate, markDirty }) {
  const allEquipment = inventory.filter(i => i.material_type === 'excavation_equipment');
  const allAttachments = inventory.filter(i => i.material_type === 'attachment');

  const addEquipment = (eqId) => {
    if (!eqId || eqId === '_none') return;
    const newEntry = {
      _id: Date.now() + Math.random(),
      equipment_id: eqId,
      rental_period: 'day',
      rental_duration: 1,
      include_delivery: false,
      attachment_ids: [],
    };
    onUpdate([...selectedEquipmentList, newEntry]);
    markDirty();
  };

  const removeEquipment = (idx) => {
    onUpdate(selectedEquipmentList.filter((_, i) => i !== idx));
    markDirty();
  };

  const updateEntry = (idx, updated) => {
    const arr = [...selectedEquipmentList];
    arr[idx] = updated;
    onUpdate(arr);
    markDirty();
  };

  const totalEquipmentCost = selectedEquipmentList.reduce((sum, entry) => {
    const eq = inventory.find(i => i.id === entry.equipment_id);
    if (!eq) return sum;
    const rentalPeriod = entry.rental_period || 'day';
    const rentalDuration = entry.rental_duration || 1;
    let base = 0;
    if (rentalPeriod === 'day') base = (eq.cost_per_day || 0) * rentalDuration;
    else if (rentalPeriod === 'week') base = (eq.cost_per_week || 0) * rentalDuration;
    else if (rentalPeriod === 'month') base = (eq.cost_per_month || 0) * rentalDuration;
    const delivery = entry.include_delivery ? (eq.pickup_delivery_cost || 0) : 0;
    const attCost = allAttachments
      .filter(a => (entry.attachment_ids || []).includes(a.id))
      .reduce((s, a) => s + (a.cost_per_unit || 0), 0);
    return sum + base + delivery + attCost;
  }, 0);

  return (
    <div className="space-y-4">
      {/* Add equipment */}
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[260px]">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Add Equipment</Label>
              <Select onValueChange={addEquipment}>
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue placeholder="Select equipment to add…" />
                </SelectTrigger>
                <SelectContent>
                  {allEquipment.length === 0 ? (
                    <SelectItem value="_none" disabled>No equipment in inventory</SelectItem>
                  ) : (
                    allEquipment.map(eq => (
                      <SelectItem key={eq.id} value={eq.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{eq.material_name}</span>
                          {eq.notes && (
                            <span className="text-xs text-slate-500 truncate max-w-[320px]">{eq.notes}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {allEquipment.length > 0 && (
              <p className="text-xs text-slate-500 pb-2">Equipment descriptions appear below each item name in the dropdown.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Equipment list */}
      {selectedEquipmentList.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-slate-400">
            <div className="text-4xl mb-2">🚜</div>
            <p className="font-medium">No equipment added yet</p>
            <p className="text-sm mt-1">Select equipment from the dropdown above.</p>
          </CardContent>
        </Card>
      )}

      {selectedEquipmentList.map((entry, idx) => {
        const eq = inventory.find(i => i.id === entry.equipment_id);
        if (!eq) return null;
        return (
          <EquipmentCard
            key={entry._id || idx}
            equipment={eq}
            selectedEquipment={entry}
            onUpdate={(updated) => updateEntry(idx, updated)}
            onRemove={() => removeEquipment(idx)}
            allAttachments={allAttachments}
          />
        );
      })}

      {selectedEquipmentList.length > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <span className="font-medium text-amber-800">Total Equipment Cost</span>
            <span className="text-lg font-bold text-amber-700">${totalEquipmentCost.toFixed(2)}</span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}