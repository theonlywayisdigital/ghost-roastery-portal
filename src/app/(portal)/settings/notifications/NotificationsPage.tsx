"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  ShoppingCart,
  Users,
  Megaphone,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
} from "@/components/icons";
import { SettingsHeader } from "@/components/SettingsHeader";

interface PreferenceConfig {
  key: string;
  label: string;
  description: string;
  locked?: boolean;
  lockedNote?: string;
}

const ORDER_PREFERENCES: PreferenceConfig[] = [
  {
    key: "new_storefront_order",
    label: "New portal order",
    description: "Get notified when a customer places an order through your wholesale portal.",
  },
  {
    key: "new_wholesale_order",
    label: "New wholesale order",
    description: "Get notified when a wholesale buyer places an order.",
  },
  {
    key: "new_ghost_roastery_order",
    label: "New Ghost Roastery order",
    description: "Get notified when Ghost Roastery assigns a new order to you.",
  },
  {
    key: "order_status_updated",
    label: "Order status updated by customer",
    description: "Get notified when a customer updates or cancels an order.",
  },
];

const CUSTOMER_PREFERENCES: PreferenceConfig[] = [
  {
    key: "new_wholesale_application",
    label: "New wholesale application",
    description: "Get notified when someone applies for a wholesale account.",
  },
  {
    key: "new_contact_enquiry",
    label: "New contact form enquiry",
    description: "Get notified when someone submits a contact form on your wholesale portal.",
  },
];

const MARKETING_PREFERENCES: PreferenceConfig[] = [
  {
    key: "ghost_roastery_newsletter",
    label: "Ghost Roastery newsletter",
    description: "Monthly updates about the platform, new features, and partner news.",
  },
  {
    key: "product_tips_updates",
    label: "Product tips and updates",
    description: "Tips on improving your wholesale portal, SEO, and product listings.",
  },
  {
    key: "platform_maintenance",
    label: "Platform maintenance alerts",
    description: "Notifications about scheduled maintenance and downtime.",
    locked: true,
    lockedNote: "Required",
  },
];

export function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});

  const loadPreferences = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/notifications");
      if (res.ok) {
        const data = await res.json();
        setPreferences(data.preferences);
      }
    } catch (err) {
      console.error("Failed to load notification preferences:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  function togglePreference(key: string) {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch {
      setError("Failed to save preferences");
    }
    setSaving(false);
  }

  function renderToggle(pref: PreferenceConfig) {
    const enabled = preferences[pref.key] ?? true;
    const isLocked = pref.locked;

    return (
      <div
        key={pref.key}
        className="flex items-start justify-between gap-4 py-4"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-900">{pref.label}</p>
            {isLocked && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                <Lock className="w-3 h-3" />
                {pref.lockedNote}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{pref.description}</p>
        </div>
        <button
          onClick={() => !isLocked && togglePreference(pref.key)}
          disabled={isLocked}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
            isLocked
              ? "bg-brand-600 cursor-not-allowed opacity-60"
              : enabled
                ? "bg-brand-600 cursor-pointer"
                : "bg-slate-200 cursor-pointer"
          }`}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 mt-1">Choose which email notifications you receive.</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <SettingsHeader
        title="Notifications"
        description="Choose which email notifications you receive."
        breadcrumb="Notifications"
      />

      <div className="space-y-6">
        {/* ─── Section 1: Order Notifications ─── */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Order Notifications</h2>
            </div>
          </div>
          <div className="px-6 divide-y divide-slate-100">
            {ORDER_PREFERENCES.map(renderToggle)}
          </div>
        </section>

        {/* ─── Section 2: Customer Notifications ─── */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Customer Notifications</h2>
            </div>
          </div>
          <div className="px-6 divide-y divide-slate-100">
            {CUSTOMER_PREFERENCES.map(renderToggle)}
          </div>
        </section>

        {/* ─── Section 3: Marketing & Platform ─── */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Marketing & Platform</h2>
            </div>
          </div>
          <div className="px-6 divide-y divide-slate-100">
            {MARKETING_PREFERENCES.map(renderToggle)}
          </div>
        </section>

        {/* ─── Save ─── */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Preferences"}
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
