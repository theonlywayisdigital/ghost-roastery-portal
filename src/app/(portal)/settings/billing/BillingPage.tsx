"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Receipt,
  Landmark,
  XCircle,
  FileText,
  Building2,
  Send,
  Bell,
  Save,
  Crown,
  Sparkles,
  Zap,
} from "@/components/icons";
import { SettingsHeader } from "@/components/SettingsHeader";
import { UsageBar } from "@/components/shared/UsageBar";
import { PlanSelector } from "@/components/shared/PlanSelector";
import { StatusBadge as TierBadge } from "@/components/admin/StatusBadge";
import {
  type TierLevel,
  type LimitKey,
  type BillingCycle,
  TIER_NAMES,
  LIMIT_LABELS,
  CREDIT_PACKS,
  getEffectivePlatformFee,
  getSalesPricing,
  getMarketingPricing,
  WEBSITE_PRICING,
  type AiActionType,
  AI_ACTION_LABELS,
} from "@/lib/tier-config";
import { RETAIL_ENABLED } from "@/lib/feature-flags";

interface RoasterData {
  id: string;
  business_name: string;
  email: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  postcode: string;
  country: string;
  vat_number: string;
  billing_email: string;
  platform_fee_percent: number;
  stripe_account_id: string | null;
  storefront_logo_url: string | null;
  // Customer billing fields
  invoice_prefix: string;
  default_payment_terms: number;
  invoice_currency: string;
  bank_name: string;
  bank_account_number: string;
  bank_sort_code: string;
  payment_instructions: string;
  late_payment_terms: string;
  auto_create_invoices: boolean;
  auto_send_invoices: boolean;
  invoice_reminder_enabled: boolean;
  reminder_days_before_due: number;
  sales_tier: string;
  marketing_tier: string;
  // Subscription fields
  sales_billing_cycle: string | null;
  marketing_billing_cycle: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  stripe_sales_subscription_id: string | null;
  stripe_marketing_subscription_id: string | null;
  tier_override_by: string | null;
  // Trial fields
  trial_started_at: string | null;
  trial_ends_at: string | null;
  trial_used: boolean;
  // Website subscription
  website_subscription_active: boolean;
  website_billing_cycle: string | null;
  stripe_website_subscription_id: string | null;
}

interface StripeStatus {
  connected: boolean;
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  external_accounts: { id: string; last4: string | null; bank_name: string | null; type: string }[];
  requirements: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
    errors: { code: string; reason: string; requirement: string }[];
  } | null;
}

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrival_date: string;
  created: string;
  destination: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  subtotal: number;
  total: number;
  status: string;
  payment_status: string;
  payment_due_date: string | null;
  created_at: string;
  notes: string | null;
}

type Tab = "subscription" | "my-billing" | "customer-billing";

const CURRENCY_OPTIONS = [
  { value: "GBP", label: "GBP (£)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "USD", label: "USD ($)" },
];

const PAYMENT_TERMS_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 45, label: "45 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
];

const REMINDER_DAYS_OPTIONS = [
  { value: 3, label: "3 days before" },
  { value: 5, label: "5 days before" },
  { value: 7, label: "7 days before" },
  { value: 14, label: "14 days before" },
];

interface UsageData {
  tiers: { sales: TierLevel; marketing: TierLevel };
  limits: Record<LimitKey, { current: number; limit: number; percentUsed: number; warning: boolean }>;
  features: Record<string, boolean>;
  platformFeePercent: number;
}

