import React, { useState } from "react";
import { Customer } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

// Customer Search — every field is a filter; empty search returns everyone.
export default function CustomerSearchDialog({ options, onClose, onPick }) {
  const [f, setF] = useState({
    company_name: "", first_name: "", last_name: "", email: "", address: "",
    salesperson: "all", location: "all", master_account: "all", include_inactive: false,
  });
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const opts = (type) => (options || []).filter((o) => o.option_type === type && o.is_active !== false);

  const search = async () => {
    setSearching(true);
    const all = await Customer.list("company_name", 1000);
    const t = (v) => (v || "").toLowerCase();
    setResults(
      (all || []).filter((c) => {
        if (!f.include_inactive && c.is_active === false) return false;
        if (f.company_name && !t(c.company_name).includes(t(f.company_name))) return false;
        if (f.first_name && !t(c.contact_first_name).includes(t(f.first_name))) return false;
        if (f.last_name && !t(c.contact_last_name).includes(t(f.last_name))) return false;
        if (f.email && !t(c.contact_email).includes(t(f.email))) return false;
        if (f.address && !`${t(c.billing_address_1)} ${t(c.billing_city)} ${t(c.billing_state)}`.includes(t(f.address))) return false;
        if (f.salesperson !== "all" && c.salesperson !== f.salesperson) return false;
        if (f.location !== "all" && c.location !== f.location) return false;
        if (f.master_account !== "all" && c.master_account !== f.master_account) return false;
        return true;
      })
    );
    setSearching(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto py-10">
      <div className="absolute inset-0 bg-slate-800/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-4xl mx-4 shadow-2xl rounded-sm">
        <button onClick={onClose} className="absolute top-2 right-2 text-slate-500 hover:text-red-600"><X className="w-4 h-4" /></button>

        <div className="bg-slate-200 p-4 grid md:grid-cols-5 gap-3">
          <div><Label className="text-xs">Company Name</Label><Input className="h-8 rounded-sm bg-white" value={f.company_name} onChange={(e) => set("company_name", e.target.value)} /></div>
          <div><Label className="text-xs">Contact First Name</Label><Input className="h-8 rounded-sm bg-white" value={f.first_name} onChange={(e) => set("first_name", e.target.value)} /></div>
          <div><Label className="text-xs">Contact Last Name</Label><Input className="h-8 rounded-sm bg-white" value={f.last_name} onChange={(e) => set("last_name", e.target.value)} /></div>
          <div><Label className="text-xs">Email</Label><Input className="h-8 rounded-sm bg-white" value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
          <div><Label className="text-xs">Address</Label><Input className="h-8 rounded-sm bg-white" value={f.address} onChange={(e) => set("address", e.target.value)} /></div>

          <div>
            <Label className="text-xs">Salesperson</Label>
            <Select value={f.salesperson} onValueChange={(v) => set("salesperson", v)}>
              <SelectTrigger className="h-8 rounded-sm bg-white"><SelectValue placeholder="select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">select</SelectItem>
                {opts("salesperson").map((o) => <SelectItem key={o.id} value={o.label}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Location</Label>
            <Select value={f.location} onValueChange={(v) => set("location", v)}>
              <SelectTrigger className="h-8 rounded-sm bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {opts("sales_center").map((o) => <SelectItem key={o.id} value={o.label}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Master Account</Label>
            <Select value={f.master_account} onValueChange={(v) => set("master_account", v)}>
              <SelectTrigger className="h-8 rounded-sm bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">-- select --</SelectItem>
                {opts("master_account").map((o) => <SelectItem key={o.id} value={o.label}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 pb-1">
            <Checkbox id="inc-inactive" checked={f.include_inactive} onCheckedChange={(v) => set("include_inactive", !!v)} />
            <Label htmlFor="inc-inactive" className="text-xs cursor-pointer">Include Inactive</Label>
          </div>
          <div className="flex items-end">
            <Button size="sm" className="h-8 rounded-sm bg-zinc-700 hover:bg-zinc-800 text-white" onClick={search} disabled={searching}>
              {searching ? "Searching…" : "Search"}
            </Button>
          </div>
        </div>

        <div className="p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-1.5 mb-2">Customer Search Results</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-600 text-white text-left">
                <th className="px-2 py-1.5">Location</th>
                <th className="px-2 py-1.5">Company Name</th>
                <th className="px-2 py-1.5">Primary Contact</th>
                <th className="px-2 py-1.5">Company Phone</th>
                <th className="px-2 py-1.5">Email Address</th>
                <th className="px-2 py-1.5">Salesperson</th>
              </tr>
            </thead>
            <tbody>
              {(results || []).map((c, i) => (
                <tr key={c.id} className={`border-t border-slate-200 cursor-pointer hover:bg-lime-50 ${i % 2 ? "bg-slate-50" : ""}`}
                  onClick={() => onPick(c)}>
                  <td className="px-2 py-1.5">{c.location || "—"}</td>
                  <td className="px-2 py-1.5 text-blue-600">{c.company_name}</td>
                  <td className="px-2 py-1.5">{[c.contact_first_name, c.contact_last_name].filter(Boolean).join(" ") || "—"}</td>
                  <td className="px-2 py-1.5">{c.company_phone || "—"}</td>
                  <td className="px-2 py-1.5">{c.contact_email || "—"}</td>
                  <td className="px-2 py-1.5">{c.salesperson || "—"}</td>
                </tr>
              ))}
              {results && results.length === 0 && (
                <tr><td colSpan={6} className="px-2 py-4 text-slate-500">No customers matched those filters.</td></tr>
              )}
            </tbody>
          </table>

          {!results && (
            <div className="pt-4 text-sm text-slate-700">
              <p className="font-bold mb-2">How to use Customer Search</p>
              <p>Think of the different search boxes as filters.</p>
              <p>If you click "search" without filling in any of the boxes, you will get back all customers.</p>
              <p>The more information you put into the text boxes, the more accurate and filtered your search will be.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}