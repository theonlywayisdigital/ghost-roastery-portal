"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, FileText, Eye } from "@/components/icons";
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

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceFull[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/invoices?${params}`);
      const data = await res.json();
      setError(null);
      setInvoices(data.data || []);
      setTotal(data.total || 0);
    } catch {
      setError("Failed to load invoices");
    }
    setLoading(false);
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    fetch("/api/invoices/check-overdue").catch(() => {});
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage invoices for your wholesale customers.
        </p>
      </div>

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
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
        <a
          href="/invoices/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </a>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No invoices yet.</p>
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
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      Status
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      Total
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden sm:table-cell">
                      Due
                    </th>
                    <th className="px-6 py-3">
                      <span className="sr-only">View</span>
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
                      <td className="px-6 py-3">
                        <StatusBadge status={inv.status} type="invoiceStatus" />
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
                          href={`/invoices/${inv.id}`}
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
