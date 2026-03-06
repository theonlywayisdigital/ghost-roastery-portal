"use client";

import { AlertTriangle, Lock } from "@/components/icons";
import Link from "next/link";
import type { TierLevel, ProductType } from "@/lib/tier-config";
import { TIER_NAMES } from "@/lib/tier-config";

interface UpgradeBannerProps {
  type: "warning" | "blocked";
  message: string;
  upgradeTier?: TierLevel;
  productType?: ProductType;
}

export function UpgradeBanner({ type, message, upgradeTier, productType }: UpgradeBannerProps) {
  const isBlocked = type === "blocked";
  const borderColor = isBlocked ? "border-red-200" : "border-amber-200";
  const bgColor = isBlocked ? "bg-red-50" : "bg-amber-50";
  const iconColor = isBlocked ? "text-red-500" : "text-amber-500";
  const textColor = isBlocked ? "text-red-800" : "text-amber-800";
  const Icon = isBlocked ? Lock : AlertTriangle;

  const tierLabel = upgradeTier ? TIER_NAMES[upgradeTier] : "";
  const productLabel = productType === "marketing" ? "Marketing Suite" : "Sales Suite";

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${borderColor} ${bgColor}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${textColor}`}>
          {isBlocked ? "Upgrade to unlock" : "Approaching limit"}
        </p>
        <p className={`text-sm mt-0.5 ${isBlocked ? "text-red-700" : "text-amber-700"}`}>
          {message}
        </p>
        {upgradeTier && upgradeTier !== "free" && (
          <Link
            href={`/settings/billing?tab=subscription`}
            className={`inline-flex items-center gap-1 mt-2 text-sm font-medium ${
              isBlocked
                ? "text-red-700 hover:text-red-800"
                : "text-amber-700 hover:text-amber-800"
            }`}
          >
            {`Upgrade to ${tierLabel} (${productLabel})`}
            <span aria-hidden="true">&rarr;</span>
          </Link>
        )}
      </div>
    </div>
  );
}
