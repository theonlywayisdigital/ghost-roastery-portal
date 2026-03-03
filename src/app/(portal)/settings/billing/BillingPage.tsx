"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Receipt,
  Percent,
  Landmark,
  XCircle,
  ArrowRight,
  FileText,
  Building2,
  Send,
  Bell,
  Save,
} from "lucide-react";
import { SettingsHeader } from "@/components/SettingsHeader";

interface RoasterData {
  id: string;
  business_name: string;
  email: string;
  address_line1: string;
  address_line2: string;
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
  auto_send_invoices: boolean;
  invoice_reminder_enabled: boolean;
  reminder_days_before_due: number;
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

type Tab = "my-billing" | "customer-billing";

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

export function BillingPage({ roaster }: { roaster: RoasterData }) {
  const [activeTab, setActiveTab] = useState<Tab>("my-billing");
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

  // Customer Billing settings form
  const [invoicePrefix, setInvoicePrefix] = useState(roaster.invoice_prefix);
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState(roaster.default_payment_terms);
  const [invoiceCurrency, setInvoiceCurrency] = useState(roaster.invoice_currency);
  const [bankName, setBankName] = useState(roaster.bank_name);
  const [bankAccountNumber, setBankAccountNumber] = useState(roaster.bank_account_number);
  const [bankSortCode, setBankSortCode] = useState(roaster.bank_sort_code);
  const [paymentInstructions, setPaymentInstructions] = useState(roaster.payment_instructions);
  const [latePaymentTerms, setLatePaymentTerms] = useState(roaster.late_payment_terms);
  const [autoSendInvoices, setAutoSendInvoices] = useState(roaster.auto_send_invoices);
  const [invoiceReminderEnabled, setInvoiceReminderEnabled] = useState(roaster.invoice_reminder_enabled);
  const [reminderDaysBeforeDue, setReminderDaysBeforeDue] = useState(roaster.reminder_days_before_due);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [savedCustomer, setSavedCustomer] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, payoutsRes, invoicesRes] = await Promise.all([
        fetch("/api/storefront/stripe/status"),
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

  async function handleConnect() {
    setConnecting(true);
    try {
      const res = await fetch("/api/storefront/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnPath: "/settings/billing?stripe=complete",
          refreshPath: "/settings/billing?stripe=refresh",
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

      {loading ? (
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
      {/* ─── Section 1: Stripe Connect ─── */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              Stripe Connect
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Accept payments through your storefront via Stripe.
          </p>
        </div>
        <div className="p-6">
          {!stripeStatus?.connected ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-base font-medium text-slate-900 mb-1">
                Connect your Stripe account
              </h3>
              <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                Connect Stripe to accept card payments, Apple Pay, and Google
                Pay on your storefront. Payouts go directly to your bank
                account.
              </p>
              <button
                onClick={onConnect}
                disabled={connecting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {connecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                {connecting ? "Redirecting..." : "Connect Stripe"}
              </button>
            </div>
          ) : !stripeStatus.onboarding_complete ? (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-medium text-slate-900">
                  Setup incomplete
                </h3>
                <p className="text-sm text-slate-500 mt-1 mb-4">
                  Your Stripe account has been created but onboarding isn't
                  finished. Complete setup to start accepting payments.
                </p>
                <button
                  onClick={onConnect}
                  disabled={connecting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {connecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  {connecting ? "Redirecting..." : "Complete Setup"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-medium text-slate-900">
                    Stripe connected
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Your account is set up and ready to accept payments.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatusBadge
                  label="Charges"
                  enabled={stripeStatus.charges_enabled}
                />
                <StatusBadge
                  label="Payouts"
                  enabled={stripeStatus.payouts_enabled}
                />
                {stripeStatus.external_accounts.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                    <Landmark className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-700">
                      {stripeStatus.external_accounts[0].bank_name
                        ? `${stripeStatus.external_accounts[0].bank_name} ****${stripeStatus.external_accounts[0].last4}`
                        : `****${stripeStatus.external_accounts[0].last4}`}
                    </span>
                  </div>
                )}
              </div>

              {hasRequirements && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <h4 className="text-sm font-medium text-yellow-800">
                      Action required
                    </h4>
                  </div>
                  <p className="text-sm text-yellow-700 mb-3">
                    Stripe requires additional information to keep your
                    account active.
                  </p>
                  <button
                    onClick={onConnect}
                    disabled={connecting}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50"
                  >
                    {connecting ? "Redirecting..." : "Update information"}
                  </button>
                </div>
              )}

              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700"
              >
                Manage in Stripe Dashboard
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </section>

      {/* ─── Section 2: Platform Fees ─── */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              Platform Fees
            </h2>
          </div>
        </div>
        <div className="p-6">
          {!isConnected ? (
            <PromptConnect message="Connect Stripe to view your fee structure." />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Transaction fee
                  </p>
                  <p className="text-xs text-slate-500">
                    Deducted from each storefront sale before payout
                  </p>
                </div>
                <span className="text-lg font-semibold text-slate-900">
                  {`${roaster.platform_fee_percent}%`}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Stripe processing
                  </p>
                  <p className="text-xs text-slate-500">
                    Standard Stripe fees (1.4% + 20p for UK cards)
                  </p>
                </div>
                <span className="text-sm text-slate-500">
                  Charged by Stripe
                </span>
              </div>
              <p className="text-xs text-slate-400 pt-2">
                Platform fees are set by Ghost Roastery and cannot be changed
                here. Contact us if you have questions.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ─── Section 3: Payouts ─── */}
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
              customers and invoices you receive from Ghost Roastery.
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
                    [roaster.address_line1, roaster.city, roaster.postcode]
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
  onSetAutoSendInvoices: (v: boolean) => void;
  onSetInvoiceReminderEnabled: (v: boolean) => void;
  onSetReminderDaysBeforeDue: (v: number) => void;
  onSave: () => void;
  maskAccountNumber: (n: string) => string;
}) {
  const addressLine = [roaster.address_line1, roaster.city, roaster.postcode]
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
            Configure automatic invoice sending and payment reminders.
          </p>
        </div>
        <div className="p-6 space-y-5">
          {/* Auto-send toggle */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900">
                Auto-send invoices
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically email invoices to customers when an order is confirmed.
              </p>
            </div>
            <button
              onClick={() => onSetAutoSendInvoices(!autoSendInvoices)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                autoSendInvoices ? "bg-brand-600" : "bg-slate-200"
              }`}
              role="switch"
              aria-checked={autoSendInvoices}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoSendInvoices ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
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
