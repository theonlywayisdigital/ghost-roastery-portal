"use client";

import { useState } from "react";
import { RotateCcw, AlertTriangle, Loader2 } from "@/components/icons";

interface RefundModalProps {
  orderId: string;
  orderType: string;
  orderTotal: number;
  existingRefundTotal: number;
  hasStripePayment: boolean;
  onClose: () => void;
  onRefunded: () => void;
}

const REASON_CATEGORIES = [
  { value: "customer_request", label: "Customer Request" },
  { value: "order_error", label: "Order Error" },
  { value: "quality_issue", label: "Quality Issue" },
  { value: "delivery_issue", label: "Delivery Issue" },
  { value: "duplicate_order", label: "Duplicate Order" },
  { value: "other", label: "Other" },
];

function formatCurrency(amount: number) {
  return `£${amount.toFixed(2)}`;
}

export function RefundModal({
  orderId,
  orderType,
  orderTotal,
  existingRefundTotal,
  hasStripePayment,
  onClose,
  onRefunded,
}: RefundModalProps) {
  const remaining = orderTotal - existingRefundTotal;

  const [refundType, setRefundType] = useState<"full" | "partial" | "store_credit">(
    remaining === orderTotal ? "full" : "partial"
  );
  const [amount, setAmount] = useState(remaining);
  const [reasonCategory, setReasonCategory] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleRefundTypeChange(type: "full" | "partial" | "store_credit") {
    setRefundType(type);
    if (type === "full") {
      setAmount(remaining);
    }
  }

  async function handleSubmit() {
    if (!reason.trim()) {
      setError("Reason is required.");
      return;
    }
    if (amount <= 0 || amount > remaining + 0.01) {
      setError(`Amount must be between £0.01 and ${formatCurrency(remaining)}.`);
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType,
          refundType,
          amount: parseFloat(amount.toFixed(2)),
          reason: reason.trim(),
          reasonCategory: reasonCategory || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to process refund.");
        setIsSubmitting(false);
        return;
      }

      onRefunded();
    } catch {
      setError("Network error. Please try again.");
      setIsSubmitting(false);
    }
  }

  const isStripeRefund = refundType !== "store_credit";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Issue Refund</h3>
        <p className="text-sm text-slate-500 mb-4">
          {`Order total: ${formatCurrency(orderTotal)}`}
          {existingRefundTotal > 0 && (
            <span className="text-orange-600">{` · Already refunded: ${formatCurrency(existingRefundTotal)}`}</span>
          )}
          {` · Remaining: ${formatCurrency(remaining)}`}
        </p>

        <div className="space-y-4">
          {/* Refund type */}
          <div>
            <label className="text-xs text-slate-500 font-medium">Refund Type</label>
            <div className="flex gap-2 mt-1.5">
              {(
                [
                  { value: "full", label: "Full Refund", disabled: existingRefundTotal > 0 },
                  { value: "partial", label: "Partial Refund", disabled: false },
                  { value: "store_credit", label: "Store Credit", disabled: false },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => !opt.disabled && handleRefundTypeChange(opt.value)}
                  disabled={opt.disabled}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    refundType === opt.value
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : opt.disabled
                      ? "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs text-slate-500 font-medium">Amount</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">£</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={remaining}
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                disabled={refundType === "full"}
                className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          {/* Reason category */}
          <div>
            <label className="text-xs text-slate-500 font-medium">Reason Category</label>
            <select
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select category</option>
              {REASON_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs text-slate-500 font-medium">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why this refund is being issued..."
              rows={3}
              className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-slate-500 font-medium">Internal Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any internal notes about this refund..."
              rows={2}
              className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {/* Warning */}
          {isStripeRefund && hasStripePayment && (
            <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                {`This will refund ${formatCurrency(amount)} to the customer's original payment method via Stripe. This cannot be undone.`}
              </p>
            </div>
          )}

          {isStripeRefund && !hasStripePayment && (
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">
                No Stripe payment found for this order. Use Store Credit instead.
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (isStripeRefund && !hasStripePayment)}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processing...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                {`Process Refund of ${formatCurrency(amount)}`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
