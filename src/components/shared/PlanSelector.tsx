"use client";

import { Check, X, Loader2 } from "@/components/icons";
import {
  type TierLevel,
  type ProductType,
  type BillingCycle,
  TIER_NAMES,
  getSalesPricing,
  getMarketingPricing,
  getSalesLimits,
  getMarketingLimits,
  getSalesFeatures,
  getMarketingFeatures,
  formatLimit,
  LIMIT_LABELS,
  FEATURE_LABELS,
  tierIndex,
  type SalesLimitKey,
  type MarketingLimitKey,
  type SalesFeatureKey,
  type MarketingFeatureKey,
} from "@/lib/tier-config";

interface PlanSelectorProps {
  productType: ProductType;
  currentTier: TierLevel;
  onSelect?: (tier: TierLevel) => void;
  disabled?: boolean;
  billingCycle?: BillingCycle;
  loading?: boolean;
  pendingTier?: TierLevel | null;
}

const TIERS: TierLevel[] = ["growth", "pro", "scale"];

export function PlanSelector({
  productType,
  currentTier,
  onSelect,
  disabled,
  billingCycle = "monthly",
  loading,
  pendingTier,
}: PlanSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {TIERS.map((tier) => {
        const isCurrent = tier === currentTier;
        const isPending = tier === pendingTier;
        const pricing = productType === "sales"
          ? getSalesPricing(tier)
          : getMarketingPricing(tier);

        const limits = productType === "sales"
          ? getSalesLimits(tier) as Record<string, number>
          : getMarketingLimits(tier) as Record<string, number>;

        const features = productType === "sales"
          ? getSalesFeatures(tier) as Record<string, boolean>
          : getMarketingFeatures(tier) as Record<string, boolean>;

        const limitLabels = LIMIT_LABELS as Record<string, string>;
        const featureLabels = FEATURE_LABELS as Record<string, string>;

        const limitKeys = productType === "sales"
          ? (["products", "wholesaleOrdersPerMonth", "wholesaleAccounts", "crmContacts", "teamMembers"] as SalesLimitKey[])
          : (["emailSendsPerMonth", "embeddedForms", "aiCreditsPerMonth"] as MarketingLimitKey[]);

        const featureKeys = productType === "sales"
          ? (["invoices", "integrationsEcommerce", "integrationsAccounting"] as SalesFeatureKey[])
          : (["contentCalendar", "socialScheduling", "automations", "integrationsSocial"] as MarketingFeatureKey[]);

        // Determine CTA text
        const isUpgrade = tierIndex(tier) > tierIndex(currentTier);
        const isDowngrade = tierIndex(tier) < tierIndex(currentTier);

        let ctaText = "Select Plan";
        if (isCurrent) {
          ctaText = "Current Plan";
        } else if (isUpgrade) {
          ctaText = "Upgrade";
        } else if (isDowngrade) {
          ctaText = "Downgrade";
        }

        // Show price based on billing cycle
        const displayPrice = billingCycle === "annual" ? pricing.annual : pricing.monthly;

        return (
          <div
            key={tier}
            className={`relative bg-white rounded-xl border-2 p-5 transition-all ${
              isCurrent
                ? "border-brand-600 shadow-sm"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            {isCurrent && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-brand-600 text-white text-xs font-medium px-3 py-0.5 rounded-full">
                  Current
                </span>
              </div>
            )}

            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">{TIER_NAMES[tier]}</h3>
              <div className="mt-1">
                <p className="text-2xl font-bold text-slate-900">
                  {`\u00A3${(displayPrice / 100).toFixed(0)}`}
                  <span className="text-sm font-normal text-slate-500">/mo</span>
                </p>
                {billingCycle === "monthly" && pricing.annual > 0 && (
                  <p className="text-xs text-slate-400">
                    {`\u00A3${(pricing.annual / 100).toFixed(0)}/mo billed annually`}
                  </p>
                )}
                {billingCycle === "annual" && (
                  <p className="text-xs text-slate-400">
                    {`\u00A3${((displayPrice * 12) / 100).toFixed(0)} billed annually`}
                  </p>
                )}
              </div>
            </div>

            {/* Limits */}
            <div className="space-y-2 mb-4">
              {limitKeys.map((key) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{limitLabels[key]}</span>
                  <span className="font-medium text-slate-900">{formatLimit(limits[key])}</span>
                </div>
              ))}
            </div>

            {/* Features */}
            <div className="space-y-1.5 border-t border-slate-100 pt-3">
              {featureKeys.map((key) => {
                const enabled = features[key];
                return (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    {enabled ? (
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    )}
                    <span className={enabled ? "text-slate-700" : "text-slate-400"}>
                      {featureLabels[key]}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            {onSelect && !disabled ? (
              <button
                onClick={() => onSelect(tier)}
                disabled={isCurrent || (loading && isPending)}
                className={`w-full mt-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isCurrent
                    ? "bg-slate-100 text-slate-400 cursor-default"
                    : isDowngrade
                    ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    : "bg-brand-600 text-white hover:bg-brand-700"
                } disabled:opacity-50`}
              >
                {loading && isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  ctaText
                )}
              </button>
            ) : (
              <div className="mt-4 py-2 text-center text-sm text-slate-400">
                {isCurrent ? "Current Plan" : ""}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
