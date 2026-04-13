import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bot, CheckCircle2 } from 'lucide-react';

const helpContent = {
  info: {
    title: "Project Info Tab",
    steps: [
      "Here you can enter the client's name, project name, and an estimate number.",
      "You can also provide a reference link to external documents or plans.",
      "Add any general notes for the project in the Notes section."
    ]
  },
  foundation: {
    title: "Foundation Tab",
    steps: [
      "Add one or more foundation items (Spread Foot or Pillar).",
      "Set dimensions like length, width, diameter, and depth.",
      "Toggle inclusions for rebar, forming, and finishing.",
      "Note: Forming will only appear in the 3D Viewer once you select a forming material from the dropdown.",
      "Use the AI Engineering Assistant to calculate recommended dimensions and wind loads based on your site data."
    ]
  },
  equipment: {
    title: "Equipment Tab",
    steps: [
      "Select excavation or other equipment needed for the project.",
      "Specify rental durations (day/week/month) to calculate accurate costs.",
      "Add attachments or sub-attachments as required for your equipment."
    ]
  },
  walls_poles: {
    title: "Walls & Poles Tab",
    steps: [
      "Add and configure wall types by selecting materials and dimensions.",
      "Draw walls on the 2D Layout Canvas. They will automatically snap to the foundations.",
      "Place poles on the canvas by selecting a pole from the dropdown and clicking 'Place on Canvas'.",
      "You can also move poles around or adjust their height and rotation using the tools provided."
    ]
  },
  beautify: {
    title: "Signage & Landscape Tab",
    steps: [
      "Add sign cabinets to the poles you placed in the previous tab.",
      "Use the Sign Designer to draw custom cabinet shapes or load images.",
      "Adjust the positioning (height/offset) of each sign cabinet on its pole.",
      "Draw landscaping features like grass, concrete pads, or dirt using the Landscape Designer."
    ]
  },
  summary: {
    title: "Cost Summary Tab",
    steps: [
      "Review the calculated costs for all materials, labor, and equipment.",
      "Override quantities or rates manually by clicking on the underlined values.",
      "Copy the summary to your clipboard or export it to a CSV file for sharing."
    ]
  },
  bom: {
    title: "Bill of Materials Tab",
    steps: [
      "View a consolidated list of all materials needed for the project.",
      "Quantities are aggregated from all foundations, walls, and poles.",
      "Print or export this list for purchasing and inventory management."
    ]
  }
};

export default function HelpAssistant({ activeTab, manualTrigger, onManualTriggerClose }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (manualTrigger) {
      setOpen(true);
      setStep(0);
      return;
    }

    const seenKey = `help_seen_foundation_${activeTab}`;
    if (!localStorage.getItem(seenKey)) {
      const t = setTimeout(() => {
        setOpen(true);
        setStep(0);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [activeTab, manualTrigger]);

  const handleClose = () => {
    localStorage.setItem(`help_seen_foundation_${activeTab}`, 'true');
    setOpen(false);
    if (onManualTriggerClose) onManualTriggerClose();
  };

  const content = helpContent[activeTab];
  if (!content) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
    }}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-900">
            <Bot className="w-5 h-5 text-indigo-600" /> AI Assistant: {content.title}
          </DialogTitle>
          <DialogDescription>
            Let me guide you through the features on this tab.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 min-h-[100px] flex items-center">
          <div className="flex gap-3">
            <div className="mt-0.5 flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              {content.steps[step]}
            </p>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <div className="text-xs text-slate-500 font-medium">
            Step {step + 1} of {content.steps.length}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleClose} className="h-8 text-xs">
              Skip
            </Button>
            {step < content.steps.length - 1 ? (
              <Button onClick={() => setStep(s => s + 1)} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700">
                Next
              </Button>
            ) : (
              <Button onClick={handleClose} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700">
                Got it!
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}