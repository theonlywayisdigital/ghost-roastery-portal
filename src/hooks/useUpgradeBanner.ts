"use client";

import { useState, useEffect, useRef } from "react";
import type { TierLevel, ProductType, LimitKey } from "@/lib/tier-config";
import { getMinimumTierForHigherLimit, LIMIT_LABELS, LIMIT_PRODUCT_MAP, formatLimit } from "@/lib/tier-config";

interface UpgradeBannerState {
  show: boolean;
  type: "warning" | "blocked";
  message: string;
  upgradeTier?: TierLevel;
  productType?: ProductType;
}

const EMPTY: UpgradeBannerState = { show: false, type: "warning", message: "" };

// Simple in-memory cache shared across hook instances
let cachedUsageData: Record<string, { current: number; limit: number; percentUsed: number; warning: boolean }> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 1 minute

export function useUpgradeBanner(limitKey: LimitKey): UpgradeBannerState {
  const [state, setState] = useState<UpgradeBannerState>(EMPTY);
  const fetchedRef = useRef(false);

  useEffect(() => {
    async function check() {
      const now = Date.now();

      // Use cached data if fresh
      if (cachedUsageData && now - cacheTimestamp < CACHE_TTL) {
        setState(computeState(limitKey, cachedUsageData));
        return;
      }

      if (fetchedRef.current) return;
      fetchedRef.current = true;

      try {
        const res = await fetch("/api/usage");
        if (!res.ok) return;
        const data = await res.json();
        cachedUsageData = data.limits;
        cacheTimestamp = Date.now();
        setState(computeState(limitKey, data.limits));
      } catch {
        // Silently fail — no banner shown
      }
    }
    check();
  }, [limitKey]);

  return state;
}

function computeState(
  limitKey: LimitKey,
  limits: Record<string, { current: number; limit: number; percentUsed: number; warning: boolean }>
): UpgradeBannerState {
  const data = limits[limitKey];
  if (!data) return EMPTY;
  // API serializes Infinity as -1 for JSON transport
  if (data.limit === Infinity || data.limit === -1) return EMPTY;

  const label = LIMIT_LABELS[limitKey];
  const productType = LIMIT_PRODUCT_MAP[limitKey];
  const productLabel = productType === "marketing" ? "Marketing Suite" : "Sales Suite";

  const isBlocked = data.current >= data.limit;
  const isWarning = data.percentUsed >= 80 && !isBlocked;

  if (!isBlocked && !isWarning) return EMPTY;

  const nextTier = getMinimumTierForHigherLimit(limitKey, data.limit);

  return {
    show: true,
    type: isBlocked ? "blocked" : "warning",
    message: isBlocked
      ? `You've reached your ${label} limit (${data.current}/${formatLimit(data.limit)}). Upgrade your ${productLabel} plan to add more.`
      : `You're approaching your ${label} limit (${data.current}/${formatLimit(data.limit)}).`,
    upgradeTier: nextTier?.tier,
    productType: nextTier?.product || productType,
  };
}
