"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShoppingCart,
  Store,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Package,
  Sparkles,
  Link2,
} from "lucide-react";

interface StockOption {
  id: string;
  name: string;
  current_stock_kg: number;
  is_active: boolean;
}

interface ProductMapping {
  id: string;
  product_id: string;
  connection_id: string;
  external_product_id: string;
  roasted_stock_id: string | null;
  green_bean_id: string | null;
  sync_status: string;
  last_synced_at: string | null;
  variant_count: number;
  products: {
    id: string;
    name: string;
    image_url: string | null;
    sku: string | null;
    category: string;
    roasted_stock_id: string | null;
    green_bean_id: string | null;
  };
  ecommerce_connections: {
    id: string;
    provider: string;
    store_url: string;
    shop_name: string;
  };
}

export function ProductMappingPage() {
  const [mappings, setMappings] = useState<ProductMapping[]>([]);
  const [roastedStocks, setRoastedStocks] = useState<StockOption[]>([]);
  const [greenBeans, setGreenBeans] = useState<StockOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [bulkStockId, setBulkStockId] = useState("");
  const [bulkBeanId, setBulkBeanId] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  const loadMappings = useCallback(async () => {
    try {
      const res = await fetch(
        "/api/integrations/ecommerce/product-mappings"
      );
      const data = await res.json();
      setMappings(data.mappings || []);
      setRoastedStocks(data.roasted_stocks || []);
      setGreenBeans(data.green_beans || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMappings();
  }, [loadMappings]);

  function suggestStock(productName: string): StockOption | null {
    if (roastedStocks.length === 0) return null;
    const nameLower = productName.toLowerCase();
    let bestMatch: StockOption | null = null;
    let bestScore = 0;

    for (const stock of roastedStocks) {
      const stockWords = stock.name.toLowerCase().split(/\s+/);
      let matched = 0;
      for (const word of stockWords) {
        if (word.length >= 3 && nameLower.includes(word)) {
          matched++;
        }
      }
      const score = stockWords.length > 0 ? matched / stockWords.length : 0;
      if (score > bestScore && score >= 0.5) {
        bestScore = score;
        bestMatch = stock;
      }
    }
    return bestMatch;
  }

  async function handleUpdateMapping(
    mappingId: string,
    field: "roasted_stock_id" | "green_bean_id",
    value: string | null
  ) {
    setSaving(mappingId);
    setSuccessMsg(null);
    try {
      const res = await fetch(
        `/api/integrations/ecommerce/product-mappings/${mappingId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value || null }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        // Update local state
        setMappings((prev) =>
          prev.map((m) =>
            m.id === mappingId ? { ...m, [field]: value || null } : m
          )
        );
        if (data.stock_name) {
          setSuccessMsg(
            `Stock tracking active \u2014 orders from ${data.store_name} will now deduct from ${data.stock_name}`
          );
          setTimeout(() => setSuccessMsg(null), 5000);
        }
      }
    } finally {
      setSaving(null);
    }
  }

  async function handleBulkLink() {
    if (!bulkStockId && !bulkBeanId) return;
    const unmapped = mappings.filter(
      (m) => !m.roasted_stock_id && !m.green_bean_id
    );
    if (unmapped.length === 0) return;

    setBulkSaving(true);
    setSuccessMsg(null);
    let storeName = "";

    try {
      for (const mapping of unmapped) {
        const body: Record<string, string | null> = {};
        if (bulkStockId) body.roasted_stock_id = bulkStockId;
        if (bulkBeanId) body.green_bean_id = bulkBeanId;

        const res = await fetch(
          `/api/integrations/ecommerce/product-mappings/${mapping.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        const data = await res.json();
        if (data.store_name) storeName = data.store_name;
      }

      // Reload
      await loadMappings();

      const stockName = bulkStockId
        ? roastedStocks.find((s) => s.id === bulkStockId)?.name
        : greenBeans.find((b) => b.id === bulkBeanId)?.name;

      setSuccessMsg(
        `Linked ${unmapped.length} product${unmapped.length !== 1 ? "s" : ""} to ${stockName || "stock"} \u2014 orders from ${storeName || "your store"} will now deduct from this stock`
      );
      setTimeout(() => setSuccessMsg(null), 6000);
      setBulkStockId("");
      setBulkBeanId("");
    } finally {
      setBulkSaving(false);
    }
  }

  const unmappedCount = mappings.filter(
    (m) => !m.roasted_stock_id && !m.green_bean_id
  ).length;

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 bg-slate-200 rounded" />
        <div className="h-40 bg-slate-100 rounded-xl" />
        <div className="h-40 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/settings/integrations"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Integrations
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          Product Stock Mapping
        </h1>
        <p className="text-slate-500 mt-1">
          Link imported products to your roasted stock and green bean records so
          stock levels stay in sync across all channels.
        </p>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Unmapped warning */}
      {unmappedCount > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">
              {unmappedCount} product
              {unmappedCount !== 1 ? "s" : ""} not linked to stock
            </p>
            <p className="mt-0.5 text-amber-600">
              Orders for these products won&apos;t deduct from your stock until
              you link them below.
            </p>
          </div>
        </div>
      )}

      {/* Bulk link section */}
      {unmappedCount > 0 &&
        (roastedStocks.length > 0 || greenBeans.length > 0) && (
          <div className="mb-6 bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900">
                Bulk link unmapped products
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Link all {unmappedCount} unmapped product
              {unmappedCount !== 1 ? "s" : ""} to the same stock record.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              {roastedStocks.length > 0 && (
                <div className="min-w-[200px]">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Roasted Stock
                  </label>
                  <select
                    value={bulkStockId}
                    onChange={(e) => setBulkStockId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="">Select...</option>
                    {roastedStocks.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({Number(s.current_stock_kg).toFixed(1)} kg)
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {greenBeans.length > 0 && (
                <div className="min-w-[200px]">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Green Bean
                  </label>
                  <select
                    value={bulkBeanId}
                    onChange={(e) => setBulkBeanId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="">Select...</option>
                    {greenBeans.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({Number(b.current_stock_kg).toFixed(1)} kg)
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={handleBulkLink}
                disabled={
                  bulkSaving || (!bulkStockId && !bulkBeanId)
                }
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {bulkSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4" />
                )}
                {bulkSaving
                  ? "Linking..."
                  : `Link ${unmappedCount} product${unmappedCount !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        )}

      {/* Empty state */}
      {mappings.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700">
            No imported products found
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Import products from your connected Shopify or WooCommerce store
            first.
          </p>
          <Link
            href="/settings/integrations"
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            Go to Integrations
          </Link>
        </div>
      )}

      {/* Mapping table */}
      {mappings.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">
                    Product
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">
                    Source
                  </th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">
                    Variants
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3 min-w-[220px]">
                    Roasted Stock
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3 min-w-[220px]">
                    Green Bean
                  </th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mappings.map((mapping) => {
                  const product = mapping.products;
                  const conn = mapping.ecommerce_connections;
                  const suggestion =
                    !mapping.roasted_stock_id && product
                      ? suggestStock(product.name)
                      : null;
                  const isLinked =
                    !!mapping.roasted_stock_id || !!mapping.green_bean_id;

                  return (
                    <tr
                      key={mapping.id}
                      className={
                        !isLinked
                          ? "bg-amber-50/30 hover:bg-amber-50/50"
                          : "hover:bg-slate-50"
                      }
                    >
                      {/* Product */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product?.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-9 h-9 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <Package className="w-4 h-4 text-slate-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">
                              {product?.name || "Unknown"}
                            </p>
                            {product?.sku && (
                              <p className="text-xs text-slate-500">
                                {product.sku}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {conn?.provider === "shopify" ? (
                            <ShoppingCart className="w-4 h-4 text-[#96BF48]" />
                          ) : (
                            <Store className="w-4 h-4 text-[#7F54B3]" />
                          )}
                          <span className="text-sm text-slate-700 truncate max-w-[120px]">
                            {conn?.shop_name || conn?.store_url || "—"}
                          </span>
                        </div>
                      </td>

                      {/* Variants */}
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-slate-600">
                          {mapping.variant_count || "—"}
                        </span>
                      </td>

                      {/* Roasted Stock dropdown */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <select
                            value={mapping.roasted_stock_id || ""}
                            onChange={(e) =>
                              handleUpdateMapping(
                                mapping.id,
                                "roasted_stock_id",
                                e.target.value || null
                              )
                            }
                            disabled={saving === mapping.id}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm bg-white disabled:opacity-50"
                          >
                            <option value="">Not linked</option>
                            {roastedStocks.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} (
                                {Number(s.current_stock_kg).toFixed(1)} kg)
                              </option>
                            ))}
                          </select>
                          {suggestion &&
                            !mapping.roasted_stock_id && (
                              <button
                                onClick={() =>
                                  handleUpdateMapping(
                                    mapping.id,
                                    "roasted_stock_id",
                                    suggestion.id
                                  )
                                }
                                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>
                                  Suggest: {suggestion.name}
                                </span>
                              </button>
                            )}
                        </div>
                      </td>

                      {/* Green Bean dropdown */}
                      <td className="px-4 py-3">
                        <select
                          value={mapping.green_bean_id || ""}
                          onChange={(e) =>
                            handleUpdateMapping(
                              mapping.id,
                              "green_bean_id",
                              e.target.value || null
                            )
                          }
                          disabled={saving === mapping.id}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm bg-white disabled:opacity-50"
                        >
                          <option value="">Not linked</option>
                          {greenBeans.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} (
                              {Number(b.current_stock_kg).toFixed(1)} kg)
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        {isLinked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3" />
                            Linked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            <AlertCircle className="w-3 h-3" />
                            Unmapped
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info section */}
      <div className="mt-6 bg-slate-50 rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">
          How stock mapping works
        </h3>
        <ul className="text-sm text-slate-600 space-y-1.5">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
            <span>
              <strong>Roasted Stock</strong> — link to track finished product
              inventory. Orders deduct from this pool.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
            <span>
              <strong>Green Bean</strong> — link to track raw ingredient usage.
              Helps plan purchasing.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
            <span>
              <strong>Stock sync</strong> — when an order is placed on any
              connected channel, stock levels are deducted and pushed back across
              all channels.
            </span>
          </li>
        </ul>
      </div>
    </>
  );
}
