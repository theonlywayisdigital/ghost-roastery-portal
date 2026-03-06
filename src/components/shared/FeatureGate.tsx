import Link from "next/link";
import { Lock } from "lucide-react";
import type { TierLevel, ProductType } from "@/lib/tier-config";
import { TIER_NAMES } from "@/lib/tier-config";

interface FeatureGateProps {
  featureName: string;
  requiredTier: TierLevel;
  productType: ProductType;
}

export function FeatureGate({ featureName, requiredTier, productType }: FeatureGateProps) {
  const isWebsite = productType === "website";
  const tierLabel = TIER_NAMES[requiredTier];
  const productLabel = isWebsite
    ? "Website"
    : productType === "marketing"
      ? "Marketing Suite"
      : "Sales Suite";

  return (
    <div className="flex items-center justify-center py-24">
      <div className="max-w-md w-full text-center p-8 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-slate-400" />
        </div>

        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          {featureName}
        </h2>

        <p className="text-sm text-slate-500 mb-6">
          {isWebsite ? (
            <>
              Subscribe to the{" "}
              <span className="font-medium text-slate-700">Website</span> add-on
              to build and publish your own website. Just £19/month.
            </>
          ) : (
            <>
              This feature requires the{" "}
              <span className="font-medium text-slate-700">{tierLabel}</span> plan
              on the <span className="font-medium text-slate-700">{productLabel}</span>.
              Upgrade to unlock {featureName.toLowerCase()} and more.
            </>
          )}
        </p>

        <Link
          href="/settings/billing?tab=subscription"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          {isWebsite ? "Subscribe to Website" : `Upgrade to ${tierLabel}`}
        </Link>
      </div>
    </div>
  );
}
