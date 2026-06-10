import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Share2, MapPin, User, Receipt, Flag } from "lucide-react";

// Single source of truth for project info. These details auto-fill every
// section created in the Build tab and are pushed to all sections on save —
// the user NEVER re-enters them inside the individual estimators.
export default function AllInOneProjectDetailsTab({ project, updateField }) {
  const genEstimateNumber = () => {
    updateField(
      "estimate_number",
      `AIO-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`
    );
  };

  const reqClass = (v) => (!v ? "border-red-300 focus-visible:ring-red-400" : "");

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="bg-white border-0 shadow-sm lg:col-span-2">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" /> Project & Client
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 grid md:grid-cols-2 gap-4">
          <div>
            <Label>Project Name *</Label>
            <Input
              className={reqClass(project.project_name)}
              value={project.project_name}
              onChange={(e) => updateField("project_name", e.target.value)}
              placeholder="e.g. Main St Pylon — Full Build"
            />
            {!project.project_name && <p className="text-xs text-red-500 mt-1">Required before building sections</p>}
          </div>
          <div>
            <Label>Client Name *</Label>
            <Input
              className={reqClass(project.client_name)}
              value={project.client_name}
              onChange={(e) => updateField("client_name", e.target.value)}
              placeholder="Client name"
            />
            {!project.client_name && <p className="text-xs text-red-500 mt-1">Required before building sections</p>}
          </div>
          <div>
            <Label>Estimate #</Label>
            <div className="flex gap-2">
              <Input
                value={project.estimate_number || ""}
                onChange={(e) => updateField("estimate_number", e.target.value)}
                placeholder="Optional"
              />
              <Button type="button" variant="outline" size="sm" className="h-9 flex-shrink-0" onClick={genEstimateNumber} title="Auto-generate estimate number">
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Generate
              </Button>
            </div>
          </div>
          <div>
            <Label>Customer PO #</Label>
            <Input
              value={project.po_number || ""}
              onChange={(e) => updateField("po_number", e.target.value)}
              placeholder="Purchase order (shown on quote)"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Site Address</Label>
            <Input
              value={project.site_address || ""}
              onChange={(e) => updateField("site_address", e.target.value)}
              placeholder="Job site address — auto-fills install & maintenance sections"
            />
          </div>
          <div>
            <Label>Contact Name</Label>
            <Input value={project.contact_name || ""} onChange={(e) => updateField("contact_name", e.target.value)} placeholder="On-site / billing contact" />
          </div>
          <div>
            <Label>Contact Phone</Label>
            <Input value={project.contact_phone || ""} onChange={(e) => updateField("contact_phone", e.target.value)} placeholder="(555) 555-5555" />
          </div>
          <div>
            <Label>Contact Email</Label>
            <Input type="email" value={project.contact_email || ""} onChange={(e) => updateField("contact_email", e.target.value)} placeholder="name@company.com" />
          </div>
          <div>
            <Label>Target Install Date</Label>
            <Input type="date" value={project.target_install_date || ""} onChange={(e) => updateField("target_install_date", e.target.value)} />
          </div>
          <div>
            <Label className="flex items-center gap-1"><Flag className="w-3.5 h-3.5" /> Priority</Label>
            <Select value={project.priority || "normal"} onValueChange={(v) => updateField("priority", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="rush">Rush</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tags</Label>
            <Input
              value={project.tags || ""}
              onChange={(e) => updateField("tags", e.target.value)}
              placeholder="comma, separated, tags"
            />
            <p className="text-xs text-slate-400 mt-1">Searchable from the projects list</p>
          </div>
          <div className="md:col-span-2">
            <Label>Hyperlink</Label>
            <Input
              value={project.hyperlink || ""}
              onChange={(e) => updateField("hyperlink", e.target.value)}
              placeholder="Optional reference link"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Notes</Label>
            <Textarea
              value={project.notes || ""}
              onChange={(e) => updateField("notes", e.target.value)}
              className="h-24"
              placeholder="Project notes — shown on the Customer View"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="w-5 h-5 text-indigo-600" /> Pricing Settings
            </CardTitle>
            <p className="text-xs text-slate-500">
              Applied in order: adjustments → discount → contingency → fees → tax
            </p>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={project.status || "draft"} onValueChange={(v) => updateField("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="calculated">Calculated</SelectItem>
                  <SelectItem value="sent">Sent to Customer</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Discount %</Label>
                <Input
                  type="number" min="0" step="0.5"
                  value={project.discount_percent ?? 0}
                  onChange={(e) => updateField("discount_percent", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label>Contingency %</Label>
                <Input
                  type="number" min="0" step="0.5"
                  value={project.contingency_percent ?? 0}
                  onChange={(e) => updateField("contingency_percent", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label>Shipping Fee $</Label>
                <Input
                  type="number" min="0" step="1"
                  value={project.shipping_fee ?? 0}
                  onChange={(e) => updateField("shipping_fee", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label>Permit Fee $</Label>
                <Input
                  type="number" min="0" step="1"
                  value={project.permit_fee ?? 0}
                  onChange={(e) => updateField("permit_fee", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label>Sales Tax %</Label>
                <Input
                  type="number" min="0" step="0.1"
                  value={project.tax_percent ?? 0}
                  onChange={(e) => updateField("tax_percent", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label>Deposit %</Label>
                <Input
                  type="number" min="0" max="100" step="1"
                  value={project.deposit_percent ?? 50}
                  onChange={(e) => updateField("deposit_percent", parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Per-section adjustment % is set on each section row in the Build tab (the % button).
            </p>
          </CardContent>
        </Card>

        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex gap-3">
          <Share2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-900">
            <p className="font-semibold mb-1">One entry — shared everywhere</p>
            <p className="text-indigo-800/90">
              These details auto-fill every section you build (client, estimate #, link, site
              address) and are re-synced to all sections every time you save. You never re-enter
              project info inside the individual estimators.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}