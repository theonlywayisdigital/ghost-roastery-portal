"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "@/components/icons";
import Link from "next/link";

interface GreenBean {
  id: string;
  name: string;
}

interface RoastedStockData {
  id?: string;
  name: string;
  green_bean_id: string;
  current_stock_kg: string;
  low_stock_threshold_kg: string;
  notes: string;
  is_active: boolean;
}

const EMPTY: RoastedStockData = {
  name: "", green_bean_id: "", current_stock_kg: "",
  low_stock_threshold_kg: "", notes: "", is_active: true,
};

export function RoastedStockForm({
  stock,
  greenBeans,
}: {
  stock?: RoastedStockData & { id: string };
  greenBeans: GreenBean[];
}) {
  const router = useRouter();
  const isEdit = !!stock;
  const [form, setForm] = useState<RoastedStockData>(stock || EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof RoastedStockData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }

    setSaving(true);
    setError(null);

    const url = isEdit ? `/api/tools/roasted-stock/${stock!.id}` : "/api/tools/roasted-stock";
    const method = isEdit ? "PATCH" : "POST";

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

    router.push("/tools/roasted-stock");
    router.refresh();
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm(`Delete "${stock!.name}"? This will also delete all stock movements.`)) return;
    const res = await fetch(`/api/tools/roasted-stock/${stock!.id}`, { method: "DELETE" });
    if (res.ok) { router.push("/tools/roasted-stock"); router.refresh(); }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tools/roasted-stock" className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Roasted Stock" : "Add Roasted Stock"}</h1>
        </div>
        {isEdit && (
          <button onClick={handleDelete} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            placeholder="e.g. Colombian Single Origin" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Source Green Bean</label>
          <select value={form.green_bean_id} onChange={(e) => update("green_bean_id", e.target.value)}
            className={`w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${form.green_bean_id ? "text-slate-900" : "text-slate-400"}`}>
            <option value="">No linked green bean</option>
            {greenBeans.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <p className="text-xs text-slate-400 mt-1">Optional — link this roasted stock to the green bean it was roasted from.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Initial Stock (kg)</label>
              <input type="number" value={form.current_stock_kg} onChange={(e) => update("current_stock_kg", e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                min="0" step="0.001" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Low Stock Alert (kg)</label>
            <input type="number" value={form.low_stock_threshold_kg} onChange={(e) => update("low_stock_threshold_kg", e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              min="0" step="0.001" placeholder="Leave blank to disable" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
        </div>

        {isEdit && (
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => update("is_active", e.target.checked)}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
            <label htmlFor="is_active" className="text-sm text-slate-700">Active</label>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50">
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Roasted Stock"}
          </button>
          <Link href="/tools/roasted-stock" className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 transition-colors">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
