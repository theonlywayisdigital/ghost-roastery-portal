"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X } from "@/components/icons";
import type { NormalisedProduct } from "@/lib/product-import";

// ─── Types ───────────────────────────────────────────────────

interface RoastedStockOption {
  id: string;
  name: string;
  current_stock_kg: number;
  low_stock_threshold_kg: number | null;
  is_active: boolean;
}

interface GreenBeanOption {
  id: string;
  name: string;
  current_stock_kg: number;
  low_stock_threshold_kg: number | null;
  is_active: boolean;
}

interface BlendComponent {
  roasted_stock_id: string;
  percentage: string;
}

export interface ProductStockMapping {
  roasted_stock_id: string | null;
  green_bean_id: string | null;
  is_blend: boolean;
  blend_components: { roasted_stock_id: string; percentage: number }[];
}

interface Props {
  products: NormalisedProduct[];
  stockMappings: Record<string, ProductStockMapping>;
  onMappingsChange: (mappings: Record<string, ProductStockMapping>) => void;
}

// ─── Toggle ──────────────────────────────────────────────────

function Toggle({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          enabled ? "bg-brand-600" : "bg-slate-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <span className="text-sm text-slate-700">{label}</span>
    </div>
  );
}

// ─── Stock status helper ─────────────────────────────────────

