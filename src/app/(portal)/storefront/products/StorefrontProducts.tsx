"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, Plus, Pencil } from "@/components/icons";

interface ProductVariant {
  id: string;
  retail_price: number | null;
  wholesale_price: number | null;
  is_active: boolean | null;
  unit: string | null;
  channel: string | null;
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
  is_retail: boolean;
  is_wholesale: boolean;
  retail_price: number | null;
  product_variants: ProductVariant[];
}

export function StorefrontProducts({ products: initialProducts }: { products: Product[] }) {
  const [products, setProducts] = useState(initialProducts);

  async function toggleField(product: Product, field: "is_retail" | "is_wholesale") {
    const newValue = !product[field];

    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, [field]: newValue } : p))
    );

    const res = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: newValue }),
    });

    if (!res.ok) {
      // Revert on failure
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, [field]: !newValue } : p
        )
      );
    }
  }

  function hasWholesalePrice(product: Product): boolean {
    return product.product_variants?.some(
      (v) => v.wholesale_price != null && v.wholesale_price > 0
    ) ?? false;
  }

  function hasRetailPrice(product: Product): boolean {
    return product.retail_price != null && product.retail_price > 0;
  }

  function getUnitDisplay(product: Product): string {
    const activeVars = product.product_variants?.filter((v) => v.is_active) || [];
    if (activeVars.length === 0) return product.unit;
    const units = Array.from(new Set(activeVars.map((v) => v.unit).filter((u): u is string => !!u)));
    return units.length > 0 ? units.join(", ") : product.unit;
  }

  function getPriceDisplay(product: Product): string {
    const variants = product.product_variants?.filter((v) => v.is_active) || [];
    if (variants.length === 0) return `£${product.price.toFixed(2)}`;

    const prices = variants
      .flatMap((v) => [v.retail_price, v.wholesale_price])
      .filter((p): p is number => p != null && p > 0);
    if (prices.length === 0) return `£${product.price.toFixed(2)}`;

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `£${min.toFixed(2)}` : `£${min.toFixed(2)} – £${max.toFixed(2)}`;
  }

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
          <Package className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="text-sm font-medium text-slate-900 mb-1">
          No products yet
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Add your first product to get your storefront live.
        </p>
        <Link
          href="/products/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">
          These products appear on your storefront.
        </p>
        <Link
          href="/products/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => {
          const retailEnabled = hasRetailPrice(product);
          const wholesaleEnabled = hasWholesalePrice(product);

          return (
            <div
              key={product.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              {/* Product image */}
              {product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div className="w-full h-40 bg-slate-100 flex items-center justify-center">
                  <Package className="w-8 h-8 text-slate-300" />
                </div>
              )}

              {/* Product info */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-slate-900 mb-0.5">
                  {product.name}
                </h3>
                <p className="text-sm text-slate-500">
                  {getPriceDisplay(product)} / {getUnitDisplay(product)}
                </p>

                {/* Channel toggles */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
                  {/* Retail toggle */}
                  <div className="flex flex-col">
                    <div className={`flex items-center gap-1.5 ${!retailEnabled ? "opacity-40 cursor-not-allowed" : ""}`}>
                      <button
                        type="button"
                        onClick={() => retailEnabled && toggleField(product, "is_retail")}
                        disabled={!retailEnabled}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${
                          !retailEnabled ? "bg-slate-200 cursor-not-allowed" :
                          product.is_retail ? "bg-brand-600 cursor-pointer" : "bg-slate-200 cursor-pointer"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                            product.is_retail ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <span className="text-xs text-slate-500">Retail</span>
                    </div>
                    {!retailEnabled && (
                      <Link
                        href={`/products/${product.id}`}
                        className="text-xs mt-0.5"
                        style={{ color: "color-mix(in srgb, currentColor 55%, transparent)" }}
                      >
                        No retail price — edit in Products
                      </Link>
                    )}
                  </div>

                  {/* Wholesale toggle */}
                  <div className="flex flex-col">
                    <div className={`flex items-center gap-1.5 ${!wholesaleEnabled ? "opacity-40 cursor-not-allowed" : ""}`}>
                      <button
                        type="button"
                        onClick={() => wholesaleEnabled && toggleField(product, "is_wholesale")}
                        disabled={!wholesaleEnabled}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${
                          !wholesaleEnabled ? "bg-slate-200 cursor-not-allowed" :
                          product.is_wholesale ? "bg-brand-600 cursor-pointer" : "bg-slate-200 cursor-pointer"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                            product.is_wholesale ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <span className="text-xs text-slate-500">Wholesale</span>
                    </div>
                    {!wholesaleEnabled && (
                      <Link
                        href={`/products/${product.id}`}
                        className="text-xs mt-0.5"
                        style={{ color: "color-mix(in srgb, currentColor 55%, transparent)" }}
                      >
                        No wholesale price — edit in Products
                      </Link>
                    )}
                  </div>
                </div>

                {/* Edit link */}
                <div className="flex justify-end mt-2">
                  <Link
                    href={`/products/${product.id}`}
                    className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
