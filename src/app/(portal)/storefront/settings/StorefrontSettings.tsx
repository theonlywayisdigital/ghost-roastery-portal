"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "@/components/icons";

interface SettingsData {
  storefront_type: string;
  minimum_wholesale_order: number;
  storefront_seo_title: string;
  storefront_seo_description: string;
  storefront_contact_email: string;
  storefront_contact_phone: string;
  storefront_contact_address: string;
  business_name: string;
}

const inputClassName =
  "w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent";

const SEO_TITLE_MAX = 60;
const SEO_DESCRIPTION_MAX = 160;

export function StorefrontSettings({ settings }: { settings: SettingsData }) {
  const router = useRouter();

  const [storefrontType, setStorefrontType] = useState(settings.storefront_type);
  const [minOrder, setMinOrder] = useState(settings.minimum_wholesale_order.toString());
  const [seoTitle, setSeoTitle] = useState(settings.storefront_seo_title);
  const [seoDescription, setSeoDescription] = useState(settings.storefront_seo_description);

  const [contactEmail, setContactEmail] = useState(settings.storefront_contact_email);
  const [contactPhone, setContactPhone] = useState(settings.storefront_contact_phone);
  const [contactAddress, setContactAddress] = useState(settings.storefront_contact_address);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch("/api/storefront/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storefront_type: storefrontType,
          minimum_wholesale_order: parseInt(minOrder) || 1,
          storefront_seo_title: seoTitle || null,
          storefront_seo_description: seoDescription || null,
          storefront_contact_email: contactEmail || null,
          storefront_contact_phone: contactPhone || null,
          storefront_contact_address: contactAddress || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [storefrontType, minOrder, seoTitle, seoDescription, contactEmail, contactPhone, contactAddress, router]);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Storefront type */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">
          Storefront type
        </h3>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Type
            </label>
            <select
              value={storefrontType}
              onChange={(e) => setStorefrontType(e.target.value)}
              className={inputClassName}
            >
              <option value="wholesale">Wholesale only</option>
              <option value="retail">Retail only</option>
              <option value="both">Both wholesale and retail</option>
            </select>
          </div>

          {(storefrontType === "wholesale" || storefrontType === "both") && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Minimum wholesale order (units)
              </label>
              <input
                type="number"
                min="1"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                className={`${inputClassName} max-w-[150px]`}
              />
            </div>
          )}
        </div>
      </div>

      {/* SEO */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">
          Search engine optimisation
        </h3>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              SEO title{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder={settings.business_name}
              className={inputClassName}
            />
            <p className={`text-xs mt-1 ${seoTitle.length > SEO_TITLE_MAX ? "text-red-500" : "text-slate-400"}`}>
              {`${seoTitle.length} / ${SEO_TITLE_MAX} characters`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              SEO description{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="A short description for search engines…"
              rows={3}
              className={inputClassName}
            />
            <p className={`text-xs mt-1 ${seoDescription.length > SEO_DESCRIPTION_MAX ? "text-red-500" : "text-slate-400"}`}>
              {`${seoDescription.length} / ${SEO_DESCRIPTION_MAX} characters`}
            </p>
          </div>
        </div>
      </div>

      {/* Contact details */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">
          Contact details
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Displayed on your storefront contact page.
        </p>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="hello@yourbrand.com"
              className={inputClassName}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Phone{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="07..."
              className={inputClassName}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Address{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={contactAddress}
              onChange={(e) => setContactAddress(e.target.value)}
              placeholder="Your business address"
              rows={3}
              className={inputClassName}
            />
          </div>
        </div>
      </div>

      {/* Save bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving…
            </>
          ) : saved ? (
            <>
              <Check className="w-4 h-4" />
              Saved
            </>
          ) : (
            "Save Changes"
          )}
        </button>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>
    </div>
  );
}
