"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, ExternalLink } from "@/components/icons";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import type {
  PayoutBatch,
  PartnerOutstanding,
} from "@/types/finance";

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

export function PayoutsTab() {
  const [outstanding, setOutstanding] = useState<PartnerOutstanding[]>([]);
  const [batches, setBatches] = useState<PayoutBatch[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [outRes, batchRes] = await Promise.all([
        fetch("/api/admin/finance/payouts/outstanding"),
        fetch(
          `/api/admin/finance/payouts/batches?page=${page}&pageSize=${pageSize}`
        ),
      ]);
      const outData = await outRes.json();
      const batchData = await batchRes.json();
      setOutstanding(outData.data || []);
      setBatches(batchData.data || []);
      setTotal(batchData.total || 0);
    } catch (error) {
      console.error("Failed to load payouts:", error);
    }
    setLoading(false);
  }, [page, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleGenerateBatch() {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/finance/payouts/generate-batch", {
        method: "POST",
      });
      if (res.ok) {
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to generate batch.");
      }
    } catch (error) {
      console.error("Failed to generate batch:", error);
    }
    setGenerating(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  const totalOutstanding = outstanding.reduce(
    (sum, p) => sum + p.total_amount,
    0
  );

  return (
    <div className="space-y-6">
      {/* Outstanding payouts */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Outstanding Payouts
            </h3>
            {totalOutstanding > 0 && (
              <p className="text-xs text-slate-500 mt-0.5">
                {`${formatCurrency(totalOutstanding)} across ${outstanding.length} partner${outstanding.length === 1 ? "" : "s"}`}
              </p>
            )}
          </div>
          {outstanding.length > 0 && (
            <button
              onClick={handleGenerateBatch}
              disabled={generating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {generating ? "Generating..." : "Generate Batch"}
            </button>
          )}
        </div>
        {outstanding.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">
              No outstanding payouts. All partners are paid up.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                    Partner
                  </th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                    Orders
                  </th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                    Amount
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden sm:table-cell">
                    Payment
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outstanding.map((p) => (
                  <tr key={p.roaster_id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm font-medium text-slate-900">
                      {p.roaster_name}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-700 text-right">
                      {p.order_count}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-slate-900 text-right">
                      {formatCurrency(p.total_amount)}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-500 hidden sm:table-cell">
                      {p.has_stripe_account
                        ? "Stripe Transfer"
                        : "Bank Transfer"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Batches list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">
            Payout Batches
          </h3>
        </div>
        {batches.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">
              No payout batches yet. Generate one from outstanding payouts above.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      Batch
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      Status
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden sm:table-cell">
                      Partners
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden sm:table-cell">
                      Orders
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      Total
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      Date
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 text-sm font-mono font-medium text-slate-900">
                        {batch.batch_number}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge
                          status={batch.status}
                          type="payoutBatch"
                        />
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-700 text-right hidden sm:table-cell">
                        {batch.partner_count}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-700 text-right hidden sm:table-cell">
                        {batch.total_orders}
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-slate-900 text-right">
                        {formatCurrency(batch.total_amount)}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-700">
                        {formatDate(batch.created_at)}
                      </td>
                      <td className="px-6 py-3">
                        <a
                          href={`/admin/finance/payouts/${batch.id}`}
                          className="text-brand-600 hover:text-brand-700 text-sm font-medium inline-flex items-center gap-1"
                        >
                          View
                          <ExternalLink className="w-3 h-3" />
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
