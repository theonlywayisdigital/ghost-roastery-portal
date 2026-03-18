"use client";

import { Check, XCircle } from "@/components/icons";
import { formatDate, formatDateTime } from "./format";

interface StepDef {
  key: string;
  label: string;
}

interface FulfilmentStepperProps {
  steps: StepDef[];
  currentStatus: string;
  isCancelled: boolean;
  timestamps: Record<string, string | undefined>;
  cancellationReason?: string | null;
}

// Map statuses that aren't explicit steps to their nearest step equivalent
const STATUS_ALIASES: Record<string, string> = {
  paid: "pending",        // paid by Stripe but not yet confirmed — show as pending
  processing: "confirmed", // legacy status — treat as confirmed
};

export function FulfilmentStepper({ steps, currentStatus, isCancelled, timestamps, cancellationReason }: FulfilmentStepperProps) {
  const effectiveStatus = STATUS_ALIASES[currentStatus] || currentStatus;
  const currentIdx = steps.findIndex((s) => s.key === effectiveStatus);

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-50 text-red-600">
          <XCircle className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-red-600">Order Cancelled</p>
          {cancellationReason && (
            <p className="text-xs text-slate-500 mt-0.5">{cancellationReason}</p>
          )}
          <p className="text-xs text-slate-400">{formatDateTime(timestamps[currentStatus] || new Date().toISOString())}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const isCompleted = i < currentIdx;
        const isCurrent = i === currentIdx;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${
                  isCompleted
                    ? "bg-green-100 text-green-700"
                    : isCurrent
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <p className={`text-xs mt-1.5 text-center whitespace-nowrap ${
                isCurrent ? "font-medium text-slate-900" : isCompleted ? "text-slate-600" : "text-slate-400"
              }`}>
                {step.label}
              </p>
              {timestamps[step.key] && (isCompleted || isCurrent) && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {formatDate(timestamps[step.key]!)}
                </p>
              )}
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mt-[-20px] ${
                isCompleted ? "bg-green-300" : "bg-slate-200"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export const WHOLESALE_STEPS: StepDef[] = [
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "dispatched", label: "Dispatched" },
  { key: "delivered", label: "Delivered" },
];

export const GHOST_STEPS: StepDef[] = [
  { key: "Pending", label: "Received" },
  { key: "In Production", label: "Roasting" },
  { key: "Dispatched", label: "Shipped" },
  { key: "Delivered", label: "Delivered" },
];

export const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  paid: ["confirmed", "cancelled"],
  confirmed: ["dispatched", "cancelled"],
  processing: ["dispatched", "cancelled"],  // legacy — treat same as confirmed
  dispatched: ["delivered"],
};
