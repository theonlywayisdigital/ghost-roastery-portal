"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, FileText } from "@/components/icons";
import {
  DataTable,
  FilterBar,
  Pagination,
  StatusBadge,
} from "@/components/admin";
import type { Column } from "@/components/admin/DataTable";
import type { FilterConfig } from "@/components/admin/FilterBar";
import type { InvoiceFull } from "@/types/finance";

type SubTab = "ghost_roastery" | "platform";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "partially_paid", label: "Partially Paid" },
  { value: "void", label: "Void" },
];

function formatCurrency(amount: number) {
  return `£${amount.toFixed(2)}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function InvoicesTab() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const subTab = (searchParams.get("subTab") || "ghost_roastery") as SubTab;
  const [invoices, setInvoices] = useState<InvoiceFull[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<{
    total: number;
    totalValue: number;
    unpaid: number;
    overdue: number;
    paid: number;
    draft: number;
  } | null>(null);

  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "25");
  const sortKey = searchParams.get("sortKey") || "created_at";
  const sortDir = searchParams.get("sortDir") || "desc";

  const filterValues: Record<string, string> = {
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "",
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
  };

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v);
        else params.delete(k);
      });
      if (!("page" in updates)) params.set("page", "1");
      router.replace(`/admin/finance?tab=invoices&${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    const fetchInvoices = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        params.set("sortKey", sortKey);
        params.set("sortDir", sortDir);
        params.set("includeStats", "true");
        if (subTab === "ghost_roastery") {
          params.set("owner_type", "ghost_roastery");
        }
        Object.entries(filterValues).forEach(([k, v]) => {
          if (v) params.set(k, v);
        });

        const res = await fetch(`/api/invoices?${params.toString()}`);
        const data = await res.json();
        setInvoices(data.data || []);
        setTotal(data.total || 0);
        if (data.stats) setStats(data.stats);
      } catch {
        console.error("Failed to fetch invoices");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  // Check for overdue invoices on mount
  useEffect(() => {
    fetch("/api/invoices/check-overdue").catch(() => {});
  }, []);

  const filters: FilterConfig[] = [
    { key: "search", label: "Search invoices...", type: "search" },
    { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
    { key: "date", label: "Date", type: "date-range" },
  ];

  const columns: Column<InvoiceFull>[] = [
    {
      key: "invoice_number",
      label: "Invoice",
      sortable: true,
      render: (row) => (
        <div>
          <span className="text-sm font-mono font-medium text-slate-900">
            {row.invoice_number}
          </span>
          <p className="text-xs text-slate-500">{formatDate(row.created_at)}</p>
        </div>
      ),
    },
    {
      key: "customer_name",
      label: "Customer",
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-sm text-slate-700">
          {row.customer_name || row.business_name || row.customer_email || "—"}
        </span>
      ),
    },
    ...(subTab === "platform"
      ? [
          {
            key: "roaster_name" as const,
            label: "Issuer",
            hiddenOnMobile: true,
            render: (row: InvoiceFull) => (
              <span className="text-sm text-slate-600">
                {row.roaster_name || "Ghost Roastery"}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => <StatusBadge status={row.status} type="invoiceStatus" />,
    },
    {
      key: "total",
      label: "Total",
      sortable: true,
      render: (row) => (
        <span className="text-sm font-medium text-slate-900">
          {formatCurrency(row.total)}
        </span>
      ),
    },
    {
      key: "payment_due_date",
      label: "Due",
      sortable: true,
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-sm text-slate-700">
          {row.payment_due_date ? formatDate(row.payment_due_date) : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => updateParams({ subTab: "ghost_roastery" })}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              subTab === "ghost_roastery"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Ghost Roastery
          </button>
          <button
            onClick={() => updateParams({ subTab: "platform" })}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              subTab === "platform"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Platform Overview
          </button>
        </nav>
      </div>

      {/* Quick stats — computed from full dataset */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, color: "text-slate-900" },
            { label: "Unpaid", value: stats.unpaid, color: "text-yellow-700" },
            { label: "Overdue", value: stats.overdue, color: "text-red-700" },
            { label: "Paid", value: stats.paid, color: "text-green-700" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl border border-slate-200 p-4 text-center"
            >
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters + Create */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <FilterBar
            filters={filters}
            values={filterValues}
            onChange={(key, value) => updateParams({ [key]: value })}
            onClear={() =>
              updateParams({
                search: "",
                status: "",
                dateFrom: "",
                dateTo: "",
              })
            }
          />
        </div>
        {subTab === "ghost_roastery" && (
          <a
            href="/admin/finance/invoices/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </a>
        )}
      </div>

      {/* Table */}
      {!isLoading && invoices.length === 0 && !Object.values(filterValues).some((v) => v) ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No invoices found.</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={invoices}
          isLoading={isLoading}
          sortKey={sortKey}
          sortDirection={sortDir as "asc" | "desc"}
          onSort={(key) => {
            const newDir = sortKey === key && sortDir === "desc" ? "asc" : "desc";
            updateParams({ sortKey: key, sortDir: newDir });
          }}
          onRowClick={(row) => router.push(`/admin/finance/invoices/${row.id}`)}
          emptyMessage="No invoices match your filters"
        />
      )}

      {/* Pagination */}
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => updateParams({ page: String(p) })}
        onPageSizeChange={(s) => updateParams({ pageSize: String(s), page: "1" })}
      />
    </div>
  );
}
