"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

interface CancellationDialogProps {
  orderNumber: string;
  onConfirm: (data: { reason: string; reasonCategory: string }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const REASON_CATEGORIES = [
  { value: "changed_mind", label: "Changed my mind" },
  { value: "ordered_by_mistake", label: "Ordered by mistake" },
  { value: "taking_too_long", label: "Taking too long" },
  { value: "found_elsewhere", label: "Found elsewhere" },
  { value: "quality_concerns", label: "Quality concerns" },
  { value: "other", label: "Other" },
];

export function CancellationDialog({
  orderNumber,
  onConfirm,
  onCancel,
  isLoading,
}: CancellationDialogProps) {
  const [reasonCategory, setReasonCategory] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    if (!reasonCategory) {
      setError("Please select a reason.");
      return;
    }
    if (reasonCategory === "other" && !reason.trim()) {
      setError("Please provide a reason.");
      return;
    }
    setError("");
    const reasonText = reason.trim()
      ? reason.trim()
      : REASON_CATEGORIES.find((c) => c.value === reasonCategory)?.label || reasonCategory;
    onConfirm({ reason: reasonText, reasonCategory });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">
          {`Cancel Order #${orderNumber}?`}
        </h3>

        <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mt-3 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">This cannot be undone.</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 font-medium">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={reasonCategory}
              onChange={(e) => {
                setReasonCategory(e.target.value);
                setError("");
              }}
              className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select a reason...</option>
              {REASON_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-500 font-medium">
              {`Additional details${reasonCategory === "other" ? " *" : " (optional)"}`}
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
              placeholder="Tell us more..."
              rows={3}
              className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
          >
            Keep order
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Cancelling...
              </>
            ) : (
              "Cancel this order"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
