"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "@/components/icons";
import { DataTable, FilterBar, Pagination } from "@/components/admin";
import type { Column, FilterConfig } from "@/components/admin";
import { useUpgradeBanner } from "@/hooks/useUpgradeBanner";
import { UpgradeBanner } from "@/components/shared/UpgradeBanner";

interface CuppingSession {
  id: string;
  session_date: string;
  session_name: string;
  cupper_name: string | null;
  notes: string | null;
  created_at: string;
  sample_count: number;
  avg_score: number | null;
}

const PAGE_SIZE = 25;

const filters: FilterConfig[] = [
  { key: "search", label: "Search sessions...", type: "search" },
];

function scoreColor(score: number | null): string {
  if (score == null) return "text-slate-400";
  if (score >= 80) return "text-green-700";
  if (score >= 70) return "text-blue-700";
  return "text-slate-600";
}

export function CuppingTable({ sessions: initial }: { sessions: CuppingSession[] }) {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sortKey, setSortKey] = useState("session_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const banner = useUpgradeBanner("cuppingSessionsPerMonth");

  const filtered = useMemo(() => {
    let result = [...initial];

    if (filterValues.search) {
      const q = filterValues.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.session_name.toLowerCase().includes(q) ||
          s.cupper_name?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortKey] ?? "";
      const bVal = (b as unknown as Record<string, unknown>)[sortKey] ?? "";
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [initial, filterValues, sortKey, sortDir]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns: Column<CuppingSession>[] = [
    {
      key: "session_date",
      label: "Date",
      sortable: true,
      render: (row) => (
        <span className="text-slate-600">
          {new Date(row.session_date).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "session_name",
      label: "Session Name",
      sortable: true,
      render: (row) => <span className="font-medium text-slate-900">{row.session_name}</span>,
    },
    {
      key: "cupper_name",
      label: "Cupper",
      sortable: true,
      hiddenOnMobile: true,
      render: (row) => <span className="text-slate-600">{row.cupper_name || "\u2014"}</span>,
    },
    {
      key: "sample_count",
      label: "Samples",
      sortable: true,
      render: (row) => <span className="text-slate-600">{row.sample_count}</span>,
    },
    {
      key: "avg_score",
      label: "Avg Score",
      sortable: true,
      hiddenOnMobile: true,
      render: (row) => (
        <span className={`font-medium ${scoreColor(row.avg_score)}`}>
          {row.avg_score != null ? row.avg_score.toFixed(2) : "\u2014"}
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
          <h1 className="text-2xl font-bold text-slate-900">Cupping Sessions</h1>
          <p className="text-slate-500 mt-1">Score and track your coffee cuppings.</p>
        </div>
        <Link
          href="/tools/cupping/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Session
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
        onRowClick={(row) => router.push(`/tools/cupping/${row.id}`)}
        emptyMessage="No cupping sessions yet \u2014 create your first session to start scoring."
      />

      {filtered.length > pageSize && (
        <div className="mt-4">
          <Pagination
            page={page}
            total={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        </div>
      )}
    </div>
  );
}
