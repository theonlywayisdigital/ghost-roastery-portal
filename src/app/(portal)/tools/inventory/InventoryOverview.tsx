"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  Archive,
  ShoppingCart,
  Flame,
  Settings,
} from "@/components/icons";
import { DataTable } from "@/components/admin/DataTable";

interface RoastedStock {
  id: string;
  name: string;
  current_stock_kg: number;
  green_bean_id: string | null;
  low_stock_threshold_kg: number | null;
}

interface GreenBean {
  id: string;
  name: string;
  current_stock_kg: number;
  low_stock_threshold_kg: number | null;
}

interface OverviewData {
  roastedStock: RoastedStock[];
  greenBeans: GreenBean[];
  committedByRoasted: Record<string, number>;
  committedByGreen: Record<string, number>;
  defaultBatchSizeKg: number | null;
}

interface TableRow {
  id: string;
  name: string;
  greenStockKg: number | null;
  greenBeanName: string | null;
  roastedStockKg: number;
  committedKg: number;
  requiredKg: number;
  batches: number | null;
  excessKg: number;
}

export function InventoryOverview({ roasterId }: { roasterId: string }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [batchSize, setBatchSize] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    fetch("/api/tools/inventory/overview")
      .then((r) => r.json())
      .then((d: OverviewData) => {
        setData(d);
        setBatchSize(d.defaultBatchSizeKg != null ? String(d.defaultBatchSizeKg) : "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSaveBatchSize() {
    setSaving(true);
    setSaved(false);
    const value = batchSize.trim() ? parseFloat(batchSize) : null;
    const res = await fetch("/api/tools/inventory/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ default_batch_size_kg: value }),
    });
    if (res.ok) {
      setSaved(true);
      if (data) {
        setData({ ...data, defaultBatchSizeKg: value });
      }
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 h-24" />
          ))}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 h-64" />
      </div>
    );
  }

  if (!data || data.roastedStock.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Archive className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No inventory to show yet</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            Add roasted stock items to start tracking your inventory. You can add stock manually
            via the Roasted Stock tab, or it will be created automatically when you complete a roast log.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/tools/inventory/roasted/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
            >
              <Archive className="w-4 h-4" />
              Add Roasted Stock
            </Link>
            <Link
              href="/tools/roast-log"
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              <Flame className="w-4 h-4" />
              Roast Log
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Build green bean lookup
  const greenBeanMap: Record<string, GreenBean> = {};
  for (const gb of data.greenBeans) {
    greenBeanMap[gb.id] = gb;
  }

  const batchSizeKg = data.defaultBatchSizeKg;

  // Build table rows
  const rows: TableRow[] = data.roastedStock.map((rs) => {
    const gb = rs.green_bean_id ? greenBeanMap[rs.green_bean_id] || null : null;
    const greenStockKg = gb ? Number(gb.current_stock_kg) : null;
    const roastedStockKg = Number(rs.current_stock_kg);
    const committedKg = data.committedByRoasted[rs.id] || 0;
    const requiredKg = committedKg - roastedStockKg;
    const batches =
      batchSizeKg && batchSizeKg > 0 && requiredKg > 0
        ? Math.ceil(requiredKg / batchSizeKg)
        : requiredKg > 0
          ? null
          : 0;
    const excessKg = requiredKg < 0 ? Math.abs(requiredKg) : 0;

    return {
      id: rs.id,
      name: rs.name,
      greenStockKg,
      greenBeanName: gb?.name || null,
      roastedStockKg,
      committedKg,
      requiredKg,
      batches,
      excessKg,
    };
  });

  // Sort rows
  const sorted = [...rows].sort((a, b) => {
    const key = sortKey as keyof TableRow;
    const aVal = a[key];
    const bVal = b[key];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === "asc"
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  // Summary stats
  const totalGreenKg = data.greenBeans.reduce((s, gb) => s + Number(gb.current_stock_kg), 0);
  const totalRoastedKg = data.roastedStock.reduce((s, rs) => s + Number(rs.current_stock_kg), 0);
  const totalCommittedKg = Object.values(data.committedByRoasted).reduce((s, v) => s + v, 0);
  const totalBatches = rows.reduce((s, r) => s + (r.batches || 0), 0);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const columns = [
    {
      key: "name",
      label: "Coffee",
      sortable: true,
      render: (row: TableRow) => (
        <Link href={`/tools/inventory/roasted/${row.id}`} className="text-brand-600 hover:text-brand-700 font-medium">
          {row.name}
        </Link>
      ),
    },
    {
      key: "greenStockKg",
      label: "Green (kg)",
      sortable: true,
      hiddenOnMobile: true,
      render: (row: TableRow) => (
        <span className="text-slate-600">
          {row.greenStockKg != null ? row.greenStockKg.toFixed(1) : "—"}
        </span>
      ),
    },
    {
      key: "roastedStockKg",
      label: "Roasted (kg)",
      sortable: true,
      render: (row: TableRow) => (
        <span className="font-medium text-slate-900">{row.roastedStockKg.toFixed(1)}</span>
      ),
    },
    {
      key: "committedKg",
      label: "Committed (kg)",
      sortable: true,
      hiddenOnMobile: true,
      render: (row: TableRow) => (
        <span className="text-slate-600">
          {row.committedKg > 0 ? row.committedKg.toFixed(1) : "0"}
        </span>
      ),
    },
    {
      key: "requiredKg",
      label: "Required (kg)",
      sortable: true,
      render: (row: TableRow) => {
        if (row.requiredKg > 0) {
          return <span className="font-semibold text-red-600">{row.requiredKg.toFixed(1)}</span>;
        }
        if (row.requiredKg < 0) {
          return <span className="text-green-600">{row.requiredKg.toFixed(1)}</span>;
        }
        return <span className="text-slate-400">0</span>;
      },
    },
    {
      key: "batches",
      label: "Batches",
      sortable: true,
      hiddenOnMobile: true,
      render: (row: TableRow) => {
        if (row.batches === null) return <span className="text-slate-400">—</span>;
        if (row.batches === 0) return <span className="text-slate-400">0</span>;
        return <span className="font-semibold text-amber-600">{row.batches}</span>;
      },
    },
    {
      key: "excessKg",
      label: "Excess (kg)",
      sortable: true,
      hiddenOnMobile: true,
      render: (row: TableRow) => (
        <span className={row.excessKg > 0 ? "text-green-600" : "text-slate-400"}>
          {row.excessKg > 0 ? row.excessKg.toFixed(1) : "0"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-xs text-slate-500">Green Stock</p>
          </div>
          <p className="text-xl font-bold text-slate-900">{`${totalGreenKg.toFixed(1)} kg`}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
              <Archive className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xs text-slate-500">Roasted Stock</p>
          </div>
          <p className="text-xl font-bold text-slate-900">{`${totalRoastedKg.toFixed(1)} kg`}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs text-slate-500">Committed</p>
          </div>
          <p className="text-xl font-bold text-slate-900">{`${totalCommittedKg.toFixed(1)} kg`}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <Flame className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-xs text-slate-500">Batches Needed</p>
          </div>
          <p className="text-xl font-bold text-slate-900">
            {batchSizeKg ? totalBatches : "—"}
          </p>
        </div>
      </div>

      {/* Inventory table */}
      <DataTable
        columns={columns}
        data={sorted}
        onSort={handleSort}
        sortKey={sortKey}
        sortDirection={sortDir}
        onRowClick={(row) => {
          window.location.href = `/tools/inventory/roasted/${row.id}`;
        }}
        emptyMessage="No roasted stock items found."
      />

      {/* Batch size setting */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Batch Size</h3>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label htmlFor="batch-size" className="text-xs text-slate-500">
              Default roast batch size (kg)
            </label>
            <input
              id="batch-size"
              type="number"
              step="0.1"
              min="0"
              value={batchSize}
              onChange={(e) => setBatchSize(e.target.value)}
              placeholder="e.g. 12"
              className="mt-1 w-28 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <button
            onClick={handleSaveBatchSize}
            disabled={saving}
            className="mt-5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {saved && (
            <span className="mt-5 text-sm text-green-600 font-medium">Saved</span>
          )}
        </div>
      </div>
    </div>
  );
}
