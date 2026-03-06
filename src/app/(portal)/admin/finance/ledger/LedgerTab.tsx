"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Download, ScrollText } from "@/components/icons";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import type { LedgerEntry } from "@/types/finance";

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

const ORDER_TYPE_LABELS: Record<string, string> = {
  ghost_roastery: "Ghost Roastery",
  storefront: "Storefront",
  wholesale: "Wholesale",
  retail_stripe: "Retail (Stripe)",
  wholesale_stripe: "Wholesale (Stripe)",
  wholesale_invoice_online: "Wholesale (Invoice)",
  wholesale_invoice_offline: "Wholesale (Offline)",
};

export function LedgerTab() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [orderType, setOrderType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (orderType) params.set("orderType", orderType);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/admin/finance/ledger?${params}`);
      const data = await res.json();
      setEntries(data.data || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to load ledger:", error);
    }
    setLoading(false);
  }, [page, pageSize, orderType, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleExportCSV() {
    const headers = [
      "Date",
      "Type",
      "Roaster",
      "Gross",
      "Fee %",
      "Fee",
      "Net to Roaster",
      "Status",
    ];
    const rows = entries.map((e) => [
      e.created_at,
      ORDER_TYPE_LABELS[e.order_type] || e.order_type,
      e.roaster_name || "",
      e.gross_amount,
      e.fee_percent ?? "",
      e.fee_amount,
      e.net_to_roaster ?? "",
      e.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledger-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={orderType}
          onChange={(e) => {
            setOrderType(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
        >
          <option value="">All types</option>
          <option value="ghost_roastery">Ghost Roastery</option>
          <option value="storefront">Storefront</option>
          <option value="wholesale_stripe">Wholesale (Stripe)</option>
          <option value="wholesale_invoice_online">
            Wholesale (Invoice)
          </option>
          <option value="wholesale_invoice_offline">
            Wholesale (Offline)
          </option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
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
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <ScrollText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              No ledger entries found.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      Date
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      Type
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden sm:table-cell">
                      Roaster
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      Gross
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden sm:table-cell">
                      Fee %
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      Fee
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                      Net
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 text-sm text-slate-700">
                        {formatDate(entry.created_at)}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-700">
                        {ORDER_TYPE_LABELS[entry.order_type] ||
                          entry.order_type}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-700 hidden sm:table-cell">
                        {entry.roaster_name || "—"}
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-slate-900 text-right">
                        {formatCurrency(entry.gross_amount)}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-500 text-right hidden sm:table-cell">
                        {entry.fee_percent != null
                          ? `${entry.fee_percent}%`
                          : "—"}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-900 text-right">
                        {formatCurrency(entry.fee_amount)}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-700 text-right hidden md:table-cell">
                        {entry.net_to_roaster != null
                          ? formatCurrency(entry.net_to_roaster)
                          : "—"}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge status={entry.status} type="payment" />
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
