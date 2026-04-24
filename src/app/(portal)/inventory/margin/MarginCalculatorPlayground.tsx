"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  computeRoastedCostPerKg,
  computeVariantCost,
  computeMarginSuggestion,
  formatCurrency,
  type MarginSettings,
} from "@/lib/margin-calculator";
import { PriceReviewModal } from "@/components/inventory/PriceReviewModal";

interface GreenBeanRef {
  id: string;
  name: string;
  cost_per_kg: number | null;
}

interface RoastProfile {
  id: string;
  name: string;
  weight_loss_percentage: number | null;
  green_bean_id: string | null;
  green_beans: GreenBeanRef | null;
}

interface GreenBeanOption {
  id: string;
  name: string;
  cost_per_kg: number | null;
}

interface Props {
  profiles: RoastProfile[];
  greenBeans: GreenBeanOption[];
  settings: MarginSettings;
  currency: string;
}

const COMMON_WEIGHTS = [250, 500, 1000];

export function MarginCalculatorPlayground({ profiles, greenBeans, settings: initialSettings, currency }: Props) {
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [weightGrams, setWeightGrams] = useState(250);
  const [customMultiplier, setCustomMultiplier] = useState("");

  // Allow live tuning of settings within the playground
  const [settings, setSettings] = useState(initialSettings);

  // Bulk review
  const [reviewBeanId, setReviewBeanId] = useState<string | null>(null);
  const [selectedBulkBeanId, setSelectedBulkBeanId] = useState("");

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) || null;

  const result = useMemo(() => {
    if (!selectedProfile) return null;

    const greenCost = selectedProfile.green_beans?.cost_per_kg;
    if (greenCost == null || greenCost <= 0) return null;

    const weightLoss = selectedProfile.weight_loss_percentage ?? settings.default_weight_loss_pct;
    const roastedCostPerKg = computeRoastedCostPerKg(greenCost, weightLoss);

    const variantCost = computeVariantCost({
      weight_grams: weightGrams,
      roasted_cost_per_kg: roastedCostPerKg,
    });

    const multiplierOverride = customMultiplier ? parseFloat(customMultiplier) : null;
    const suggestion = computeMarginSuggestion(variantCost, settings, multiplierOverride);

    return {
      greenCostPerKg: greenCost,
      weightLossPct: weightLoss,
      roastedCostPerKg,
      ...suggestion,
    };
  }, [selectedProfile, weightGrams, customMultiplier, settings]);

  const fmt = (v: number) => formatCurrency(v, currency);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Margin Calculator</h2>
          <p className="text-sm text-slate-500">
            Select a roast profile and bag weight to see suggested prices.
          </p>
        </div>
        <Link
          href="/settings/margin"
          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          Edit defaults
        </Link>
      </div>

      {profiles.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-sm text-slate-500 mb-2">
            No active roast profiles found. Create one with a linked green bean to get started.
          </p>
          <Link
            href="/inventory/roasted"
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            Go to Roast Profiles
          </Link>
        </div>
      ) : (
        <>
          {/* ─── Inputs ─── */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Calculator Inputs</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Profile selector */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Roast Profile
                  </label>
                  <select
                    value={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    <option value="">Select a profile...</option>
                    {profiles.map((p) => {
                      const hasCost = p.green_beans?.cost_per_kg != null && p.green_beans.cost_per_kg > 0;
                      return (
                        <option key={p.id} value={p.id} disabled={!hasCost}>
                          {p.name}{!hasCost ? " (no green cost)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Weight */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Bag Weight
                  </label>
                  <div className="flex gap-1.5">
                    {COMMON_WEIGHTS.map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setWeightGrams(w)}
                        className={`flex-1 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                          weightGrams === w
                            ? "bg-brand-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {w >= 1000 ? `${w / 1000}kg` : `${w}g`}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={weightGrams}
                    onChange={(e) => setWeightGrams(parseInt(e.target.value) || 250)}
                    className="w-full mt-1.5 px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Custom weight (g)"
                  />
                </div>

                {/* Multiplier override */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Multiplier Override
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={customMultiplier}
                    onChange={(e) => setCustomMultiplier(e.target.value)}
                    placeholder={`Default: ${settings.markup_multiplier}x`}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">Leave blank to use default</p>
                </div>

                {/* Wholesale discount override */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Wholesale Discount %
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="99"
                    value={settings.wholesale_discount_pct}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, wholesale_discount_pct: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">Saved default: {initialSettings.wholesale_discount_pct}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Results ─── */}
          {selectedProfile && !result && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
              This profile&apos;s green bean has no cost set. Add a cost/kg on the{" "}
              <Link href="/inventory/green" className="font-medium underline">
                Green Stock
              </Link>{" "}
              page.
            </div>
          )}

          {result && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">
                  Results for {selectedProfile?.name} — {weightGrams >= 1000 ? `${weightGrams / 1000}kg` : `${weightGrams}g`}
                </h3>
              </div>
              <div className="p-6">
                {/* Cost chain */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Green Cost/kg</p>
                    <p className="text-lg font-semibold text-slate-900">{fmt(result.greenCostPerKg)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Weight Loss</p>
                    <p className="text-lg font-semibold text-slate-900">{result.weightLossPct}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Roasted Cost/kg</p>
                    <p className="text-lg font-semibold text-slate-900">{fmt(result.roastedCostPerKg)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Bag Cost</p>
                    <p className="text-lg font-semibold text-slate-900">{fmt(result.variant_cost)}</p>
                  </div>
                </div>

                {/* Suggested prices */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                    <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">Suggested Retail</p>
                    <p className="text-3xl font-bold text-green-800">{fmt(result.suggested_retail)}</p>
                    <p className="text-sm text-green-600 mt-1">{result.retail_margin_pct}% margin</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                    <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">Suggested Wholesale</p>
                    <p className="text-3xl font-bold text-blue-800">{fmt(result.suggested_wholesale)}</p>
                    <p className="text-sm text-blue-600 mt-1">{result.wholesale_margin_pct}% margin</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Bulk Price Review ─── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Bulk Price Review</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Review and update prices for all products linked to a green bean.
          </p>
        </div>
        <div className="p-6">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Green Bean
              </label>
              <select
                value={selectedBulkBeanId}
                onChange={(e) => setSelectedBulkBeanId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                <option value="">Select a green bean...</option>
                {greenBeans.map((b) => {
                  const hasCost = b.cost_per_kg != null && b.cost_per_kg > 0;
                  return (
                    <option key={b.id} value={b.id} disabled={!hasCost}>
                      {b.name}{hasCost ? ` (${fmt(b.cost_per_kg!)}/kg)` : " (no cost set)"}
                    </option>
                  );
                })}
              </select>
            </div>
            <button
              onClick={() => {
                if (selectedBulkBeanId) setReviewBeanId(selectedBulkBeanId);
              }}
              disabled={!selectedBulkBeanId}
              className="px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              Review Prices
            </button>
          </div>
        </div>
      </div>

      {reviewBeanId && (
        <PriceReviewModal
          greenBeanId={reviewBeanId}
          greenBeanName={greenBeans.find((b) => b.id === reviewBeanId)?.name}
          currency={currency}
          onClose={() => setReviewBeanId(null)}
        />
      )}
    </div>
  );
}
