"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, Plus, Pencil } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export function StorefrontProducts({ products: initialProducts }: { products: Product[] }) {
  const [products, setProducts] = useState(initialProducts);

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
        {products.map((product) => (
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
                £{product.price.toFixed(2)} / {product.unit}
              </p>

              {/* Actions */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleActive(product)}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      product.is_active ? "bg-brand-600" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                        product.is_active ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="text-xs text-slate-500">
                    {product.is_active ? "Active" : "Hidden"}
                  </span>
                </div>
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
        ))}
      </div>
    </div>
  );
}
