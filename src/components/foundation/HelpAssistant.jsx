import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const tourData = {
  info: [
    { targetId: null, text: "Here you can enter the client's name, project name, and an estimate number." },
    { targetId: null, text: "Add any general notes for the project in the Notes section." }
  ],
  foundation: [
    { targetId: "btn-add-foundation", text: "Add one or more foundation items (Spread Foot or Pillar) here." },
    { targetId: "foundation-dimensions-0", text: "Set dimensions like length, width, diameter, and depth." },
    { targetId: "foundation-toggles-0", text: "Toggle inclusions for rebar, forming, and finishing." },
    { targetId: "foundation-forming-0", text: "Note: Forming will only appear in the 3D Viewer once you select a forming material." },
    { targetId: "btn-ai-assistant", text: "Use the AI Engineering Assistant to calculate recommended dimensions and wind loads." }
  ],
  equipment: [
    { targetId: null, text: "Select excavation or other equipment needed for the project." },
    { targetId: null, text: "Specify rental durations (day/week/month) to calculate accurate costs." }
  ],
  walls_poles: [
    { targetId: "wall-configurations", text: "Add and configure wall types by selecting materials and dimensions." },
    { targetId: "layout-canvas", text: "Draw walls on the 2D Layout Canvas. They will automatically snap to the foundations." },
    { targetId: "add-poles-toggle", text: "Toggle 'Add Pole/s' to place poles on the canvas." }
  ],
  beautify: [
    { targetId: "signage-cabinets", text: "Add sign cabinets to the poles you placed in the previous tab." },
    { targetId: "landscape-designer", text: "Draw landscaping features like grass, concrete pads, or dirt." }
  ],
  summary: [
    { targetId: null, text: "Review the calculated costs for all materials, labor, and equipment." },
    { targetId: null, text: "Override quantities or rates manually by clicking on the underlined values." }
  ],
  bom: [
    { targetId: null, text: "View a consolidated list of all materials needed for the project." }
  ]
};

export default function HelpAssistant({ activeTab, manualTrigger, onManualTriggerClose }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [bubbleStyle, setBubbleStyle] = useState({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0 });

  const steps = tourData[activeTab] || [];

  const handleClose = () => {
    localStorage.setItem(`help_seen_foundation_${activeTab}`, 'true');
    setOpen(false);
    if (onManualTriggerClose) onManualTriggerClose();
  };

  useEffect(() => {
    if (manualTrigger) {
      setOpen(true);
      setStep(0);
      return;
    }

    const seenKey = `help_seen_foundation_${activeTab}`;
    if (!localStorage.getItem(seenKey) && steps.length > 0) {
      const t = setTimeout(() => {
        setOpen(true);
        setStep(0);
      }, 600);
      return () => clearTimeout(t);
    } else {
      setOpen(false);
    }
  }, [activeTab, manualTrigger, steps.length]);

  const updatePosition = useCallback(() => {
    if (!open || steps.length === 0) return;
    const currentStep = steps[step];
    if (!currentStep) return;

    const el = currentStep.targetId ? document.getElementById(currentStep.targetId) : null;
    if (el) {
      const rect = el.getBoundingClientRect();
      
      let top = rect.bottom + 16;
      let left = rect.left + (rect.width / 2);
      
      if (top + 200 > window.innerHeight) {
        top = rect.top - 16; 
      }
      
      left = Math.max(160, Math.min(window.innerWidth - 160, left));
      
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
         el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      setBubbleStyle({
        top: `${top}px`,
        left: `${left}px`,
        transform: top === rect.top - 16 ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
        opacity: 1
      });
    } else {
      setBubbleStyle({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        opacity: 1
      });
    }
  }, [open, step, steps]);

  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true); 
    
    const interval = setInterval(updatePosition, 500);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      clearInterval(interval);
    };
  }, [updatePosition]);

  if (!open || steps.length === 0) return null;
  const currentStep = steps[step];

  return (
    <>
      <div className="fixed inset-0 z-[110] bg-indigo-950/10 pointer-events-none transition-opacity" />
      <div 
        className="fixed z-[120] w-[300px] bg-white rounded-2xl shadow-2xl border-2 border-indigo-100 p-4 transition-all duration-300 ease-out"
        style={bubbleStyle}
      >
        <button onClick={handleClose} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-sm font-medium text-slate-700 leading-snug pt-1">
            {currentStep.text}
          </p>
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div key={i} className={cn("w-1.5 h-1.5 rounded-full transition-colors", i === step ? "bg-indigo-500 w-3" : "bg-indigo-200")} />
            ))}
          </div>
          
          <Button 
            size="sm" 
            onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : handleClose()}
            className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 rounded-full px-4"
          >
            {step < steps.length - 1 ? (
               <>Next <ChevronRight className="w-3 h-3 ml-1 -mr-1" /></>
            ) : 'Got it!'}
          </Button>
        </div>
        
        {/* Tail */}
        {currentStep.targetId && bubbleStyle.transform === 'translate(-50%, 0)' && (
           <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l-2 border-t-2 border-indigo-100 rotate-45" />
        )}
        {currentStep.targetId && bubbleStyle.transform === 'translate(-50%, -100%)' && (
           <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r-2 border-b-2 border-indigo-100 rotate-45" />
        )}
      </div>
    </>
  );
}