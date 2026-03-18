"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "@/components/icons";
import Link from "next/link";

interface Supplier {
  id: string;
  name: string;
}

interface GreenBeanData {
  id?: string;
  name: string;
  origin_country: string;
  origin_region: string;
  variety: string;
  process: string;
  lot_number: string;
  supplier_id: string;
  arrival_date: string;
  cost_per_kg: string;
  cupping_score: string;
  tasting_notes: string;
  altitude_masl: string;
  harvest_year: string;
  current_stock_kg: string;
  low_stock_threshold_kg: string;
  notes: string;
  is_active: boolean;
}

const EMPTY: GreenBeanData = {
  name: "", origin_country: "", origin_region: "", variety: "", process: "",
  lot_number: "", supplier_id: "", arrival_date: "", cost_per_kg: "",
  cupping_score: "", tasting_notes: "", altitude_masl: "", harvest_year: "",
  current_stock_kg: "", low_stock_threshold_kg: "", notes: "", is_active: true,
};

const PROCESSES = ["Washed", "Natural", "Honey", "Anaerobic", "Wet Hulled", "Semi-Washed"];

export function GreenBeanForm({
  bean,
  suppliers,
}: {
  bean?: GreenBeanData & { id: string };
  suppliers: Supplier[];
}) {
  const router = useRouter();
  const isEdit = !!bean;
  const [form, setForm] = useState<GreenBeanData>(bean || EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof GreenBeanData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }

    setSaving(true);
    setError(null);

    const url = isEdit ? `/api/tools/green-beans/${bean!.id}` : "/api/tools/green-beans";
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

    router.push("/tools/inventory/green");
    router.refresh();
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm(`Delete "${bean!.name}"? This will also delete all stock movements.`)) return;
    const res = await fetch(`/api/tools/green-beans/${bean!.id}`, { method: "DELETE" });
    if (res.ok) { router.push("/tools/inventory/green"); router.refresh(); }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tools/inventory/green" className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Green Bean" : "Add Green Bean"}</h1>
        </div>
        {isEdit && (
          <button onClick={handleDelete} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        {/* Identity */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            placeholder="e.g. Ethiopia Yirgacheffe Grade 1" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Origin Country</label>
            <input type="text" value={form.origin_country} onChange={(e) => update("origin_country", e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500" placeholder="e.g. Ethiopia" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Region</label>
            <input type="text" value={form.origin_region} onChange={(e) => update("origin_region", e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500" placeholder="e.g. Yirgacheffe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Variety</label>
            <input type="text" value={form.variety} onChange={(e) => update("variety", e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500" placeholder="e.g. Bourbon, SL28, Gesha" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Process</label>
            <select value={form.process} onChange={(e) => update("process", e.target.value)} className={`w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${form.process ? "text-slate-900" : "text-slate-400"}`}>
              <option value="">Select process</option>
              {PROCESSES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Lot Number</label>
            <input type="text" value={form.lot_number} onChange={(e) => update("lot_number", e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Harvest Year</label>
            <input type="text" value={form.harvest_year} onChange={(e) => update("harvest_year", e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500" placeholder="e.g. 2025/26" />
          </div>
        </div>

        {/* Supplier & Purchase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
            <select value={form.supplier_id} onChange={(e) => update("supplier_id", e.target.value)} className={`w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${form.supplier_id ? "text-slate-900" : "text-slate-400"}`}>
              <option value="">Select supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Arrival Date</label>
            <input type="date" value={form.arrival_date} onChange={(e) => update("arrival_date", e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cost per kg (£)</label>
            <input type="number" value={form.cost_per_kg} onChange={(e) => update("cost_per_kg", e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500" min="0" step="0.01" />
          </div>
        </div>

        {/* Quality */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cupping Score (0-100)</label>
            <input type="number" value={form.cupping_score} onChange={(e) => update("cupping_score", e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500" min="0" max="100" step="0.5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Altitude (masl)</label>
            <input type="number" value={form.altitude_masl} onChange={(e) => update("altitude_masl", e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500" min="0" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tasting Notes</label>
          <input type="text" value={form.tasting_notes} onChange={(e) => update("tasting_notes", e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500" placeholder="e.g. Blueberry, jasmine, citrus" />
        </div>

        {/* Stock */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Initial Stock (kg)</label>
              <input type="number" value={form.current_stock_kg} onChange={(e) => update("current_stock_kg", e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500" min="0" step="0.001" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Low Stock Alert (kg)</label>
            <input type="number" value={form.low_stock_threshold_kg} onChange={(e) => update("low_stock_threshold_kg", e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500" min="0" step="0.001" placeholder="Leave blank to disable" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
        </div>

        {isEdit && (
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => update("is_active", e.target.checked)} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
            <label htmlFor="is_active" className="text-sm text-slate-700">Active</label>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50">
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Green Bean"}
          </button>
          <Link href="/tools/inventory/green" className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 transition-colors">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
