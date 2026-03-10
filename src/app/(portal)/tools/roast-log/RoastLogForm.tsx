"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Star } from "@/components/icons";
import Link from "next/link";

interface Bean {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
}

interface RoastLogData {
  id?: string;
  roast_date: string;
  roast_number: string;
  green_bean_id: string;
  green_bean_name: string;
  green_weight_kg: string;
  roasted_weight_kg: string;
  roast_level: string;
  roast_time_seconds: string;
  charge_temp_c: string;
  first_crack_time_seconds: string;
  first_crack_temp_c: string;
  second_crack_time_seconds: string;
  second_crack_temp_c: string;
  drop_temp_c: string;
  roaster_machine: string;
  operator: string;
  ambient_temp_c: string;
  ambient_humidity_percent: string;
  quality_rating: string;
  notes: string;
  product_id: string;
  status: string;
}

const EMPTY: RoastLogData = {
  roast_date: new Date().toISOString().split("T")[0],
  roast_number: "", green_bean_id: "", green_bean_name: "",
  green_weight_kg: "", roasted_weight_kg: "",
  roast_level: "", roast_time_seconds: "", charge_temp_c: "",
  first_crack_time_seconds: "", first_crack_temp_c: "",
  second_crack_time_seconds: "", second_crack_temp_c: "",
  drop_temp_c: "", roaster_machine: "", operator: "",
  ambient_temp_c: "", ambient_humidity_percent: "",
  quality_rating: "", notes: "", product_id: "", status: "draft",
};

const ROAST_LEVELS = ["Light", "Medium-Light", "Medium", "Medium-Dark", "Dark"];

const inputClass = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500";
const selectClass = (hasValue: boolean) =>
  `w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${hasValue ? "text-slate-900" : "text-slate-400"}`;
const labelClass = "block text-sm font-medium text-slate-700 mb-1";

