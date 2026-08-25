import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { Bell, FileText, TrendingUp, AlertCircle, CheckCircle2, Clock } from "lucide-react";

// ============================================================================
// Sales Home — notifications & activity feed only.
// No estimate creation here; use the Quick Price / Estimates menus to build.
// ============================================================================
export default function Dashboard() {
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.AllInOneEstimate.list("-updated_date", 12)
      .then(setEstimates)
      .catch(() => setEstimates([]))
      .finally(() => setLoading(false));
  }, []);

  const statusIcon = (status) => {
    switch (status) {
      case "approved": return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "sent": return <FileText className="w-4 h-4 text-blue-600" />;
      case "archived": return <AlertCircle className="w-4 h-4 text-slate-400" />;
      default: return <Clock className="w-4 h-4 text-amber-600" />;
    }
  };

  const statusLabel = (status) => ({
    draft: "Draft",
    calculated: "Calculated",
    sent: "Sent to Customer",
    approved: "Approved",
    archived: "Archived",
  }[status] || "Draft");

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-[900px] mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white border border-slate-300 rounded-sm shadow-sm px-4 py-3 flex items-center gap-2">
          <Bell className="w-5 h-5 text-lime-700" />
          <h1 className="text-base font-bold text-lime-700 uppercase tracking-wide">Sales Home — Notifications</h1>
        </div>

        {/* Summary tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-300 rounded-sm shadow-sm px-4 py-3">
            <p className="text-xs text-slate-500 uppercase font-semibold">Active Estimates</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{estimates.filter(e => e.status !== "archived").length}</p>
          </div>
          <div className="bg-white border border-slate-300 rounded-sm shadow-sm px-4 py-3">
            <p className="text-xs text-slate-500 uppercase font-semibold">Awaiting Approval</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{estimates.filter(e => e.status === "sent").length}</p>
          </div>
          <div className="bg-white border border-slate-300 rounded-sm shadow-sm px-4 py-3">
            <p className="text-xs text-slate-500 uppercase font-semibold">Approved</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{estimates.filter(e => e.status === "approved").length}</p>
          </div>
          <div className="bg-white border border-slate-300 rounded-sm shadow-sm px-4 py-3">
            <p className="text-xs text-slate-500 uppercase font-semibold">In Draft</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{estimates.filter(e => e.status === "draft" || e.status === "calculated").length}</p>
          </div>
        </div>

        {/* Recent activity feed */}
        <div className="bg-white border border-slate-300 rounded-sm shadow-sm">
          <div className="px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Recent Estimate Activity</h2>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-sm animate-pulse" />)}
            </div>
          ) : estimates.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Bell className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">No recent activity. Create an estimate from the Estimates menu.</p>
            </div>
          ) : (
            <div>
              {estimates.map((e, i) => (
                <Link
                  key={e.id}
                  to={`${createPageUrl("NewAllInOneEstimate")}?id=${e.id}`}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-lime-50/60 transition-colors ${i % 2 ? "bg-slate-50/40" : ""}`}
                >
                  {statusIcon(e.status)}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{e.project_name || "Untitled"}</p>
                    <p className="text-xs text-slate-500 truncate">{e.client_name || "No customer"} · {statusLabel(e.status)}</p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {e.updated_date ? new Date(e.updated_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}