export function BillingPage({ roaster }: { roaster: RoasterData }) {
  // Check URL for ?tab=subscription
  const initialTab = typeof window !== "undefined"
    ? (new URLSearchParams(window.location.search).get("tab") as Tab) || "subscription"
    : "subscription";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  // My Billing settings form
  const [vatNumber, setVatNumber] = useState(roaster.vat_number);
  const [billingEmail, setBillingEmail] = useState(roaster.billing_email);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Subscription usage data
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  // Customer Billing settings form
  const [invoicePrefix, setInvoicePrefix] = useState(roaster.invoice_prefix);
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState(roaster.default_payment_terms);
  const [invoiceCurrency, setInvoiceCurrency] = useState(roaster.invoice_currency);
  const [bankName, setBankName] = useState(roaster.bank_name);
  const [bankAccountNumber, setBankAccountNumber] = useState(roaster.bank_account_number);
  const [bankSortCode, setBankSortCode] = useState(roaster.bank_sort_code);
  const [paymentInstructions, setPaymentInstructions] = useState(roaster.payment_instructions);
  const [latePaymentTerms, setLatePaymentTerms] = useState(roaster.late_payment_terms);
  const [autoCreateInvoices, setAutoCreateInvoices] = useState(roaster.auto_create_invoices);
  const [autoSendInvoices, setAutoSendInvoices] = useState(roaster.auto_send_invoices);
  const [invoiceReminderEnabled, setInvoiceReminderEnabled] = useState(roaster.invoice_reminder_enabled);
  const [reminderDaysBeforeDue, setReminderDaysBeforeDue] = useState(roaster.reminder_days_before_due);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [savedCustomer, setSavedCustomer] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, payoutsRes, invoicesRes] = await Promise.all([
        fetch("/api/wholesale-portal/stripe/status"),
        fetch("/api/settings/billing/payouts"),
        fetch("/api/settings/billing/invoices"),
      ]);
      const statusData = await statusRes.json();
      const payoutsData = await payoutsRes.json();
      const invoicesData = await invoicesRes.json();
      setStripeStatus(statusData);
      setPayouts(payoutsData.payouts || []);
      setInvoices(invoicesData.invoices || []);
    } catch (error) {
      console.error("Failed to load billing data:", error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load usage data when subscription tab is active
  useEffect(() => {
    if (activeTab === "subscription" && !usageData && !loadingUsage) {
      setLoadingUsage(true);
      fetch("/api/usage")
        .then((res) => res.json())
        .then((data) => setUsageData(data))
        .catch(console.error)
        .finally(() => setLoadingUsage(false));
    }
  }, [activeTab, usageData, loadingUsage]);

  async function handleConnect() {
    setConnecting(true);
    try {
      const res = await fetch("/api/wholesale-portal/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnPath: "/settings/integrations?tab=payments&stripe=complete",
          refreshPath: "/settings/integrations?tab=payments&stripe=refresh",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Failed to start Stripe Connect:", error);
      setConnecting(false);
    }
  }

  async function handleSaveSettings() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/billing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vat_number: vatNumber,
          billing_email: billingEmail,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
    setSaving(false);
  }

  async function handleSaveCustomerBilling() {
    setSavingCustomer(true);
    setSavedCustomer(false);
    try {
      const res = await fetch("/api/settings/billing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_prefix: invoicePrefix,
          default_payment_terms: defaultPaymentTerms,
          invoice_currency: invoiceCurrency,
          bank_name: bankName,
          bank_account_number: bankAccountNumber,
          bank_sort_code: bankSortCode,
          payment_instructions: paymentInstructions,
          late_payment_terms: latePaymentTerms,
          auto_create_invoices: autoCreateInvoices,
          auto_send_invoices: autoSendInvoices,
          invoice_reminder_enabled: invoiceReminderEnabled,
          reminder_days_before_due: reminderDaysBeforeDue,
        }),
      });
      if (res.ok) {
        setSavedCustomer(true);
        setTimeout(() => setSavedCustomer(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save customer billing settings:", error);
    }
    setSavingCustomer(false);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatCurrency(amount: number) {
    return `£${amount.toFixed(2)}`;
  }

  function maskAccountNumber(num: string) {
    if (!num || num.length <= 4) return num;
    return "****" + num.slice(-4);
  }

  const isConnected = stripeStatus?.connected && stripeStatus.onboarding_complete;
  const hasRequirements =
    stripeStatus?.requirements &&
    (stripeStatus.requirements.currently_due.length > 0 ||
      stripeStatus.requirements.past_due.length > 0);

  return (
    <div>
      <SettingsHeader
        title="Billing & Payouts"
        description="Manage your payment settings, view payouts, and configure how you invoice customers."
        breadcrumb="Billing & Payouts"
      />

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-6" aria-label="Billing tabs">
          <button
            onClick={() => setActiveTab("subscription")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "subscription"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Subscription
          </button>
          <button
            onClick={() => setActiveTab("my-billing")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "my-billing"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            My Billing
          </button>
          <button
            onClick={() => setActiveTab("customer-billing")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "customer-billing"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Customer Billing
          </button>
        </nav>
      </div>

      {activeTab === "subscription" ? (
        <SubscriptionTab
          roaster={roaster}
          usageData={usageData}
          loading={loadingUsage}
        />
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : activeTab === "my-billing" ? (
        <MyBillingTab
          roaster={roaster}
          stripeStatus={stripeStatus}
          isConnected={isConnected}
          hasRequirements={hasRequirements}
          payouts={payouts}
          invoices={invoices}
          connecting={connecting}
          vatNumber={vatNumber}
          billingEmail={billingEmail}
          saving={saving}
          saved={saved}
          onConnect={handleConnect}
          onSetVatNumber={setVatNumber}
          onSetBillingEmail={setBillingEmail}
          onSave={handleSaveSettings}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
        />
      ) : (
        <CustomerBillingTab
          roaster={roaster}
          invoicePrefix={invoicePrefix}
          defaultPaymentTerms={defaultPaymentTerms}
          invoiceCurrency={invoiceCurrency}
          bankName={bankName}
          bankAccountNumber={bankAccountNumber}
          bankSortCode={bankSortCode}
          paymentInstructions={paymentInstructions}
          latePaymentTerms={latePaymentTerms}
          autoCreateInvoices={autoCreateInvoices}
          autoSendInvoices={autoSendInvoices}
          invoiceReminderEnabled={invoiceReminderEnabled}
          reminderDaysBeforeDue={reminderDaysBeforeDue}
          saving={savingCustomer}
          saved={savedCustomer}
          onSetInvoicePrefix={setInvoicePrefix}
          onSetDefaultPaymentTerms={setDefaultPaymentTerms}
          onSetInvoiceCurrency={setInvoiceCurrency}
          onSetBankName={setBankName}
          onSetBankAccountNumber={setBankAccountNumber}
          onSetBankSortCode={setBankSortCode}
          onSetPaymentInstructions={setPaymentInstructions}
          onSetLatePaymentTerms={setLatePaymentTerms}
          onSetAutoCreateInvoices={setAutoCreateInvoices}
          onSetAutoSendInvoices={setAutoSendInvoices}
          onSetInvoiceReminderEnabled={setInvoiceReminderEnabled}
          onSetReminderDaysBeforeDue={setReminderDaysBeforeDue}
          onSave={handleSaveCustomerBilling}
          maskAccountNumber={maskAccountNumber}
        />
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Subscription Tab
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SubscriptionTab({
  roaster,
  usageData,
  loading,
}: {
  roaster: RoasterData;
  usageData: UsageData | null;
  loading: boolean;
}) {
  const salesTier = (roaster.sales_tier as TierLevel) || "growth";
  const marketingTier = (roaster.marketing_tier as TierLevel) || "growth";
  const salesPricing = getSalesPricing(salesTier);
  const marketingPricing = getMarketingPricing(marketingTier);
  const platformFee = getEffectivePlatformFee(salesTier);

  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [pendingTier, setPendingTier] = useState<{ product: "sales" | "marketing"; tier: TierLevel } | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<"sales" | "marketing" | "website" | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Handle checkout URL params
  const [checkoutResult, setCheckoutResult] = useState<"success" | "cancel" | null>(null);
  const [showSubscribePrompt, setShowSubscribePrompt] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const result = params.get("checkout") as "success" | "cancel" | null;
      if (result) {
        setCheckoutResult(result);
        // Clean URL
        const url = new URL(window.location.href);
        url.searchParams.delete("checkout");
        window.history.replaceState({}, "", url.toString());
        if (result === "success") {
          setTimeout(() => setCheckoutResult(null), 5000);
        }
      }
      // Show subscribe prompt if redirected from lockout
      if (params.get("subscribe") === "true") {
        setShowSubscribePrompt(true);
        const url = new URL(window.location.href);
        url.searchParams.delete("subscribe");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, []);

  const subscriptionStatus = roaster.subscription_status;
  const isAdminOverride = !!roaster.tier_override_by;

  async function handleSelectPlan(productType: "sales" | "marketing", tier: TierLevel) {
    setCheckoutLoading(true);
    setCheckoutError(null);
    setPendingTier({ product: productType, tier });

    try {
      const res = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productType, tier, billingCycle }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.action === "updated") {
        // Mid-cycle change — reload page
        window.location.reload();
        return;
      }

      if (data.error) {
        setCheckoutError(data.error);
      }
    } catch {
      setCheckoutError("Something went wrong. Please try again or contact support.");
    }

    setCheckoutLoading(false);
    setPendingTier(null);
  }

  async function handleWebsiteSubscribe() {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productType: "website", tier: "growth", billingCycle }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.error) {
        setCheckoutError(data.error);
      }
    } catch {
      setCheckoutError("Something went wrong. Please try again or contact support.");
    }
    setCheckoutLoading(false);
  }

  async function handleCancelSubscription(productType: "sales" | "marketing" | "website") {
    setCancelLoading(true);
    try {
      const res = await fetch("/api/billing/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productType }),
      });

      if (res.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to cancel:", error);
    }
    setCancelLoading(false);
    setShowCancelModal(null);
  }

  async function handleOpenPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/create-portal-session", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch (error) {
      console.error("Failed to open portal:", error);
    }
    setPortalLoading(false);
  }

  const SALES_LIMIT_KEYS: LimitKey[] = ["products", "wholesaleOrdersPerMonth", "wholesaleAccounts", "crmContacts", "teamMembers"];
  const MARKETING_LIMIT_KEYS: LimitKey[] = ["emailSendsPerMonth", "embeddedForms", "aiCreditsPerMonth"];

  return (
    <div className="space-y-6">
      {/* Subscribe prompt banner (shown when redirected from lockout) */}
      {showSubscribePrompt && subscriptionStatus !== "trialing" && (
        <div className="p-4 bg-brand-50 border border-brand-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-brand-600 flex-shrink-0" />
          <p className="text-sm font-medium text-brand-800">
            {roaster.trial_used
              ? "Your trial has ended. Subscribe to a plan below to continue using the platform."
              : "Subscribe to a plan below to access the platform."}
          </p>
        </div>
      )}

      {/* Checkout result banner */}
      {checkoutResult === "success" && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm font-medium text-green-800">
            Your subscription has been activated. Welcome to your new plan!
          </p>
        </div>
      )}

      {checkoutResult === "cancel" && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            Checkout was cancelled. No changes were made.
          </p>
        </div>
      )}

      {/* Subscription status badge */}
      {subscriptionStatus && subscriptionStatus !== "inactive" && (
        <div className={`p-4 rounded-lg border flex items-center gap-3 ${
          subscriptionStatus === "active"
            ? "bg-green-50 border-green-200"
            : subscriptionStatus === "trialing"
            ? "bg-brand-50 border-brand-200"
            : subscriptionStatus === "past_due"
            ? "bg-red-50 border-red-200"
            : subscriptionStatus === "cancelling"
            ? "bg-amber-50 border-amber-200"
            : "bg-slate-50 border-slate-200"
        }`}>
          {subscriptionStatus === "active" && (
            <>
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm font-medium text-green-800">Subscription active</p>
            </>
          )}
          {subscriptionStatus === "trialing" && (
            <>
              <CheckCircle2 className="w-5 h-5 text-brand-600 flex-shrink-0" />
              <p className="text-sm font-medium text-brand-800">
                {`Free trial — ends ${roaster.trial_ends_at ? new Date(roaster.trial_ends_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "soon"}`}
              </p>
            </>
          )}
          {subscriptionStatus === "past_due" && (
            <>
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Payment past due</p>
                <p className="text-xs text-red-700 mt-0.5">
                  Your subscription payment failed. Update your payment method to avoid service interruption.
                </p>
              </div>
            </>
          )}
          {subscriptionStatus === "cancelling" && (
            <>
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm font-medium text-amber-800">
                Your subscription will cancel at the end of the current billing period.
              </p>
            </>
          )}
        </div>
      )}

      {/* Admin override notice */}
      {isAdminOverride && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
          <Crown className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            Your plan was set by the Roastery Platform admin team.
          </p>
        </div>
      )}

      {/* Current Plan Cards */}
      <div className={`grid grid-cols-1 ${RETAIL_ENABLED ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4`}>
        {/* Sales Suite */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-slate-600" />
                <h2 className="text-lg font-semibold text-slate-900">Sales Suite</h2>
              </div>
              <TierBadge status={salesTier} type="subscriptionTier" />
            </div>
          </div>
          <div className="p-6">
            <p className="text-2xl font-bold text-slate-900">
              {`\u00A3${(salesPricing.monthly / 100).toFixed(0)}`}
              <span className="text-sm font-normal text-slate-500">/mo</span>
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {`Platform fee: ${platformFee}%`}
            </p>
            {roaster.sales_billing_cycle && (
              <p className="text-xs text-slate-400 mt-1">
                {`Billed ${roaster.sales_billing_cycle}`}
              </p>
            )}
            {roaster.stripe_sales_subscription_id && subscriptionStatus !== "cancelling" && (
              <button
                onClick={() => setShowCancelModal("sales")}
                className="mt-3 text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                Cancel subscription
              </button>
            )}
          </div>
        </section>

        {/* Marketing Suite */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-slate-600" />
                <h2 className="text-lg font-semibold text-slate-900">Marketing Suite</h2>
              </div>
              <TierBadge status={marketingTier} type="subscriptionTier" />
            </div>
          </div>
          <div className="p-6">
            <p className="text-2xl font-bold text-slate-900">
              {`\u00A3${(marketingPricing.monthly / 100).toFixed(0)}`}
              <span className="text-sm font-normal text-slate-500">/mo</span>
            </p>
            {roaster.marketing_billing_cycle && (
              <p className="text-xs text-slate-400 mt-1">
                {`Billed ${roaster.marketing_billing_cycle}`}
              </p>
            )}
            {roaster.stripe_marketing_subscription_id && subscriptionStatus !== "cancelling" && (
              <button
                onClick={() => setShowCancelModal("marketing")}
                className="mt-3 text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                Cancel subscription
              </button>
            )}
          </div>
        </section>

        {/* Website */}
        {RETAIL_ENABLED && (
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-slate-600" />
                <h2 className="text-lg font-semibold text-slate-900">Website</h2>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                roaster.website_subscription_active
                  ? "bg-green-50 text-green-700"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {roaster.website_subscription_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
          <div className="p-6">
            {roaster.website_subscription_active ? (
              <>
                <p className="text-2xl font-bold text-slate-900">
                  {`\u00A3${(WEBSITE_PRICING[roaster.website_billing_cycle === "annual" ? "annual" : "monthly"] / 100).toFixed(0)}`}
                  <span className="text-sm font-normal text-slate-500">/mo</span>
                </p>
                {roaster.website_billing_cycle && (
                  <p className="text-xs text-slate-400 mt-1">
                    {`Billed ${roaster.website_billing_cycle}`}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-slate-900">
                  {`\u00A3${(WEBSITE_PRICING.monthly / 100).toFixed(0)}`}
                  <span className="text-sm font-normal text-slate-500">/mo</span>
                </p>
                <p className="text-sm text-slate-500 mt-1">Add-on</p>
              </>
            )}
          </div>
        </section>
        )}
      </div>

      {/* Manage Payment Method */}
      {roaster.stripe_customer_id && (
        <div className="flex gap-3">
          <button
            onClick={handleOpenPortal}
            disabled={portalLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {portalLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            Manage Payment Method & Invoices
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      )}

      {/* Usage Dashboard */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Usage</h2>
          <p className="text-sm text-slate-500 mt-1">
            Your current usage against plan limits.
          </p>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : usageData ? (
            <div className="space-y-8">
              {/* Sales limits */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Sales Suite</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SALES_LIMIT_KEYS.map((key) => {
                    const data = usageData.limits[key];
                    if (!data) return null;
                    return (
                      <UsageBar
                        key={key}
                        label={LIMIT_LABELS[key]}
                        current={data.current}
                        limit={data.limit}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Marketing limits */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Marketing Suite</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {MARKETING_LIMIT_KEYS.map((key) => {
                    const data = usageData.limits[key];
                    if (!data) return null;
                    return (
                      <UsageBar
                        key={key}
                        label={LIMIT_LABELS[key]}
                        current={data.current}
                        limit={data.limit}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-6">
              Unable to load usage data.
            </p>
          )}
        </div>
      </section>

      {/* AI Credits */}
      <AiCreditsSection roasterId={roaster.id} />

      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center gap-2 py-2">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            billingCycle === "monthly"
              ? "bg-brand-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle("annual")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            billingCycle === "annual"
              ? "bg-brand-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Annual
          <span className="ml-1.5 text-xs opacity-75">Save ~17%</span>
        </button>
      </div>

      {checkoutError && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{checkoutError}</span>
          <button onClick={() => setCheckoutError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Plan Comparison — Sales */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Sales Suite Plans</h2>
          <p className="text-sm text-slate-500 mt-1">
            Compare plans and find the right fit for your business.
          </p>
        </div>
        <div className="p-6 overflow-x-auto">
          <PlanSelector
            productType="sales"
            currentTier={salesTier}
            billingCycle={billingCycle}
            loading={checkoutLoading}
            pendingTier={pendingTier?.product === "sales" ? pendingTier.tier : null}
            onSelect={(tier) => handleSelectPlan("sales", tier)}
          />
        </div>
      </section>

      {/* Plan Comparison — Marketing */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Marketing Suite Plans</h2>
          <p className="text-sm text-slate-500 mt-1">
            Email marketing, social scheduling, and automation tools.
          </p>
        </div>
        <div className="p-6 overflow-x-auto">
          <PlanSelector
            productType="marketing"
            currentTier={marketingTier}
            billingCycle={billingCycle}
            loading={checkoutLoading}
            pendingTier={pendingTier?.product === "marketing" ? pendingTier.tier : null}
            onSelect={(tier) => handleSelectPlan("marketing", tier)}
          />
        </div>
      </section>

      {/* Website Add-on */}
      {RETAIL_ENABLED && (
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Website</h2>
          <p className="text-sm text-slate-500 mt-1">
            Build and publish a full website for your roastery with a custom domain.
          </p>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {billingCycle === "annual"
                  ? `\u00A3${(WEBSITE_PRICING.annual / 100).toFixed(0)}`
                  : `\u00A3${(WEBSITE_PRICING.monthly / 100).toFixed(0)}`}
                <span className="text-sm font-normal text-slate-500">/mo</span>
              </p>
              {billingCycle === "annual" && (
                <p className="text-xs text-green-600 mt-1">
                  {`Save \u00A3${((WEBSITE_PRICING.monthly - WEBSITE_PRICING.annual) * 12 / 100).toFixed(0)}/year`}
                </p>
              )}
              <ul className="mt-3 space-y-1 text-sm text-slate-600">
                <li>Multi-page website builder</li>
                <li>Blog with built-in editor</li>
                <li>Custom domain support</li>
                <li>Shop page (embedded storefront)</li>
              </ul>
            </div>
            <div>
              {roaster.website_subscription_active ? (
                <button
                  onClick={() => setShowCancelModal("website")}
                  className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                >
                  Cancel
                </button>
              ) : (
                <button
                  onClick={() => handleWebsiteSubscribe()}
                  disabled={checkoutLoading}
                  className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {checkoutLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Subscribe"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Cancel Subscription
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              {`Your ${showCancelModal === "sales" ? "Sales Suite" : showCancelModal === "website" ? "Website" : "Marketing Suite"} subscription will be cancelled at the end of your current billing period. You'll keep access until then. After that, you'll need to resubscribe to access the platform.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(null)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Keep Plan
              </button>
              <button
                onClick={() => handleCancelSubscription(showCancelModal)}
                disabled={cancelLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {cancelLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  "Cancel Subscription"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI Credits Section
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AiCreditsSection({ roasterId }: { roasterId: string }) {
  const [data, setData] = useState<{
    monthlyAllocation: number;
    monthlyUsed: number;
    topupBalance: number;
    ledger: { id: string; credits_used: number; action_type: string; source: string; reason: string | null; created_at: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [buyingPack, setBuyingPack] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/billing/credits")
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleBuyPack(packId: string) {
    setBuyingPack(packId);
    try {
      const res = await fetch("/api/billing/buy-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const result = await res.json();
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      if (result.error) {
        console.error("Buy credits error:", result.error);
      }
    } catch (error) {
      console.error("Failed to buy credits:", error);
    }
    setBuyingPack(null);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">AI Credits</h2>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Your monthly allocation resets each billing period. Top-up credits are used when your monthly credits run out.
        </p>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Balance Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">Monthly Allocation</p>
                <p className="text-2xl font-bold text-slate-900">
                  {data.monthlyAllocation === Infinity ? "Unlimited" : data.monthlyAllocation}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {`${data.monthlyUsed} used`}
                </p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <p className="text-xs text-amber-600 mb-1">Top-up Balance</p>
                <p className="text-2xl font-bold text-amber-700">{data.topupBalance}</p>
                <p className="text-xs text-amber-500 mt-1">Never expires</p>
              </div>
              <div className="bg-brand-50 rounded-lg p-4 text-center">
                <p className="text-xs text-brand-600 mb-1">Total Available</p>
                <p className="text-2xl font-bold text-brand-700">
                  {data.monthlyAllocation === Infinity
                    ? "Unlimited"
                    : Math.max(0, data.monthlyAllocation - data.monthlyUsed) + data.topupBalance}
                </p>
              </div>
            </div>

            {/* Buy Credit Packs */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Buy Credit Packs</h3>
              <div className="grid grid-cols-3 gap-3">
                {CREDIT_PACKS.map((pack) => (
                  <button
                    key={pack.id}
                    onClick={() => handleBuyPack(pack.id)}
                    disabled={buyingPack !== null}
                    className="relative bg-white border-2 border-slate-200 rounded-xl p-4 text-center hover:border-brand-400 hover:shadow-sm transition-all disabled:opacity-50"
                  >
                    <Zap className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                    <p className="text-lg font-bold text-slate-900">{pack.credits}</p>
                    <p className="text-xs text-slate-500 mb-2">credits</p>
                    <p className="text-sm font-semibold text-brand-600">
                      {`\u00A3${(pack.pricePence / 100).toFixed(2)}`}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {`${(pack.pricePence / pack.credits).toFixed(1)}p each`}
                    </p>
                    {buyingPack === pack.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                        <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Usage History */}
            {data.ledger.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Usage</h3>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-2">Type</th>
                        <th className="text-right text-xs font-medium text-slate-500 uppercase px-4 py-2">Credits</th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.ledger.map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-4 py-2 text-slate-700">
                            {entry.source === "topup_purchase"
                              ? "Purchase"
                              : entry.source === "topup_admin"
                              ? "Admin Grant"
                              : AI_ACTION_LABELS[entry.action_type as AiActionType] || entry.action_type}
                          </td>
                          <td className={`px-4 py-2 text-right font-medium ${entry.credits_used < 0 ? "text-green-600" : "text-slate-700"}`}>
                            {entry.credits_used < 0 ? `+${Math.abs(entry.credits_used)}` : `-${entry.credits_used}`}
                          </td>
                          <td className="px-4 py-2 text-slate-400 whitespace-nowrap">{formatDate(entry.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-6">Unable to load credit data.</p>
        )}
      </div>
    </section>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tab 1: My Billing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function MyBillingTab({
  roaster,
  stripeStatus,
  isConnected,
  hasRequirements,
  payouts,
  invoices,
  connecting,
  vatNumber,
  billingEmail,
  saving,
  saved,
  onConnect,
  onSetVatNumber,
  onSetBillingEmail,
  onSave,
  formatDate,
  formatCurrency,
}: {
  roaster: RoasterData;
  stripeStatus: StripeStatus | null;
  isConnected: boolean | undefined;
  hasRequirements: boolean | "" | 0 | null | undefined;
  payouts: Payout[];
  invoices: Invoice[];
  connecting: boolean;
  vatNumber: string;
  billingEmail: string;
  saving: boolean;
  saved: boolean;
  onConnect: () => void;
  onSetVatNumber: (v: string) => void;
  onSetBillingEmail: (v: string) => void;
  onSave: () => void;
  formatDate: (d: string) => string;
  formatCurrency: (a: number) => string;
}) {
  return (
    <div className="space-y-6">
      {/* ─── Section 1: Payouts ─── */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              Payouts
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Recent payouts to your bank account from Stripe.
          </p>
        </div>
        <div className="p-6">
          {!isConnected ? (
            <PromptConnect message="Connect Stripe to view your payout history." />
          ) : payouts.length === 0 ? (
            <div className="text-center py-6">
              <Landmark className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                No payouts yet. Payouts are processed automatically by
                Stripe once you start receiving orders.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider pb-3">
                      Date
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider pb-3">
                      Amount
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider pb-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider pb-3 hidden sm:table-cell">
                      Destination
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payouts.map((payout) => (
                    <tr key={payout.id}>
                      <td className="py-3 text-sm text-slate-700">
                        {formatDate(payout.arrival_date)}
                      </td>
                      <td className="py-3 text-sm font-medium text-slate-900">
                        {formatCurrency(payout.amount)}
                      </td>
                      <td className="py-3">
                        <PayoutStatus status={payout.status} />
                      </td>
                      <td className="py-3 text-sm text-slate-500 hidden sm:table-cell">
                        {payout.destination || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ─── Section 4: Invoices & Settings ─── */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              Invoices
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Your invoice history and billing details used on invoices.
          </p>
        </div>
        <div className="p-6 space-y-6">
          {invoices.length === 0 ? (
            <div className="text-center py-6">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                No invoices yet. Invoices will appear here when generated.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider pb-3">
                      Invoice
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider pb-3">
                      Date
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider pb-3">
                      Amount
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider pb-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-3 text-sm font-mono text-slate-700">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 text-sm text-slate-700">
                        {formatDate(inv.created_at)}
                      </td>
                      <td className="py-3 text-sm font-medium text-slate-900">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="py-3">
                        <InvoiceStatus status={inv.payment_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Invoice settings */}
          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">
              Invoice Details
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              These details appear on invoices you send to wholesale
              customers and invoices you receive from Roastery Platform.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Business Name
                </label>
                <input
                  type="text"
                  value={roaster.business_name}
                  disabled
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-500 bg-slate-50"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Update in Business Info settings
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Billing Email
                </label>
                <input
                  type="email"
                  value={billingEmail}
                  onChange={(e) => onSetBillingEmail(e.target.value)}
                  placeholder={roaster.email}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Business Address
                </label>
                <input
                  type="text"
                  value={
                    [roaster.address_line_1, roaster.city, roaster.postcode]
                      .filter(Boolean)
                      .join(", ") || "Not set"
                  }
                  disabled
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-500 bg-slate-50"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Update in Business Info settings
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  VAT Number
                </label>
                <input
                  type="text"
                  value={vatNumber}
                  onChange={(e) => onSetVatNumber(e.target.value)}
                  placeholder="e.g. GB123456789"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={onSave}
                disabled={saving}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Details"}
              </button>
              {saved && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Saved
                </span>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tab 2: Customer Billing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function CustomerBillingTab({
  roaster,
  invoicePrefix,
  defaultPaymentTerms,
  invoiceCurrency,
  bankName,
  bankAccountNumber,
  bankSortCode,
  paymentInstructions,
  latePaymentTerms,
  autoCreateInvoices,
  autoSendInvoices,
  invoiceReminderEnabled,
  reminderDaysBeforeDue,
  saving,
  saved,
  onSetInvoicePrefix,
  onSetDefaultPaymentTerms,
  onSetInvoiceCurrency,
  onSetBankName,
  onSetBankAccountNumber,
  onSetBankSortCode,
  onSetPaymentInstructions,
  onSetLatePaymentTerms,
  onSetAutoCreateInvoices,
  onSetAutoSendInvoices,
  onSetInvoiceReminderEnabled,
  onSetReminderDaysBeforeDue,
  onSave,
  maskAccountNumber,
}: {
  roaster: RoasterData;
  invoicePrefix: string;
  defaultPaymentTerms: number;
  invoiceCurrency: string;
  bankName: string;
  bankAccountNumber: string;
  bankSortCode: string;
  paymentInstructions: string;
  latePaymentTerms: string;
  autoCreateInvoices: boolean;
  autoSendInvoices: boolean;
  invoiceReminderEnabled: boolean;
  reminderDaysBeforeDue: number;
  saving: boolean;
  saved: boolean;
  onSetInvoicePrefix: (v: string) => void;
  onSetDefaultPaymentTerms: (v: number) => void;
  onSetInvoiceCurrency: (v: string) => void;
  onSetBankName: (v: string) => void;
  onSetBankAccountNumber: (v: string) => void;
  onSetBankSortCode: (v: string) => void;
  onSetPaymentInstructions: (v: string) => void;
  onSetLatePaymentTerms: (v: string) => void;
  onSetAutoCreateInvoices: (v: boolean) => void;
  onSetAutoSendInvoices: (v: boolean) => void;
  onSetInvoiceReminderEnabled: (v: boolean) => void;
  onSetReminderDaysBeforeDue: (v: number) => void;
  onSave: () => void;
  maskAccountNumber: (n: string) => string;
}) {
  const addressLine = [roaster.address_line_1, roaster.city, roaster.postcode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      {/* ─── Read-only Business Info ─── */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              Your Business Details
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            This information appears on invoices you send to customers.
          </p>
        </div>
        <div className="p-6">
          <div className="flex items-start gap-5">
            {roaster.storefront_logo_url ? (
              <img
                src={roaster.storefront_logo_url}
                alt={roaster.business_name}
                className="w-16 h-16 rounded-xl object-contain bg-slate-50 border border-slate-200 flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-7 h-7 text-slate-400" />
              </div>
            )}
            <div className="space-y-1.5">
              <p className="text-base font-semibold text-slate-900">
                {roaster.business_name}
              </p>
              {addressLine && (
                <p className="text-sm text-slate-500">{addressLine}</p>
              )}
              <p className="text-sm text-slate-500">{roaster.email}</p>
              {roaster.vat_number && (
                <p className="text-sm text-slate-500">
                  {`VAT: ${roaster.vat_number}`}
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            To update these details, go to{" "}
            <a href="/settings/business" className="text-brand-600 hover:underline">
              Business Info
            </a>{" "}
            settings.
          </p>
        </div>
      </section>

      {/* ─── Invoice Configuration ─── */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              Invoice Settings
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Configure defaults for invoices you send to wholesale customers.
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Invoice Prefix
              </label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => onSetInvoicePrefix(e.target.value.toUpperCase())}
                placeholder="INV"
                maxLength={10}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                {`Invoices will be numbered ${invoicePrefix || "INV"}-0001, ${invoicePrefix || "INV"}-0002, etc.`}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Default Payment Terms
              </label>
              <select
                value={defaultPaymentTerms}
                onChange={(e) => onSetDefaultPaymentTerms(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                {PAYMENT_TERMS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Invoice Currency
              </label>
              <select
                value={invoiceCurrency}
                onChange={(e) => onSetInvoiceCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                {CURRENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Bank / Payment Details ─── */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              Bank & Payment Details
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Bank details printed on invoices for bank transfer payments.
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => onSetBankName(e.target.value)}
                placeholder="e.g. Barclays"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Account Number
              </label>
              <input
                type="text"
                value={bankAccountNumber}
                onChange={(e) => onSetBankAccountNumber(e.target.value)}
                placeholder="12345678"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {bankAccountNumber && bankAccountNumber.length > 4 && (
                <p className="text-xs text-slate-400 mt-1">
                  {`Shown on invoices as: ${maskAccountNumber(bankAccountNumber)}`}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Sort Code / IBAN
              </label>
              <input
                type="text"
                value={bankSortCode}
                onChange={(e) => onSetBankSortCode(e.target.value)}
                placeholder="e.g. 20-00-00 or GB29NWBK60161331926819"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="mt-4 max-w-2xl">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Payment Instructions
            </label>
            <textarea
              value={paymentInstructions}
              onChange={(e) => onSetPaymentInstructions(e.target.value)}
              placeholder="e.g. Please reference your invoice number when making payment."
              rows={3}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="mt-4 max-w-2xl">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Late Payment Terms
            </label>
            <textarea
              value={latePaymentTerms}
              onChange={(e) => onSetLatePaymentTerms(e.target.value)}
              placeholder="e.g. Interest will be charged at 8% above the Bank of England base rate on overdue invoices."
              rows={2}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
        </div>
      </section>

      {/* ─── Automation ─── */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              Automation
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Configure automatic invoice creation, sending, and payment reminders.
          </p>
        </div>
        <div className="p-6 space-y-5">
          {/* Auto-create toggle */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900">
                Auto-create invoices
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically generate invoices when wholesale orders are placed or paid via Stripe.
              </p>
            </div>
            <button
              onClick={() => {
                const newValue = !autoCreateInvoices;
                onSetAutoCreateInvoices(newValue);
                // Turn off auto-send if auto-create is being disabled
                if (!newValue && autoSendInvoices) {
                  onSetAutoSendInvoices(false);
                }
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                autoCreateInvoices ? "bg-brand-600" : "bg-slate-200"
              }`}
              role="switch"
              aria-checked={autoCreateInvoices}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoCreateInvoices ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Auto-send toggle */}
          <div className="border-t border-slate-100 pt-5">
            <div className={`flex items-start justify-between gap-4 ${!autoCreateInvoices ? "opacity-50" : ""}`}>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Auto-send invoices
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automatically email invoices to customers when an order is confirmed.
                  {!autoCreateInvoices && (
                    <span className="block text-xs text-amber-600 mt-0.5">
                      Enable auto-create invoices first.
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => onSetAutoSendInvoices(!autoSendInvoices)}
                disabled={!autoCreateInvoices}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                  !autoCreateInvoices ? "cursor-not-allowed" : "cursor-pointer"
                } ${
                  autoSendInvoices && autoCreateInvoices ? "bg-brand-600" : "bg-slate-200"
                }`}
                role="switch"
                aria-checked={autoSendInvoices}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    autoSendInvoices && autoCreateInvoices ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Reminder toggle */}
          <div className="border-t border-slate-100 pt-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-slate-500" />
                  <p className="text-sm font-medium text-slate-900">
                    Payment reminders
                  </p>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Send automatic reminders to customers before payment is due.
                </p>
              </div>
              <button
                onClick={() => onSetInvoiceReminderEnabled(!invoiceReminderEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                  invoiceReminderEnabled ? "bg-brand-600" : "bg-slate-200"
                }`}
                role="switch"
                aria-checked={invoiceReminderEnabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    invoiceReminderEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {invoiceReminderEnabled && (
              <div className="mt-3 ml-6 max-w-xs">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Remind
                </label>
                <select
                  value={reminderDaysBeforeDue}
                  onChange={(e) => onSetReminderDaysBeforeDue(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  {REMINDER_DAYS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "Saving..." : "Save Customer Billing Settings"}
        </button>
        {saved && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            Saved
          </span>
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Small helper components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function StatusBadge({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
      {enabled ? (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      ) : (
        <XCircle className="w-4 h-4 text-red-500" />
      )}
      <span className="text-sm text-slate-700">
        {`${label}: ${enabled ? "Enabled" : "Disabled"}`}
      </span>
    </div>
  );
}

function PromptConnect({ message }: { message: string }) {
  return (
    <div className="text-center py-6">
      <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

function PayoutStatus({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    paid: { label: "Paid", className: "bg-green-50 text-green-700" },
    pending: { label: "Pending", className: "bg-yellow-50 text-yellow-700" },
    in_transit: { label: "In Transit", className: "bg-blue-50 text-blue-700" },
    failed: { label: "Failed", className: "bg-red-50 text-red-700" },
    canceled: { label: "Cancelled", className: "bg-slate-100 text-slate-600" },
  };
  const c = config[status] || { label: status, className: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}

function InvoiceStatus({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    paid: { label: "Paid", className: "bg-green-50 text-green-700" },
    unpaid: { label: "Unpaid", className: "bg-yellow-50 text-yellow-700" },
    overdue: { label: "Overdue", className: "bg-red-50 text-red-700" },
    pending: { label: "Pending", className: "bg-blue-50 text-blue-700" },
    cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-600" },
  };
  const c = config[status] || { label: status, className: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}
