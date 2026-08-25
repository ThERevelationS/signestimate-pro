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

const TABS = ["Information", "Settings", "Contacts", "Notes & Flags", "History", "Analytics"];

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

        <div className="bg-white border border-slate-300 rounded-sm">
          <div className="flex flex-wrap gap-1 px-3 pt-2 border-b border-slate-300">
            {TABS.map((t) => (
              <button key={t} onClick={() => { setTab(t); setEditing(false); }}
                className={`px-3 py-1.5 text-xs font-semibold border rounded-t-sm -mb-px ${
                  tab === t ? "bg-white border-slate-300 border-b-white text-slate-900" : "bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-700"
                }`}>
                {t}
              </button>
            ))}
            {dirty && (
              <Button size="sm" className="ml-auto mb-1 h-7 rounded-sm bg-lime-600 hover:bg-lime-700 text-white text-xs"
                onClick={save} disabled={saving}>
                <Save className="w-3.5 h-3.5 mr-1" /> {saving ? "Saving…" : "Save Changes"}
              </Button>
            )}
          </div>

          <div className="p-4">
            {editing ? (
              <>
                <h2 className="text-sm font-bold uppercase tracking-wider text-lime-600 mb-4">Edit Customer</h2>
                <CustomerForm value={customer} onChange={change} lists={lists} showRequired />
                <div className="flex justify-end gap-2 border-t border-slate-200 mt-6 pt-4">
                  <Button variant="outline" size="sm" className="h-8 rounded-sm" onClick={() => setEditing(false)}>Done Editing</Button>
                  <Button size="sm" className="h-8 rounded-sm bg-lime-600 hover:bg-lime-700 text-white" onClick={save} disabled={saving}>
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
                {tab === "History" && <HistoryTab customer={customer} estimates={estimates} />}
                {tab === "Analytics" && <AnalyticsTab estimates={estimates} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}