function StockBadge({ stock }: { stock: RoastedStockOption | GreenBeanOption | undefined }) {
  if (!stock) return null;
  const kg = Number(stock.current_stock_kg);
  const isLow = stock.low_stock_threshold_kg != null && kg <= Number(stock.low_stock_threshold_kg);
  const isOut = kg <= 0;

  const className = isOut
    ? "bg-red-50 text-red-700"
    : isLow
      ? "bg-amber-50 text-amber-700"
      : "bg-green-50 text-green-700";

  const label = isOut ? "Out of stock" : isLow ? "Low stock" : `${kg.toFixed(1)} kg`;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

// ─── Per-product row ─────────────────────────────────────────

function ProductStockRow({
  product,
  mapping,
  roastedStocks,
  greenBeans,
  onChange,
}: {
  product: NormalisedProduct;
  mapping: ProductStockMapping;
  roastedStocks: RoastedStockOption[];
  greenBeans: GreenBeanOption[];
  onChange: (m: ProductStockMapping) => void;
}) {
  const [blendComponents, setBlendComponents] = useState<BlendComponent[]>(
    mapping.blend_components.length > 0
      ? mapping.blend_components.map((bc) => ({
          roasted_stock_id: bc.roasted_stock_id,
          percentage: String(bc.percentage),
        }))
      : [{ roasted_stock_id: "", percentage: "" }]
  );

  const syncBlendToParent = useCallback(
    (components: BlendComponent[]) => {
      setBlendComponents(components);
      onChange({
        ...mapping,
        blend_components: components
          .filter((c) => c.roasted_stock_id)
          .map((c) => ({
            roasted_stock_id: c.roasted_stock_id,
            percentage: parseFloat(c.percentage) || 0,
          })),
      });
    },
    [mapping, onChange]
  );

  const blendTotal = blendComponents.reduce(
    (sum, c) => sum + (parseFloat(c.percentage) || 0),
    0
  );
  const blendValid = Math.abs(blendTotal - 100) < 0.01;

  return (
    <div className="border border-slate-200 rounded-lg p-4">
      {/* Product header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-slate-900">{product.name}</p>
          <p className="text-xs text-slate-400">
            {product.variants.length} variant{product.variants.length !== 1 ? "s" : ""}
            {product.origin ? ` · ${product.origin}` : ""}
          </p>
        </div>
      </div>

      {/* Blend toggle */}
      <div className="mb-3">
        <Toggle
          enabled={mapping.is_blend}
          onToggle={() => {
            const next = !mapping.is_blend;
            if (next) {
              onChange({
                ...mapping,
                is_blend: true,
                roasted_stock_id: null,
              });
              if (blendComponents.length === 0) {
                setBlendComponents([{ roasted_stock_id: "", percentage: "" }]);
              }
            } else {
              onChange({
                ...mapping,
                is_blend: false,
                blend_components: [],
              });
              setBlendComponents([]);
            }
          }}
          label="This is a blend"
        />
      </div>

      {/* Single roasted stock (non-blend) */}
      {!mapping.is_blend && (
        <div className="mb-3">
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Roasted Stock
          </label>
          <div className="flex items-center gap-2">
            <select
              value={mapping.roasted_stock_id || ""}
              onChange={(e) =>
                onChange({
                  ...mapping,
                  roasted_stock_id: e.target.value || null,
                })
              }
              className="flex-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700"
            >
              <option value="">Not linked</option>
              {roastedStocks.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({Number(s.current_stock_kg).toFixed(1)} kg)
                </option>
              ))}
            </select>
            <StockBadge
              stock={roastedStocks.find(
                (s) => s.id === mapping.roasted_stock_id
              )}
            />
          </div>
        </div>
      )}

      {/* Blend components */}
      {mapping.is_blend && (
        <div className="mb-3">
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Blend Components
          </label>
          <div className="space-y-2">
            {blendComponents.map((comp, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={comp.roasted_stock_id}
                  onChange={(e) => {
                    const updated = [...blendComponents];
                    updated[idx] = { ...comp, roasted_stock_id: e.target.value };
                    syncBlendToParent(updated);
                  }}
                  className="flex-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700"
                >
                  <option value="">Select stock…</option>
                  {roastedStocks
                    .filter(
                      (s) =>
                        s.id === comp.roasted_stock_id ||
                        !blendComponents.some(
                          (c, ci) =>
                            ci !== idx && c.roasted_stock_id === s.id
                        )
                    )
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({Number(s.current_stock_kg).toFixed(1)} kg)
                      </option>
                    ))}
                </select>
                <div className="relative w-24">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={comp.percentage}
                    onChange={(e) => {
                      const updated = [...blendComponents];
                      updated[idx] = { ...comp, percentage: e.target.value };
                      syncBlendToParent(updated);
                    }}
                    placeholder="0"
                    className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-right pr-7 text-slate-700"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    %
                  </span>
                </div>
                {blendComponents.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = blendComponents.filter(
                        (_, i) => i !== idx
                      );
                      syncBlendToParent(updated);
                    }}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {/* Add component + total */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  syncBlendToParent([
                    ...blendComponents,
                    { roasted_stock_id: "", percentage: "" },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                <Plus className="w-3 h-3" />
                Add Component
              </button>
              <span
                className={`text-xs font-medium ${
                  blendValid
                    ? "text-green-600"
                    : "text-amber-600"
                }`}
              >
                Total: {blendTotal.toFixed(1)}%
                {!blendValid && " (must equal 100%)"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Green beans */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Green Bean Source
        </label>
        <div className="flex items-center gap-2">
          <select
            value={mapping.green_bean_id || ""}
            onChange={(e) =>
              onChange({ ...mapping, green_bean_id: e.target.value || null })
            }
            className="flex-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700"
          >
            <option value="">Not linked</option>
            {greenBeans.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({Number(b.current_stock_kg).toFixed(1)} kg)
              </option>
            ))}
          </select>
          <StockBadge
            stock={greenBeans.find((b) => b.id === mapping.green_bean_id)}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function StockMapping({
  products,
  stockMappings,
  onMappingsChange,
}: Props) {
  const [roastedStocks, setRoastedStocks] = useState<RoastedStockOption[]>([]);
  const [greenBeans, setGreenBeans] = useState<GreenBeanOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/tools/roasted-stock").then((r) => r.json()),
      fetch("/api/tools/green-beans").then((r) => r.json()),
    ]).then(([stockData, beanData]) => {
      setRoastedStocks(
        (stockData.roastedStock || []).filter(
          (s: RoastedStockOption) => s.is_active
        )
      );
      setGreenBeans(
        (beanData.greenBeans || []).filter(
          (b: GreenBeanOption) => b.is_active
        )
      );
      setLoading(false);
    });
  }, []);

  function handleProductChange(
    productId: string,
    mapping: ProductStockMapping
  ) {
    onMappingsChange({ ...stockMappings, [productId]: mapping });
  }

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading inventory…</p>
      </div>
    );
  }

  if (roastedStocks.length === 0 && greenBeans.length === 0) {
    return (
      <div className="bg-slate-50 rounded-lg p-6 text-center">
        <p className="text-sm text-slate-500 mb-1">
          No roasted stock or green bean records found.
        </p>
        <p className="text-xs text-slate-400">
          You can skip this step and link products to stock later from the product editor.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Link Products to Inventory
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Optionally link each product to roasted stock and green bean records.
          Enable "This is a blend" to map multiple stocks with percentages.
        </p>
      </div>

      <div className="space-y-3">
        {products.map((product) => {
          const key = product.external_id;
          const mapping = stockMappings[key] || {
            roasted_stock_id: null,
            green_bean_id: null,
            is_blend: false,
            blend_components: [],
          };

          return (
            <ProductStockRow
              key={key}
              product={product}
              mapping={mapping}
              roastedStocks={roastedStocks}
              greenBeans={greenBeans}
              onChange={(m) => handleProductChange(key, m)}
            />
          );
        })}
      </div>
    </div>
  );
}
