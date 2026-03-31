"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, Check, ArrowDown, Upload } from "@/components/icons";
import Link from "next/link";
import { useUpgradeBanner } from "@/hooks/useUpgradeBanner";
import { UpgradeBanner } from "@/components/shared/UpgradeBanner";


interface ProductVariant {
  id: string;
  weight_grams: number | null;
  unit: string | null;
  retail_price: number | null;
  wholesale_price: number | null;
  channel: string | null;
  is_active: boolean | null;
}

interface StockRecord {
  id: string;
  name: string;
  current_stock_kg: number;
  low_stock_threshold_kg: number | null;
  is_active: boolean;
}

interface ProductImageRef {
  id: string;
  url: string;
  sort_order: number;
  is_primary: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  image_url: string | null;
  status: "draft" | "published";
  sort_order: number;
  is_retail?: boolean;
  is_wholesale?: boolean;
  retail_price: number | null;
  product_variants: ProductVariant[] | null;
  product_images?: ProductImageRef[] | null;
  roasted_stock: StockRecord | null;
  green_beans: StockRecord | null;
  blend_components?: {
    id: string;
    roasted_stock_id: string;
    percentage: number;
    roasted_stock: StockRecord | null;
  }[] | null;
  is_blend?: boolean;
  category?: string;
}

function getPrimaryImageUrl(product: Product): string | null {
  const imgs = product.product_images;
  if (imgs && imgs.length > 0) {
    const primary = imgs.find((i) => i.is_primary) || imgs.sort((a, b) => a.sort_order - b.sort_order)[0];
    return primary?.url || null;
  }
  return product.image_url;
}

type TabValue = "all" | "retail" | "wholesale";

const allTabs: { value: TabValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "retail", label: "Retail" },
  { value: "wholesale", label: "Wholesale" },
];

const tabs = allTabs;

