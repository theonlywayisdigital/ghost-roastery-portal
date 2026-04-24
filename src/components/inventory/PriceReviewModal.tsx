"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Loader2,
  AlertTriangle,
  Check,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  Info,
} from "@/components/icons";
import { formatCurrency } from "@/lib/margin-calculator";

// ── Types ──

interface VariantSuggestion {
  id: string;
  weight_grams: number;
  channel: string;
  is_active: boolean;
  grind_type: { id: string; name: string } | null;
  current_retail: number | null;
  current_wholesale: number | null;
  suggested_retail: number | null;
  suggested_wholesale: number | null;
  variant_cost: number | null;
  retail_margin_pct: number | null;
  wholesale_margin_pct: number | null;
  retail_delta: number | null;
  wholesale_delta: number | null;
}

interface ProductWithVariants {
  id: string;
  name: string;
  is_blend: boolean;
  roasted_cost_per_kg: number | null;
  variants: VariantSuggestion[];
}

interface AffectedVariantsResponse {
  greenBean: { id: string; name: string; cost_per_kg: number };
  products: ProductWithVariants[];
}

interface PriceReviewModalProps {
  greenBeanId: string;
  greenBeanName?: string;
  /** If coming from a cost change, show Phase A intro */
  previousCostPerKg?: number | null;
  newCostPerKg?: number | null;
  /** If coming from purchase movement: unit_cost that differs from bean cost */
  purchaseUnitCost?: number | null;
  currency?: string;
  onClose: () => void;
  onApplied?: () => void;
}

interface VariantEdit {
  retail_price: number | null;
  wholesale_price: number | null;
}

// ── Component ──

