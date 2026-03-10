"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trash2 } from "@/components/icons";
import { DataTable } from "@/components/admin";
import type { Column } from "@/components/admin";

interface BreakevenCalc {
  id: string;
  name: string;
  fixed_costs_monthly: number;
  variable_cost_per_unit: number;
  selling_price_per_unit: number;
  breakeven_units: number;
  breakeven_revenue: number;
  created_at: string;
}

interface FormData {
  name: string;
  fixed_costs_monthly: string;
  variable_cost_per_unit: string;
  selling_price_per_unit: string;
}

const EMPTY: FormData = {
  name: "",
  fixed_costs_monthly: "",
  variable_cost_per_unit: "",
  selling_price_per_unit: "",
};

function computeBreakeven(form: FormData) {
  const fixed = parseFloat(form.fixed_costs_monthly) || 0;
  const variable = parseFloat(form.variable_cost_per_unit) || 0;
  const selling = parseFloat(form.selling_price_per_unit) || 0;

  if (selling <= variable || fixed === 0) {
    return { units: 0, revenue: 0, contributionMargin: 0 };
  }

  const contributionMargin = selling - variable;
  const units = Math.ceil(fixed / contributionMargin);
  const revenue = units * selling;

  return { units, revenue, contributionMargin };
}

export function BreakevenCalculator({ calculations: initial }: { calculations: BreakevenCalc[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(EMPTY);
  const [calculations, setCalculations] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const results = useMemo(() => computeBreakeven(form), [form]);

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required to save"); return; }

    const fixed = parseFloat(form.fixed_costs_monthly) || 0;
    const variable = parseFloat(form.variable_cost_per_unit) || 0;
    const selling = parseFloat(form.selling_price_per_unit) || 0;

    if (selling <= variable) {
      setError("Selling price must be greater than variable cost per unit");
      return;
    }

    setSaving(true);
    setError(null);

    const res = await fetch("/api/tools/pricing/breakeven", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        fixed_costs_monthly: fixed,
        variable_cost_per_unit: variable,
        selling_price_per_unit: selling,
        breakeven_units: results.units,
        breakeven_revenue: results.revenue,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save");
      setSaving(false);
      return;
    }

    const data = await res.json();
    setCalculations((prev) => [data.calculation, ...prev]);
    setForm(EMPTY);
    setSaving(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this calculation?")) return;
    const res = await fetch(`/api/tools/pricing/breakeven/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCalculations((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    }
  }

  const columns: Column<BreakevenCalc>[] = [
    {
      key: "name",
      label: "Name",
      render: (row) => <span className="font-medium text-slate-900">{row.name}</span>,
    },
    {
      key: "fixed_costs_monthly",
      label: "Fixed Costs/mo",
      render: (row) => <span className="text-slate-600">{`£${Number(row.fixed_costs_monthly).toFixed(2)}`}</span>,
    },
    {
      key: "variable_cost_per_unit",
      label: "Variable/Unit",
      hiddenOnMobile: true,
      render: (row) => <span className="text-slate-600">{`£${Number(row.variable_cost_per_unit).toFixed(2)}`}</span>,
    },
    {
      key: "selling_price_per_unit",
      label: "Selling Price",
      hiddenOnMobile: true,
      render: (row) => <span className="text-slate-600">{`£${Number(row.selling_price_per_unit).toFixed(2)}`}</span>,
    },
    {
      key: "breakeven_units",
      label: "Break-even Units",
      render: (row) => <span className="font-medium text-slate-900">{row.breakeven_units}</span>,
    },
    {
      key: "breakeven_revenue",
      label: "Break-even Revenue",
      hiddenOnMobile: true,
      render: (row) => <span className="text-slate-600">{`£${Number(row.breakeven_revenue).toFixed(2)}`}</span>,
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }}
          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const inputClass = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1";

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tools/pricing" className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Break-even Calculator</h1>
          <p className="text-slate-500 mt-1">Calculate how many units you need to sell to cover costs.</p>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <div>
              <label className={labelClass}>Calculation Name *</label>
              <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)} className={inputClass} placeholder="e.g. Monthly overhead scenario" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className={labelClass}>Fixed Costs / Month (£)</label>
                <input type="number" value={form.fixed_costs_monthly} onChange={(e) => update("fixed_costs_monthly", e.target.value)} className={inputClass} min="0" step="0.01" placeholder="0.00" />
              </div>
              <div>
                <label className={labelClass}>Variable Cost / Unit (£)</label>
                <input type="number" value={form.variable_cost_per_unit} onChange={(e) => update("variable_cost_per_unit", e.target.value)} className={inputClass} min="0" step="0.01" placeholder="0.00" />
              </div>
              <div>
                <label className={labelClass}>Selling Price / Unit (£)</label>
                <input type="number" value={form.selling_price_per_unit} onChange={(e) => update("selling_price_per_unit", e.target.value)} className={inputClass} min="0" step="0.01" placeholder="0.00" />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50">
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Calculation"}
              </button>
            </div>
          </form>
        </div>

        {/* Results */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Results</h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Break-even Units</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{results.units.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-1">units per month</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600 uppercase tracking-wide">Break-even Revenue</p>
                <p className="text-2xl font-bold text-green-700 mt-1">
                  {`£${results.revenue.toFixed(2)}`}
                </p>
                <p className="text-xs text-green-600 mt-1">per month</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 uppercase tracking-wide">Contribution Margin</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">
                  {`£${results.contributionMargin.toFixed(2)}`}
                </p>
                <p className="text-xs text-blue-600 mt-1">per unit</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Saved calculations */}
      {calculations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Saved Calculations</h2>
          <DataTable
            columns={columns}
            data={calculations}
            emptyMessage="No saved break-even calculations."
          />
        </div>
      )}
    </div>
  );
}
