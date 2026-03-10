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

interface Certification {
  id: string;
  cert_name: string;
  cert_type: string | null;
  certificate_number: string | null;
  issuing_body: string | null;
  expiry_date: string | null;
  status: string;
  created_at: string;
}

const PAGE_SIZE = 25;

const filters: FilterConfig[] = [
  { key: "search", label: "Search certifications...", type: "search" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "active", label: "Active" },
      { value: "expiring_soon", label: "Expiring Soon" },
      { value: "expired", label: "Expired" },
      { value: "pending", label: "Pending" },
      { value: "revoked", label: "Revoked" },
    ],
  },
];

function formatCountdown(expiryDate: string | null): string {
  if (!expiryDate) return "—";

  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return `${diffDays} days`;
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function CertificationsTable({ certifications: initial }: { certifications: Certification[] }) {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sortKey, setSortKey] = useState("expiry_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const banner = useUpgradeBanner("certifications");

  const filtered = useMemo(() => {
    let result = [...initial];

    if (filterValues.search) {
      const q = filterValues.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.cert_name.toLowerCase().includes(q) ||
          c.cert_type?.toLowerCase().includes(q) ||
          c.certificate_number?.toLowerCase().includes(q) ||
          c.issuing_body?.toLowerCase().includes(q)
      );
    }

    if (filterValues.status) {
      result = result.filter((c) => c.status === filterValues.status);
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

  const columns: Column<Certification>[] = [
    {
      key: "cert_name",
      label: "Name",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.cert_name}</p>
          {row.cert_type && <p className="text-xs text-slate-500">{row.cert_type}</p>}
        </div>
      ),
    },
    {
      key: "certificate_number",
      label: "Certificate #",
      hiddenOnMobile: true,
      render: (row) => <span className="text-slate-600">{row.certificate_number || "—"}</span>,
    },
    {
      key: "issuing_body",
      label: "Issuing Body",
      hiddenOnMobile: true,
      render: (row) => <span className="text-slate-600">{row.issuing_body || "—"}</span>,
    },
    {
      key: "expiry_date",
      label: "Expiry Date",
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-slate-600">{formatDate(row.expiry_date)}</p>
          <p className="text-xs text-slate-400">{formatCountdown(row.expiry_date)}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} type="certificationStatus" />,
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
          <h1 className="text-2xl font-bold text-slate-900">Certifications</h1>
          <p className="text-slate-500 mt-1">Track food safety certs, expiry dates, and documents.</p>
        </div>
        <Link
          href="/tools/certifications/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Certification
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
        onRowClick={(row) => router.push(`/tools/certifications/${row.id}`)}
        emptyMessage="No certifications yet — add your first certification to get started."
      />

      {filtered.length > pageSize && (
        <div className="mt-4">
          <Pagination page={page} total={filtered.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        </div>
      )}
    </div>
  );
}
