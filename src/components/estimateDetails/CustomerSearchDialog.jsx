import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchableSelect from "@/components/common/SearchableSelect";
import { X } from "lucide-react";

// Customer Search — every field is a filter; empty search returns everyone.
export default function CustomerSearchDialog({ lists, onClose, onPick }) {
  const [f, setF] = useState({
    company_name: "", first_name: "", last_name: "", email: "", address: "",
    salesperson: "all", location: "all", master_account: "", industry_type: "", include_inactive: false,
  });
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const search = async () => {
    setSearching(true);
    const all = await base44.entities.Customer.list("company_name", 1000);
    const t = (v) => (v || "").toLowerCase();
    setResults(
      (all || []).filter((c) => {
        if (!f.include_inactive && (c.is_active === false || c.customer_status === "inactive")) return false;
        if (f.company_name && !t(c.company_name).includes(t(f.company_name))) return false;
        if (f.first_name && !t(c.contact_first_name).includes(t(f.first_name))) return false;
        if (f.last_name && !t(c.contact_last_name).includes(t(f.last_name))) return false;
        if (f.email && !t(c.contact_email).includes(t(f.email))) return false;
        if (f.address && !`${t(c.billing_address_1)} ${t(c.billing_city)} ${t(c.billing_state)}`.includes(t(f.address))) return false;
        if (f.salesperson !== "all" && c.salesperson !== f.salesperson) return false;
        if (f.location !== "all" && c.location !== f.location) return false;
        if (f.master_account && c.master_account !== f.master_account) return false;
        if (f.industry_type && c.industry_type !== f.industry_type) return false;
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
              <SelectTrigger className="h-8 rounded-sm bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {lists.salespersonNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Location</Label>
            <Select value={f.location} onValueChange={(v) => set("location", v)}>
              <SelectTrigger className="h-8 rounded-sm bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {lists.listValues("sales_center").map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Industry Type</Label>
            <SearchableSelect className="mt-0.5" value={f.industry_type} options={lists.listValues("industry_type")} onChange={(v) => set("industry_type", v)} placeholder="any industry" />
          </div>
          <div>
            <Label className="text-xs">Master Account</Label>
            <SearchableSelect className="mt-0.5" value={f.master_account} options={lists.listValues("master_account")} onChange={(v) => set("master_account", v)} placeholder="any account" />
          </div>
          <div className="flex items-end gap-3 pb-1">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={f.include_inactive} onCheckedChange={(v) => set("include_inactive", !!v)} />
              Include Inactive
            </label>
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
                <th className="px-2 py-1.5">Industry</th>
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
                  <td className="px-2 py-1.5">{c.industry_type || "—"}</td>
                  <td className="px-2 py-1.5">{c.salesperson || "—"}</td>
                </tr>
              ))}
              {results && results.length === 0 && (
                <tr><td colSpan={7} className="px-2 py-4 text-slate-500">No customers matched those filters.</td></tr>
              )}
            </tbody>
          </table>

          {!results && (
            <div className="pt-4 text-sm text-slate-700">
              <p className="font-bold mb-2">How to use Customer Search</p>
              <p>Think of the different search boxes as filters.</p>
              <p>Click "Search" with everything blank to get back all customers — the more you fill in, the tighter the result.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}