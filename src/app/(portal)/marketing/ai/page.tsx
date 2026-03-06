import { getCurrentRoaster } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getEffectiveLimits, getMinimumTierForHigherLimit, type TierLevel } from "@/lib/tier-config";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { AIStudioClient } from "./AIStudioClient";

export default async function AIStudioPage() {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");

  const salesTier = (roaster.sales_tier as TierLevel) || "free";
  const marketingTier = (roaster.marketing_tier as TierLevel) || "free";
  const limits = getEffectiveLimits(salesTier, marketingTier);

  if (limits.aiCreditsPerMonth === 0) {
    const next = getMinimumTierForHigherLimit("aiCreditsPerMonth", 0);
    return (
      <FeatureGate
        featureName="AI Studio"
        requiredTier={next?.tier ?? "starter"}
        productType={next?.product ?? "marketing"}
      />
    );
  }

  return <AIStudioClient />;
}
