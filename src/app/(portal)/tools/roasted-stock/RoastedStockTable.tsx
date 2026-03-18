"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "@/components/icons";
import { DataTable, FilterBar, Pagination } from "@/components/admin";
import type { Column, FilterConfig } from "@/components/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useUpgradeBanner } from "@/hooks/useUpgradeBanner";
import { UpgradeBanner } from "@/components/shared/UpgradeBanner";

interface RoastedStock {
  id: string;
  name: string;
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
      render: (row) => <span className="font-medium text-slate-900">{Number(row.current_stock_kg).toFixed(1)}</span>,
    },
    {
      key: "low_stock_threshold_kg",
      label: "Low Threshold",
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-slate-600">
          {row.low_stock_threshold_kg ? `${Number(row.low_stock_threshold_kg).toFixed(1)} kg` : "—"}
        </span>
      ),
    },
    {
      key: "stock_status",
      label: "Status",
      render: (row) => <StatusBadge status={getStockStatus(row)} type="stockAlert" />,
    },
    {
      key: "updated_at",
      label: "Updated",
      hiddenOnMobile: true,
      sortable: true,
      render: (row) => (
        <span className="text-slate-500 text-xs">
          {new Date(row.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </span>
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
          <h1 className="text-2xl font-bold text-slate-900">Roasted Stock</h1>
          <p className="text-slate-500 mt-1">Track your roasted coffee inventory and stock levels.</p>
        </div>
        <Link
          href="/tools/roasted-stock/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Stock
        </Link>
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
        onRowClick={(row) => router.push(`/tools/roasted-stock/${row.id}`)}
        emptyMessage="No roasted stock yet — add your first item to get started."
      />

      {filtered.length > pageSize && (
        <div className="mt-4">
          <Pagination page={page} total={filtered.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        </div>
      )}
    </div>
  );
}
