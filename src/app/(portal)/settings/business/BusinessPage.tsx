"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Building2,
  Camera,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { SettingsHeader } from "@/components/SettingsHeader";

const BUSINESS_TYPE_OPTIONS = [
  { value: "sole_trader", label: "Sole Trader" },
  { value: "partnership", label: "Partnership" },
  { value: "limited_company", label: "Limited Company" },
  { value: "other", label: "Other" },
];

const COUNTRY_OPTIONS = [
  { value: "GB", label: "United Kingdom" },
  { value: "IE", label: "Ireland" },
  { value: "US", label: "United States" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "NL", label: "Netherlands" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
];

interface BusinessData {
  business_name: string;
  business_type: string;
  registration_number: string;
  vat_registered: boolean;
  vat_number: string;
  email: string;
  business_phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
  storefront_logo_url: string | null;
}

export function BusinessPage({ roasterId }: { roasterId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<BusinessData>({
    business_name: "",
    business_type: "sole_trader",
    registration_number: "",
    vat_registered: false,
    vat_number: "",
    email: "",
    business_phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    county: "",
    postcode: "",
    country: "GB",
    storefront_logo_url: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/business");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load business data:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function updateField<K extends keyof BusinessData>(key: K, value: BusinessData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/settings/business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const json = await res.json();
        setError(json.error || "Failed to save");
      }
    } catch {
      setError("Failed to save business details");
    }
    setSaving(false);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const json = await res.json();
        updateField("storefront_logo_url", json.url);
      } else {
        const json = await res.json();
        setError(json.error || "Failed to upload logo");
      }
    } catch {
      setError("Failed to upload logo");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Business Info</h1>
          <p className="text-slate-500 mt-1">
            These details appear on your invoices and public storefront.
          </p>
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
        title="Business Info"
        description="These details appear on your invoices and public storefront."
        breadcrumb="Business Info"
      />

      <div className="space-y-6">
        {/* ─── Logo ─── */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Business Logo</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-5">
              {data.storefront_logo_url ? (
                <img
                  src={data.storefront_logo_url}
                  alt="Logo"
                  className="w-20 h-20 rounded-xl object-contain border border-slate-200 bg-slate-50"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-slate-400" />
                </div>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  {uploading ? "Uploading..." : data.storefront_logo_url ? "Change Logo" : "Upload Logo"}
                </button>
                <p className="text-xs text-slate-400 mt-2">
                  Also used on your storefront. JPG, PNG, or WebP. Max 5MB.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Business Details ─── */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Business Details</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Business Name
                </label>
                <input
                  type="text"
                  value={data.business_name}
                  onChange={(e) => updateField("business_name", e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Business Type
                </label>
                <select
                  value={data.business_type}
                  onChange={(e) => updateField("business_type", e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  {BUSINESS_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Registration Number
                </label>
                <input
                  type="text"
                  value={data.registration_number}
                  onChange={(e) => updateField("registration_number", e.target.value)}
                  placeholder="Companies House number (optional)"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Business Email
                </label>
                <input
                  type="email"
                  value={data.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="business@example.com"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Business Phone
                </label>
                <input
                  type="tel"
                  value={data.business_phone}
                  onChange={(e) => updateField("business_phone", e.target.value)}
                  placeholder="e.g. +44 20 7946 0958"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* VAT */}
            <div className="mt-6 max-w-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">VAT Registered</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Toggle on if your business is VAT registered.
                  </p>
                </div>
                <button
                  onClick={() => updateField("vat_registered", !data.vat_registered)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                    data.vat_registered ? "bg-brand-600" : "bg-slate-200"
                  }`}
                  role="switch"
                  aria-checked={data.vat_registered}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      data.vat_registered ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {data.vat_registered && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    VAT Number
                  </label>
                  <input
                    type="text"
                    value={data.vat_number}
                    onChange={(e) => updateField("vat_number", e.target.value)}
                    placeholder="e.g. GB123456789"
                    className="max-w-sm w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ─── Address ─── */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Business Address</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Address Line 1
                </label>
                <input
                  type="text"
                  value={data.address_line1}
                  onChange={(e) => updateField("address_line1", e.target.value)}
                  placeholder="Street address"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={data.address_line2}
                  onChange={(e) => updateField("address_line2", e.target.value)}
                  placeholder="Apartment, suite, unit (optional)"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={data.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  County
                </label>
                <input
                  type="text"
                  value={data.county}
                  onChange={(e) => updateField("county", e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Postcode
                </label>
                <input
                  type="text"
                  value={data.postcode}
                  onChange={(e) => updateField("postcode", e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Country
                </label>
                <select
                  value={data.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  {COUNTRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
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
            {saving ? "Saving..." : "Save Business Details"}
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
