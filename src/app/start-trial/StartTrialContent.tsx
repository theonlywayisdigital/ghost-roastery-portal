"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import {
  Loader2,
  AlertCircle,
  Check,
  ArrowLeft,
  ArrowRight,
  ShoppingCart,
  Receipt,
  Sparkles,
  Mail,
  Calendar,
  Bot,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
} from "@/components/icons";
import Link from "next/link";
import { PlanSelector } from "@/components/shared/PlanSelector";
import {
  type TierLevel,
  type BillingCycle,
  getSalesPricing,
  getMarketingPricing,
  TIER_NAMES,
} from "@/lib/tier-config";

// ─── Types ───

type FlowStep = "sales-tier" | "marketing-pitch" | "review";

// ─── Helpers ───

const STEPS: FlowStep[] = ["sales-tier", "marketing-pitch", "review"];

function getStepLabel(step: FlowStep): string {
  switch (step) {
    case "sales-tier": return "Choose Plan";
    case "marketing-pitch": return "Marketing";
    case "review": return "Checkout";
  }
}

function formatPrice(pence: number): string {
  return `\u00A3${(pence / 100).toFixed(0)}`;
}

// ─── Component ───

export function StartTrialContent() {
  const searchParams = useSearchParams();
  const cancelled = searchParams.get("cancelled") === "true";

  // Wizard state
  const [step, setStep] = useState<FlowStep>("sales-tier");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [salesTier, setSalesTier] = useState<TierLevel>("growth");
  const [wantsMarketing, setWantsMarketing] = useState(false);
  const [marketingTier] = useState<TierLevel>("growth");
  const [showMarketingTiers, setShowMarketingTiers] = useState(false);
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // API state
  const [loading, setLoading] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirect, setRedirect] = useState<string | null>(null);

  const currentStepIndex = STEPS.indexOf(step);

  const goTo = useCallback((target: FlowStep) => {
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ─── Checkout handler ───

  async function handleCheckout() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/create-trial-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingCycle,
          salesTier,
          marketingTier: wantsMarketing ? marketingTier : null,
        }),
        redirect: "manual",
      });

      // Middleware redirect — no session
      if (res.type === "opaqueredirect" || res.status === 0) {
        setNeedsLogin(true);
        setLoading(false);
        return;
      }

      if (res.redirected || res.status === 307 || res.status === 302) {
        setNeedsLogin(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        let data;
        try {
          data = await res.json();
        } catch {
          setNeedsLogin(true);
          setLoading(false);
          return;
        }
        if (res.status === 401) {
          setNeedsLogin(true);
          setLoading(false);
          return;
        }
        if (data.redirect) {
          setRedirect(data.redirect);
        }
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  // ─── Pricing calculations ───

  const salesPricing = getSalesPricing(salesTier);
  const salesPrice = billingCycle === "annual" ? salesPricing.annual : salesPricing.monthly;
  const marketingPricing = getMarketingPricing(marketingTier);
  const marketingPrice = billingCycle === "annual" ? marketingPricing.annual : marketingPricing.monthly;
  const totalPrice = salesPrice + (wantsMarketing ? marketingPrice : 0);
  const isTrialEligible = salesTier === "growth";

  // Upsell price difference (Growth → Pro)
  const proPricing = getSalesPricing("pro");
  const proPrice = billingCycle === "annual" ? proPricing.annual : proPricing.monthly;
  const growthPricing = getSalesPricing("growth");
  const growthPrice = billingCycle === "annual" ? growthPricing.annual : growthPricing.monthly;
  const upsellDiff = proPrice - growthPrice;

  // ─── Needs login overlay ───

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
              Please sign in with your email and password to continue.
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

  // ─── Error state ───

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

  // ─── Main wizard ───

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Logo height={120} className="h-[120px] w-auto" />
          </div>
        </div>

        {/* Cancelled banner */}
        {cancelled && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Checkout cancelled</span>
            </div>
            <p className="text-sm text-amber-700">
              No worries — you can pick up where you left off. Your card details are required to start your trial.
            </p>
          </div>
        )}

        {/* Progress indicator — 3 pills */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center">
                {i > 0 && (
                  <div
                    className={`w-8 sm:w-12 h-0.5 mx-1 ${
                      i <= currentStepIndex ? "bg-brand-600" : "bg-slate-200"
                    }`}
                  />
                )}
                <button
                  onClick={() => {
                    if (i < currentStepIndex) goTo(s);
                  }}
                  disabled={i > currentStepIndex}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    i === currentStepIndex
                      ? "bg-brand-600 text-white"
                      : i < currentStepIndex
                      ? "bg-brand-50 text-brand-700 hover:bg-brand-100 cursor-pointer"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {i < currentStepIndex && <Check className="w-3 h-3" />}
                  <span className="hidden sm:inline">{getStepLabel(s)}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* Step 1: Sales Tier Selection                   */}
        {/* ═══════════════════════════════════════════════ */}
        {step === "sales-tier" && (
          <div>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Start your free trial</h1>
              <p className="text-sm text-slate-500">
                Start with Growth free for 14 days, or jump straight to Pro or Scale.
              </p>
            </div>

            {/* Billing cycle toggle — step 1 only */}
            <div className="flex justify-center mb-8">
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

            <PlanSelector
              productType="sales"
              billingCycle={billingCycle}
              onSelect={(tier) => {
                setSalesTier(tier);
                if (tier === "growth") {
                  // Show upsell modal for Growth
                  setShowUpsellModal(true);
                } else {
                  // Pro/Scale go straight to marketing step
                  goTo("marketing-pitch");
                }
              }}
              ctaOverride={(tier) => tier === "growth" ? "Start Free Trial" : "Select"}
              highlightTier="growth"
              highlightLabel="14-day free trial"
            />
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* Integration Upsell Modal (Growth only)         */}
        {/* ═══════════════════════════════════════════════ */}
        {showUpsellModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => {
                setShowUpsellModal(false);
                goTo("marketing-pitch");
              }}
            />
            {/* Modal */}
            <div className="relative bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg p-6 sm:p-8">
              {/* Close button */}
              <button
                onClick={() => {
                  setShowUpsellModal(false);
                  goTo("marketing-pitch");
                }}
                className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-bold text-slate-900 mb-2 pr-8">
                Unlock integrations with Sales Pro
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Connect your online stores and accounting tools — manage everything from one dashboard.
              </p>

              {/* E-commerce */}
              <div className="bg-slate-50 rounded-lg p-4 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="w-5 h-5 text-brand-600" />
                  <h3 className="font-semibold text-slate-900 text-sm">Online Store Sync</h3>
                </div>
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Two-way product sync with Shopify, WooCommerce, Squarespace &amp; Wix</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Automatic order import — no more copy-pasting</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Track inventory from green bean to online store sale</span>
                  </div>
                </div>
              </div>

              {/* Accounting */}
              <div className="bg-slate-50 rounded-lg p-4 mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="w-5 h-5 text-brand-600" />
                  <h3 className="font-semibold text-slate-900 text-sm">Accounting Sync</h3>
                </div>
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Invoices flow to Xero, Sage, or QuickBooks automatically</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Payments reconciled — no manual data entry</span>
                  </div>
                </div>
              </div>

              {/* Price callout */}
              <div className="bg-brand-50 border border-brand-100 rounded-lg p-3 mb-5 text-center">
                <p className="text-sm text-brand-800">
                  Just <span className="font-semibold">{formatPrice(upsellDiff)}/mo more</span> for all integrations
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setSalesTier("pro");
                    setShowUpsellModal(false);
                    goTo("marketing-pitch");
                  }}
                  className="flex-1 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors text-sm"
                >
                  Upgrade to Sales Pro
                </button>
                <button
                  onClick={() => {
                    setShowUpsellModal(false);
                    goTo("marketing-pitch");
                  }}
                  className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm"
                >
                  Continue with Growth
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* Step 2: Marketing Pitch                        */}
        {/* ═══════════════════════════════════════════════ */}
        {step === "marketing-pitch" && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Let your coffee do the talking
              </h1>
              <p className="text-sm text-slate-500 max-w-lg mx-auto">
                Reach more customers, fill more bags. Marketing tools built for roasters, not marketing agencies.
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
                {/* Feature highlights — stacked list */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-4 bg-slate-50 rounded-lg p-4">
                    <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 mb-1">Branded Email Campaigns</p>
                      <p className="text-sm text-slate-600">
                        Design beautiful emails that match your brand. Announce new roasts, share brew tips, and drive repeat orders — all from your Roastery Platform dashboard.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 bg-slate-50 rounded-lg p-4">
                    <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 mb-1">Social Media Scheduling</p>
                      <p className="text-sm text-slate-600">
                        Plan a week of Instagram, Facebook, and TikTok posts in minutes. Schedule once, publish automatically — so you can focus on roasting.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 bg-slate-50 rounded-lg p-4">
                    <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 mb-1">AI Content Generation</p>
                      <p className="text-sm text-slate-600">
                        Stuck for words? AI writes email copy, social captions, and product descriptions for you. Just review, tweak, and hit send.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 bg-slate-50 rounded-lg p-4">
                    <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 mb-1">AI Order Extraction</p>
                      <p className="text-sm text-slate-600">
                        Customers still emailing orders? AI reads the email, pulls out the order details, and creates the order for you — no typing required.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Growth limits */}
                <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Marketing Growth includes
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Email Sends / Month</span>
                      <span className="font-medium text-slate-900">5,000</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Embedded Forms</span>
                      <span className="font-medium text-slate-900">3</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">AI Credits / Month</span>
                      <span className="font-medium text-slate-900">150</span>
                    </div>
                  </div>
                </div>

                {/* Compare tiers expandable */}
                <button
                  onClick={() => setShowMarketingTiers(!showMarketingTiers)}
                  className="w-full flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
                >
                  Compare marketing tiers
                  {showMarketingTiers ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {showMarketingTiers && (
                  <div className="mb-6">
                    <PlanSelector
                      productType="marketing"
                      billingCycle={billingCycle}
                    />
                  </div>
                )}

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setWantsMarketing(true);
                      goTo("review");
                    }}
                    className="flex-1 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors text-sm"
                  >
                    Add Marketing — {formatPrice(marketingPrice)}/mo
                  </button>
                  <button
                    onClick={() => {
                      setWantsMarketing(false);
                      goTo("review");
                    }}
                    className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm"
                  >
                    Not right now — skip
                  </button>
                </div>
              </div>

              {/* Back button */}
              <div className="mt-6 text-center">
                <button
                  onClick={() => goTo("sales-tier")}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* Step 3: Review & Checkout                      */}
        {/* ═══════════════════════════════════════════════ */}
        {step === "review" && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {isTrialEligible ? "Review & start your trial" : "Review your plan"}
              </h1>
              <p className="text-sm text-slate-500">
                {isTrialEligible
                  ? `You won\u2019t be charged for Sales until ${new Date(
                      Date.now() + 14 * 24 * 60 * 60 * 1000
                    ).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}. We just need your card to get started.`
                  : "Check everything looks right, then continue to checkout."}
              </p>
            </div>

            <div className="max-w-lg mx-auto">
              <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
                {/* Sales line item */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Sales {TIER_NAMES[salesTier]}
                      </p>
                      <p className="text-xs text-slate-500">
                        Billed {billingCycle === "annual" ? "annually" : "monthly"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {formatPrice(salesPrice)}/mo
                    </span>
                    <button
                      onClick={() => goTo("sales-tier")}
                      className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Change plan"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Marketing line item */}
                {wantsMarketing && (
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Marketing {TIER_NAMES[marketingTier]}
                        </p>
                        <p className="text-xs text-slate-500">
                          Billed {billingCycle === "annual" ? "annually" : "monthly"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {formatPrice(marketingPrice)}/mo
                      </span>
                      <button
                        onClick={() => goTo("marketing-pitch")}
                        className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Change marketing"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {!wantsMarketing && (
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-slate-400">No marketing add-on</p>
                    <button
                      onClick={() => goTo("marketing-pitch")}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
                    >
                      Add marketing
                    </button>
                  </div>
                )}

                {/* Divider + total */}
                <div className="border-t border-slate-100 pt-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">Total</span>
                    <span className="text-lg font-bold text-slate-900">
                      {formatPrice(totalPrice)}/mo
                    </span>
                  </div>
                  {billingCycle === "annual" && (
                    <p className="text-xs text-slate-400 text-right mt-1">
                      {formatPrice(totalPrice * 12)}/year billed annually
                    </p>
                  )}
                </div>

                {/* Trial callout (Growth only) */}
                {isTrialEligible && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          14-day free trial on Sales Growth
                        </p>
                        <p className="text-xs text-green-700 mt-0.5">
                          You won&apos;t be charged for Sales until{" "}
                          {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                          . Card details are required to start.
                          {wantsMarketing && " Marketing starts immediately."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* No trial — both start immediately (Pro/Scale) */}
                {!isTrialEligible && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          No free trial on Sales {TIER_NAMES[salesTier]}
                        </p>
                        <p className="text-xs text-blue-700 mt-0.5">
                          {wantsMarketing
                            ? "Both subscriptions start immediately after checkout. Free trials are only available on the Sales Growth plan."
                            : "Your subscription starts immediately after checkout. Free trials are only available on the Sales Growth plan."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cancel anytime note */}
                <p className="text-xs text-slate-400 text-center mb-4">
                  No minimum commitment — cancel anytime.
                </p>

                {/* Terms & Conditions checkbox */}
                <label className="flex items-start gap-2.5 mb-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-xs text-slate-500">
                    I agree to the{" "}
                    <a
                      href="https://roasteryplatform.com/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:underline"
                    >
                      Terms &amp; Conditions
                    </a>
                    {" "}and{" "}
                    <a
                      href="https://roasteryplatform.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:underline"
                    >
                      Privacy Policy
                    </a>
                  </span>
                </label>

                {/* Checkout CTA */}
                <button
                  onClick={handleCheckout}
                  disabled={loading || !agreedToTerms}
                  className="w-full py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Continue to Checkout
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Back button */}
              <div className="mt-6 text-center">
                <button
                  onClick={() => goTo("marketing-pitch")}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
