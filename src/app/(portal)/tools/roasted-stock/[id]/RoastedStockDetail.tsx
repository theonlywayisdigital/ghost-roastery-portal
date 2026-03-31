"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus, Minus, AlertTriangle } from "@/components/icons";
import { StatusBadge } from "@/components/admin/StatusBadge";

interface Movement {
  id: string;
  movement_type: string;
  quantity_kg: number;
  balance_after_kg: number;
  unit_cost: number | null;
  notes: string | null;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

interface GreenBeanInfo {
  id: string;
  name: string;
  current_stock_kg: number;
}

interface RoastedStock {
  id: string;
  name: string;
  green_bean_id: string | null;
  current_stock_kg: number;
  low_stock_threshold_kg: number | null;
  is_active: boolean;
  notes: string | null;
  green_beans: { id: string; name: string; current_stock_kg: number } | null;
}

const MOVEMENT_LABELS: Record<string, string> = {
  roast_addition: "Roast Addition",
  order_deduction: "Order Deduction",
  cancellation_return: "Cancellation Return",
  adjustment: "Adjustment",
  waste: "Waste",
};

function getStockStatus(item: RoastedStock): "ok" | "low" | "out" {
  if (Number(item.current_stock_kg) <= 0) return "out";
  if (item.low_stock_threshold_kg && Number(item.current_stock_kg) <= Number(item.low_stock_threshold_kg)) return "low";
  return "ok";
}

function getReferenceLink(m: Movement): { href: string; label: string } | null {
  if (!m.reference_id || !m.reference_type) return null;
  if (m.reference_type === "roast_log") return { href: `/tools/roast-log/${m.reference_id}`, label: "View roast log" };
  if (m.reference_type === "order") return { href: `/orders/${m.reference_id}`, label: "View order" };
  return null;
}

export function RoastedStockDetail({
  stock,
  movements: initialMovements,
}: {
  stock: RoastedStock;
  movements: Movement[];
}) {
  const router = useRouter();
  const [movements, setMovements] = useState(initialMovements);
  const [currentStock, setCurrentStock] = useState(Number(stock.current_stock_kg));
  const [greenBeanStock, setGreenBeanStock] = useState(Number(stock.green_beans?.current_stock_kg || 0));
  const [showAddStock, setShowAddStock] = useState(false);
  const [stockForm, setStockForm] = useState({ type: "roast_addition", qty: "", cost: "", notes: "", deductGreen: true });
  const [saving, setSaving] = useState(false);

  const hasLinkedGreenBean = !!stock.green_bean_id && !!stock.green_beans;
  const showDeductOption = hasLinkedGreenBean && ["roast_addition"].includes(stockForm.type);

  async function handleStockSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stockForm.qty) return;
    setSaving(true);

    const payload: Record<string, unknown> = {
      movement_type: stockForm.type,
      quantity_kg: stockForm.qty,
      unit_cost: stockForm.cost || null,
      notes: stockForm.notes || null,
    };

    // Include green bean deduction if applicable
    if (showDeductOption && stockForm.deductGreen) {
      payload.deduct_green_bean_kg = stockForm.qty;
    }

