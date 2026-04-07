"use client";

import { Clock } from "@/components/icons";
import Link from "next/link";

export function TrialBanner({ trialEndsAt }: { trialEndsAt: string | null }) {
  if (!trialEndsAt) return null;

  const now = new Date();
  const end = new Date(trialEndsAt);
  const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const isUrgent = daysRemaining <= 3;

  return (
    <div className={`${isUrgent ? "bg-red-600" : "bg-amber-500"} text-white px-4 py-3`}>
      <div className="flex items-center justify-center gap-3 max-w-5xl mx-auto">
        <Clock className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm font-medium">
          {daysRemaining === 0
            ? "Your free trial ends today."
            : `You're on a free trial — ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining.`}
        </p>
        <Link
          href="/settings/billing?tab=subscription"
          className="text-sm font-semibold underline underline-offset-2 hover:no-underline flex-shrink-0"
        >
          Choose a plan
        </Link>
      </div>
    </div>
  );
}
