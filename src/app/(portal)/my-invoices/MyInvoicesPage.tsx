"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, FileText, ExternalLink } from "lucide-react";
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

export function MyInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceFull[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/my-invoices?page=${page}&pageSize=${pageSize}`
      );
      const data = await res.json();
      setInvoices(data.data || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to load invoices:", error);
    }
    setLoading(false);
  }, [page, pageSize]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Invoices</h1>
        <p className="text-sm text-slate-500 mt-1">
          View invoices issued to you by your suppliers.
        </p>
      </div>

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
                      From
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
                        {inv.roaster_name || "Ghost Roastery"}
                      </td>
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
                        {inv.invoice_access_token ? (
                          <a
                            href={`/invoice/${inv.invoice_access_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-600 hover:text-brand-700 text-sm font-medium inline-flex items-center gap-1"
                          >
                            View
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <a
                            href={`/my-invoices/${inv.id}`}
                            className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                          >
                            View
                          </a>
                        )}
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
