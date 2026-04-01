"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Upload, Flame, Scale } from "@/components/icons";
import { DataTable, FilterBar, Pagination } from "@/components/admin";
import type { Column, FilterConfig } from "@/components/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useUpgradeBanner } from "@/hooks/useUpgradeBanner";
import { UpgradeBanner } from "@/components/shared/UpgradeBanner";
import { QuickRoastModal } from "@/components/inventory/QuickRoastModal";
import { QuickRebalanceModal } from "@/components/inventory/QuickRebalanceModal";

interface RoastedStock {
  id: string;
  name: string;
  green_bean_id: string | null;
  current_stock_kg: number;
  low_stock_threshold_kg: number | null;
  is_active: boolean;
  green_beans: { name: string } | null;
  updated_at: string;
  created_at: string;
}

const PAGE_SIZE = 25;

const filters: FilterConfig[] = [
  { key: "search", label: "Search stock...", type: "search" },
  {
    key: "stock",
    label: "Stock Level",
    type: "select",
    options: [
      { value: "low", label: "Low Stock" },
      { value: "out", label: "Out of Stock" },
      { value: "ok", label: "In Stock" },
    ],
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  },
];

function getStockStatus(item: RoastedStock): "ok" | "low" | "out" {
  if (item.current_stock_kg <= 0) return "out";
  if (item.low_stock_threshold_kg && item.current_stock_kg <= item.low_stock_threshold_kg) return "low";
  return "ok";
}

export function RoastedStockTable({ stock: initial }: { stock: RoastedStock[] }) {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const banner = useUpgradeBanner("roastedStock");
  const [rebalanceItem, setRebalanceItem] = useState<{ id: string; name: string; currentKg: number; greenBeanId?: string; greenBeanName?: string } | null>(null);
  const [roastItem, setRoastItem] = useState<{ beanId?: string; stockId: string } | null>(null);

  const filtered = useMemo(() => {
    let result = [...initial];

    if (filterValues.search) {
      const q = filterValues.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.green_beans?.name?.toLowerCase().includes(q)
      );
    }

    if (filterValues.stock) {
      result = result.filter((s) => getStockStatus(s) === filterValues.stock);
    }

    if (filterValues.status === "active") result = result.filter((s) => s.is_active);
    if (filterValues.status === "inactive") result = result.filter((s) => !s.is_active);

    result.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortKey] ?? "";
      const bVal = (b as unknown as Record<string, unknown>)[sortKey] ?? "";
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [initial, filterValues, sortKey, sortDir]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns: Column<RoastedStock>[] = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          {row.green_beans?.name && <p className="text-xs text-slate-500">from {row.green_beans.name}</p>}
        </div>
      ),
    },
    {
      key: "green_beans",
      label: "Source Bean",
      hiddenOnMobile: true,
      render: (row) => <span className="text-slate-600">{row.green_beans?.name || "—"}</span>,
    },
    {
      key: "current_stock_kg",
      label: "Stock (kg)",
      sortable: true,
      render: (row) => <span className="font-medium text-slate-900">{Number(row.current_stock_kg).toFixed(2)}</span>,
    },
    {
      key: "low_stock_threshold_kg",
      label: "Low Threshold",
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-slate-600">
          {row.low_stock_threshold_kg ? `${Number(row.low_stock_threshold_kg).toFixed(2)} kg` : "—"}
        </span>
      ),
    },
    {
      key: "stock_status",
      label: "Status",
      render: (row) => <StatusBadge status={getStockStatus(row)} type="stockAlert" />,
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); setRoastItem({ beanId: row.green_bean_id || undefined, stockId: row.id }); }}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-md hover:bg-amber-100 transition-colors"
          >
            <Flame className="w-3 h-3" />
            Log Roast
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setRebalanceItem({ id: row.id, name: row.name, currentKg: Number(row.current_stock_kg), greenBeanId: row.green_bean_id || undefined, greenBeanName: row.green_beans?.name || undefined }); }}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
          >
            <Scale className="w-3 h-3" />
            Set
          </button>
        </div>
      ),
    },
  ];

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Roast Profiles</h1>
          <p className="text-slate-500 mt-1">Manage your roast profiles and track stock levels.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/tools/inventory/import"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </Link>
          <Link
            href="/tools/inventory/roasted/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Profile
          </Link>
        </div>
      </div>

      {banner.show && (
        <div className="mb-6">
          <UpgradeBanner type={banner.type} message={banner.message} upgradeTier={banner.upgradeTier} productType={banner.productType} />
        </div>
      )}

      <div className="mb-4">
        <FilterBar
          filters={filters}
          values={filterValues}
          onChange={(key, value) => { setFilterValues((prev) => ({ ...prev, [key]: value })); setPage(1); }}
          onClear={() => { setFilterValues({}); setPage(1); }}
        />
      </div>

      <DataTable
        columns={columns}
        data={paginated}
        onSort={handleSort}
        sortKey={sortKey}
        sortDirection={sortDir}
        onRowClick={(row) => router.push(`/tools/inventory/roasted/${row.id}`)}
        emptyMessage="No roast profiles yet — add your first item to get started."
      />

      {filtered.length > pageSize && (
        <div className="mt-4">
          <Pagination page={page} total={filtered.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        </div>
      )}

      <QuickRoastModal
        open={!!roastItem}
        onClose={() => setRoastItem(null)}
        onSuccess={() => { setRoastItem(null); router.refresh(); }}
        preselectedBeanId={roastItem?.beanId}
        preselectedStockId={roastItem?.stockId}
      />

      {rebalanceItem && (
        <QuickRebalanceModal
          open={!!rebalanceItem}
          onClose={() => setRebalanceItem(null)}
          onSuccess={() => { setRebalanceItem(null); router.refresh(); }}
          item={{ type: "roasted", id: rebalanceItem.id, name: rebalanceItem.name, currentKg: rebalanceItem.currentKg, linkedGreenBeanId: rebalanceItem.greenBeanId, linkedGreenBeanName: rebalanceItem.greenBeanName }}
        />
      )}
    </div>
  );
}
