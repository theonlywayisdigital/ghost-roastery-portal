"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Play,
  Trash2,
  Ban,
} from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { PayoutBatchDetail as BatchDetailType, PayoutItem } from "@/types/finance";

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

export function PayoutBatchDetail({ batchId }: { batchId: string }) {
  const router = useRouter();
  const [batch, setBatch] = useState<BatchDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const loadBatch = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/finance/payouts/batches/${batchId}`);
      if (!res.ok) {
        setBatch(null);
        return;
      }
      const data = await res.json();
      setBatch(data);
    } catch {
      setBatch(null);
    }
    setLoading(false);
  }, [batchId]);

  useEffect(() => {
    loadBatch();
  }, [loadBatch]);

  async function handleAction(action: string) {
    setActing(action);
    try {
      let res: Response;
      if (action === "approve") {
        res = await fetch(
          `/api/admin/finance/payouts/batches/${batchId}/approve`,
          { method: "PUT" }
        );
      } else if (action === "process") {
        res = await fetch(
          `/api/admin/finance/payouts/batches/${batchId}/process`,
          { method: "POST" }
        );
      } else if (action === "delete") {
        if (!confirm("Cancel this batch and return all orders to unpaid?"))  {
          setActing(null);
          return;
        }
        res = await fetch(
          `/api/admin/finance/payouts/batches/${batchId}`,
          { method: "DELETE" }
        );
        if (res.ok) {
          router.push("/admin/finance");
          return;
        }
      } else {
        setActing(null);
        return;
      }

      if (res!.ok) {
        await loadBatch();
      } else {
        const err = await res!.json();
        alert(err.error || "Action failed.");
      }
    } catch (error) {
      console.error("Action failed:", error);
    }
    setActing(null);
  }

  async function handleMarkPaid(itemId: string) {
    setActing(`mark-${itemId}`);
    try {
      const res = await fetch(
        `/api/admin/finance/payouts/items/${itemId}/mark-paid`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: "Manually marked as paid" }),
        }
      );
      if (res.ok) {
        await loadBatch();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to mark as paid.");
      }
    } catch (error) {
      console.error("Mark paid failed:", error);
    }
    setActing(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-slate-500">Batch not found.</p>
        <button
          onClick={() => router.push("/admin/finance")}
          className="mt-4 text-brand-600 text-sm font-medium hover:text-brand-700"
        >
          Back to Finance
        </button>
      </div>
    );
  }

  // Group items by roaster
  const grouped = (batch.items || []).reduce(
    (acc, item) => {
      const key = item.roaster_id;
      if (!acc[key]) {
        acc[key] = {
          roaster_name: item.roaster_name || "Unknown",
          items: [],
          total: 0,
        };
      }
      acc[key].items.push(item);
      acc[key].total += item.amount;
      return acc;
    },
    {} as Record<
      string,
      { roaster_name: string; items: PayoutItem[]; total: number }
    >
  );

  const canApprove =
    batch.status === "draft" || batch.status === "reviewing";
  const canProcess = batch.status === "approved";
  const canDelete = batch.status === "draft";

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/admin/finance")}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Finance
        </button>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">
                {batch.batch_number}
              </h1>
              <StatusBadge status={batch.status} type="payoutBatch" />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {`${batch.partner_count} partner${batch.partner_count === 1 ? "" : "s"} · ${batch.total_orders} orders · ${formatCurrency(batch.total_amount)}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canApprove && (
              <button
                onClick={() => handleAction("approve")}
                disabled={acting !== null}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {acting === "approve" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Approve
              </button>
            )}
            {canProcess && (
              <button
                onClick={() => handleAction("process")}
                disabled={acting !== null}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {acting === "process" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Process Payments
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => handleAction("delete")}
                disabled={acting !== null}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Cancel Batch
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Per-partner breakdown */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([roasterId, group]) => (
          <div
            key={roasterId}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {group.roaster_name}
                </h3>
                <p className="text-xs text-slate-500">
                  {`${group.items.length} order${group.items.length === 1 ? "" : "s"} · ${formatCurrency(group.total)}`}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-2">
                      Order
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-2">
                      Amount
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-2">
                      Method
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-2">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-2">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {group.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 text-sm font-mono text-slate-700">
                        {item.order_number || item.order_id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-slate-900 text-right">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-500">
                        {item.payment_method === "stripe_transfer"
                          ? "Stripe"
                          : "Bank Transfer"}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge
                          status={item.status}
                          type="payoutItem"
                        />
                      </td>
                      <td className="px-6 py-3">
                        {item.status !== "paid" &&
                          item.payment_method === "bank_transfer" &&
                          (batch.status === "approved" ||
                            batch.status === "partially_completed" ||
                            batch.status === "processing") && (
                            <button
                              onClick={() => handleMarkPaid(item.id)}
                              disabled={acting === `mark-${item.id}`}
                              className="text-xs text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              {acting === `mark-${item.id}` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              Mark Paid
                            </button>
                          )}
                        {item.stripe_transfer_id && (
                          <span className="text-xs text-slate-400 font-mono">
                            {item.stripe_transfer_id}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
