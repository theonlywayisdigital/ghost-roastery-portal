"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Upload, Package, Scale, Download, Trash2, X } from "@/components/icons";
import { DataTable, FilterBar, Pagination } from "@/components/admin";
import type { Column, FilterConfig } from "@/components/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useUpgradeBanner } from "@/hooks/useUpgradeBanner";
import { UpgradeBanner } from "@/components/shared/UpgradeBanner";
import { QuickReceiveModal } from "@/components/inventory/QuickReceiveModal";
import { QuickRebalanceModal } from "@/components/inventory/QuickRebalanceModal";

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
  roasted_stock: { id: string; name: string }[] | null;
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
  const [rebalanceItem, setRebalanceItem] = useState<{ id: string; name: string; currentKg: number } | null>(null);
  const [receiveItem, setReceiveItem] = useState<{ id: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const filtered = useMemo(() => {
    let result = [...initial];

    if (filterValues.search) {
      const q = filterValues.search.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.origin_country?.toLowerCase().includes(q)
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

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === paginated.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginated.map((b) => b.id)));
    }
  }

  const handleBulkAction = useCallback(async (action: "delete" | "set_active" | "set_inactive") => {
    if (action === "delete") {
      const ok = window.confirm(`Delete ${selected.size} green bean${selected.size === 1 ? "" : "s"}? This cannot be undone.`);
      if (!ok) return;
    }

    setBulkLoading(true);
    try {
      const res = await fetch("/api/tools/green-beans/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Bulk action failed");
        return;
      }
      setSelected(new Set());
      router.refresh();
    } finally {
      setBulkLoading(false);
    }
  }, [selected, router]);

  function handleExportCsv() {
    const selectedBeans = initial.filter((b) => selected.has(b.id));
    const headers = ["Name", "Origin", "Supplier", "Stock (kg)", "Cost/kg", "Linked Profiles", "Active"];
    const rows = selectedBeans.map((b) => [
      b.name,
      b.origin_country || "",
      b.suppliers?.name || "",
      Number(b.current_stock_kg).toFixed(2),
      b.cost_per_kg ? Number(b.cost_per_kg).toFixed(2) : "",
      (b.roasted_stock || []).map((rs) => rs.name).join("; "),
      b.is_active ? "Yes" : "No",
    ]);

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `green-beans-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
      key: "roasted_stock",
      label: "Linked Profiles",
      hiddenOnMobile: true,
      render: (row) => {
        const profiles = row.roasted_stock || [];
        if (profiles.length === 0) return <span className="text-slate-400">—</span>;
        const MAX = 2;
        const visible = profiles.slice(0, MAX);
        const remaining = profiles.length - MAX;
        return (
          <div className="flex flex-wrap gap-1">
            {visible.map((rs) => (
              <Link
                key={rs.id}
                href={`/inventory/roasted/${rs.id}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                {rs.name}
              </Link>
            ))}
            {remaining > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                +{remaining} more
              </span>
            )}
          </div>
        );
      },
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
      render: (row) => <span className="font-medium text-slate-900">{Number(row.current_stock_kg).toFixed(2)}</span>,
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
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); setReceiveItem({ id: row.id }); }}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-brand-600 bg-brand-50 rounded-md hover:bg-brand-100 transition-colors"
          >
            <Package className="w-3 h-3" />
            Receive
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setRebalanceItem({ id: row.id, name: row.name, currentKg: Number(row.current_stock_kg) }); }}
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

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
    setPage(1);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Green Bean Inventory</h1>
          <p className="text-slate-500 mt-1">Track your green bean stock, origins, and suppliers.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/inventory/import"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </Link>
          <Link
            href="/inventory/green/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Bean
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
          onChange={handleFilterChange}
          onClear={handleFilterClear}
        />
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 mb-4 bg-brand-50 border border-brand-200 rounded-lg">
          <span className="text-sm font-medium text-brand-700">{selected.size} selected</span>
          <button
            onClick={() => handleBulkAction("set_active")}
            disabled={bulkLoading}
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50"
          >
            Set Active
          </button>
          <button
            onClick={() => handleBulkAction("set_inactive")}
            disabled={bulkLoading}
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50"
          >
            Set Inactive
          </button>
          <button
            onClick={() => handleBulkAction("delete")}
            disabled={bulkLoading}
            className="text-xs px-2.5 py-1.5 bg-white border border-red-200 rounded-md text-red-600 hover:bg-red-50 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
          <button
            onClick={handleExportCsv}
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50 flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            Export CSV
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={paginated}
        onSort={handleSort}
        sortKey={sortKey}
        sortDirection={sortDir}
        onRowClick={(row) => router.push(`/inventory/green/${row.id}`)}
        selectedRows={selected}
        onSelectRow={toggleSelect}
        onSelectAll={toggleSelectAll}
        emptyMessage="No green beans yet — add your first bean to get started."
      />

      {filtered.length > pageSize && (
        <div className="mt-4">
          <Pagination page={page} total={filtered.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        </div>
      )}

      <QuickReceiveModal
        open={!!receiveItem}
        onClose={() => setReceiveItem(null)}
        onSuccess={() => { setReceiveItem(null); router.refresh(); }}
        preselectedBeanId={receiveItem?.id}
      />

      {rebalanceItem && (
        <QuickRebalanceModal
          open={!!rebalanceItem}
          onClose={() => setRebalanceItem(null)}
          onSuccess={() => { setRebalanceItem(null); router.refresh(); }}
          item={{ type: "green", id: rebalanceItem.id, name: rebalanceItem.name, currentKg: rebalanceItem.currentKg }}
        />
      )}
    </div>
  );
}
