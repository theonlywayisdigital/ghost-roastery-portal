"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, FileText, Eye } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import type { InvoiceFull } from "@/types/finance";

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

type SubTab = "ghost_roastery" | "platform";

export function InvoicesTab() {
  const [subTab, setSubTab] = useState<SubTab>("ghost_roastery");
  const [invoices, setInvoices] = useState<InvoiceFull[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (subTab === "ghost_roastery") {
        params.set("owner_type", "ghost_roastery");
      }
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/invoices?${params}`);
      const data = await res.json();
      setInvoices(data.data || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to load invoices:", error);
    }
    setLoading(false);
  }, [page, pageSize, subTab, search, statusFilter]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Check for overdue invoices on mount
  useEffect(() => {
    fetch("/api/invoices/check-overdue").catch(() => {});
  }, []);

  // Quick stats
  const stats = {
    total: total,
    unpaid: invoices.filter(
      (i) =>
        i.status === "sent" || i.status === "viewed" || i.status === "overdue"
    ).length,
    overdue: invoices.filter((i) => i.status === "overdue").length,
    paid: invoices.filter((i) => i.status === "paid").length,
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => {
              setSubTab("ghost_roastery");
              setPage(1);
            }}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              subTab === "ghost_roastery"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Ghost Roastery
          </button>
          <button
            onClick={() => {
              setSubTab("platform");
              setPage(1);
            }}
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

      {/* Quick stats */}
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

      {/* Filters + Create */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="void">Void</option>
        </select>
        {subTab === "ghost_roastery" && (
          <a
            href="/admin/finance/invoices/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </a>
        )}
      </div>

      {/* Invoice table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No invoices found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      Invoice
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden sm:table-cell">
                      Customer
                    </th>
                    {subTab === "platform" && (
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                        Issuer
                      </th>
                    )}
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      Status
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      Total
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden sm:table-cell">
                      Due
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3">
                        <p className="text-sm font-mono font-medium text-slate-900">
                          {inv.invoice_number}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(inv.created_at)}
                        </p>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-700 hidden sm:table-cell">
                        {inv.customer_name ||
                          inv.business_name ||
                          inv.customer_email ||
                          "—"}
                      </td>
                      {subTab === "platform" && (
                        <td className="px-6 py-3 text-sm text-slate-700 hidden md:table-cell">
                          {inv.roaster_name || "Ghost Roastery"}
                        </td>
                      )}
                      <td className="px-6 py-3">
                        <StatusBadge
                          status={inv.status}
                          type="invoiceStatus"
                        />
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-slate-900 text-right">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-700 hidden sm:table-cell">
                        {inv.payment_due_date
                          ? formatDate(inv.payment_due_date)
                          : "—"}
                      </td>
                      <td className="px-6 py-3">
                        <a
                          href={`/admin/finance/invoices/${inv.id}`}
                          className="text-brand-600 hover:text-brand-700 text-sm font-medium inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </a>
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