export function RoastLogForm({
  roastLog,
  beans,
  products,
}: {
  roastLog?: RoastLogData & { id: string };
  beans: Bean[];
  products: Product[];
}) {
  const router = useRouter();
  const isEdit = !!roastLog;
  const [form, setForm] = useState<RoastLogData>(roastLog || EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof RoastLogData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Auto-calculate weight loss percent
  const weightLossPercent = useMemo(() => {
    const green = parseFloat(form.green_weight_kg);
    const roasted = parseFloat(form.roasted_weight_kg);
    if (!green || !roasted || green <= 0) return null;
    return ((green - roasted) / green * 100).toFixed(1);
  }, [form.green_weight_kg, form.roasted_weight_kg]);

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
    if (!form.roast_date) { setError("Roast date is required"); return; }

    setSaving(true);
    setError(null);

    const url = isEdit ? `/api/tools/roast-log/${roastLog!.id}` : "/api/tools/roast-log";
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

    router.push("/tools/roast-log");
    router.refresh();
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm("Delete this roast log? This action cannot be undone.")) return;
    const res = await fetch(`/api/tools/roast-log/${roastLog!.id}`, { method: "DELETE" });
    if (res.ok) { router.push("/tools/roast-log"); router.refresh(); }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tools/roast-log" className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Roast Log" : "New Roast Log"}</h1>
        </div>
        {isEdit && (
          <button onClick={handleDelete} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-900">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className={labelClass}>Roast Date *</label>
              <input type="date" value={form.roast_date} onChange={(e) => update("roast_date", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Batch Number</label>
              <input type="text" value={form.roast_number} onChange={(e) => update("roast_number", e.target.value)} className={inputClass} placeholder="e.g. B-001" />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select value={form.status} onChange={(e) => update("status", e.target.value)} className={selectClass(!!form.status)}>
                <option value="draft">Draft</option>
                <option value="completed">Completed</option>
              </select>
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
        </div>

        {/* Weight */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-900">Weight</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className={labelClass}>Green Weight (kg)</label>
              <input type="number" value={form.green_weight_kg} onChange={(e) => update("green_weight_kg", e.target.value)} className={inputClass} min="0" step="0.001" placeholder="0.000" />
            </div>
            <div>
              <label className={labelClass}>Roasted Weight (kg)</label>
              <input type="number" value={form.roasted_weight_kg} onChange={(e) => update("roasted_weight_kg", e.target.value)} className={inputClass} min="0" step="0.001" placeholder="0.000" />
            </div>
            <div>
              <label className={labelClass}>Weight Loss %</label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium">
                {weightLossPercent != null ? `${weightLossPercent}%` : "--"}
              </div>
            </div>
          </div>
        </div>

        {/* Roast Profile */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-900">Roast Profile</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className={labelClass}>Roast Level</label>
              <select value={form.roast_level} onChange={(e) => update("roast_level", e.target.value)} className={selectClass(!!form.roast_level)}>
                <option value="">Select level</option>
                {ROAST_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Roast Time (seconds)</label>
              <input type="number" value={form.roast_time_seconds} onChange={(e) => update("roast_time_seconds", e.target.value)} className={inputClass} min="0" placeholder="e.g. 720" />
            </div>
            <div>
              <label className={labelClass}>Charge Temp ({"\u00B0"}C)</label>
              <input type="number" value={form.charge_temp_c} onChange={(e) => update("charge_temp_c", e.target.value)} className={inputClass} min="0" step="0.1" placeholder="e.g. 200" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Drop Temp ({"\u00B0"}C)</label>
            <input type="number" value={form.drop_temp_c} onChange={(e) => update("drop_temp_c", e.target.value)} className={inputClass} min="0" step="0.1" placeholder="e.g. 210" />
          </div>
        </div>

        {/* First Crack */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-900">First Crack</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>First Crack Time (seconds)</label>
              <input type="number" value={form.first_crack_time_seconds} onChange={(e) => update("first_crack_time_seconds", e.target.value)} className={inputClass} min="0" placeholder="e.g. 540" />
            </div>
            <div>
              <label className={labelClass}>First Crack Temp ({"\u00B0"}C)</label>
              <input type="number" value={form.first_crack_temp_c} onChange={(e) => update("first_crack_temp_c", e.target.value)} className={inputClass} min="0" step="0.1" placeholder="e.g. 196" />
            </div>
          </div>
        </div>

        {/* Second Crack (optional) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-900">Second Crack <span className="text-sm font-normal text-slate-400">(optional)</span></h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Second Crack Time (seconds)</label>
              <input type="number" value={form.second_crack_time_seconds} onChange={(e) => update("second_crack_time_seconds", e.target.value)} className={inputClass} min="0" placeholder="e.g. 660" />
            </div>
            <div>
              <label className={labelClass}>Second Crack Temp ({"\u00B0"}C)</label>
              <input type="number" value={form.second_crack_temp_c} onChange={(e) => update("second_crack_temp_c", e.target.value)} className={inputClass} min="0" step="0.1" placeholder="e.g. 224" />
            </div>
          </div>
        </div>

        {/* Environment */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-900">Environment</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Roaster Machine</label>
              <input type="text" value={form.roaster_machine} onChange={(e) => update("roaster_machine", e.target.value)} className={inputClass} placeholder="e.g. Probat P12" />
            </div>
            <div>
              <label className={labelClass}>Operator</label>
              <input type="text" value={form.operator} onChange={(e) => update("operator", e.target.value)} className={inputClass} placeholder="e.g. John" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Ambient Temp ({"\u00B0"}C)</label>
              <input type="number" value={form.ambient_temp_c} onChange={(e) => update("ambient_temp_c", e.target.value)} className={inputClass} step="0.1" placeholder="e.g. 22" />
            </div>
            <div>
              <label className={labelClass}>Ambient Humidity (%)</label>
              <input type="number" value={form.ambient_humidity_percent} onChange={(e) => update("ambient_humidity_percent", e.target.value)} className={inputClass} min="0" max="100" step="0.1" placeholder="e.g. 55" />
            </div>
          </div>
        </div>

        {/* Quality */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-900">Quality</h2>

          <div>
            <label className={labelClass}>Rating</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => update("quality_rating", form.quality_rating === String(star) ? "" : String(star))}
                  className="p-1 rounded hover:bg-slate-100 transition-colors"
                >
                  <Star
                    className={`w-6 h-6 ${
                      Number(form.quality_rating) >= star ? "text-amber-400" : "text-slate-200"
                    }`}
                  />
                </button>
              ))}
              {form.quality_rating && (
                <span className="ml-2 text-sm text-slate-500">{form.quality_rating}/5</span>
              )}
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} className={inputClass} placeholder="Any observations about this roast..." />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50">
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Roast Log"}
          </button>
          <Link href="/tools/roast-log" className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 transition-colors">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
