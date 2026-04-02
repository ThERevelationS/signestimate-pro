import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Loader2, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AIEngineeringCalculatorModal({ onSave }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  
  const [formData, setFormData] = useState({
    signSize: '',
    heightToBottom: '',
    soilType: '',
    weight: '',
    requiredPoleSize: '',
    foundationType: '',
    qtyPoles: '',
    additionalInfo: ''
  });

  const handleCalculate = async () => {
    setLoading(true);
    setResult('');
    try {
      const response = await base44.functions.invoke('aiEngineeringCalculator', formData);
      if (response.data && response.data.recommendation) {
        setResult(response.data.recommendation);
      }
    } catch (err) {
      console.error(err);
      setResult('Failed to calculate. Please try again.');
    }
    setLoading(false);
  };

  const handleSave = () => {
    onSave(result);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white gap-2 font-bold px-8 py-6 shadow-lg hover:shadow-xl transition-all border border-indigo-400">
          <Bot className="w-5 h-5" /> Run AI Engineering Calculator
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-600" />
            AI Engineering Calculator
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <Label className="text-xs">Sign Size (e.g. 5x10 ft)</Label>
            <Input value={formData.signSize} onChange={e => setFormData({...formData, signSize: e.target.value})} className="h-8 mt-1" />
          </div>
          <div>
            <Label className="text-xs">Height to Bottom of Sign</Label>
            <Input value={formData.heightToBottom} onChange={e => setFormData({...formData, heightToBottom: e.target.value})} className="h-8 mt-1" />
          </div>
          <div>
            <Label className="text-xs">Soil Type</Label>
            <Input value={formData.soilType} onChange={e => setFormData({...formData, soilType: e.target.value})} className="h-8 mt-1" placeholder="e.g. Clay, Sand, Rock" />
          </div>
          <div>
            <Label className="text-xs">Weight of Sign</Label>
            <Input value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} className="h-8 mt-1" />
          </div>
          <div>
            <Label className="text-xs">Required Pole Size (if any)</Label>
            <Input value={formData.requiredPoleSize} onChange={e => setFormData({...formData, requiredPoleSize: e.target.value})} className="h-8 mt-1" />
          </div>
          <div>
            <Label className="text-xs">Qty of Poles</Label>
            <Input type="number" value={formData.qtyPoles} onChange={e => setFormData({...formData, qtyPoles: e.target.value})} className="h-8 mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Foundation Type Wanted</Label>
            <Select value={formData.foundationType} onValueChange={v => setFormData({...formData, foundationType: v})}>
              <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Spread Foot">Spread Foot</SelectItem>
                <SelectItem value="Pillar">Pillar / Drilled Pier</SelectItem>
                <SelectItem value="Block">Block</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Additional Information</Label>
            <Textarea value={formData.additionalInfo} onChange={e => setFormData({...formData, additionalInfo: e.target.value})} className="mt-1 min-h-[60px]" placeholder="Any other criteria or special wind zone requirements..." />
          </div>
        </div>

        <Button onClick={handleCalculate} disabled={loading} className="w-full mt-4 bg-slate-900 text-white">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Calculating...</> : 'Calculate Recommendations'}
        </Button>

        {result && (
          <div className="mt-6 border-t pt-4">
            <h4 className="font-semibold text-sm mb-2 text-indigo-700">AI Calculation Breakdown</h4>
            <div className="bg-slate-50 p-3 rounded-lg border text-sm text-slate-700 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
              {result}
            </div>
            <Button onClick={handleSave} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Save className="w-4 h-4 mr-2" /> Save Recommendations to Project
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}