"use client";

import type { NormalisedProduct } from "@/lib/product-import";

interface Props {
  products: NormalisedProduct[];
  errors: string[];
}

export function ImportPreview({ products, errors }: Props) {
  const totalVariants = products.reduce(
    (sum, p) => sum + p.variants.length,
    0
  );
  const retailCount = products.filter((p) => p.is_retail).length;
  const wholesaleCount = products.filter((p) => p.is_wholesale).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{products.length}</p>
          <p className="text-xs text-slate-500">Products</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{totalVariants}</p>
          <p className="text-xs text-slate-500">Variants</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{retailCount}</p>
          <p className="text-xs text-slate-500">Retail</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{wholesaleCount}</p>
          <p className="text-xs text-slate-500">Wholesale</p>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-amber-800 mb-1">
            Warnings ({errors.length})
          </h4>
          <ul className="text-xs text-amber-700 space-y-0.5 max-h-32 overflow-y-auto">
            {errors.map((err, i) => (
              <li key={i}>• {err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Product table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Product
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Variants
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Price
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Channel
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product, i) => {
                const prices = product.variants
                  .map((v) => v.price)
                  .filter((p): p is number => p != null);
                const priceMin = prices.length > 0 ? Math.min(...prices) : null;
                const priceMax = prices.length > 0 ? Math.max(...prices) : null;

                const priceDisplay =
                  priceMin != null
                    ? priceMin === priceMax
                      ? `£${priceMin.toFixed(2)}`
                      : `£${priceMin.toFixed(2)} – £${priceMax!.toFixed(2)}`
                    : "—";

                const channels: string[] = [];
                if (product.is_retail) channels.push("Retail");
                if (product.is_wholesale) channels.push("Wholesale");

                return (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <div>
                        <p className="font-medium text-slate-900">
                          {product.name}
                        </p>
                        {product.origin && (
                          <p className="text-xs text-slate-400">
                            {product.origin}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {product.variants.length}
                      {product.variants.length > 0 && (
                        <span className="text-slate-400 ml-1 text-xs">
                          ({product.variants.map((v) => v.unit).filter(Boolean).join(", ")})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {priceDisplay}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          product.status === "published"
                            ? "bg-green-50 text-green-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {product.status === "published" ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {channels.join(", ") || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
