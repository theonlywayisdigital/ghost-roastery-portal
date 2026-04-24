"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "@/components/icons";
import Link from "next/link";

interface Bean {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
}

interface ProductionPlanData {
  id?: string;
  planned_date: string;
  green_bean_id: string;
  green_bean_name: string;
  planned_weight_kg: string;
  expected_loss_percent: string;
  product_id: string;
  priority: string;
  notes: string;
  status: string;
}

const EMPTY: ProductionPlanData = {
  planned_date: new Date().toISOString().split("T")[0],
  green_bean_id: "", green_bean_name: "",
  planned_weight_kg: "", expected_loss_percent: "15",
  product_id: "", priority: "0", notes: "", status: "planned",
};

const inputClass = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500";
const selectClass = (hasValue: boolean) =>
  `w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${hasValue ? "text-slate-900" : "text-slate-400"}`;
const labelClass = "block text-sm font-medium text-slate-700 mb-1";

export function ProductionForm({
  plan,
  beans,
  products,
}: {
  plan?: ProductionPlanData & { id: string };
  beans: Bean[];
  products: Product[];
}) {
  const router = useRouter();
  const isEdit = !!plan;
  const [form, setForm] = useState<ProductionPlanData>(plan || EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof ProductionPlanData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Auto-calculate expected output
  const expectedOutput = useMemo(() => {
    const weight = parseFloat(form.planned_weight_kg);
    const loss = parseFloat(form.expected_loss_percent);
    if (!weight || weight <= 0 || isNaN(loss)) return null;
    return (weight * (1 - loss / 100)).toFixed(2);
  }, [form.planned_weight_kg, form.expected_loss_percent]);

  // When selecting a bean, auto-fill the green_bean_name
  function handleBeanChange(beanId: string) {
    const bean = beans.find((b) => b.id === beanId);
    setForm((prev) => ({
      ...prev,
      green_bean_id: beanId,
      green_bean_name: bean?.name || "",
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.planned_date) { setError("Planned date is required"); return; }

    setSaving(true);
    setError(null);

    const url = isEdit ? `/api/tools/production/${plan!.id}` : "/api/tools/production";
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

    router.push("/production");
    router.refresh();
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm("Delete this production plan? This action cannot be undone.")) return;
    const res = await fetch(`/api/tools/production/${plan!.id}`, { method: "DELETE" });
    if (res.ok) { router.push("/production"); router.refresh(); }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/production" className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Production Plan" : "New Production Plan"}</h1>
        </div>
        {isEdit && (
          <button onClick={handleDelete} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className={labelClass}>Planned Date *</label>
            <input type="date" value={form.planned_date} onChange={(e) => update("planned_date", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select value={form.status} onChange={(e) => update("status", e.target.value)} className={selectClass(!!form.status)}>
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Priority (0-5)</label>
            <input type="number" value={form.priority} onChange={(e) => update("priority", e.target.value)} className={inputClass} min="0" max="5" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Green Bean</label>
            <select value={form.green_bean_id} onChange={(e) => handleBeanChange(e.target.value)} className={selectClass(!!form.green_bean_id)}>
              <option value="">Select bean</option>
              {beans.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Product Link (optional)</label>
            <select value={form.product_id} onChange={(e) => update("product_id", e.target.value)} className={selectClass(!!form.product_id)}>
              <option value="">Select product</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className={labelClass}>Planned Weight (kg)</label>
            <input type="number" value={form.planned_weight_kg} onChange={(e) => update("planned_weight_kg", e.target.value)} className={inputClass} min="0" step="0.001" placeholder="0.000" />
          </div>
          <div>
            <label className={labelClass}>Expected Loss %</label>
            <input type="number" value={form.expected_loss_percent} onChange={(e) => update("expected_loss_percent", e.target.value)} className={inputClass} min="0" max="100" step="0.1" placeholder="15" />
          </div>
          <div>
            <label className={labelClass}>Expected Output (kg)</label>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium">
              {expectedOutput != null ? `${expectedOutput} kg` : "--"}
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass}>Notes</label>
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} className={inputClass} placeholder="Any notes about this production plan..." />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50">
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Plan"}
          </button>
          <Link href="/production" className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 transition-colors">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
