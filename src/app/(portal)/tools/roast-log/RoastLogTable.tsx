"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Star, Flame, Upload } from "@/components/icons";
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
        onRowClick={(row) => router.push(`/tools/inventory/roast-log/${row.id}`)}
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
