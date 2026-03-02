import React from 'react';
import { Button } from '@/components/ui/button';
import { X, CheckCircle2, Zap } from 'lucide-react';

export default function AIFillResultModal({ isOpen, onClose, result, inventory }) {
  if (!isOpen || !result) return null;

  const resultData = result.data || result;
  const coreMaterials = resultData.core_materials || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Core Fill Complete</h2>
              <p className="text-purple-100 text-xs">AI-optimized packing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Success Message */}
          <div className="flex items-start gap-3 bg-green-50 p-3 rounded-lg border border-green-200">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-green-900">Successfully calculated optimal block fill</p>
              <p className="text-green-700 text-xs mt-1">{coreMaterials.length} block type(s) selected</p>
            </div>
          </div>

          {/* Materials Breakdown */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">Materials Selected:</p>
            <div className="space-y-2">
              {coreMaterials.map((item, idx) => {
                const material = inventory?.find(m => m.id === item.material_id);
                return (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {material?.material_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {material?.length}" × {material?.width}" × {material?.height}"
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600">{item.quantity}</p>
                      <p className="text-xs text-slate-500">units</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coverage Metrics */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <p className="text-xs text-blue-600 font-medium">Coverage</p>
              <p className="text-lg font-bold text-blue-900">
                {(resultData.total_coverage_percentage || 95).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-600 font-medium">Total Blocks</p>
              <p className="text-lg font-bold text-blue-900">
                {coreMaterials.reduce((sum, m) => sum + (m.quantity || 0), 0)}
              </p>
            </div>
          </div>

          {/* Notes */}
          {resultData.calculation_notes && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs font-medium text-amber-900 mb-1">Details:</p>
              <p className="text-xs text-amber-800 leading-relaxed">{resultData.calculation_notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 rounded-b-2xl flex gap-3">
          <Button
            onClick={onClose}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold"
          >
            Accept & Continue
          </Button>
        </div>
      </div>
    </div>
  );
}