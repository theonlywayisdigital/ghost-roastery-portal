"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Star, Flame, Upload, Download, Trash2, X } from "@/components/icons";
import { QuickRoastModal } from "@/components/inventory/QuickRoastModal";
import { RoastLogImportModal } from "@/components/inventory/RoastLogImportModal";
import { DataTable, FilterBar, Pagination } from "@/components/admin";
import type { Column, FilterConfig } from "@/components/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useUpgradeBanner } from "@/hooks/useUpgradeBanner";
import { UpgradeBanner } from "@/components/shared/UpgradeBanner";

interface RoastLog {
  id: string;
  roast_date: string;
  roast_number: string | null;
  green_bean_id: string | null;
  green_bean_name: string | null;
  green_weight_kg: number | null;
  roasted_weight_kg: number | null;
  weight_loss_percent: number | null;
  roast_level: string | null;
  quality_rating: number | null;
  status: string;
  green_beans: { name: string } | null;
  created_at: string;
}

const PAGE_SIZE = 25;

const filters: FilterConfig[] = [
  { key: "search", label: "Search roast logs...", type: "search" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "draft", label: "Draft" },
      { value: "completed", label: "Completed" },
      { value: "void", label: "Void" },
    ],
  },
];

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-slate-300">--</span>;
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < rating ? "text-amber-400" : "text-slate-200"}`}
        />
      ))}
    </span>
  );
}

export function RoastLogTable({ roastLogs: initial }: { roastLogs: RoastLog[] }) {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sortKey, setSortKey] = useState("roast_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const banner = useUpgradeBanner("roastLogsPerMonth");
  const [showRoastModal, setShowRoastModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const filtered = useMemo(() => {
    let result = [...initial];

    if (filterValues.search) {
      const q = filterValues.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.roast_number?.toLowerCase().includes(q) ||
          r.green_bean_name?.toLowerCase().includes(q) ||
          r.green_beans?.name?.toLowerCase().includes(q) ||
          r.roast_level?.toLowerCase().includes(q)
      );
    }

    if (filterValues.status) {
      result = result.filter((r) => r.status === filterValues.status);
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
      setSelected(new Set(paginated.map((r) => r.id)));
    }
  }

  const handleBulkDelete = useCallback(async () => {
    const ok = window.confirm(`Delete ${selected.size} roast log${selected.size === 1 ? "" : "s"}? This cannot be undone.`);
    if (!ok) return;

    setBulkLoading(true);
    try {
      const res = await fetch("/api/tools/roast-log/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action: "delete" }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Bulk delete failed");
        return;
      }
      setSelected(new Set());
      router.refresh();
    } finally {
      setBulkLoading(false);
    }
  }, [selected, router]);

  function handleExportCsv() {
    const selectedLogs = initial.filter((r) => selected.has(r.id));
    const headers = ["Date", "Batch #", "Bean", "Green (kg)", "Roasted (kg)", "Loss %", "Level", "Rating", "Status"];
    const rows = selectedLogs.map((r) => [
      r.roast_date,
      r.roast_number || "",
      r.green_beans?.name || r.green_bean_name || "",
      r.green_weight_kg != null ? Number(r.green_weight_kg).toFixed(2) : "",
      r.roasted_weight_kg != null ? Number(r.roasted_weight_kg).toFixed(2) : "",
      r.weight_loss_percent != null ? Number(r.weight_loss_percent).toFixed(1) : "",
      r.roast_level || "",
      r.quality_rating != null ? String(r.quality_rating) : "",
      r.status,
    ]);

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roast-log-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: Column<RoastLog>[] = [
    {
      key: "roast_date",
      label: "Date",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-slate-900">
          {new Date(row.roast_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      key: "roast_number",
      label: "Batch #",
      render: (row) => <span className="text-slate-600">{row.roast_number || "--"}</span>,
    },
    {
      key: "green_beans",
      label: "Bean",
      render: (row) => (
        <span className="text-slate-900">{row.green_beans?.name || row.green_bean_name || "--"}</span>
      ),
    },
    {
      key: "green_weight_kg",
      label: "Green (kg)",
      sortable: true,
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-slate-600">
          {row.green_weight_kg != null ? Number(row.green_weight_kg).toFixed(2) : "--"}
        </span>
      ),
    },
    {
      key: "roasted_weight_kg",
      label: "Roasted (kg)",
      sortable: true,
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-slate-600">
          {row.roasted_weight_kg != null ? Number(row.roasted_weight_kg).toFixed(2) : "--"}
        </span>
      ),
    },
    {
      key: "weight_loss_percent",
      label: "Loss %",
      sortable: true,
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-slate-600">
          {row.weight_loss_percent != null ? `${Number(row.weight_loss_percent).toFixed(1)}%` : "--"}
        </span>
      ),
    },
    {
      key: "roast_level",
      label: "Level",
      hiddenOnMobile: true,
      render: (row) => <span className="text-slate-600">{row.roast_level || "--"}</span>,
    },
    {
      key: "quality_rating",
      label: "Rating",
      sortable: true,
      render: (row) => <StarRating rating={row.quality_rating} />,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} type="roastLogStatus" />,
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
          <h1 className="text-2xl font-bold text-slate-900">Roast Log</h1>
          <p className="text-slate-500 mt-1">Record and track every roast batch.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={() => setShowRoastModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
          >
            <Flame className="w-4 h-4" />
            Log Roast
          </button>
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
            onClick={handleBulkDelete}
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
        onRowClick={(row) => router.push(`/tools/inventory/roast-log/${row.id}`)}
        selectedRows={selected}
        onSelectRow={toggleSelect}
        onSelectAll={toggleSelectAll}
        emptyMessage="No roast logs yet — record your first roast to get started."
      />

      {filtered.length > pageSize && (
        <div className="mt-4">
          <Pagination page={page} total={filtered.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        </div>
      )}

      <QuickRoastModal
        open={showRoastModal}
        onClose={() => setShowRoastModal(false)}
        onSuccess={() => { setShowRoastModal(false); router.refresh(); }}
      />

      <RoastLogImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={() => router.refresh()}
      />
    </div>
  );
}
