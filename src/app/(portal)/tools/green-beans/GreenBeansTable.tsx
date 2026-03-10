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

interface GreenBean {
  id: string;
  name: string;
  origin_country: string | null;
  variety: string | null;
  process: string | null;
  current_stock_kg: number;
  low_stock_threshold_kg: number | null;
  cost_per_kg: number | null;
  is_active: boolean;
  suppliers: { name: string } | null;
  created_at: string;
}

const PAGE_SIZE = 25;

const filters: FilterConfig[] = [
  { key: "search", label: "Search beans...", type: "search" },
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

function getStockStatus(bean: GreenBean): "ok" | "low" | "out" {
  if (bean.current_stock_kg <= 0) return "out";
  if (bean.low_stock_threshold_kg && bean.current_stock_kg <= bean.low_stock_threshold_kg) return "low";
  return "ok";
}

export function GreenBeansTable({ beans: initial }: { beans: GreenBean[] }) {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const banner = useUpgradeBanner("greenBeans");

  const filtered = useMemo(() => {
    let result = [...initial];

    if (filterValues.search) {
      const q = filterValues.search.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.origin_country?.toLowerCase().includes(q) ||
          b.variety?.toLowerCase().includes(q) ||
          b.process?.toLowerCase().includes(q)
      );
    }

    if (filterValues.stock) {
      result = result.filter((b) => getStockStatus(b) === filterValues.stock);
    }

    if (filterValues.status === "active") result = result.filter((b) => b.is_active);
    if (filterValues.status === "inactive") result = result.filter((b) => !b.is_active);

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

  const columns: Column<GreenBean>[] = [
    {
      key: "name",
      label: "Bean",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          {row.origin_country && <p className="text-xs text-slate-500">{row.origin_country}</p>}
        </div>
      ),
    },
    {
      key: "variety",
      label: "Variety",
      hiddenOnMobile: true,
      render: (row) => <span className="text-slate-600">{row.variety || "—"}</span>,
    },
    {
      key: "process",
      label: "Process",
      hiddenOnMobile: true,
      render: (row) => <span className="text-slate-600">{row.process || "—"}</span>,
    },
    {
      key: "suppliers",
      label: "Supplier",
      hiddenOnMobile: true,
      render: (row) => <span className="text-slate-600">{row.suppliers?.name || "—"}</span>,
    },
    {
      key: "current_stock_kg",
      label: "Stock (kg)",
      sortable: true,
      render: (row) => <span className="font-medium text-slate-900">{Number(row.current_stock_kg).toFixed(1)}</span>,
    },
    {
      key: "cost_per_kg",
      label: "Cost/kg",
      sortable: true,
      hiddenOnMobile: true,
      render: (row) => <span className="text-slate-600">{row.cost_per_kg ? `£${Number(row.cost_per_kg).toFixed(2)}` : "—"}</span>,
    },
    {
      key: "stock_status",
      label: "Status",
      render: (row) => <StatusBadge status={getStockStatus(row)} type="stockAlert" />,
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
          <h1 className="text-2xl font-bold text-slate-900">Green Bean Inventory</h1>
          <p className="text-slate-500 mt-1">Track your green bean stock, origins, and suppliers.</p>
        </div>
        <Link
          href="/tools/green-beans/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Bean
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
        onRowClick={(row) => router.push(`/tools/green-beans/${row.id}`)}
        emptyMessage="No green beans yet — add your first bean to get started."
      />

      {filtered.length > pageSize && (
        <div className="mt-4">
          <Pagination page={page} total={filtered.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        </div>
      )}
    </div>
  );
}
