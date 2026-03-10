"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus } from "@/components/icons";
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

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  product_type: string | null;
  is_retail?: boolean;
  is_wholesale?: boolean;
  product_variants: ProductVariant[] | null;
}

type TabValue = "all" | "retail" | "wholesale";

const tabs: { value: TabValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "retail", label: "Retail" },
  { value: "wholesale", label: "Wholesale" },
];

export function ProductsTable({ products: initial }: { products: Product[] }) {
  const router = useRouter();
  const [products, setProducts] = useState(initial);
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const banner = useUpgradeBanner("products");

  const filteredProducts = activeTab === "all"
    ? products
    : activeTab === "retail"
      ? products.filter((p) => p.is_retail ?? (p.product_type === "retail" || p.product_type === "both"))
      : products.filter((p) => p.is_wholesale ?? (p.product_type === "wholesale" || p.product_type === "both"));

  function getPriceDisplay(product: Product): string {
    const variants = product.product_variants?.filter((v) => v.is_active) || [];
    if (variants.length === 0) return `£${product.price.toFixed(2)}`;

    const channel = activeTab === "wholesale" ? "wholesale" : "retail";
    const channelVars = variants.filter((v) => v.channel === channel);
    if (channelVars.length === 0) {
      // Fall back to other channel or product price
      const otherVars = variants.filter((v) => v.channel === (channel === "retail" ? "wholesale" : "retail"));
      if (otherVars.length === 0) return `£${product.price.toFixed(2)}`;
      const prices = otherVars
        .map((v) => v.channel === "wholesale" ? v.wholesale_price : v.retail_price)
        .filter((p): p is number => p != null);
      if (prices.length === 0) return `£${product.price.toFixed(2)}`;
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      return min === max ? `£${min.toFixed(2)}` : `£${min.toFixed(2)} – £${max.toFixed(2)}`;
    }

    const prices = channelVars
      .map((v) => channel === "wholesale" ? v.wholesale_price : v.retail_price)
      .filter((p): p is number => p != null);
    if (prices.length === 0) return `£${product.price.toFixed(2)}`;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `£${min.toFixed(2)}` : `£${min.toFixed(2)} – £${max.toFixed(2)}`;
  }

  function getUnitDisplay(product: Product): string {
    const activeVars = product.product_variants?.filter((v) => v.is_active) || [];
    if (activeVars.length === 0) return product.unit;
    const units = Array.from(new Set(activeVars.map((v) => v.unit).filter((u): u is string => !!u)));
    return units.length > 0 ? units.join(", ") : product.unit;
  }

  async function toggleActive(product: Product) {
    const newValue = !product.is_active;

    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_active: newValue } : p))
    );

    const res = await fetch(`/api/products/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...product, is_active: newValue }),
    });

    if (!res.ok) {
      // Revert on failure
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, is_active: !newValue } : p
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
        <Link
          href="/products/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Link>
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
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                    Price
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                    Unit
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
                        {product.image_url ? (
                          <img
                            src={product.image_url}
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
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-900">
                        {getPriceDisplay(product)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-500">
                        {getUnitDisplay(product)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActive(product)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          product.is_active
                            ? "bg-green-50 text-green-700 hover:bg-green-100"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {product.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
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
