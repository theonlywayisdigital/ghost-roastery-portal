"use client";

import { AlertTriangle } from "@/components/icons";
import Link from "next/link";

export function PastDueBanner() {
  return (
    <div className="bg-red-600 text-white px-4 py-3">
      <div className="flex items-center justify-center gap-3 max-w-5xl mx-auto">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm font-medium">
          Your subscription payment failed. Update your payment method to avoid losing access.
        </p>
        <Link
          href="/settings/billing?tab=subscription"
          className="text-sm font-semibold underline underline-offset-2 hover:no-underline flex-shrink-0"
        >
          Update now
        </Link>
      </div>
    </div>
  );
}
