"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "@/components/icons";

export function CuppingForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    session_name: "",
    session_date: new Date().toISOString().split("T")[0],
    cupper_name: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.session_name.trim()) {
      setError("Session name is required");
      return;
    }
    if (!form.session_date) {
      setError("Session date is required");
      return;
    }

    setSaving(true);
    setError(null);

    const res = await fetch("/api/tools/cupping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create session");
      setSaving(false);
      return;
    }

    const data = await res.json();
    router.push(`/inventory/cupping/${data.session.id}`);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/inventory/cupping" className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">New Cupping Session</h1>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Session Name *</label>
          <input
            type="text"
            value={form.session_name}
            onChange={(e) => update("session_name", e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            placeholder="e.g. Ethiopia Naturals Comparison"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Session Date *</label>
            <input
              type="date"
              value={form.session_date}
              onChange={(e) => update("session_date", e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cupper Name</label>
            <input
              type="text"
              value={form.cupper_name}
              onChange={(e) => update("cupper_name", e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="e.g. John Smith"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            placeholder="Any notes about this session..."
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Session"}
          </button>
          <Link href="/inventory/cupping" className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
