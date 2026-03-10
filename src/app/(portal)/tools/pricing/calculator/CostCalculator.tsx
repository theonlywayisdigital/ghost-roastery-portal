"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "@/components/icons";

interface GreenBean {
  id: string;
  name: string;
  cost_per_kg: number | null;
}

interface CostCalculatorData {
  id?: string;
  name: string;
  green_bean_id: string;
  green_cost_per_kg: string;
  roast_loss_percent: string;
  labour_cost_per_hour: string;
  roast_time_minutes: string;
  packaging_cost_per_unit: string;
  label_cost_per_unit: string;
  overhead_per_unit: string;
  bag_weight_grams: string;
  target_retail_margin_percent: string;
  target_wholesale_margin_percent: string;
  product_id: string;
  notes: string;
  is_template: boolean;
}

const EMPTY: CostCalculatorData = {
  name: "",
  green_bean_id: "",
  green_cost_per_kg: "",
  roast_loss_percent: "15",
  labour_cost_per_hour: "",
  roast_time_minutes: "",
  packaging_cost_per_unit: "",
  label_cost_per_unit: "",
  overhead_per_unit: "",
  bag_weight_grams: "250",
  target_retail_margin_percent: "50",
  target_wholesale_margin_percent: "30",
  product_id: "",
  notes: "",
  is_template: false,
};

const BAG_SIZES = [
  { value: "250", label: "250g" },
  { value: "500", label: "500g" },
  { value: "1000", label: "1kg" },
];

function computeResults(form: CostCalculatorData) {
  const greenCostPerKg = parseFloat(form.green_cost_per_kg) || 0;
  const roastLoss = parseFloat(form.roast_loss_percent) || 0;
  const labourPerHour = parseFloat(form.labour_cost_per_hour) || 0;
  const roastMinutes = parseFloat(form.roast_time_minutes) || 0;
  const packagingCost = parseFloat(form.packaging_cost_per_unit) || 0;
  const labelCost = parseFloat(form.label_cost_per_unit) || 0;
  const overheadCost = parseFloat(form.overhead_per_unit) || 0;
  const bagWeight = parseFloat(form.bag_weight_grams) || 250;
  const retailMargin = parseFloat(form.target_retail_margin_percent) || 0;
  const wholesaleMargin = parseFloat(form.target_wholesale_margin_percent) || 0;

  if (greenCostPerKg === 0) {
    return { costPerBag: 0, retailPrice: 0, wholesalePrice: 0, retailMarginAmt: 0, wholesaleMarginAmt: 0 };
  }

  const roastedCostPerKg = greenCostPerKg / (1 - roastLoss / 100);
  const greenCostPerBag = roastedCostPerKg * (bagWeight / 1000);
  const bagsPerBatch = 1000 / bagWeight;
  const labourPerBag = (labourPerHour * roastMinutes / 60) / bagsPerBatch;
  const totalCost = greenCostPerBag + labourPerBag + packagingCost + labelCost + overheadCost;

  const retailPrice = retailMargin < 100 ? totalCost / (1 - retailMargin / 100) : 0;
  const wholesalePrice = wholesaleMargin < 100 ? totalCost / (1 - wholesaleMargin / 100) : 0;

  return {
    costPerBag: totalCost,
    retailPrice,
    wholesalePrice,
    retailMarginAmt: retailPrice - totalCost,
    wholesaleMarginAmt: wholesalePrice - totalCost,
  };
}

