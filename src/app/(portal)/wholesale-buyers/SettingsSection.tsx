"use client";

import { useState } from "react";

export function SettingsSection({
  autoApprove: initial,
  roasterId,
}: {
  autoApprove: boolean;
  roasterId: string;
}) {
  const [autoApprove, setAutoApprove] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function toggleAutoApprove() {
    setSaving(true);
    const newValue = !autoApprove;

    try {
      const res = await fetch("/api/wholesale-buyers/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoApproveWholesale: newValue }),
      });

      if (res.ok) {
        setAutoApprove(newValue);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
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
          onClick={toggleAutoApprove}
          disabled={saving}
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
    </div>
  );
}
