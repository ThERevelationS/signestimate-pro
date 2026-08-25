import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sparkles, Trash2, Library } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";

// Full editor popup for a single scope line on the quote. Shows the whole
// wording, lets you rewrite or remove it, and (for admins) push the new
// wording back to the shared scope library when the line came from there.
export default function ScopeLineDialog({ open, onOpenChange, line, kind, libraryRow, isAuto, onSave, onRemove }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState(line || "");

  useEffect(() => { setText(line || ""); }, [line, open]);

  const save = async (alsoLibrary) => {
    const next = text.trim();
    if (!next) return;
    onSave(next);
    if (alsoLibrary && libraryRow) {
      await base44.entities.QuoteScopeLine.update(libraryRow.id, { text: next });
      toast({ title: "Library line updated", description: "Future quotes will use the new wording." });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            {isAuto && <Sparkles className="w-4 h-4 text-amber-500" />}
            Edit {kind === "exclusion" ? "excluded" : "included"} scope line
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label className="text-xs">Wording printed on the quote</Label>
          <Textarea rows={4} className="text-sm" value={text} onChange={(e) => setText(e.target.value)} />
          {libraryRow && (
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <Library className="w-3 h-3" />
              From the scope library{libraryRow.category ? ` · ${libraryRow.category}` : ""}
              {libraryRow.always_include ? " · always included" : ""}
              {(libraryRow.auto_modules || []).length ? ` · auto for ${libraryRow.auto_modules.length} module(s)` : ""}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" className="text-red-600" onClick={() => { onRemove(); onOpenChange(false); }}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remove from quote
          </Button>
          <div className="flex gap-2">
            {libraryRow && user?.role === "admin" && (
              <Button type="button" variant="outline" onClick={() => save(true)}>Save + update library</Button>
            )}
            <Button type="button" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => save(false)}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}