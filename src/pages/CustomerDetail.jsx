import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Save } from "lucide-react";
import useCustomerLists from "@/components/customers/useCustomerLists";
import CustomerHeader from "@/components/customers/CustomerHeader";
import CustomerForm from "@/components/customers/CustomerForm";
import InformationTab from "@/components/customers/tabs/InformationTab";
import SettingsTab from "@/components/customers/tabs/SettingsTab";
import ContactsTab from "@/components/customers/tabs/ContactsTab";
import NotesFlagsTab from "@/components/customers/tabs/NotesFlagsTab";
import HistoryTab from "@/components/customers/tabs/HistoryTab";
import AnalyticsTab from "@/components/customers/tabs/AnalyticsTab";

const TABS = ["Information", "Settings", "Contacts", "Notes & Flags", "Orders and Estimates", "Analytics"];

// Full customer record — same form used to create it, plus the account tabs.
export default function CustomerDetail() {
  const { toast } = useToast();
  const lists = useCustomerLists();
  const id = new URLSearchParams(window.location.search).get("id");
  const [customer, setCustomer] = useState(null);
  const [notes, setNotes] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [tab, setTab] = useState("Information");
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadNotes = async () => {
    setNotes((await base44.entities.CustomerNote.filter({ customer_id: id }, "-created_date", 200)) || []);
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      const c = await base44.entities.Customer.get(id);
      setCustomer(c);
      loadNotes();
      const ests = await base44.entities.AllInOneEstimate.filter({ customer_id: id }, "-created_date", 300);
      setEstimates(ests || []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const stats = useMemo(() => ({
    count: estimates.length,
    pipeline: estimates.filter((e) => !["archived", "approved"].includes(e.status))
      .reduce((s, e) => s + (Number(e.quote_total) || Number(e.total_cost) || 0), 0),
    approved: estimates.filter((e) => e.status === "approved")
      .reduce((s, e) => s + (Number(e.quote_total) || Number(e.total_cost) || 0), 0),
  }), [estimates]);

  const change = (k, v) => { setCustomer((p) => ({ ...p, [k]: v })); setDirty(true); };

  const save = async () => {
    setSaving(true);
    const { id: _id, created_date, updated_date, created_by, created_by_id, ...data } = customer;
    await base44.entities.Customer.update(id, data);
    setSaving(false);
    setDirty(false);
    setEditing(false);
    toast({ title: "Customer saved" });
  };

  const setStatus = async (status) => {
    await base44.entities.Customer.update(id, { customer_status: status, is_active: status !== "inactive" });
    setCustomer((p) => ({ ...p, customer_status: status, is_active: status !== "inactive" }));
  };

  if (!id) return <div className="p-8 text-slate-600">No customer selected.</div>;
  if (!customer || lists.loading) return <div className="p-8 text-slate-600">Loading customer…</div>;

  return (
    <div className="p-4 md:p-6 space-y-3">
      <div className="max-w-[1400px] mx-auto space-y-3">
        <CustomerHeader
          customer={customer}
          flags={notes.filter((n) => n.kind === "flag")}
          stats={stats}
          onEdit={() => { setEditing(true); setTab("Information"); }}
          onSetStatus={setStatus}
        />

        <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/80">
          <div className="flex flex-wrap items-center gap-1 px-4 border-b border-slate-200">
            {TABS.map((t) => (
              <button key={t} onClick={() => { setTab(t); setEditing(false); }}
                className={`px-3.5 py-3 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                  tab === t ? "border-red-600 text-red-700" : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}>
                {t}
              </button>
            ))}
            {dirty && (
              <Button size="sm" className="ml-auto mb-1.5 h-8 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs shadow-sm shadow-red-600/25"
                onClick={save} disabled={saving}>
                <Save className="w-3.5 h-3.5 mr-1" /> {saving ? "Saving…" : "Save Changes"}
              </Button>
            )}
          </div>

          <div className="p-5">
            {editing ? (
              <>
                <h2 className="text-sm font-bold uppercase tracking-wider text-red-600 mb-4">Edit Customer</h2>
                <CustomerForm value={customer} onChange={change} lists={lists} showRequired />
                <div className="flex justify-end gap-2 border-t border-slate-200 mt-6 pt-4">
                  <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => setEditing(false)}>Done Editing</Button>
                  <Button size="sm" className="h-8 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/25" onClick={save} disabled={saving}>
                    {saving ? "Saving…" : "Save Customer"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                {tab === "Information" && <InformationTab customer={customer} onEdit={() => setEditing(true)} />}
                {tab === "Settings" && <SettingsTab customer={customer} lists={lists} onChange={change} />}
                {tab === "Contacts" && <ContactsTab customer={customer} lists={lists} onChange={change} />}
                {tab === "Notes & Flags" && <NotesFlagsTab customerId={id} notes={notes} onReload={loadNotes} />}
                {tab === "Orders and Estimates" && <HistoryTab customer={customer} estimates={estimates} />}
                {tab === "Analytics" && <AnalyticsTab estimates={estimates} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}