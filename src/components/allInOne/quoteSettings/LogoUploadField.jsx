import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Trash2, ImageOff } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";

// Branding logo field. Admins can upload an image file (or paste a URL);
// everyone else sees the current logo read-only.
export default function LogoUploadField({ value, onChange }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
      toast({ title: "Logo uploaded" });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <Label className="text-xs">Branding Logo</Label>
      <div className="mt-1 flex items-center gap-2">
        <div className="w-20 h-14 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
          {value ? <img src={value} alt="" className="max-h-full max-w-full object-contain" /> : <ImageOff className="w-4 h-4 text-slate-300" />}
        </div>
        <div className="flex-1 space-y-1.5">
          {isAdmin ? (
            <>
              <div className="flex gap-1.5">
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs" disabled={busy} onClick={() => fileRef.current?.click()}>
                  {busy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                  {busy ? "Uploading…" : "Upload image"}
                </Button>
                {value && (
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs text-red-600" onClick={() => onChange("")}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <Input className="h-7 text-xs" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="…or paste an image URL" />
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
            </>
          ) : (
            <p className="text-[11px] text-slate-400">Only an admin can change the branding logo.</p>
          )}
        </div>
      </div>
    </div>
  );
}