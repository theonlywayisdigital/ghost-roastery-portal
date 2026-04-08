"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Loader2, AlertCircle } from "@/components/icons";
import Link from "next/link";
import { PlanSelector } from "@/components/shared/PlanSelector";
import {
  type TierLevel,
  type ProductType,
  type BillingCycle,
  getSalesPricing,
  getMarketingPricing,
} from "@/lib/tier-config";

export function StartTrialContent() {
  const searchParams = useSearchParams();
  const cancelled = searchParams.get("cancelled") === "true";

  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    productType: ProductType;
    tier: TierLevel;
  } | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirect, setRedirect] = useState<string | null>(null);

  async function handleSelectPlan(productType: ProductType, tier: TierLevel) {
    setLoading(true);
    setPendingAction({ productType, tier });
    setError(null);

    const isTrialEligible = productType === "sales" && tier === "growth";
    const endpoint = isTrialEligible
      ? "/api/billing/create-trial-session"
      : "/api/billing/create-checkout-session";

    const body = isTrialEligible
      ? { billingCycle }
      : { productType, tier, billingCycle };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        redirect: "manual",
      });

      // Middleware redirect — no session
      if (res.type === "opaqueredirect" || res.status === 0) {
        setNeedsLogin(true);
        setLoading(false);
        setPendingAction(null);
        return;
      }

      if (res.redirected || res.status === 307 || res.status === 302) {
        setNeedsLogin(true);
        setLoading(false);
        setPendingAction(null);
        return;
      }

      if (!res.ok) {
        let data;
        try {
          data = await res.json();
        } catch {
          setNeedsLogin(true);
          setLoading(false);
          setPendingAction(null);
          return;
        }
        if (res.status === 401) {
          setNeedsLogin(true);
          setLoading(false);
          setPendingAction(null);
          return;
        }
        if (data.redirect) {
          setRedirect(data.redirect);
        }
        setError(data.error || "Something went wrong");
        setLoading(false);
        setPendingAction(null);
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.success) {
        // Subscription updated (existing sub upgrade) — redirect to billing
        window.location.href = "/settings/billing?tab=subscription&checkout=success";
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
      setPendingAction(null);
    }
  }

  function salesCtaOverride(tier: TierLevel): string {
    if (tier === "growth") return "Start Free Trial";
    const pricing = getSalesPricing(tier);
    const price = billingCycle === "annual" ? pricing.annual : pricing.monthly;
    return `Subscribe — £${(price / 100).toFixed(0)}/mo`;
  }

  function marketingCtaOverride(tier: TierLevel): string {
    const pricing = getMarketingPricing(tier);
    const price = billingCycle === "annual" ? pricing.annual : pricing.monthly;
    return `Add for £${(price / 100).toFixed(0)}/mo`;
  }

  // Needs login overlay
  if (needsLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo height={150} className="h-[150px] w-auto" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Sign in to continue
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Please sign in with your email and password to start your free trial.
            </p>
            <Link
              href="/login?next=/start-trial"
              className="inline-flex items-center justify-center w-full py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Error state (trial already used, etc.)
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo height={150} className="h-[150px] w-auto" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              {error === "Trial already used" ? "Trial already used" : "Something went wrong"}
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              {error === "Trial already used"
                ? "You\u2019ve already used your free trial. Subscribe to a plan to continue using the platform."
                : error}
            </p>
            <Link
              href={redirect || "/settings/billing?tab=subscription"}
              className="inline-flex items-center justify-center w-full py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
            >
              {error === "Trial already used" ? "View Plans" : "Go to Billing"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Main pricing page
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <Logo height={150} className="h-[150px] w-auto" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Choose your plan
          </h1>
          <p className="text-base text-slate-500 max-w-lg mx-auto">
            Start with a 14-day free trial on Sales Growth. No charge for 14 days.
          </p>
        </div>

        {/* Cancelled banner */}
        {cancelled && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Card details required</span>
            </div>
            <p className="text-sm text-amber-700">
              You&apos;ll need to enter card details to start your free trial. You won&apos;t be charged until your trial ends.
            </p>
          </div>
        )}

        {/* Billing cycle toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center bg-white rounded-lg border border-slate-200 p-1">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                billingCycle === "monthly"
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                billingCycle === "annual"
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Annual
              <span className="ml-1.5 text-xs opacity-80">Save ~15%</span>
            </button>
          </div>
        </div>

        {/* Sales Suite */}
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Sales Suite</h2>
            <p className="text-sm text-slate-500 mt-1">
              Everything you need to sell, manage orders, and grow your wholesale business.
            </p>
          </div>
          <PlanSelector
            productType="sales"
            billingCycle={billingCycle}
            onSelect={(tier) => handleSelectPlan("sales", tier)}
            loading={loading && pendingAction?.productType === "sales"}
            pendingTier={
              loading && pendingAction?.productType === "sales"
                ? pendingAction.tier
                : null
            }
            ctaOverride={salesCtaOverride}
            highlightTier="growth"
            highlightLabel="14-day free trial"
          />
        </div>

        {/* Marketing Suite */}
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              Marketing Suite
              <span className="ml-2 text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full align-middle">
                Optional add-on
              </span>
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Email campaigns, social scheduling, and AI-powered content tools.
            </p>
          </div>
          <PlanSelector
            productType="marketing"
            billingCycle={billingCycle}
            onSelect={(tier) => handleSelectPlan("marketing", tier)}
            loading={loading && pendingAction?.productType === "marketing"}
            pendingTier={
              loading && pendingAction?.productType === "marketing"
                ? pendingAction.tier
                : null
            }
            ctaOverride={marketingCtaOverride}
          />
        </div>

        {/* Sticky bottom CTA (mobile) */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 sm:hidden z-50">
          <button
            onClick={() => handleSelectPlan("sales", "growth")}
            disabled={loading}
            className="w-full py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {loading && pendingAction?.productType === "sales" && pendingAction?.tier === "growth" ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              "Start Free Trial — Sales Growth"
            )}
          </button>
        </div>

        {/* Spacer for sticky CTA on mobile */}
        <div className="h-20 sm:hidden" />
      </div>
    </div>
  );
}
