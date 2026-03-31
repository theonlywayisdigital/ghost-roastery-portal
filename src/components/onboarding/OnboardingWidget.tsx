"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { X, Sparkles } from "@/components/icons";
import type { OnboardingResponse } from "@/lib/onboarding";

interface OnboardingWidgetProps {
  salesTier: string;
  marketingTier: string;
  onOpenPanel: () => void;
  onDismissed?: () => void;
  children?: ReactNode;
}

function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const size = 36;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? completed / total : 0;
  const offset = circumference - progress * circumference;

  return (
    <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-brand-200"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-brand-600 transition-all duration-500"
      />
    </svg>
  );
}

export function OnboardingWidget({
  salesTier,
  marketingTier,
  onOpenPanel,
  onDismissed,
  children,
}: OnboardingWidgetProps) {
  const pathname = usePathname();
  const [data, setData] = useState<OnboardingResponse | null>(null);
  const [hidden, setHidden] = useState(false);

  const fetchOnboarding = useCallback(async () => {
    try {
      const res = await fetch("/api/onboarding");
      if (res.ok) {
        const json: OnboardingResponse = await res.json();
        setData(json);
      }
    } catch {
      // silent
    }
  }, []);

  // Fetch on mount + pathname changes
  useEffect(() => {
    fetchOnboarding();
  }, [pathname, fetchOnboarding]);

  async function handleDismiss() {
    try {
      await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissed: true }),
      });
      setHidden(true);
      onDismissed?.();
    } catch {
      // silent
    }
  }

  // Show upgrade CTA fallback if: dismissed, manually hidden, all complete, or still loading
  if (!data || data.dismissed || hidden || data.completedCount === data.totalCount) {
    return <>{children}</>;
  }

  return (
    <div className="px-3 pb-2">
      <div className="relative p-3 bg-gradient-to-br from-brand-50 to-brand-100 rounded-lg border border-brand-200">
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-0.5 rounded hover:bg-brand-200/50 text-brand-400 hover:text-brand-600 transition-colors"
          aria-label="Dismiss setup guide"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <ProgressRing completed={data.completedCount} total={data.totalCount} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-brand-900">
              {data.completedCount}/{data.totalCount} complete
            </p>
            <p className="text-xs text-brand-700">Finish setting up your account</p>
          </div>
        </div>

        <button
          onClick={onOpenPanel}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-md transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Continue setup
        </button>
      </div>
    </div>
  );
}
