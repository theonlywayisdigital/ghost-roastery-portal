"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Package,
  Archive,
  ShoppingCart,
  Flame,
  Settings,
  ArrowRight,
  AlertTriangle,
  Scale,
  ChevronDown,
  ChevronUp,
  Upload,
} from "@/components/icons";
import { DataTable } from "@/components/admin/DataTable";
import { QuickReceiveModal } from "@/components/inventory/QuickReceiveModal";
import { QuickRoastModal } from "@/components/inventory/QuickRoastModal";
import { QuickRebalanceModal } from "@/components/inventory/QuickRebalanceModal";
import { RoastLogImportModal } from "@/components/inventory/RoastLogImportModal";

interface RoastedStock {
  id: string;
  name: string;
  current_stock_kg: number;
  committed_stock_kg: number;
  green_bean_id: string | null;
  low_stock_threshold_kg: number | null;
  batch_size_kg: number | null;
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
  greenBeanId: string | null;
  greenStockKg: number | null;
  greenBeanName: string | null;
  roastedStockKg: number;
  committedKg: number;
  requiredKg: number;
  batches: number | null;
  excessKg: number;
}

interface LowStockItem {
  type: "green" | "roasted";
  id: string;
  name: string;
  currentKg: number;
  thresholdKg: number | null;
  greenBeanId?: string;
  greenBeanName?: string;
  greenBeanKg?: number;
}

function EmptyState({ onImported }: { onImported: () => void }) {
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Option A — Import (recommended) */}
        <div className="bg-white rounded-xl border-2 border-brand-200 p-8 relative">
          <span className="absolute top-4 right-4 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700 uppercase tracking-wide">
            Recommended
          </span>
          <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center mb-4">
            <Upload className="w-5 h-5 text-brand-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Got a roasting tool? Set everything up in one go
          </h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Export this week&apos;s roast logs from Cropster, Artisan, or any roasting software as a spreadsheet and import them here. We&apos;ll create your green beans, roast profiles, and stock levels automatically. Have your current stock weights to hand — you can always rebalance later.
          </p>
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import Roast Logs
          </button>
        </div>

        {/* Option B — Manual setup */}
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
            <Settings className="w-5 h-5 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Prefer to set up manually?
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            Add your green beans and roast profiles separately, then log your roasts going forward.
          </p>

          <ol className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold shrink-0 mt-0.5">1</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 mb-1.5">Add your green beans</p>
                <Link
                  href="/inventory/green/new"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  <Package className="w-3.5 h-3.5" />
                  Add Bean
                </Link>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold shrink-0 mt-0.5">2</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 mb-1.5">Create roast profiles and map them to your beans</p>
                <Link
                  href="/inventory/roasted"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Go to Roast Profiles
                </Link>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold shrink-0 mt-0.5">3</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 mb-1.5">Log roasts to track stock automatically</p>
                <Link
                  href="/inventory/roast-log/new"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  <Flame className="w-3.5 h-3.5" />
                  Log a Roast
                </Link>
              </div>
            </li>
          </ol>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">
        Once you&apos;re selling products through your wholesale portal or a connected storefront, your inventory will update automatically with every order.
      </p>

      <RoastLogImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          setImportOpen(false);
          onImported();
        }}
      />
    </div>
  );
}