    const res = await fetch(`/api/tools/roasted-stock/${stock.id}/movements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      setCurrentStock(data.balance);
      if (data.green_bean_balance !== null && data.green_bean_balance !== undefined) {
        setGreenBeanStock(data.green_bean_balance);
      }
      setShowAddStock(false);
      setStockForm({ type: "roast_addition", qty: "", cost: "", notes: "", deductGreen: true });
      router.refresh();
    }
    setSaving(false);
  }

  const stockStatus = getStockStatus({ ...stock, current_stock_kg: currentStock });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tools/inventory/roasted" className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{stock.name}</h1>
          <p className="text-sm text-slate-500">
            {stock.green_beans?.name ? `Roasted from ${stock.green_beans.name}` : "No linked green bean"}
          </p>
        </div>
        <StatusBadge status={stockStatus} type="stockAlert" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Details</h2>
              <Link href={`/tools/inventory/roasted/${stock.id}/edit`} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <Pencil className="w-4 h-4" />
              </Link>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-slate-500">Name</dt><dd className="font-medium text-slate-900">{stock.name}</dd></div>
              <div>
                <dt className="text-slate-500">Source Green Bean</dt>
                <dd className="font-medium text-slate-900">
                  {stock.green_beans ? (
                    <Link href={`/tools/inventory/green/${stock.green_beans.id}`} className="text-brand-600 hover:text-brand-700">
                      {stock.green_beans.name}
                    </Link>
                  ) : "—"}
                </dd>
              </div>
              <div><dt className="text-slate-500">Status</dt><dd className="font-medium text-slate-900">{stock.is_active ? "Active" : "Inactive"}</dd></div>
              <div><dt className="text-slate-500">Low Stock Threshold</dt><dd className="font-medium text-slate-900">{stock.low_stock_threshold_kg ? `${Number(stock.low_stock_threshold_kg).toFixed(2)} kg` : "Not set"}</dd></div>
            </dl>
            {stock.notes && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-500">Notes</p>
                <p className="text-sm text-slate-700 mt-1">{stock.notes}</p>
              </div>
            )}
          </div>

          {/* Stock Movements */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Stock Movements</h2>
              <button onClick={() => setShowAddStock(!showAddStock)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Add Movement
              </button>
            </div>

            {showAddStock && (
              <form onSubmit={handleStockSubmit} className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                    <select value={stockForm.type} onChange={(e) => setStockForm((p) => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500">
                      <option value="roast_addition">Roast Addition</option>
                      <option value="adjustment">Adjustment</option>
                      <option value="waste">Waste</option>
                      <option value="cancellation_return">Cancellation Return</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Quantity (kg)</label>
                    <input type="number" value={stockForm.qty} onChange={(e) => setStockForm((p) => ({ ...p, qty: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500" min="0.001" step="0.001" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Unit Cost (£/kg)</label>
                    <input type="number" value={stockForm.cost} onChange={(e) => setStockForm((p) => ({ ...p, cost: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500" min="0" step="0.01" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                    <input type="text" value={stockForm.notes} onChange={(e) => setStockForm((p) => ({ ...p, notes: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                </div>

                {/* Green bean deduction prompt */}
                {showDeductOption && stock.green_beans && (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="deduct-green"
                          checked={stockForm.deductGreen}
                          onChange={(e) => setStockForm((p) => ({ ...p, deductGreen: e.target.checked }))}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <label htmlFor="deduct-green" className="text-sm font-medium text-slate-900">
                          Deduct {stockForm.qty || "—"} kg from {stock.green_beans.name}
                        </label>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 ml-6">
                        Current green stock: {greenBeanStock.toFixed(2)} kg
                        {stockForm.qty && greenBeanStock > 0 && (
                          <> → {Math.max(0, greenBeanStock - parseFloat(stockForm.qty || "0")).toFixed(2)} kg after deduction</>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">{saving ? "Saving..." : "Record Movement"}</button>
                  <button type="button" onClick={() => setShowAddStock(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
                </div>
              </form>
            )}

            {movements.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No stock movements recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {movements.map((m) => {
                  const ref = getReferenceLink(m);
                  return (
                    <div key={m.id} className="flex items-center gap-4 py-3">
                      <div className={`p-1.5 rounded-lg ${Number(m.quantity_kg) > 0 ? "bg-green-50" : "bg-red-50"}`}>
                        {Number(m.quantity_kg) > 0 ? <Plus className="w-4 h-4 text-green-600" /> : <Minus className="w-4 h-4 text-red-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{MOVEMENT_LABELS[m.movement_type] || m.movement_type}</p>
                        {m.notes && <p className="text-xs text-slate-500 truncate">{m.notes}</p>}
                        {ref && (
                          <Link href={ref.href} className="text-xs text-brand-600 hover:text-brand-700">{ref.label}</Link>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${Number(m.quantity_kg) > 0 ? "text-green-700" : "text-red-700"}`}>
                          {Number(m.quantity_kg) > 0 ? "+" : ""}{Number(m.quantity_kg).toFixed(3)} kg
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(m.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right — Stock Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Current Stock</h3>
            <p className="text-3xl font-bold text-slate-900">{currentStock.toFixed(2)} <span className="text-lg font-normal text-slate-500">kg</span></p>
            {stock.low_stock_threshold_kg && (
              <p className="text-xs text-slate-500 mt-1">{`Low stock alert at ${Number(stock.low_stock_threshold_kg).toFixed(2)} kg`}</p>
            )}
          </div>

          {hasLinkedGreenBean && stock.green_beans && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-medium text-slate-500 mb-2">Linked Green Bean</h3>
              <Link href={`/tools/inventory/green/${stock.green_beans.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                {stock.green_beans.name}
              </Link>
              <p className="text-2xl font-bold text-slate-900 mt-1">{greenBeanStock.toFixed(2)} <span className="text-base font-normal text-slate-500">kg</span></p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-500 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button onClick={() => setShowAddStock(true)} className="w-full px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
                Add Stock
              </button>
              <Link href={`/tools/inventory/roasted/${stock.id}/edit`} className="block w-full px-4 py-2.5 text-center border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                Edit Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
