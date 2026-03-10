"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "@/components/icons";
import { DataTable, FilterBar, Pagination } from "@/components/admin";
import type { Column, FilterConfig } from "@/components/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";

interface ProductionPlan {
  id: string;
  planned_date: string;
  green_bean_id: string | null;
  green_bean_name: string | null;
  planned_weight_kg: number | null;
  expected_roasted_kg: number | null;
  expected_loss_percent: number | null;
  product_id: string | null;
  priority: number;
  status: string;
  notes: string | null;
  green_beans: { name: string } | null;
  created_at: string;
}

const PAGE_SIZE = 25;

const filters: FilterConfig[] = [
  { key: "search", label: "Search production plans...", type: "search" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "planned", label: "Planned" },
      { value: "in_progress", label: "In Progress" },
      { value: "completed", label: "Completed" },
      { value: "cancelled", label: "Cancelled" },
    ],
  },
];

// Map production statuses to order status badge colors
const STATUS_MAP: Record<string, string> = {
  planned: "pending",
  in_progress: "processing",
  completed: "delivered",
  cancelled: "cancelled",
};

export function ProductionTable({ plans: initial }: { plans: ProductionPlan[] }) {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sortKey, setSortKey] = useState("planned_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    let result = [...initial];

    if (filterValues.search) {
      const q = filterValues.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.green_bean_name?.toLowerCase().includes(q) ||
          p.green_beans?.name?.toLowerCase().includes(q) ||
          p.notes?.toLowerCase().includes(q)
      );
    }

    if (filterValues.status) {
      result = result.filter((p) => p.status === filterValues.status);
    }

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

  const columns: Column<ProductionPlan>[] = [
    {
      key: "planned_date",
      label: "Planned Date",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-slate-900">
          {new Date(row.planned_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      key: "green_beans",
      label: "Bean",
      render: (row) => (
        <span className="text-slate-900">{row.green_beans?.name || row.green_bean_name || "--"}</span>
      ),
    },
    {
      key: "planned_weight_kg",
      label: "Planned (kg)",
      sortable: true,
      render: (row) => (
        <span className="text-slate-600">
          {row.planned_weight_kg != null ? Number(row.planned_weight_kg).toFixed(2) : "--"}
        </span>
      ),
    },
    {
      key: "expected_roasted_kg",
      label: "Expected Output (kg)",
      sortable: true,
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-slate-600">
          {row.expected_roasted_kg != null ? Number(row.expected_roasted_kg).toFixed(2) : "--"}
        </span>
      ),
    },
    {
      key: "expected_loss_percent",
      label: "Loss %",
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-slate-600">
          {row.expected_loss_percent != null ? `${Number(row.expected_loss_percent).toFixed(1)}%` : "--"}
        </span>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      sortable: true,
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-slate-600">{row.priority || 0}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge status={STATUS_MAP[row.status] || row.status} type="order" />
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
          <h1 className="text-2xl font-bold text-slate-900">Production Planner</h1>
          <p className="text-slate-500 mt-1">Plan and schedule your roasting production.</p>
        </div>
        <Link
          href="/tools/production/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Plan
        </Link>
      </div>

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
        onRowClick={(row) => router.push(`/tools/production/${row.id}`)}
        emptyMessage="No production plans yet — create your first plan to get started."
      />

      {filtered.length > pageSize && (
        <div className="mt-4">
          <Pagination page={page} total={filtered.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        </div>
      )}
    </div>
  );
}