export function InventoryOverview({ roasterId }: { roasterId: string }) {
  const router = useRouter();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [batchSize, setBatchSize] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showBatchSettings, setShowBatchSettings] = useState(false);

  // Modal state
  const [receiveModal, setReceiveModal] = useState<{ open: boolean; beanId?: string }>({ open: false });
  const [roastModal, setRoastModal] = useState<{ open: boolean; beanId?: string; stockId?: string }>({ open: false });
  const [rebalanceModal, setRebalanceModal] = useState<{
    open: boolean;
    item?: { type: "green" | "roasted"; id: string; name: string; currentKg: number; linkedGreenBeanId?: string; linkedGreenBeanName?: string; linkedGreenBeanKg?: number };
  }>({ open: false });

  function fetchData() {
    setLoading(true);
    fetch("/api/tools/inventory/overview")
      .then((r) => r.json())
      .then((d: OverviewData) => {
        setData(d);
        setBatchSize(d.defaultBatchSizeKg != null ? String(d.defaultBatchSizeKg) : "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, []);

  function handleModalSuccess() {
    fetchData();
    router.refresh();
  }

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
      <EmptyState onImported={fetchData} />
    );
  }

  // Build green bean lookup
  const greenBeanMap: Record<string, GreenBean> = {};
  for (const gb of data.greenBeans) {
    greenBeanMap[gb.id] = gb;
  }

  const globalBatchSizeKg = data.defaultBatchSizeKg;

  // Build table rows
  const rows: TableRow[] = data.roastedStock.map((rs) => {
    const gb = rs.green_bean_id ? greenBeanMap[rs.green_bean_id] || null : null;
    const greenStockKg = gb ? Number(gb.current_stock_kg) : null;
    const roastedStockKg = Number(rs.current_stock_kg);
    const orderCommittedKg = data.committedByRoasted[rs.id] || 0;
    const standingCommittedKg = Number(rs.committed_stock_kg) || 0;
    const committedKg = orderCommittedKg + standingCommittedKg;
    const requiredKg = committedKg - roastedStockKg;
    const effectiveBatchSize = rs.batch_size_kg ?? globalBatchSizeKg;
    const batches =
      effectiveBatchSize && effectiveBatchSize > 0 && requiredKg > 0
        ? Math.ceil(requiredKg / effectiveBatchSize)
        : requiredKg > 0
          ? null
          : 0;
    const excessKg = requiredKg < 0 ? Math.abs(requiredKg) : 0;

    return {
      id: rs.id,
      name: rs.name,
      greenBeanId: rs.green_bean_id,
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

  // Low stock items
  const lowStockItems: LowStockItem[] = [];
  for (const gb of data.greenBeans) {
    const kg = Number(gb.current_stock_kg);
    if (gb.low_stock_threshold_kg && kg <= Number(gb.low_stock_threshold_kg)) {
      lowStockItems.push({ type: "green", id: gb.id, name: gb.name, currentKg: kg, thresholdKg: Number(gb.low_stock_threshold_kg) });
    } else if (kg <= 0) {
      lowStockItems.push({ type: "green", id: gb.id, name: gb.name, currentKg: kg, thresholdKg: null });
    }
  }
  for (const rs of data.roastedStock) {
    const kg = Number(rs.current_stock_kg);
    const gb = rs.green_bean_id ? greenBeanMap[rs.green_bean_id] : null;
    if (rs.low_stock_threshold_kg && kg <= Number(rs.low_stock_threshold_kg)) {
      lowStockItems.push({
        type: "roasted", id: rs.id, name: rs.name, currentKg: kg, thresholdKg: Number(rs.low_stock_threshold_kg),
        greenBeanId: rs.green_bean_id || undefined, greenBeanName: gb?.name, greenBeanKg: gb ? Number(gb.current_stock_kg) : undefined,
      });
    } else if (kg <= 0) {
      lowStockItems.push({
        type: "roasted", id: rs.id, name: rs.name, currentKg: kg, thresholdKg: null,
        greenBeanId: rs.green_bean_id || undefined, greenBeanName: gb?.name, greenBeanKg: gb ? Number(gb.current_stock_kg) : undefined,
      });
    }
  }

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
      label: "Roast Profile",
      sortable: true,
      render: (row: TableRow) => (
        <Link href={`/inventory/roasted/${row.id}`} className="text-brand-600 hover:text-brand-700 font-medium">
          {row.name}
        </Link>
      ),
    },
    {
      key: "greenBeanName",
      label: "Green Bean",
      sortable: true,
      hiddenOnMobile: true,
      render: (row: TableRow) => (
        <span className="text-slate-600">
          {row.greenBeanName || "—"}
        </span>
      ),
    },
    {
      key: "greenStockKg",
      label: "Green (kg)",
      sortable: true,
      hiddenOnMobile: true,
      render: (row: TableRow) => (
        <span className="text-slate-600">
          {row.greenStockKg != null ? row.greenStockKg.toFixed(2) : "—"}
        </span>
      ),
    },
    {
      key: "roastedStockKg",
      label: "Roasted (kg)",
      sortable: true,
      render: (row: TableRow) => (
        <span className="font-medium text-slate-900">{row.roastedStockKg.toFixed(2)}</span>
      ),
    },
    {
      key: "committedKg",
      label: "Committed (kg)",
      sortable: true,
      hiddenOnMobile: true,
      render: (row: TableRow) => (
        <span className="text-slate-600">
          {row.committedKg > 0 ? row.committedKg.toFixed(2) : "0"}
        </span>
      ),
    },
    {
      key: "requiredKg",
      label: "Required (kg)",
      sortable: true,
      render: (row: TableRow) => {
        if (row.requiredKg > 0) {
          return <span className="font-semibold text-red-600">{row.requiredKg.toFixed(2)}</span>;
        }
        if (row.requiredKg < 0) {
          return <span className="text-green-600">{row.requiredKg.toFixed(2)}</span>;
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
          {row.excessKg > 0 ? row.excessKg.toFixed(2) : "0"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (row: TableRow) => {
        const gb = row.greenBeanId ? greenBeanMap[row.greenBeanId] : null;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setRebalanceModal({
                open: true,
                item: {
                  type: "roasted",
                  id: row.id,
                  name: row.name,
                  currentKg: row.roastedStockKg,
                  linkedGreenBeanId: row.greenBeanId || undefined,
                  linkedGreenBeanName: gb?.name,
                  linkedGreenBeanKg: gb ? Number(gb.current_stock_kg) : undefined,
                },
              });
            }}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
          >
            <Scale className="w-3 h-3" />
            Set
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards with flow arrows */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 relative">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-xs text-slate-500">Green Stock</p>
          </div>
          <p className="text-xl font-bold text-slate-900">{`${totalGreenKg.toFixed(2)} kg`}</p>
          <div className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-5 h-5 bg-slate-100 rounded-full items-center justify-center">
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 relative">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
              <Archive className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xs text-slate-500">Roasted Stock</p>
          </div>
          <p className="text-xl font-bold text-slate-900">{`${totalRoastedKg.toFixed(2)} kg`}</p>
          <div className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-5 h-5 bg-slate-100 rounded-full items-center justify-center">
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs text-slate-500">Committed</p>
          </div>
          <p className="text-xl font-bold text-slate-900">{`${totalCommittedKg.toFixed(2)} kg`}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <Flame className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-xs text-slate-500">Batches Needed</p>
          </div>
          <p className="text-xl font-bold text-slate-900">
            {rows.some((r) => r.batches === null) ? "—" : totalBatches}
          </p>
        </div>
      </div>

      {/* Low stock alerts */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-900">Low Stock</h3>
          </div>
          <div className="space-y-2">
            {lowStockItems.map((item) => (
              <div key={`${item.type}-${item.id}`} className="flex items-center justify-between gap-3 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.currentKg <= 0 ? "bg-red-500" : "bg-amber-500"}`} />
                  <span className="text-sm text-slate-900 truncate">{item.name}</span>
                  <span className="text-xs text-slate-500 flex-shrink-0">
                    ({item.type === "green" ? "Green" : "Roasted"})
                  </span>
                  <span className="text-sm font-medium text-slate-700 flex-shrink-0">
                    {item.currentKg.toFixed(2)} kg
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {item.type === "green" && (
                    <button
                      onClick={() => setReceiveModal({ open: true, beanId: item.id })}
                      className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 transition-colors"
                    >
                      Receive
                    </button>
                  )}
                  {item.type === "roasted" && (
                    <button
                      onClick={() => setRoastModal({ open: true, beanId: item.greenBeanId, stockId: item.id })}
                      className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-md hover:bg-amber-200 transition-colors"
                    >
                      Log Roast
                    </button>
                  )}
                  <button
                    onClick={() => setRebalanceModal({
                      open: true,
                      item: {
                        type: item.type,
                        id: item.id,
                        name: item.name,
                        currentKg: item.currentKg,
                        linkedGreenBeanId: item.greenBeanId,
                        linkedGreenBeanName: item.greenBeanName,
                        linkedGreenBeanKg: item.greenBeanKg,
                      },
                    })}
                    className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                  >
                    Rebalance
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory table */}
      <DataTable
        columns={columns}
        data={sorted}
        onSort={handleSort}
        sortKey={sortKey}
        sortDirection={sortDir}
        onRowClick={(row) => {
          window.location.href = `/inventory/roasted/${row.id}`;
        }}
        emptyMessage="No roasted stock items found."
      />

      {/* Batch size setting — collapsible */}
      <div className="bg-white rounded-xl border border-slate-200">
        <button
          onClick={() => setShowBatchSettings(!showBatchSettings)}
          className="flex items-center gap-2 w-full px-6 py-4 text-left"
        >
          <Settings className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-900">Batch Size Settings</span>
          {data.defaultBatchSizeKg && (
            <span className="text-xs text-slate-500 ml-auto mr-2">{data.defaultBatchSizeKg} kg</span>
          )}
          {showBatchSettings ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>
        {showBatchSettings && (
          <div className="px-6 pb-4 pt-0">
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
            <p className="text-xs text-slate-500 mt-2">
              This is the default batch size. Edit per-profile batch sizes in the{" "}
              <Link href="/inventory/roasted" className="text-brand-600 hover:text-brand-700 font-medium">Roast Profile editor</Link>.
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <QuickReceiveModal
        open={receiveModal.open}
        onClose={() => setReceiveModal({ open: false })}
        onSuccess={handleModalSuccess}
        preselectedBeanId={receiveModal.beanId}
      />
      <QuickRoastModal
        open={roastModal.open}
        onClose={() => setRoastModal({ open: false })}
        onSuccess={handleModalSuccess}
        preselectedBeanId={roastModal.beanId}
        preselectedStockId={roastModal.stockId}
      />
      {rebalanceModal.open && rebalanceModal.item && (
        <QuickRebalanceModal
          open={rebalanceModal.open}
          onClose={() => setRebalanceModal({ open: false })}
          onSuccess={handleModalSuccess}
          item={rebalanceModal.item}
        />
      )}
    </div>
  );
}