export function ProductsTable({ products: initial }: { products: Product[] }) {
  const router = useRouter();
  const [products, setProducts] = useState(initial);
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const banner = useUpgradeBanner("products");

  const filteredProducts = activeTab === "all"
    ? products
    : activeTab === "retail"
      ? products.filter((p) => p.is_retail)
      : products.filter((p) => p.is_wholesale);

  function getBasePriceDisplay(product: Product): string {
    if (product.retail_price != null && product.retail_price > 0) return `£${product.retail_price.toFixed(2)}`;
    return `£${product.price.toFixed(2)}`;
  }

  function formatRange(prices: number[]): string | null {
    if (prices.length === 0) return null;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `£${min.toFixed(2)}` : `£${min.toFixed(2)} – £${max.toFixed(2)}`;
  }

  function getRetailPriceDisplay(product: Product): string {
    const variants = product.product_variants?.filter((v) => v.is_active && v.channel === "retail") || [];
    const prices = variants.map((v) => v.retail_price).filter((p): p is number => p != null && p > 0);
    const range = formatRange(prices);
    if (range) return range;
    // Fallback to product-level retail_price then price
    return getBasePriceDisplay(product);
  }

  function getWholesalePriceDisplay(product: Product): string {
    const variants = product.product_variants?.filter((v) => v.is_active && v.channel === "wholesale") || [];
    const prices = variants.map((v) => v.wholesale_price).filter((p): p is number => p != null && p > 0);
    return formatRange(prices) || "—";
  }

  function getStockLevel(stock: StockRecord | null): "none" | "out" | "low" | "in" {
    if (!stock) return "none";
    const kg = Number(stock.current_stock_kg);
    if (kg <= 0) return "out";
    if (stock.low_stock_threshold_kg && kg <= Number(stock.low_stock_threshold_kg)) return "low";
    return "in";
  }

  function getStockBadge(product: Product): { label: string; className: string } | null {
    // Blend products: check all component stocks
    if (product.is_blend && product.blend_components && product.blend_components.length > 0) {
      const levels = product.blend_components
        .map((bc) => getStockLevel(bc.roasted_stock))
        .filter((l) => l !== "none");
      if (levels.length === 0) return null;
      const worst = levels.includes("out") ? "out" : levels.includes("low") ? "low" : "in";
      if (worst === "out") return { label: "Out of stock", className: "bg-red-50 text-red-700" };
      if (worst === "low") return { label: "Low stock", className: "bg-amber-50 text-amber-700" };
      return { label: "In stock", className: "bg-green-50 text-green-700" };
    }

    // Non-blend: original logic
    const roastedLevel = getStockLevel(product.roasted_stock);
    const greenBeanLevel = getStockLevel(product.green_beans);

    // If neither is linked, no badge
    if (roastedLevel === "none" && greenBeanLevel === "none") return null;

    // Show worst status across both pools
    const levels = [roastedLevel, greenBeanLevel].filter((l) => l !== "none");
    const worst = levels.includes("out") ? "out" : levels.includes("low") ? "low" : "in";

    if (worst === "out") return { label: "Out of stock", className: "bg-red-50 text-red-700" };
    if (worst === "low") return { label: "Low stock", className: "bg-amber-50 text-amber-700" };
    return { label: "In stock", className: "bg-green-50 text-green-700" };
  }

  function getUnitDisplay(product: Product): string {
    const activeVars = product.product_variants?.filter((v) => v.is_active) || [];
    if (activeVars.length === 0) return product.unit;
    const units = Array.from(new Set(activeVars.map((v) => v.unit).filter((u): u is string => !!u)));
    return units.length > 0 ? units.join(", ") : product.unit;
  }

  async function toggleStatus(product: Product) {
    const newStatus = product.status === "published" ? "draft" : "published";

    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p))
    );

    const res = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      // Revert on failure
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, status: product.status } : p
        )
      );
    }
  }

  async function deleteProduct(product: Product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;

    const res = await fetch(`/api/products/${product.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-500 mt-1">
            Manage your wholesale coffee products.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/products/import"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </Link>
          <Link
            href="/products/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Link>
        </div>
      </div>

      {banner.show && (
        <div className="mb-6">
          <UpgradeBanner
            type={banner.type}
            message={banner.message}
            upgradeTier={banner.upgradeTier}
            productType={banner.productType}
          />
        </div>
      )}

      {/* Tabs */}
      {tabs.length > 0 && (
      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-brand-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      )}

      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500 mb-4">
            No products yet — add your first product to get started.
          </p>
          <Link
            href="/products/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                    Product
                  </th>
                  {activeTab === "all" ? (
                    <>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                        Retail Price
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                        Wholesale Price
                      </th>
                    </>
                  ) : (
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      Price
                    </th>
                  )}
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                    Unit
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                    Stock
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                    Status
                  </th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getPrimaryImageUrl(product) ? (
                          <img
                            src={getPrimaryImageUrl(product)!}
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <span className="text-xs text-slate-400">IMG</span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {product.name}
                          </p>
                          {product.description && (
                            <p className="text-xs text-slate-500 truncate max-w-[200px]">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    {activeTab === "all" ? (
                      <>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-900">
                            {getRetailPriceDisplay(product)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-900">
                            {getWholesalePriceDisplay(product)}
                          </span>
                        </td>
                      </>
                    ) : (
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-900">
                          {activeTab === "retail" ? getRetailPriceDisplay(product) : getWholesalePriceDisplay(product)}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-500">
                        {getUnitDisplay(product)}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      {(() => {
                        const badge = getStockBadge(product);
                        if (!badge) return <span className="text-xs text-slate-300">—</span>;
                        return (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badge.className}`}>
                            {badge.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          product.status === "published"
                            ? "bg-green-50 text-green-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {product.status === "published" ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleStatus(product)}
                          className={`p-2 rounded-lg transition-colors ${
                            product.status === "draft"
                              ? "text-green-500 hover:text-green-700 hover:bg-green-50"
                              : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          }`}
                          title={product.status === "draft" ? "Publish" : "Unpublish"}
                        >
                          {product.status === "draft" ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <ArrowDown className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() =>
                            router.push(`/products/${product.id}`)
                          }
                          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteProduct(product)}
                          className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
