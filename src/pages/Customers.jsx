import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users } from "lucide-react";
import useCustomerLists from "@/components/customers/useCustomerLists";
import CreateCustomerDialog from "@/components/estimateDetails/CreateCustomerDialog";

const EMPTY = { company: "", contact: "", email: "", salesperson: "all", location: "all", industry: "all", include_inactive: false };

// Customers search + list. Rows open the full customer record.
export default function Customers() {
  const lists = useCustomerLists();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(EMPTY);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    setRows((await base44.entities.Customer.list("company_name", 1000)) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const t = (v) => (v || "").toLowerCase();
    return rows.filter((c) => {
      if (!filters.include_inactive && (c.is_active === false || c.customer_status === "inactive")) return false;
      if (filters.company && !t(c.company_name).includes(t(filters.company))) return false;
      if (filters.contact && !t(`${c.contact_first_name} ${c.contact_last_name}`).includes(t(filters.contact))) return false;
      if (filters.email && !t(c.contact_email).includes(t(filters.email))) return false;
      if (filters.salesperson !== "all" && c.salesperson !== filters.salesperson) return false;
      if (filters.location !== "all" && c.location !== filters.location) return false;
      if (filters.industry !== "all" && c.industry_type !== filters.industry) return false;
      return true;
    });
  }, [rows, filters]);

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto bg-white border border-slate-300 rounded-sm shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-base font-bold text-lime-700 uppercase tracking-wide flex items-center gap-2">
            <Users className="w-4 h-4" /> Customers
          </h1>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>Total: <b className="text-slate-800">{rows.length}</b></span>
            <Button size="sm" className="h-8 rounded-sm bg-zinc-800 hover:bg-zinc-700 text-white" onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4 mr-1" /> Create New
            </Button>
          </div>
        </div>

        <div className="px-4 py-3 bg-slate-100 border-b border-slate-300 grid grid-cols-2 md:grid-cols-7 gap-3 items-end">
          <div>
            <Label className="text-xs">Company Name</Label>
            <Input className="h-8 rounded-sm bg-white" value={filters.company} onChange={(e) => setFilters({ ...filters, company: e.target.value })} placeholder="Type to filter…" />
          </div>
          <div>
            <Label className="text-xs">Contact</Label>
            <Input className="h-8 rounded-sm bg-white" value={filters.contact} onChange={(e) => setFilters({ ...filters, contact: e.target.value })} placeholder="Type to filter…" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input className="h-8 rounded-sm bg-white" value={filters.email} onChange={(e) => setFilters({ ...filters, email: e.target.value })} placeholder="Type to filter…" />
          </div>
          <div>
            <Label className="text-xs">Salesperson</Label>
            <Select value={filters.salesperson} onValueChange={(v) => setFilters({ ...filters, salesperson: v })}>
              <SelectTrigger className="h-8 rounded-sm bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {lists.salespersonNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Location</Label>
            <Select value={filters.location} onValueChange={(v) => setFilters({ ...filters, location: v })}>
              <SelectTrigger className="h-8 rounded-sm bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {lists.listValues("sales_center").map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Industry Type</Label>
            <Select value={filters.industry} onValueChange={(v) => setFilters({ ...filters, industry: v })}>
              <SelectTrigger className="h-8 rounded-sm bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {lists.listValues("industry_type").map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={filters.include_inactive} onCheckedChange={(v) => setFilters({ ...filters, include_inactive: !!v })} />
              Include Inactive
            </label>
            <Button variant="outline" className="h-8 rounded-sm" onClick={() => setFilters(EMPTY)}>Clear</Button>
          </div>
        </div>

        {loading ? (
          <p className="p-8 text-slate-600">Loading customers…</p>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p>No customers match. Create one to start quoting.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-700 text-white text-xs">
                  <th className="text-left px-3 py-2 font-semibold">Company Name</th>
                  <th className="text-left px-3 py-2 font-semibold">Primary Contact</th>
                  <th className="text-left px-3 py-2 font-semibold">Company Phone</th>
                  <th className="text-left px-3 py-2 font-semibold">Email</th>
                  <th className="text-left px-3 py-2 font-semibold">Industry</th>
                  <th className="text-left px-3 py-2 font-semibold">Salesperson</th>
                  <th className="text-left px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} className={`border-b border-slate-200 hover:bg-lime-50/60 ${i % 2 ? "bg-slate-50/60" : "bg-white"}`}>
                    <td className="px-3 py-2">
                      <Link to={`${createPageUrl("CustomerDetail")}?id=${c.id}`} className="text-lime-700 font-semibold hover:underline">
                        {c.company_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{`${c.contact_first_name || ""} ${c.contact_last_name || ""}`.trim() || "—"}</td>
                    <td className="px-3 py-2">{c.company_phone || "—"}</td>
                    <td className="px-3 py-2">{c.contact_email || "—"}</td>
                    <td className="px-3 py-2">{c.industry_type || "—"}</td>
                    <td className="px-3 py-2">{c.salesperson || "—"}</td>
                    <td className="px-3 py-2 uppercase text-[10px] font-bold text-slate-600">{c.customer_status || "prospect"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-3 py-2 text-xs text-slate-500 border-t border-slate-200">Showing {filtered.length} of {rows.length} customers</p>
          </div>
        )}
      </div>

      {creating && !lists.loading && (
        <CreateCustomerDialog lists={lists} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />
      )}
    </div>
  );
}