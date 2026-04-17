"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Landmark,
  Send,
  Bell,
  Save,
  Loader2,
  CheckCircle2,
  Sliders,
} from "@/components/icons";
import type { PlatformSettings } from "@/types/finance";

const PAYMENT_TERMS_OPTIONS = [
  { value: "net7", label: "Net 7 days" },
  { value: "net14", label: "Net 14 days" },
  { value: "net30", label: "Net 30 days" },
];

const REMINDER_DAYS_OPTIONS = [
  { value: 3, label: "3 days before" },
  { value: 5, label: "5 days before" },
  { value: 7, label: "7 days before" },
  { value: 14, label: "14 days before" },
];

export function PlatformSettingsClient() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [invoicePrefix, setInvoicePrefix] = useState("");
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState("net30");
  const [defaultCurrency, setDefaultCurrency] = useState("GBP");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankSortCode, setBankSortCode] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [latePaymentTerms, setLatePaymentTerms] = useState("");
  const [invoiceNotesDefault, setInvoiceNotesDefault] = useState("");
  const [autoSendInvoices, setAutoSendInvoices] = useState(false);
  const [autoReminder, setAutoReminder] = useState(false);
  const [reminderDaysBeforeDue, setReminderDaysBeforeDue] = useState(3);

  useEffect(() => {
    fetch("/api/admin/settings/platform")
      .then((res) => res.json())
      .then((data: PlatformSettings) => {
        setSettings(data);
        setInvoicePrefix(data.invoice_prefix || "");
        setDefaultPaymentTerms(data.default_payment_terms || "net30");
        setDefaultCurrency(data.default_currency || "GBP");
        setBankName(data.bank_name || "");
        setBankAccountNumber(data.bank_account_number || "");
        setBankSortCode(data.bank_sort_code || "");
        setBankIban(data.bank_iban || "");
        setPaymentInstructions(data.payment_instructions || "");
        setLatePaymentTerms(data.late_payment_terms || "");
        setInvoiceNotesDefault(data.invoice_notes_default || "");
        setAutoSendInvoices(data.auto_send_invoices);
        setAutoReminder(data.auto_reminder);
        setReminderDaysBeforeDue(data.reminder_days_before_due);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings/platform", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_prefix: invoicePrefix,
          default_payment_terms: defaultPaymentTerms,
          default_currency: defaultCurrency,
          bank_name: bankName,
          bank_account_number: bankAccountNumber,
          bank_sort_code: bankSortCode,
          bank_iban: bankIban,
          payment_instructions: paymentInstructions,
          late_payment_terms: latePaymentTerms,
          invoice_notes_default: invoiceNotesDefault,
          auto_send_invoices: autoSendInvoices,
          auto_reminder: autoReminder,
          reminder_days_before_due: reminderDaysBeforeDue,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sliders className="w-5 h-5 text-slate-600" />
          <h1 className="text-2xl font-bold text-slate-900">
            Platform Settings
          </h1>
        </div>
        <p className="text-sm text-slate-500">
          Configure Roastery Platform invoice settings and billing defaults.
        </p>
      </div>

      <div className="space-y-6">
        {/* Invoice Configuration */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">
                Invoice Settings
              </h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Configure defaults for Roastery Platform invoices.
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
                  onChange={(e) =>
                    setInvoicePrefix(e.target.value.toUpperCase())
                  }
                  placeholder="GR-INV-"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  {`Invoices will be numbered ${invoicePrefix || "GR-INV-"}0001, ${invoicePrefix || "GR-INV-"}0002, etc.`}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Default Payment Terms
                </label>
                <select
                  value={defaultPaymentTerms}
                  onChange={(e) => setDefaultPaymentTerms(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                  Default Currency
                </label>
                <select
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="GBP">GBP (£)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Bank Details */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">
                Bank & Payment Details
              </h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Bank details printed on Roastery Platform invoices.
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
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Barclays"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Account Number
                </label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="12345678"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Sort Code
                </label>
                <input
                  type="text"
                  value={bankSortCode}
                  onChange={(e) => setBankSortCode(e.target.value)}
                  placeholder="20-00-00"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  IBAN
                </label>
                <input
                  type="text"
                  value={bankIban}
                  onChange={(e) => setBankIban(e.target.value)}
                  placeholder="GB29NWBK60161331926819"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div className="mt-4 max-w-2xl">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Payment Instructions
              </label>
              <textarea
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                placeholder="e.g. Please reference your invoice number when making payment."
                rows={3}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="mt-4 max-w-2xl">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Late Payment Terms
              </label>
              <textarea
                value={latePaymentTerms}
                onChange={(e) => setLatePaymentTerms(e.target.value)}
                placeholder="e.g. Interest will be charged at 8% above the Bank of England base rate."
                rows={2}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="mt-4 max-w-2xl">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Default Invoice Notes
              </label>
              <textarea
                value={invoiceNotesDefault}
                onChange={(e) => setInvoiceNotesDefault(e.target.value)}
                placeholder="Default notes shown on every new invoice."
                rows={2}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </section>

        {/* Automation */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">
                Automation
              </h2>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Auto-send invoices
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automatically email invoices when created.
                </p>
              </div>
              <button
                onClick={() => setAutoSendInvoices(!autoSendInvoices)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  autoSendInvoices ? "bg-brand-600" : "bg-slate-200"
                }`}
                role="switch"
                aria-checked={autoSendInvoices}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    autoSendInvoices ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

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
                    Send automatic reminders before due date.
                  </p>
                </div>
                <button
                  onClick={() => setAutoReminder(!autoReminder)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    autoReminder ? "bg-brand-600" : "bg-slate-200"
                  }`}
                  role="switch"
                  aria-checked={autoReminder}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      autoReminder ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {autoReminder && (
                <div className="mt-3 ml-6 max-w-xs">
                  <select
                    value={reminderDaysBeforeDue}
                    onChange={(e) =>
                      setReminderDaysBeforeDue(Number(e.target.value))
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white"
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

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : "Save Settings"}
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
  );
}
