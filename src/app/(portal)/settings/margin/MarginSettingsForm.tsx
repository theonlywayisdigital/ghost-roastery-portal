"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "@/components/icons";
import { SettingsHeader } from "@/components/SettingsHeader";
import {
  computeRoastedCostPerKg,
  computeVariantCost,
  computeMarginSuggestion,
  formatCurrency,
  type MarginSettings,
} from "@/lib/margin-calculator";

interface MarginData {
  margin_markup_multiplier: number;
  margin_wholesale_discount_pct: number;
  margin_retail_rounding: number;
  margin_wholesale_rounding: number;
  default_weight_loss_pct: number;
  invoice_currency: string;
}

const ROUNDING_OPTIONS = [
  { value: 0, label: "No rounding (exact)" },
  { value: 0.01, label: "Nearest penny (0.01)" },
  { value: 0.05, label: "Nearest 5p (0.05)" },
  { value: 0.10, label: "Nearest 10p (0.10)" },
  { value: 0.50, label: "Nearest 50p (0.50)" },
];

// Example values for the live preview
const EXAMPLE_GREEN_COST = 18.87;
const EXAMPLE_WEIGHT_LOSS = 12;
const EXAMPLE_WEIGHT_GRAMS = 250;

export function MarginSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<MarginData>({
    margin_markup_multiplier: 3.5,
    margin_wholesale_discount_pct: 35,
    margin_retail_rounding: 0.05,
    margin_wholesale_rounding: 0.05,
    default_weight_loss_pct: 14,
    invoice_currency: "GBP",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/margin");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load margin settings:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function updateField<K extends keyof MarginData>(key: K, value: MarginData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/settings/margin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const json = await res.json();
        setError(json.error || "Failed to save");
      }
    } catch {
      setError("Failed to save margin settings");
    }
    setSaving(false);
  }

  // Live example calculation
  const settings: MarginSettings = {
    markup_multiplier: data.margin_markup_multiplier,
    wholesale_discount_pct: data.margin_wholesale_discount_pct,
    retail_rounding: data.margin_retail_rounding,
    wholesale_rounding: data.margin_wholesale_rounding,
    default_weight_loss_pct: data.default_weight_loss_pct,
  };

  const exampleRoastedCost = computeRoastedCostPerKg(EXAMPLE_GREEN_COST, EXAMPLE_WEIGHT_LOSS);
  const exampleVariantCost = computeVariantCost({
    weight_grams: EXAMPLE_WEIGHT_GRAMS,
    roasted_cost_per_kg: exampleRoastedCost,
  });
  const exampleSuggestion = computeMarginSuggestion(exampleVariantCost, settings);
  const curr = data.invoice_currency;

  if (loading) {
    return (
      <div>
        <SettingsHeader
          title="Margin Calculator"
          description="Set your default markup, wholesale discount, and rounding rules."
          breadcrumb="Margin Calculator"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <SettingsHeader
        title="Margin Calculator"
        description="Set your default markup, wholesale discount, and rounding rules."
        breadcrumb="Margin Calculator"
      />

      <div className="space-y-6">
        {/* ─── Markup & Discount ─── */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Markup & Discount</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Retail Markup Multiplier
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="20"
                  value={data.margin_markup_multiplier}
                  onChange={(e) => updateField("margin_markup_multiplier", parseFloat(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  Retail price = cost x multiplier. A 3.5x multiplier on a {formatCurrency(5.36, curr)} cost = {formatCurrency(5.36 * 3.5, curr)}.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Wholesale Discount %
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="99"
                  value={data.margin_wholesale_discount_pct}
                  onChange={(e) => updateField("margin_wholesale_discount_pct", parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  Wholesale = retail minus this percentage. 35% off {formatCurrency(18.75, curr)} = {formatCurrency(18.75 * 0.65, curr)}.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Default Weight Loss %
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={data.default_weight_loss_pct}
                  onChange={(e) => updateField("default_weight_loss_pct", parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  Fallback weight loss for profiles that don&apos;t have one set. Also used in Business Info settings.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Rounding ─── */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Price Rounding</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Retail Rounding
                </label>
                <select
                  value={data.margin_retail_rounding}
                  onChange={(e) => updateField("margin_retail_rounding", parseFloat(e.target.value))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  {ROUNDING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Wholesale Rounding
                </label>
                <select
                  value={data.margin_wholesale_rounding}
                  onChange={(e) => updateField("margin_wholesale_rounding", parseFloat(e.target.value))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  {ROUNDING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Live Example ─── */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Live Example</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Using {formatCurrency(EXAMPLE_GREEN_COST, curr)}/kg green cost, {EXAMPLE_WEIGHT_LOSS}% loss, {EXAMPLE_WEIGHT_GRAMS}g bag
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Roasted Cost/kg</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatCurrency(exampleRoastedCost, curr)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">250g Bag Cost</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatCurrency(exampleVariantCost, curr)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Suggested Retail</p>
                <p className="text-lg font-semibold text-green-700">
                  {formatCurrency(exampleSuggestion.suggested_retail, curr)}
                </p>
                <p className="text-xs text-slate-400">{exampleSuggestion.retail_margin_pct}% margin</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Suggested Wholesale</p>
                <p className="text-lg font-semibold text-blue-700">
                  {formatCurrency(exampleSuggestion.suggested_wholesale, curr)}
                </p>
                <p className="text-xs text-slate-400">{exampleSuggestion.wholesale_margin_pct}% margin</p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Save ─── */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Margin Settings"}
          </button>
          {saved && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