export function CostCalculator({
  greenBeans,
  calculation,
}: {
  greenBeans: GreenBean[];
  calculation?: CostCalculatorData & { id: string };
}) {
  const router = useRouter();
  const isEdit = !!calculation;
  const [form, setForm] = useState<CostCalculatorData>(calculation || EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const results = useMemo(() => computeResults(form), [form]);

  function update(field: keyof CostCalculatorData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleBeanSelect(beanId: string) {
    update("green_bean_id", beanId);
    if (beanId) {
      const bean = greenBeans.find((b) => b.id === beanId);
      if (bean?.cost_per_kg) {
        update("green_cost_per_kg", String(bean.cost_per_kg));
      }
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required to save"); return; }

    setSaving(true);
    setError(null);

    const url = isEdit ? `/api/tools/pricing/${calculation!.id}` : "/api/tools/pricing";
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

    router.push("/tools/pricing");
    router.refresh();
  }

  const inputClass = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1";

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tools/pricing" className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Calculation" : "Cost Calculator"}</h1>
          <p className="text-slate-500 mt-1">Calculate your cost per bag and set profitable prices.</p>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Save Name */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Calculation Name</h2>
              <div>
                <label className={labelClass}>Name *</label>
                <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)} className={inputClass} placeholder="e.g. Ethiopia Yirgacheffe 250g" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input type="checkbox" id="is_template" checked={form.is_template} onChange={(e) => update("is_template", e.target.checked)} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                <label htmlFor="is_template" className="text-sm text-slate-700">Save as template</label>
              </div>
            </div>

            {/* Green Bean Cost */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Green Bean Cost</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Select Bean (optional)</label>
                  <select
                    value={form.green_bean_id}
                    onChange={(e) => handleBeanSelect(e.target.value)}
                    className={`${inputClass} ${form.green_bean_id ? "text-slate-900" : "text-slate-400"}`}
                  >
                    <option value="">Manual entry</option>
                    {greenBeans.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}{b.cost_per_kg ? ` (£${Number(b.cost_per_kg).toFixed(2)}/kg)` : ""}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Green Cost per kg (£)</label>
                  <input type="number" value={form.green_cost_per_kg} onChange={(e) => update("green_cost_per_kg", e.target.value)} className={inputClass} min="0" step="0.01" placeholder="0.00" />
                </div>
              </div>
              <div className="mt-5">
                <label className={labelClass}>Roast Loss %</label>
                <input type="number" value={form.roast_loss_percent} onChange={(e) => update("roast_loss_percent", e.target.value)} className={inputClass} min="0" max="50" step="0.5" />
              </div>
            </div>

            {/* Labour */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Labour</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Labour Cost per Hour (£)</label>
                  <input type="number" value={form.labour_cost_per_hour} onChange={(e) => update("labour_cost_per_hour", e.target.value)} className={inputClass} min="0" step="0.01" placeholder="0.00" />
                </div>
                <div>
                  <label className={labelClass}>Roast Time (minutes)</label>
                  <input type="number" value={form.roast_time_minutes} onChange={(e) => update("roast_time_minutes", e.target.value)} className={inputClass} min="0" step="1" placeholder="12" />
                </div>
              </div>
            </div>

            {/* Packaging */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Packaging</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className={labelClass}>Packaging Cost per Unit (£)</label>
                  <input type="number" value={form.packaging_cost_per_unit} onChange={(e) => update("packaging_cost_per_unit", e.target.value)} className={inputClass} min="0" step="0.01" placeholder="0.00" />
                </div>
                <div>
                  <label className={labelClass}>Label Cost per Unit (£)</label>
                  <input type="number" value={form.label_cost_per_unit} onChange={(e) => update("label_cost_per_unit", e.target.value)} className={inputClass} min="0" step="0.01" placeholder="0.00" />
                </div>
                <div>
                  <label className={labelClass}>Overhead per Unit (£)</label>
                  <input type="number" value={form.overhead_per_unit} onChange={(e) => update("overhead_per_unit", e.target.value)} className={inputClass} min="0" step="0.01" placeholder="0.00" />
                </div>
              </div>
            </div>

            {/* Product */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Product</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className={labelClass}>Bag Weight</label>
                  <select value={form.bag_weight_grams} onChange={(e) => update("bag_weight_grams", e.target.value)} className={inputClass}>
                    {BAG_SIZES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Target Retail Margin %</label>
                  <input type="number" value={form.target_retail_margin_percent} onChange={(e) => update("target_retail_margin_percent", e.target.value)} className={inputClass} min="0" max="99" step="1" />
                </div>
                <div>
                  <label className={labelClass}>Target Wholesale Margin %</label>
                  <input type="number" value={form.target_wholesale_margin_percent} onChange={(e) => update("target_wholesale_margin_percent", e.target.value)} className={inputClass} min="0" max="99" step="1" />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Notes</h2>
              <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} className={inputClass} placeholder="Any additional notes..." />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50">
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : isEdit ? "Save Changes" : "Save Calculation"}
              </button>
              <Link href="/tools/pricing" className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 transition-colors">Cancel</Link>
            </div>
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">Results</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Cost per bag</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      £{results.costPerBag.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600 uppercase tracking-wide">Retail Price</p>
                    <p className="text-2xl font-bold text-green-700 mt-1">
                      £{results.retailPrice.toFixed(2)}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Margin: £{results.retailMarginAmt.toFixed(2)} ({form.target_retail_margin_percent}%)
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 uppercase tracking-wide">Wholesale Price</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">
                      £{results.wholesalePrice.toFixed(2)}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Margin: £{results.wholesaleMarginAmt.toFixed(2)} ({form.target_wholesale_margin_percent}%)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
