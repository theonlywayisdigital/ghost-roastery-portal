"use client";

import { useState } from "react";
import { X, Loader2 } from "@/components/icons";

const BUSINESS_TYPE_OPTIONS = [
  { value: "cafe", label: "Caf\u00e9" },
  { value: "restaurant", label: "Restaurant" },
  { value: "hotel", label: "Hotel" },
  { value: "office", label: "Office" },
  { value: "retailer", label: "Retailer" },
  { value: "gym", label: "Gym" },
  { value: "coworking", label: "Coworking" },
  { value: "events", label: "Events" },
  { value: "retail", label: "Retail" },
  { value: "other", label: "Other" },
];

const VOLUME_OPTIONS = [
  "Under 5kg",
  "5\u201320kg",
  "20\u201350kg",
  "50kg+",
];

const TERMS_OPTIONS = [
  { value: "prepay", label: "Prepay" },
  { value: "net7", label: "Net 7" },
  { value: "net14", label: "Net 14" },
  { value: "net30", label: "Net 30" },
];

interface AddWholesaleCustomerModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddWholesaleCustomerModal({
  onClose,
  onSuccess,
}: AddWholesaleCustomerModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    businessName: "",
    businessType: "",
    businessAddress: "",
    businessWebsite: "",
    vatNumber: "",
    monthlyVolume: "",
    paymentTerms: "prepay",
    notes: "",
  });

  function updateField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/wholesale-buyers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone || undefined,
          businessName: form.businessName,
          businessType: form.businessType || undefined,
          businessAddress: form.businessAddress || undefined,
          businessWebsite: form.businessWebsite || undefined,
          vatNumber: form.vatNumber || undefined,
          monthlyVolume: form.monthlyVolume || undefined,
          notes: form.notes || undefined,
          paymentTerms: form.paymentTerms,
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add wholesale customer.");
      }
    } catch {
      setError("Failed to add wholesale customer.");
    }

    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h3 className="text-lg font-semibold text-slate-900">
            Add Wholesale Customer
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Contact Details */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-3">
              Contact Details
            </h4>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Business Details */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-3">
              Business Details
            </h4>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.businessName}
                    onChange={(e) => updateField("businessName", e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Business Type
                  </label>
                  <select
                    value={form.businessType}
                    onChange={(e) => updateField("businessType", e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select type...</option>
                    {BUSINESS_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Business Address
                </label>
                <input
                  type="text"
                  value={form.businessAddress}
                  onChange={(e) => updateField("businessAddress", e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={form.businessWebsite}
                    onChange={(e) =>
                      updateField("businessWebsite", e.target.value)
                    }
                    placeholder="https://"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    VAT Number
                  </label>
                  <input
                    type="text"
                    value={form.vatNumber}
                    onChange={(e) => updateField("vatNumber", e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Estimated Monthly Volume
                </label>
                <select
                  value={form.monthlyVolume}
                  onChange={(e) => updateField("monthlyVolume", e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select volume...</option>
                  {VOLUME_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Wholesale Terms */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-3">
              Wholesale Terms
            </h4>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Payment Terms
              </label>
              <select
                value={form.paymentTerms}
                onChange={(e) => updateField("paymentTerms", e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {TERMS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={3}
              placeholder="Any additional notes about this customer..."
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.firstName || !form.email || !form.businessName}
              className="flex-1 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Add Customer"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