export function PriceReviewModal({
  greenBeanId,
  greenBeanName,
  previousCostPerKg,
  newCostPerKg,
  purchaseUnitCost,
  currency = "GBP",
  onClose,
  onApplied,
}: PriceReviewModalProps) {
  // Phase A: intro/cost update confirmation (only for purchase flow)
  const showIntro = purchaseUnitCost != null && purchaseUnitCost > 0;
  const [phase, setPhase] = useState<"intro" | "loading" | "results">(
    showIntro ? "intro" : "loading"
  );
  const [updateBeanCost, setUpdateBeanCost] = useState(true);

  // Phase B/C: loading + results
  const [data, setData] = useState<AffectedVariantsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Selection + edits
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, VariantEdit>>({});
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fmt = useCallback(
    (v: number) => formatCurrency(v, currency),
    [currency]
  );

  // Fetch affected variants
  const fetchAffected = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch(
        `/api/margin/affected-variants?greenBeanId=${greenBeanId}`
      );
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to fetch affected variants");
        setPhase("results");
        return;
      }
      const result: AffectedVariantsResponse = await res.json();
      setData(result);

      // Pre-select all variants that have a delta
      const preSelected = new Set<string>();
      const initialEdits: Record<string, VariantEdit> = {};
      for (const product of result.products) {
        for (const v of product.variants) {
          if (
            v.suggested_retail != null ||
            v.suggested_wholesale != null
          ) {
            preSelected.add(v.id);
            initialEdits[v.id] = {
              retail_price: v.suggested_retail,
              wholesale_price: v.suggested_wholesale,
            };
          }
        }
      }
      setSelected(preSelected);
      setEdits(initialEdits);
      setPhase("results");
    } catch {
      setError("Network error");
      setPhase("results");
    }
  }, [greenBeanId]);

  // Auto-fetch on mount if not showing intro
  useEffect(() => {
    if (!showIntro) {
      fetchAffected();
    }
  }, [showIntro, fetchAffected]);

  // Phase A: handle intro confirmation
  async function handleIntroConfirm() {
    if (updateBeanCost && purchaseUnitCost != null) {
      // Update the bean's cost_per_kg first
      try {
        await fetch(`/api/tools/green-beans/${greenBeanId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: greenBeanName || "Bean",
            cost_per_kg: String(purchaseUnitCost),
          }),
        });
      } catch {
        // Non-blocking — proceed to fetch affected even if update fails
      }
    }
    fetchAffected();
  }

  function handleIntroSkip() {
    onClose();
  }

  // Selection helpers
  function toggleVariant(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    if (!data) return;
    const all = new Set<string>();
    for (const p of data.products) {
      for (const v of p.variants) {
        if (edits[v.id]) all.add(v.id);
      }
    }
    setSelected(all);
  }

  function selectNone() {
    setSelected(new Set());
  }

  // Inline edit
  function handleEditPrice(
    variantId: string,
    field: "retail_price" | "wholesale_price",
    value: string
  ) {
    setDirty(true);
    setEdits((prev) => ({
      ...prev,
      [variantId]: {
        ...prev[variantId],
        [field]: value === "" ? null : parseFloat(value),
      },
    }));
  }

  // Apply selected
  async function handleApply() {
    if (selected.size === 0) return;
    setApplying(true);
    setError(null);

    const updates = Array.from(selected)
      .filter((id) => edits[id])
      .map((id) => ({
        variant_id: id,
        retail_price: edits[id].retail_price,
        wholesale_price: edits[id].wholesale_price,
      }));

    try {
      const res = await fetch("/api/variants/bulk-update-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to update prices");
        setApplying(false);
        return;
      }

      setApplied(true);
      setDirty(false);
      setApplying(false);
      onApplied?.();

      // Auto-close after brief success
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch {
      setError("Network error");
      setApplying(false);
    }
  }

  // Unsaved changes guard
  function handleDismiss() {
    if (dirty && selected.size > 0 && !applied) {
      if (
        !confirm(
          "You have unsaved price changes. Close without applying?"
        )
      ) {
        return;
      }
    }
    onClose();
  }

  // Variant label
  function variantLabel(v: VariantSuggestion): string {
    const parts: string[] = [];
    if (v.weight_grams) {
      parts.push(
        v.weight_grams >= 1000
          ? `${v.weight_grams / 1000}kg`
          : `${v.weight_grams}g`
      );
    }
    if (v.grind_type?.name) parts.push(v.grind_type.name);
    if (v.channel && v.channel !== "retail") parts.push(v.channel);
    return parts.join(" / ") || "Default";
  }

  // Delta badge
  function deltaBadge(delta: number | null) {
    if (delta == null || delta === 0) return null;
    const isUp = delta > 0;
    return (
      <span
        className={`inline-flex items-center gap-0.5 text-xs font-medium ${
          isUp ? "text-green-700" : "text-red-700"
        }`}
      >
        {isUp ? "+" : ""}
        {fmt(delta)}
      </span>
    );
  }

  const totalVariants = data?.products.reduce(
    (sum, p) => sum + p.variants.length,
    0
  ) ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={handleDismiss} />
      <div className="relative bg-white border border-slate-200 rounded-xl w-full max-w-3xl mx-4 shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Price Review
              </h3>
              {data?.greenBean && (
                <p className="text-sm text-slate-500">
                  {data.greenBean.name} &mdash; {fmt(data.greenBean.cost_per_kg)}/kg
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ─── Phase A: Intro (purchase flow) ─── */}
          {phase === "intro" && (
            <div className="space-y-4">
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Cost difference detected
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    The purchase unit cost ({fmt(purchaseUnitCost!)}) differs
                    from the current bean cost
                    {previousCostPerKg != null && ` (${fmt(previousCostPerKg)})`}.
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={updateBeanCost}
                  onChange={(e) => setUpdateBeanCost(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Update bean cost to {fmt(purchaseUnitCost!)}/kg
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    This will also recalculate suggested prices for all affected products.
                  </p>
                </div>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleIntroSkip}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
                >
                  Skip
                </button>
                <button
                  onClick={handleIntroConfirm}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
                >
                  <TrendingUp className="w-4 h-4" />
                  Review Prices
                </button>
              </div>
            </div>
          )}

          {/* ─── Phase B: Loading ─── */}
          {phase === "loading" && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
              <p className="text-sm text-slate-500">
                Calculating suggested prices...
              </p>
            </div>
          )}

          {/* ─── Phase C: Results ─── */}
          {phase === "results" && (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              {applied && (
                <div className="flex items-center justify-center gap-2 py-12 text-green-600">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">
                    Prices updated successfully
                  </span>
                </div>
              )}

              {!applied && data && data.products.length === 0 && (
                <div className="text-center py-12">
                  <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">
                    No products use this green bean. Nothing to review.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-4 px-4 py-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Close
                  </button>
                </div>
              )}

              {!applied && data && data.products.length > 0 && (
                <div className="space-y-4">
                  {/* Cost change summary */}
                  {previousCostPerKg != null &&
                    newCostPerKg != null &&
                    previousCostPerKg !== newCostPerKg && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                        <span>Cost changed:</span>
                        <span className="font-medium">
                          {fmt(previousCostPerKg)}
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span className="font-medium text-brand-700">
                          {fmt(newCostPerKg)}
                        </span>
                        <span className="text-slate-400">/kg</span>
                      </div>
                    )}

                  {/* Selection controls */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                      {selected.size} of {totalVariants} variant
                      {totalVariants !== 1 ? "s" : ""} selected
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAll}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                      >
                        Select all
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={selectNone}
                        className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                      >
                        Select none
                      </button>
                    </div>
                  </div>

                  {/* Product groups */}
                  {data.products.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                    >
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-slate-900">
                            {product.name}
                          </h4>
                          {product.is_blend && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                              Blend
                            </span>
                          )}
                          {product.roasted_cost_per_kg != null && (
                            <span className="text-xs text-slate-400 ml-auto">
                              Roasted: {fmt(product.roasted_cost_per_kg)}/kg
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {product.variants.map((v) => {
                          const isSelected = selected.has(v.id);
                          const edit = edits[v.id];

                          return (
                            <div
                              key={v.id}
                              className={`px-4 py-3 flex items-center gap-3 transition-colors ${
                                isSelected
                                  ? "bg-brand-50/30"
                                  : "bg-white"
                              }`}
                            >
                              {/* Checkbox */}
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleVariant(v.id)}
                                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 flex-shrink-0"
                              />

                              {/* Variant label */}
                              <div className="min-w-0 flex-shrink-0 w-28">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {variantLabel(v)}
                                </p>
                                {v.variant_cost != null && (
                                  <p className="text-xs text-slate-400">
                                    Cost: {fmt(v.variant_cost)}
                                  </p>
                                )}
                              </div>

                              {/* Retail price */}
                              <div className="flex-1 min-w-0">
                                <label className="text-xs text-slate-500 block mb-0.5">
                                  Retail
                                </label>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={
                                      edit?.retail_price != null
                                        ? edit.retail_price
                                        : ""
                                    }
                                    onChange={(e) =>
                                      handleEditPrice(
                                        v.id,
                                        "retail_price",
                                        e.target.value
                                      )
                                    }
                                    disabled={!isSelected}
                                    className="w-24 px-2 py-1 border border-slate-200 rounded text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-400"
                                  />
                                  {v.current_retail != null && (
                                    <span className="text-xs text-slate-400">
                                      was {fmt(v.current_retail)}
                                    </span>
                                  )}
                                  {deltaBadge(v.retail_delta)}
                                </div>
                              </div>

                              {/* Wholesale price */}
                              <div className="flex-1 min-w-0">
                                <label className="text-xs text-slate-500 block mb-0.5">
                                  Wholesale
                                </label>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={
                                      edit?.wholesale_price != null
                                        ? edit.wholesale_price
                                        : ""
                                    }
                                    onChange={(e) =>
                                      handleEditPrice(
                                        v.id,
                                        "wholesale_price",
                                        e.target.value
                                      )
                                    }
                                    disabled={!isSelected}
                                    className="w-24 px-2 py-1 border border-slate-200 rounded text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-400"
                                  />
                                  {v.current_wholesale != null && (
                                    <span className="text-xs text-slate-400">
                                      was {fmt(v.current_wholesale)}
                                    </span>
                                  )}
                                  {deltaBadge(v.wholesale_delta)}
                                </div>
                              </div>

                              {/* Margin */}
                              {v.retail_margin_pct != null && (
                                <div className="flex-shrink-0 text-right w-16">
                                  <p className="text-xs text-slate-400">Margin</p>
                                  <p className="text-xs font-medium text-slate-700">
                                    {v.retail_margin_pct}%
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer — only show in results phase with data */}
        {phase === "results" && !applied && data && data.products.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-slate-50/50">
            <button
              onClick={handleDismiss}
              disabled={applying}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={applying || selected.size === 0}
              className="flex items-center gap-1.5 px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {applying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Apply {selected.size} Price{selected.size !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
