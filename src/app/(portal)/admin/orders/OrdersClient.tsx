"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Package } from "@/components/icons";
import {
  DataTable,
  FilterBar,
  Pagination,
  StatusBadge,
} from "@/components/admin";
import type { Column } from "@/components/admin/DataTable";
import type { FilterConfig } from "@/components/admin/FilterBar";
import type { UnifiedOrder, OrderType } from "@/types/admin";
import { RETAIL_ENABLED } from "@/lib/feature-flags";

const tabs: { label: string; value: OrderType | "" }[] = [
  { label: "All", value: "" },
  { label: "Ghost Roastery", value: "ghost" },
  ...(RETAIL_ENABLED ? [{ label: "Storefront", value: "storefront" as OrderType }] : []),
  { label: "Wholesale", value: "wholesale" },
];

const GHOST_STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Artwork Review", label: "Artwork Review" },
  { value: "Approved", label: "Approved" },
  { value: "Allocated", label: "Allocated" },
  { value: "Accepted", label: "Accepted" },
  { value: "In Production", label: "In Production" },
  { value: "Processing", label: "Processing" },
  { value: "Dispatched", label: "Dispatched" },
  { value: "Delivered", label: "Delivered" },
  { value: "Cancelled", label: "Cancelled" },
  { value: "Disputed", label: "Disputed" },
];

const WHOLESALE_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "dispatched", label: "Dispatched" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const ALL_STATUS_OPTIONS = [
  ...GHOST_STATUS_OPTIONS,
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "paid", label: RETAIL_ENABLED ? "Paid (Storefront)" : "Paid" },
];

const PAYMENT_OPTIONS = [
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "partial", label: "Partial" },
  { value: "overdue", label: "Overdue" },
  { value: "awaiting payment", label: "Awaiting Payment" },
  { value: "awaiting invoice", label: "Awaiting Invoice" },
];

const ARTWORK_OPTIONS = [
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "needs_edit", label: "Needs Edit" },
  { value: "sent_to_print", label: "Sent to Print" },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(pounds: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pounds);
}

interface OrdersClientProps {
  roasters: { value: string; label: string }[];
}

export function OrdersClient({ roasters }: OrdersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = (searchParams.get("orderType") || "") as OrderType | "";
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "25");
  const sortKey = searchParams.get("sortKey") || "date";
  const sortDir = searchParams.get("sortDir") || "desc";

  const filterValues: Record<string, string> = {
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "",
    paymentStatus: searchParams.get("paymentStatus") || "",
    roasterId: searchParams.get("roasterId") || "",
    artworkStatus: searchParams.get("artworkStatus") || "",
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
      router.replace(`/admin/orders?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      params.set("sortKey", sortKey);
      params.set("sortDir", sortDir);
      if (activeTab) params.set("orderType", activeTab);
      Object.entries(filterValues).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });

      try {
        const res = await fetch(`/api/admin/orders?${params.toString()}`);
        const data = await res.json();
        setOrders(data.data || []);
        setTotal(data.total || 0);
      } catch {
        console.error("Failed to fetch orders");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  const statusOptions = activeTab === "ghost"
    ? GHOST_STATUS_OPTIONS
    : activeTab === "storefront" || activeTab === "wholesale"
    ? WHOLESALE_STATUS_OPTIONS
    : ALL_STATUS_OPTIONS;

  const filters: FilterConfig[] = [
    { key: "search", label: "Search orders...", type: "search" },
    { key: "status", label: "Status", type: "select", options: statusOptions },
    { key: "paymentStatus", label: "Payment", type: "select", options: PAYMENT_OPTIONS },
    { key: "roasterId", label: "Roaster", type: "select", options: roasters },
    ...(activeTab === "ghost"
      ? [{ key: "artworkStatus" as const, label: "Artwork", type: "select" as const, options: ARTWORK_OPTIONS }]
      : []),
    { key: "date", label: "Date", type: "date-range" },
  ];

  const columns: Column<UnifiedOrder>[] = [
    {
      key: "orderNumber",
      label: "Order",
      sortable: true,
      render: (row) => (
        <span className="text-sm font-mono font-medium text-slate-900">
          {row.orderNumber}
        </span>
      ),
    },
    ...(RETAIL_ENABLED ? [{
      key: "orderType" as const,
      label: "Type",
      render: (row: UnifiedOrder) => <StatusBadge status={row.orderType} type="orderType" />,
    }] : []),
    {
      key: "customerName",
      label: "Customer",
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-slate-900">{row.customerName || "—"}</p>
          <p className="text-xs text-slate-500">{row.customerEmail}</p>
        </div>
      ),
    },
    {
      key: "roasterName",
      label: "Roaster",
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-sm text-slate-600">{row.roasterName || "—"}</span>
      ),
    },
    {
      key: "itemSummary",
      label: "Product",
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-sm text-slate-600">{row.itemSummary}</span>
      ),
    },
    {
      key: "total",
      label: "Total",
      sortable: true,
      render: (row) => (
        <span className="text-sm font-medium text-slate-900">
          {formatPrice(row.total)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => <StatusBadge status={row.status} type="order" />,
    },
    {
      key: "paymentStatus",
      label: "Payment",
      hiddenOnMobile: true,
      render: (row) => <StatusBadge status={row.paymentStatus} type="payment" />,
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-sm text-slate-500">{formatDate(row.date)}</span>
      ),
    },
  ];

  if (activeTab === "ghost") {
    columns.splice(columns.length - 2, 0, {
      key: "artworkStatus",
      label: "Artwork",
      hiddenOnMobile: true,
      render: (row) =>
        row.artworkStatus ? (
          <StatusBadge status={row.artworkStatus} type="artwork" />
        ) : (
          <span className="text-slate-300">—</span>
        ),
    });
  }

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    Object.entries(filterValues).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    if (activeTab) params.set("orderType", activeTab);
    window.open(`/api/admin/orders/export?${params.toString()}`);
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => updateParams({ orderType: tab.value })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-brand-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}

        {/* Export button */}
        <button
          onClick={handleExportCsv}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <FilterBar
          filters={filters}
          values={filterValues}
          onChange={(key, value) => updateParams({ [key]: value })}
          onClear={() =>
            updateParams({
              search: "", status: "", paymentStatus: "",
              roasterId: "", artworkStatus: "", dateFrom: "", dateTo: "",
            })
          }
        />
      </div>

      {/* Table */}
      {!isLoading && orders.length === 0 && !Object.values(filterValues).some(v => v) ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No orders yet.</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={orders}
          isLoading={isLoading}
          sortKey={sortKey}
          sortDirection={sortDir as "asc" | "desc"}
          onSort={(key) => {
            const newDir = sortKey === key && sortDir === "desc" ? "asc" : "desc";
            updateParams({ sortKey: key, sortDir: newDir });
          }}
          onRowClick={(row) =>
            router.push(`/admin/orders/${row.id}?type=${row.orderType}`)
          }
          emptyMessage="No orders match your filters"
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
