"use client";

import type { NormalisedGreenBean, NormalisedRoastedStock } from "@/lib/inventory-import";

// ─── Green Bean Preview ─────────────────────────────────────

interface GreenBeanPreviewProps {
  beans: NormalisedGreenBean[];
  errors: string[];
}

export function GreenBeanImportPreview({ beans, errors }: GreenBeanPreviewProps) {
  const totalStock = beans.reduce((sum, b) => sum + b.current_stock_kg, 0);
  const withSupplier = beans.filter((b) => b.supplier_name).length;
  const costs = beans.map((b) => b.cost_per_kg).filter((c): c is number => c != null);
  const avgCost = costs.length > 0 ? costs.reduce((a, b) => a + b, 0) / costs.length : null;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{beans.length}</p>
          <p className="text-xs text-slate-500">Green Beans</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{totalStock.toFixed(1)}</p>
          <p className="text-xs text-slate-500">Total Stock (kg)</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{withSupplier}</p>
          <p className="text-xs text-slate-500">With Supplier</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">
            {avgCost != null ? `\u00A3${avgCost.toFixed(2)}` : "\u2014"}
          </p>
          <p className="text-xs text-slate-500">Avg Cost/kg</p>
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
              <li key={i}>{"\u2022"} {err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Bean table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Name
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Origin
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Variety / Process
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Supplier
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Stock (kg)
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Cost/kg
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {beans.map((bean, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-900">{bean.name}</p>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {bean.origin_country || "\u2014"}
                    {bean.origin_region && (
                      <span className="text-slate-400 text-xs ml-1">({bean.origin_region})</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {[bean.variety, bean.process].filter(Boolean).join(" / ") || "\u2014"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {bean.supplier_name || "\u2014"}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    {bean.current_stock_kg.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {bean.cost_per_kg != null ? `\u00A3${bean.cost_per_kg.toFixed(2)}` : "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Roasted Stock Preview ──────────────────────────────────

interface RoastedStockPreviewProps {
  stock: NormalisedRoastedStock[];
  errors: string[];
}

export function RoastedStockImportPreview({ stock, errors }: RoastedStockPreviewProps) {
  const totalStock = stock.reduce((sum, s) => sum + s.current_stock_kg, 0);
  const withSourceBean = stock.filter((s) => s.green_bean_name).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{stock.length}</p>
          <p className="text-xs text-slate-500">Roasted Stock</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{totalStock.toFixed(1)}</p>
          <p className="text-xs text-slate-500">Total Stock (kg)</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{withSourceBean}</p>
          <p className="text-xs text-slate-500">With Source Bean</p>
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
              <li key={i}>{"\u2022"} {err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Stock table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Name
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Source Bean
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Stock (kg)
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Threshold
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Batch Size
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stock.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-900">{item.name}</p>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {item.green_bean_name || "\u2014"}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    {item.current_stock_kg.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {item.low_stock_threshold_kg != null
                      ? `${item.low_stock_threshold_kg.toFixed(2)} kg`
                      : "\u2014"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {item.batch_size_kg != null
                      ? `${item.batch_size_kg.toFixed(2)} kg`
                      : "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
