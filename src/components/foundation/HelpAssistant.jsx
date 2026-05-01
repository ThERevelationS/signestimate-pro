import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { User } from '@/entities/all';

const tourData = {
  info: [
    { targetId: "info-client-name", text: "Enter the client's name here. This is required to save the project." },
    { targetId: "info-project-name", text: "Enter the project name here. This is also required." },
    { targetId: "info-estimate-number", text: "Optionally, enter an estimate number or ID to track this quote in your own system." },
    { targetId: "info-reference-link", text: "Paste a URL to a folder, Google Drive, or document containing site plans and references." },
    { targetId: "info-notes", text: "Add any internal or external notes related to this project." }
  ],
  foundation: [
    { targetId: "btn-ai-assistant", text: "Start by generating wind load calculations and dimension recommendations using the AI Engineering Assistant." },
    { targetId: "foundation-item-0", text: "This is a Foundation Item. You can add multiple foundations to a single project." },
    { targetId: "foundation-type-0", text: "Choose the shape of your foundation: Spread Foot (Square/Rectangular) or Pillar (Round)." },
    { targetId: "foundation-quantity-0", text: "Set how many identical foundations of this type you need to build." },
    { targetId: "foundation-dimensions-0", text: "Specify the exact dimensions for your foundation. Length, width, depth, and how high above grade it sits." },
    { targetId: "foundation-toggles-0", text: "Toggle what you want to include in the estimate. Rebar, wooden forming materials, and concrete finishing." },
    { targetId: "foundation-forming-0", text: "Select your forming material. Note: Forming will only appear in the 3D viewer if you select a material here!" },
    { targetId: "foundation-rebar-0", text: "Set rebar specifications. We calculate the exact linear footage needed based on your spacing, layers, and overlap." },
    { targetId: "foundation-excavation-0", text: "Choose your excavation method. Hand dig or equipment. If equipment, you'll select the machine in the Equipment Tab." },
    { targetId: "foundation-concrete-0", text: "Select your concrete type from inventory. We calculate the cubic yards and minimum order fees automatically." },
    { targetId: "foundation-costs-0", text: "Here is your live cost breakdown for this specific foundation, including all labor, materials, and excavation." },
    { targetId: "btn-add-foundation", text: "Click here to add another distinct foundation item to the project." }
  ],
  equipment: [
    { targetId: null, text: "Select excavation or other equipment needed for the project from your inventory." },
    { targetId: null, text: "Specify rental durations (day/week/month) to calculate accurate costs." },
    { targetId: null, text: "Add attachments or sub-attachments to the equipment as required." }
  ],
  walls_poles: [
    { targetId: "wall-configurations", text: "Click 'Add Wall Type' to configure masonry walls. You can select both outer and inner (core) materials." },
    { targetId: "layout-canvas", text: "This is your 2D Layout Canvas. Click and drag to draw walls. They will snap to your foundations." },
    { targetId: "add-poles-toggle", text: "Check 'Add Pole/s' to enable the pole placement tool." },
    { targetId: null, text: "Once poles are enabled, select a pole from the dropdown and click the 'Place on Canvas' button, then click on the canvas to place it exactly where you need it." },
    { targetId: null, text: "Click on any placed pole in the right-hand list to adjust its height, depth in ground, and rotation." }
  ],
  beautify: [
    { targetId: "signage-cabinets", text: "Here you can add sign cabinets to any poles you placed in the previous tab." },
    { targetId: null, text: "Click '+ Add Cabinet' on a pole, then use the Sign Designer to draw custom cabinet shapes or load an image." },
    { targetId: null, text: "Use the positioning tools to adjust the height and offset of each sign cabinet on its pole." },
    { targetId: "landscape-designer", text: "Use the Landscape Designer to draw grass, dirt, concrete pads, or asphalt around your signs." }
  ],
  summary: [
    { targetId: null, text: "Review the calculated costs for all materials, labor, and equipment." },
    { targetId: null, text: "If you need to change a price for this specific project, click any underlined value to override it." }
  ],
  bom: [
    { targetId: null, text: "View a consolidated list of all materials needed for the project." },
    { targetId: null, text: "Quantities are aggregated from all foundations, walls, and poles for easy purchasing." }
  ]
};

export default function HelpAssistant({ activeTab, manualTrigger, onManualTriggerClose, onStepChange }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [bubbleStyle, setBubbleStyle] = useState({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0 });
  const [tutorialsSeen, setTutorialsSeen] = useState(null); // null = loading

  const steps = tourData[activeTab] || [];
  const tutorialKey = `foundation_${activeTab}`;

  // Load seen tutorials from user record
  useEffect(() => {
    User.me()
      .then(user => setTutorialsSeen(user?.tutorials_seen || {}))
      .catch(() => setTutorialsSeen({}));
  }, []);

  useEffect(() => {
    if (open && steps.length > 0 && onStepChange) {
      onStepChange(step, steps[step]);
    }
  }, [step, open, steps, onStepChange]);

  const handleClose = () => {
    const updated = { ...(tutorialsSeen || {}), [tutorialKey]: true };
    setTutorialsSeen(updated);
    User.updateMyUserData({ tutorials_seen: updated }).catch(err => console.error('Failed to save tutorial state:', err));
    setOpen(false);
    if (onManualTriggerClose) onManualTriggerClose();
  };

  useEffect(() => {
    if (manualTrigger) {
      setOpen(true);
      setStep(0);
      return;
    }

    // Wait for tutorialsSeen to load
    if (tutorialsSeen === null) return;

    if (!tutorialsSeen[tutorialKey] && steps.length > 0) {
      const t = setTimeout(() => {
        setOpen(true);
        setStep(0);
      }, 600);
      return () => clearTimeout(t);
    } else {
      setOpen(false);
    }
  }, [activeTab, manualTrigger, steps.length, tutorialsSeen, tutorialKey]);

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
        className="fixed z-[120] w-[320px] bg-white rounded-2xl shadow-2xl border-2 border-indigo-100 p-4 transition-all duration-300 ease-out"
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
          <div className="flex gap-1.5 flex-wrap flex-1 mr-2">
            {steps.map((_, i) => (
              <div key={i} className={cn("w-1.5 h-1.5 rounded-full transition-colors flex-shrink-0", i === step ? "bg-indigo-500 w-3" : "bg-indigo-200")} />
            ))}
          </div>
          
          <div className="flex gap-2">
            {step > 0 && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setStep(s => s - 1)}
                className="h-7 text-xs rounded-full px-3 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              >
                Back
              </Button>
            )}
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