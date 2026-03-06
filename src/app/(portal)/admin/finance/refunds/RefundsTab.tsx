"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Download } from "@/components/icons";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import type { Refund, RefundSummary } from "@/types/finance";

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

const ORDER_TYPE_MAP: Record<string, string> = {
  ghost_roastery: "ghost",
  storefront: "storefront",
  wholesale: "wholesale",
};

export function RefundsTab() {
  const router = useRouter();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [summary, setSummary] = useState<RefundSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);

  // Filters
  const [status, setStatus] = useState("");
  const [orderType, setOrderType] = useState("");
  const [reasonCategory, setReasonCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (status) params.set("status", status);
      if (orderType) params.set("orderType", orderType);
      if (reasonCategory) params.set("reasonCategory", reasonCategory);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/admin/finance/refunds?${params}`);
      const data = await res.json();
      setRefunds(data.data || []);
      setTotal(data.total || 0);
      setSummary(data.summary || null);
    } catch (error) {
      console.error("Failed to load refunds:", error);
    }
    setLoading(false);
  }, [page, pageSize, status, orderType, reasonCategory, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleExportCSV() {
    const headers = ["Date", "Order #", "Order Type", "Customer", "Amount", "Type", "Reason Category", "Reason", "Status", "Stripe ID"];
    const rows = refunds.map((r) => [
      r.created_at,
      r.order_number || "",
      r.order_type,
      r.customer_name || "",
      r.amount,
      r.refund_type,
      r.reason_category || "",
      r.reason.replace(/,/g, ";"),
      r.status,
      r.stripe_refund_id || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `refunds-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const summaryCards = summary
    ? [
        { label: "Refunded This Month", value: formatCurrency(summary.totalRefundedThisMonth) },
        { label: "Refunded All Time", value: formatCurrency(summary.totalRefundedAllTime) },
        { label: "Refunds This Month", value: String(summary.refundCountThisMonth) },
        { label: "Average Refund", value: formatCurrency(summary.averageRefundAmount) },
      ]
    : [];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xl font-bold text-slate-900">{card.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={orderType}
          onChange={(e) => { setOrderType(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
        >
          <option value="">All order types</option>
          <option value="ghost_roastery">Ghost Roastery</option>
          <option value="storefront">Storefront</option>
          <option value="wholesale">Wholesale</option>
        </select>
        <select
          value={reasonCategory}
          onChange={(e) => { setReasonCategory(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
        >
          <option value="">All reasons</option>
          <option value="customer_request">Customer Request</option>
          <option value="order_error">Order Error</option>
          <option value="quality_issue">Quality Issue</option>
          <option value="delivery_issue">Delivery Issue</option>
          <option value="duplicate_order">Duplicate Order</option>
          <option value="other">Other</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
        />
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors ml-auto"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : refunds.length === 0 ? (
          <div className="text-center py-16">
            <RotateCcw className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No refunds found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Order #</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Order Type</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden sm:table-cell">Customer</th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Amount</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Refund Type</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">Reason</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden lg:table-cell">Stripe ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {refunds.map((refund) => (
                    <tr
                      key={refund.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/admin/orders/${refund.order_id}?type=${ORDER_TYPE_MAP[refund.order_type] || refund.order_type}`
                        )
                      }
                    >
                      <td className="px-6 py-3 text-sm text-slate-700">{formatDate(refund.created_at)}</td>
                      <td className="px-6 py-3 text-sm font-medium text-slate-900">{refund.order_number || "—"}</td>
                      <td className="px-6 py-3">
                        <StatusBadge status={ORDER_TYPE_MAP[refund.order_type] || refund.order_type} type="orderType" />
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-700 hidden sm:table-cell">{refund.customer_name || "—"}</td>
                      <td className="px-6 py-3 text-sm font-medium text-slate-900 text-right">{formatCurrency(refund.amount)}</td>
                      <td className="px-6 py-3">
                        <StatusBadge status={refund.refund_type} type="refundType" />
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600 hidden md:table-cell max-w-[200px] truncate">
                        {refund.reason}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge status={refund.status} type="refundStatus" />
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-400 hidden lg:table-cell font-mono">
                        {refund.stripe_refund_id || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-slate-100">
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
