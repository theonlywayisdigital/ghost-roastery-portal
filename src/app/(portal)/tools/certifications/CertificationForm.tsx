"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Upload } from "@/components/icons";
import { createBrowserClient } from "@/lib/supabase";

interface CertificationData {
  id?: string;
  cert_name: string;
  cert_type: string;
  certificate_number: string;
  issuing_body: string;
  issue_date: string;
  expiry_date: string;
  reminder_days: string;
  document_url: string;
  document_name: string;
  notes: string;
}

const EMPTY: CertificationData = {
  cert_name: "",
  cert_type: "",
  certificate_number: "",
  issuing_body: "",
  issue_date: "",
  expiry_date: "",
  reminder_days: "30",
  document_url: "",
  document_name: "",
  notes: "",
};

const CERT_TYPES = [
  "Food Safety",
  "Organic",
  "Fair Trade",
  "Quality",
  "Environmental",
  "Other",
];

export function CertificationForm({
  certification,
  roasterId,
}: {
  certification?: CertificationData & { id: string };
  roasterId: string;
}) {
  const router = useRouter();
  const isEdit = !!certification;
  const [form, setForm] = useState<CertificationData>(certification || EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof CertificationData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const supabase = createBrowserClient();
      const filePath = `${roasterId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("certification-documents")
        .upload(filePath, file);

      if (uploadError) {
        setError("Failed to upload document: " + uploadError.message);
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("certification-documents")
        .getPublicUrl(filePath);

      setForm((prev) => ({
        ...prev,
        document_url: publicUrl,
        document_name: file.name,
      }));
    } catch {
      setError("Failed to upload document");
    }

    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cert_name.trim()) { setError("Certificate name is required"); return; }

    setSaving(true);
    setError(null);

    const url = isEdit ? `/api/tools/certifications/${certification!.id}` : "/api/tools/certifications";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save");
      setSaving(false);
      return;
    }

    router.push("/tools/certifications");
    router.refresh();
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm(`Delete "${certification!.cert_name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/tools/certifications/${certification!.id}`, { method: "DELETE" });
    if (res.ok) { router.push("/tools/certifications"); router.refresh(); }
  }

  const inputClass = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1";

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tools/certifications" className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Certification" : "Add Certification"}</h1>
        </div>
        {isEdit && (
          <button onClick={handleDelete} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        {/* Name */}
        <div>
          <label className={labelClass}>Certificate Name *</label>
          <input type="text" value={form.cert_name} onChange={(e) => update("cert_name", e.target.value)} className={inputClass} placeholder="e.g. Level 3 Food Safety" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Type</label>
            <select
              value={form.cert_type}
              onChange={(e) => update("cert_type", e.target.value)}
              className={`${inputClass} ${form.cert_type ? "text-slate-900" : "text-slate-400"}`}
            >
              <option value="">Select type</option>
              {CERT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Certificate Number</label>
            <input type="text" value={form.certificate_number} onChange={(e) => update("certificate_number", e.target.value)} className={inputClass} placeholder="e.g. FS-2024-12345" />
          </div>
        </div>

        <div>
          <label className={labelClass}>Issuing Body</label>
          <input type="text" value={form.issuing_body} onChange={(e) => update("issuing_body", e.target.value)} className={inputClass} placeholder="e.g. Chartered Institute of Environmental Health" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className={labelClass}>Issue Date</label>
            <input type="date" value={form.issue_date} onChange={(e) => update("issue_date", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Expiry Date</label>
            <input type="date" value={form.expiry_date} onChange={(e) => update("expiry_date", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Reminder (days before expiry)</label>
            <input type="number" value={form.reminder_days} onChange={(e) => update("reminder_days", e.target.value)} className={inputClass} min="1" max="365" step="1" />
          </div>
        </div>

        {/* Document upload */}
        <div>
          <label className={labelClass}>Document</label>
          {form.document_url ? (
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{form.document_name || "Document"}</p>
                <a href={form.document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:text-brand-700">
                  View document
                </a>
              </div>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, document_url: "", document_name: "" }))}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-brand-300 hover:bg-slate-50 transition-colors">
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-500">
                {uploading ? "Uploading..." : "Click to upload document"}
              </span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          )}
        </div>

        <div>
          <label className={labelClass}>Notes</label>
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} className={inputClass} placeholder="Any additional notes..." />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50">
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Certification"}
          </button>
          <Link href="/tools/certifications" className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 transition-colors">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
