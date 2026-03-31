"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  X,
  Check,
  Lock,
  ChevronRight,
  Palette,
  Package,
  Globe,
  CreditCard,
  Store,
  Link2,
  Archive,
  Users,
  Send,
} from "@/components/icons";
import type { OnboardingResponse, OnboardingStepStatus } from "@/lib/onboarding";
import { TIER_NAMES, type TierLevel } from "@/lib/tier-config";

interface OnboardingPanelProps {
  open: boolean;
  onClose: () => void;
  salesTier: string;
  marketingTier: string;
}

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Palette,
  Package,
  Globe,
  CreditCard,
  Store,
  Link2,
  Archive,
  Users,
  Send,
};

export function OnboardingPanel({ open, onClose, salesTier, marketingTier }: OnboardingPanelProps) {
  const router = useRouter();
  const [data, setData] = useState<OnboardingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding");
      if (res.ok) {
        const json: OnboardingResponse = await res.json();
        setData(json);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when panel opens
  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  async function handleDismiss() {
    try {
      await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissed: true }),
      });
      onClose();
    } catch {
      // silent
    }
  }

  function handleStepClick(step: OnboardingStepStatus) {
    if (step.gated) {
      router.push("/settings/billing?tab=subscription");
    } else if (!step.completed) {
      router.push(step.href);
    }
    onClose();
  }

  if (!mounted || !open) return null;

  const completedCount = data?.completedCount ?? 0;
  const totalCount = data?.totalCount ?? 8;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[420px] bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Getting Started</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {completedCount}/{totalCount} steps complete
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4 pb-2">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Step list */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {loading && !data ? (
            <div className="py-12 text-center">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <div className="space-y-1">
              {(data?.steps ?? []).map((step) => {
                const Icon = STEP_ICONS[step.iconName] || Package;
                const isGated = !!step.gated;
                const isComplete = step.completed;

                return (
                  <button
                    key={step.key}
                    onClick={() => handleStepClick(step)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                      isComplete
                        ? "bg-green-50/50 hover:bg-green-50"
                        : isGated
                          ? "hover:bg-slate-50"
                          : "hover:bg-brand-50/50"
                    }`}
                  >
                    {/* Status icon */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isComplete
                          ? "bg-green-100 text-green-600"
                          : isGated
                            ? "bg-slate-100 text-slate-400"
                            : "bg-brand-50 text-brand-600"
                      }`}
                    >
                      {isComplete ? (
                        <Check className="w-4 h-4" />
                      ) : isGated ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          isComplete
                            ? "text-slate-500 line-through"
                            : isGated
                              ? "text-slate-400"
                              : "text-slate-900"
                        }`}
                      >
                        {step.label}
                      </p>
                      {isGated && step.gated ? (
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Requires {TIER_NAMES[step.gated.requiredTier]}{" "}
                          {step.gated.product === "marketing" ? "Marketing" : "Sales"}
                        </p>
                      ) : !isComplete ? (
                        <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                      ) : null}
                    </div>

                    {/* Right arrow / check */}
                    {isComplete ? (
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200">
          <button
            onClick={handleDismiss}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Dismiss checklist
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
