import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

const COLORS = ["red", "amber", "blue", "green"];

// Notes & Flags tab — internal notes plus flags that show on the customer
// header (and warn whoever opens an estimate for this customer).
export default function NotesFlagsTab({ customerId, notes, onReload }) {
  const [noteText, setNoteText] = useState("");
  const [flagText, setFlagText] = useState("");
  const [flagColor, setFlagColor] = useState("amber");

  const add = async (kind) => {
    const text = kind === "note" ? noteText : flagText;
    if (!text.trim()) return;
    await base44.entities.CustomerNote.create({ customer_id: customerId, kind, text: text.trim(), flag_color: flagColor });
    kind === "note" ? setNoteText("") : setFlagText("");
    onReload();
  };

  const remove = async (n) => {
    await base44.entities.CustomerNote.delete(n.id);
    onReload();
  };

  const list = (kind) => notes.filter((n) => n.kind === kind);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-lime-600 mb-2">Customer Notes</p>
        <div className="flex gap-2 mb-2">
          <Input className="h-7 rounded-sm text-xs" placeholder="Add a note…" value={noteText}
            onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add("note")} />
          <Button size="sm" className="h-7 rounded-sm bg-zinc-700 hover:bg-zinc-800 text-white text-xs" onClick={() => add("note")}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="divide-y divide-slate-100">
          {list("note").length === 0 && <p className="text-xs text-slate-500 py-1">No notes yet.</p>}
          {list("note").map((n) => (
            <div key={n.id} className="flex items-start gap-2 py-1.5 text-sm">
              <div className="flex-1">
                <p className="text-slate-800">{n.text}</p>
                <p className="text-[11px] text-slate-400">{format(new Date(n.created_date), "MM/dd/yyyy hh:mm a")}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-red-500 hover:bg-red-50" onClick={() => remove(n)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-lime-600 mb-2">Customer Flags</p>
        <div className="flex gap-2 mb-2">
          <Input className="h-7 rounded-sm text-xs" placeholder="e.g. Credit hold" value={flagText}
            onChange={(e) => setFlagText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add("flag")} />
          <Select value={flagColor} onValueChange={setFlagColor}>
            <SelectTrigger className="h-7 rounded-sm text-xs w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{COLORS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" className="h-7 rounded-sm bg-zinc-700 hover:bg-zinc-800 text-white text-xs" onClick={() => add("flag")}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="divide-y divide-slate-100">
          {list("flag").length === 0 && <p className="text-xs text-slate-500 py-1">No flags — flags appear on the customer header.</p>}
          {list("flag").map((n) => (
            <div key={n.id} className="flex items-center gap-2 py-1.5 text-sm">
              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-sm border
                ${n.flag_color === "red" ? "bg-red-50 text-red-700 border-red-300"
                  : n.flag_color === "blue" ? "bg-blue-50 text-blue-700 border-blue-300"
                  : n.flag_color === "green" ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : "bg-amber-50 text-amber-700 border-amber-300"}`}>
                {n.text}
              </span>
              <span className="flex-1" />
              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-red-500 hover:bg-red-50" onClick={() => remove(n)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}