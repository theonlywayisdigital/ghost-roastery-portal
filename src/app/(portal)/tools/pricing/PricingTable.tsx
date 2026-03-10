"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "@/components/icons";
import { DataTable, FilterBar, Pagination } from "@/components/admin";
import type { Column, FilterConfig } from "@/components/admin";

interface CostCalculation {
  id: string;
  name: string;
  green_bean_id: string | null;
  bag_weight_grams: number;
  calculated_cost_per_unit: number | null;
  calculated_retail_price: number | null;
  calculated_wholesale_price: number | null;
  target_retail_margin_percent: number;
  target_wholesale_margin_percent: number;
  is_template: boolean;
  green_beans: { name: string } | null;
  created_at: string;
}

const PAGE_SIZE = 25;

const filters: FilterConfig[] = [
  { key: "search", label: "Search calculations...", type: "search" },
  {
    key: "bag_size",
    label: "Bag Size",
    type: "select",
    options: [
      { value: "250", label: "250g" },
      { value: "500", label: "500g" },
      { value: "1000", label: "1kg" },
    ],
  },
];

function formatBagSize(grams: number): string {
  if (grams >= 1000) return `${grams / 1000}kg`;
  return `${grams}g`;
}

export function PricingTable({ calculations: initial }: { calculations: CostCalculation[] }) {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    let result = [...initial];

    if (filterValues.search) {
      const q = filterValues.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.green_beans?.name?.toLowerCase().includes(q)
      );
    }

    if (filterValues.bag_size) {
      result = result.filter((c) => String(c.bag_weight_grams) === filterValues.bag_size);
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

  const columns: Column<CostCalculation>[] = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          {row.is_template && <p className="text-xs text-brand-600">Template</p>}
        </div>
      ),
    },
    {
      key: "green_beans",
      label: "Bean",
      hiddenOnMobile: true,
      render: (row) => <span className="text-slate-600">{row.green_beans?.name || "—"}</span>,
    },
    {
      key: "bag_weight_grams",
      label: "Bag Size",
      sortable: true,
      render: (row) => <span className="text-slate-600">{formatBagSize(row.bag_weight_grams)}</span>,
    },
    {
      key: "calculated_cost_per_unit",
      label: "Cost/Unit",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-slate-900">
          {row.calculated_cost_per_unit != null ? `£${Number(row.calculated_cost_per_unit).toFixed(2)}` : "—"}
        </span>
      ),
    },
    {
      key: "calculated_retail_price",
      label: "Retail Price",
      sortable: true,
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-slate-600">
          {row.calculated_retail_price != null ? `£${Number(row.calculated_retail_price).toFixed(2)}` : "—"}
        </span>
      ),
    },
    {
      key: "calculated_wholesale_price",
      label: "Wholesale Price",
      sortable: true,
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-slate-600">
          {row.calculated_wholesale_price != null ? `£${Number(row.calculated_wholesale_price).toFixed(2)}` : "—"}
        </span>
      ),
    },
    {
      key: "target_retail_margin_percent",
      label: "Margin%",
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-slate-600">{row.target_retail_margin_percent}% / {row.target_wholesale_margin_percent}%</span>
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
          <h1 className="text-2xl font-bold text-slate-900">Calculators</h1>
          <p className="text-slate-500 mt-1">Calculate costs per bag, break-even, and set profitable prices.</p>
        </div>
        <Link
          href="/tools/pricing/calculator"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Calculator
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
        onRowClick={(row) => router.push(`/tools/pricing/calculator/${row.id}`)}
        emptyMessage="No pricing calculations yet — use the calculator to get started."
      />

      {filtered.length > pageSize && (
        <div className="mt-4">
          <Pagination page={page} total={filtered.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        </div>
      )}
    </div>
  );
}
