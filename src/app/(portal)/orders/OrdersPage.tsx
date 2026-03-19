"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Package, ShoppingCart, TrendingUp, Clock, Plus } from "@/components/icons";
import { DataTable, FilterBar, Pagination, StatusBadge } from "@/components/admin";
import type { Column } from "@/components/admin/DataTable";
import type { FilterConfig } from "@/components/admin/FilterBar";


interface RoasterOrder {
  id: string;
  orderNumber: string;
  orderType: "ghost" | "storefront" | "wholesale";
  customerName: string | null;
  customerEmail: string;
  customerBusiness: string | null;
  itemSummary: string;
  total: number;
  status: string;
  paymentStatus: string;
  date: string;
}

type TabValue = "all" | "ghost" | "storefront" | "wholesale";

const GHOST_STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "In Production", label: "In Production" },
  { value: "Dispatched", label: "Dispatched" },
  { value: "Delivered", label: "Delivered" },
  { value: "Cancelled", label: "Cancelled" },
];

const WHOLESALE_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "confirmed", label: "Confirmed" },
  { value: "dispatched", label: "Dispatched" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_OPTIONS = [
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "partial", label: "Partial" },
  { value: "overdue", label: "Overdue" },
  { value: "awaiting payment", label: "Awaiting Payment" },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(pounds: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pounds);
}

interface OrdersPageProps {
  roasterId: string;
  isPartner: boolean;
}

export function OrdersPage({ roasterId, isPartner }: OrdersPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [allOrders, setAllOrders] = useState<RoasterOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activeTab, setActiveTab] = useState<TabValue>(
    (searchParams.get("tab") as TabValue) || "all"
  );

  const filterValues: Record<string, string> = {
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "",
    paymentStatus: searchParams.get("paymentStatus") || "",
  };

  const tabs: { label: string; value: TabValue }[] = [
    { label: "All", value: "all" },
    ...(isPartner ? [{ label: "Ghost Roastery", value: "ghost" as TabValue }] : []),
    { label: "Retail", value: "storefront" as TabValue },
    { label: "Wholesale", value: "wholesale" },
  ];

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v);
        else params.delete(k);
      });
      router.replace(`/orders?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set("tab", activeTab);
      if (filterValues.search) params.set("search", filterValues.search);
      if (filterValues.status) params.set("status", filterValues.status);

      try {
        const res = await fetch(`/api/orders/all?${params.toString()}`);
        const data = await res.json();
        setAllOrders(data.data || []);
        setPage(1);
      } catch {
        console.error("Failed to fetch orders");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchParams.toString()]);

  // Client-side pagination
  const orders = allOrders.slice((page - 1) * pageSize, page * pageSize);

  // Summary stats from loaded data
  const totalOrders = allOrders.length;
  const openOrders = allOrders.filter(
    (o) => !["delivered", "Delivered", "cancelled", "Cancelled"].includes(o.status)
  ).length;
  const now = new Date();
  const thisMonthRevenue = allOrders
    .filter((o) => {
      const d = new Date(o.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, o) => sum + o.total, 0);

  const statusOptions =
    activeTab === "ghost"
      ? GHOST_STATUS_OPTIONS
      : activeTab === "storefront" || activeTab === "wholesale"
        ? WHOLESALE_STATUS_OPTIONS
        : [...GHOST_STATUS_OPTIONS, { value: "confirmed", label: "Confirmed" }, { value: "paid", label: "Paid" }];

  const filters: FilterConfig[] = [
    { key: "search", label: "Search orders...", type: "search" },
    { key: "status", label: "Status", type: "select", options: statusOptions },
    { key: "paymentStatus", label: "Payment", type: "select", options: PAYMENT_OPTIONS },
  ];

  const columns: Column<RoasterOrder>[] = [
    {
      key: "orderNumber",
      label: "Order",
      render: (row) => (
        <span className="text-sm font-mono font-medium text-slate-900">
          {row.orderNumber}
        </span>
      ),
    },
    {
      key: "orderType" as const,
      label: "Type",
      render: (row: RoasterOrder) => <StatusBadge status={row.orderType} type="orderType" />,
    },
    {
      key: "customerName",
      label: "Customer",
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-slate-900">{row.customerName || "\u2014"}</p>
          {row.customerBusiness && (
            <p className="text-xs text-slate-500">{row.customerBusiness}</p>
          )}
        </div>
      ),
    },
    {
      key: "itemSummary",
      label: "Items",
      hiddenOnMobile: true,
      render: (row) => <span className="text-sm text-slate-600">{row.itemSummary}</span>,
    },
    {
      key: "total",
      label: "Total",
      render: (row) => (
        <div>
          <span className="text-sm font-medium text-slate-900">{formatPrice(row.total)}</span>
          {row.orderType === "ghost" && (
            <p className="text-xs text-slate-400">Your payout</p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
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
      hiddenOnMobile: true,
      render: (row) => <span className="text-sm text-slate-500">{formatDate(row.date)}</span>,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-500 mt-1">
            Manage orders across all your channels.
          </p>
        </div>
        <button
          onClick={() => router.push("/orders/new")}
          className="flex items-center gap-2 bg-brand-600 text-white hover:bg-brand-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Order
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900">{totalOrders}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total Orders</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-50 text-orange-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900">{openOrders}</p>
          <p className="text-xs text-slate-500 mt-0.5">Open Orders</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-50 text-green-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900">{formatPrice(thisMonthRevenue)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Revenue This Month</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setActiveTab(tab.value);
              updateParams({ tab: tab.value, status: "", paymentStatus: "" });
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-brand-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4">
        <FilterBar
          filters={filters}
          values={filterValues}
          onChange={(key, value) => updateParams({ [key]: value })}
          onClear={() => updateParams({ search: "", status: "", paymentStatus: "" })}
        />
      </div>

      {/* Table */}
      {!isLoading && allOrders.length === 0 && !Object.values(filterValues).some((v) => v) ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">
            No orders yet — orders will appear here when customers place them.
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={orders}
          isLoading={isLoading}
          onRowClick={(row) => router.push(`/orders/${row.id}?type=${row.orderType}`)}
          emptyMessage="No orders match your filters"
        />
      )}

      {/* Pagination */}
      {allOrders.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={allOrders.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
