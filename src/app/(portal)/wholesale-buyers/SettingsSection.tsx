"use client";

import { useState } from "react";

export function SettingsSection({
  autoApprove: initialAutoApprove,
  wholesaleStripeEnabled: initialStripeEnabled,
  roasterId,
}: {
  autoApprove: boolean;
  wholesaleStripeEnabled: boolean;
  roasterId: string;
}) {
  const [autoApprove, setAutoApprove] = useState(initialAutoApprove);
  const [wholesaleStripeEnabled, setWholesaleStripeEnabled] = useState(initialStripeEnabled);
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

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">
            Auto-approve wholesale requests
          </p>
          {autoApprove && (
            <p className="text-xs text-slate-500 mt-0.5">
              New applications will be auto-approved with Standard pricing and Prepay terms.
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

      <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">
            Accept Stripe payments for wholesale
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {wholesaleStripeEnabled
              ? "Prepay wholesale buyers will pay via Stripe checkout."
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
