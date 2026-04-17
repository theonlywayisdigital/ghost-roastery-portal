"use client";

import { useState } from "react";

const TERMS_OPTIONS = [
  { value: "net7", label: "Net 7" },
  { value: "net14", label: "Net 14" },
  { value: "net30", label: "Net 30" },
];

export function SettingsSection({
  autoApprove: initialAutoApprove,
  wholesaleStripeEnabled: initialStripeEnabled,
  autoApprovePaymentTerms: initialTerms,
  roasterId,
}: {
  autoApprove: boolean;
  wholesaleStripeEnabled: boolean;
  autoApprovePaymentTerms: string;
  roasterId: string;
}) {
  const [autoApprove, setAutoApprove] = useState(initialAutoApprove);
  const [wholesaleStripeEnabled, setWholesaleStripeEnabled] = useState(initialStripeEnabled);
  const [paymentTerms, setPaymentTerms] = useState(initialTerms);
  const [saving, setSaving] = useState<string | null>(null);

  async function toggleSetting(key: string, newValue: boolean) {
    setSaving(key);

    try {
      const res = await fetch("/api/wholesale-buyers/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newValue }),
      });

      if (res.ok) {
        if (key === "autoApproveWholesale") setAutoApprove(newValue);
        if (key === "wholesaleStripeEnabled") setWholesaleStripeEnabled(newValue);
      }
    } finally {
      setSaving(null);
    }
  }

  async function updatePaymentTerms(value: string) {
    setPaymentTerms(value);
    setSaving("paymentTerms");

    try {
      await fetch("/api/wholesale-buyers/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoApprovePaymentTerms: value }),
      });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">
            Auto-approve wholesale requests
          </p>
          {autoApprove && (
            <p className="text-xs text-slate-500 mt-0.5">
              New applications will be auto-approved with Standard pricing.
            </p>
          )}
        </div>
        <button
          onClick={() => toggleSetting("autoApproveWholesale", !autoApprove)}
          disabled={saving !== null}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
            autoApprove ? "bg-brand-600" : "bg-slate-200"
          }`}
          role="switch"
          aria-checked={autoApprove}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
              autoApprove ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {autoApprove && (
        <div className="pl-0.5">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Default payment terms
          </label>
          <select
            value={paymentTerms}
            onChange={(e) => updatePaymentTerms(e.target.value)}
            disabled={saving !== null}
            className="w-full max-w-[200px] px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50"
          >
            {TERMS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Payment terms applied to buyers who are automatically approved.
          </p>
        </div>
      )}

      <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">
            Accept Stripe payments for wholesale
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {wholesaleStripeEnabled
              ? "Wholesale buyers can pay via Stripe checkout."
              : "Wholesale orders use invoice checkout only (no online payment)."}
          </p>
        </div>
        <button
          onClick={() => toggleSetting("wholesaleStripeEnabled", !wholesaleStripeEnabled)}
          disabled={saving !== null}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
            wholesaleStripeEnabled ? "bg-brand-600" : "bg-slate-200"
          }`}
          role="switch"
          aria-checked={wholesaleStripeEnabled}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
              wholesaleStripeEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
