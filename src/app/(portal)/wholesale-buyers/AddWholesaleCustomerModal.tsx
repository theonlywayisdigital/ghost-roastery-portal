"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Loader2, Search, Check } from "@/components/icons";

const BUSINESS_TYPE_OPTIONS = [
  { value: "cafe", label: "Caf\u00e9" },
  { value: "restaurant", label: "Restaurant" },
  { value: "hotel", label: "Hotel" },
  { value: "office", label: "Office" },
  { value: "retailer", label: "Retailer" },
  { value: "other", label: "Other" },
];

const VOLUME_OPTIONS = [
  "Under 5kg",
  "5\u201320kg",
  "20\u201350kg",
  "50kg+",
];

const TERMS_OPTIONS = [
  { value: "net7", label: "Net 7" },
  { value: "net14", label: "Net 14" },
  { value: "net30", label: "Net 30" },
];

interface SearchContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  business_name: string | null;
  businesses: { id: string; name: string } | null;
}

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

  // Contact search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchContact[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedContact, setSelectedContact] = useState<SearchContact | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    businessName: "",
    businessType: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    county: "",
    postcode: "",
    businessWebsite: "",
    vatNumber: "",
    monthlyVolume: "",
    paymentTerms: "net30",
    notes: "",
  });

  function updateField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Debounced contact search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `/api/contacts?search=${encodeURIComponent(searchQuery)}&status=active`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.contacts || []);
          setShowDropdown(true);
        }
      } catch {
        // Silently fail — search is optional
      }
      setSearchLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectContact = useCallback((contact: SearchContact) => {
    setSelectedContact(contact);
    setSearchQuery("");
    setShowDropdown(false);
    setForm((f) => ({
      ...f,
      firstName: contact.first_name || "",
      lastName: contact.last_name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      businessName: contact.businesses?.name || contact.business_name || "",
    }));
  }, []);

  const handleClearContact = useCallback(() => {
    setSelectedContact(null);
    setSearchQuery("");
    setForm((f) => ({
      ...f,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      businessName: "",
    }));
  }, []);

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
          addressLine1: form.addressLine1 || undefined,
          addressLine2: form.addressLine2 || undefined,
          city: form.city || undefined,
          county: form.county || undefined,
          postcode: form.postcode || undefined,
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
              {/* Contact Search */}
              <div ref={dropdownRef} className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Link Existing Contact{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                {selectedContact ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-brand-50 border border-brand-200 rounded-lg text-sm">
                    <Check className="w-4 h-4 text-brand-600 shrink-0" />
                    <span className="text-slate-900">
                      Linked to:{" "}
                      <span className="font-medium">
                        {selectedContact.first_name} {selectedContact.last_name}
                      </span>
                      {selectedContact.email && (
                        <span className="text-slate-500"> — {selectedContact.email}</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearContact}
                      className="ml-auto text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search contacts by name or email..."
                      className="w-full pl-9 pr-9 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    {searchLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                    )}
                  </div>
                )}
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => handleSelectContact(contact)}
                        className="w-full text-left px-3 py-2.5 hover:bg-slate-50 text-sm border-b border-slate-100 last:border-b-0"
                      >
                        <span className="font-medium text-slate-900">
                          {contact.first_name} {contact.last_name}
                        </span>
                        {contact.email && (
                          <span className="text-slate-500"> — {contact.email}</span>
                        )}
                        {(contact.businesses?.name || contact.business_name) && (
                          <span className="text-slate-400">
                            {" "}
                            — {contact.businesses?.name || contact.business_name}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && searchQuery.length >= 2 && !searchLoading && searchResults.length === 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-3 text-sm text-slate-500">
                    No contacts found
                  </div>
                )}
              </div>

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
                  Address Line 1
                </label>
                <input
                  type="text"
                  value={form.addressLine1}
                  onChange={(e) => updateField("addressLine1", e.target.value)}
                  placeholder="Street address"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={form.addressLine2}
                  onChange={(e) => updateField("addressLine2", e.target.value)}
                  placeholder="Apartment, suite, unit (optional)"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    County
                  </label>
                  <input
                    type="text"
                    value={form.county}
                    onChange={(e) => updateField("county", e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Postcode
                  </label>
                  <input
                    type="text"
                    value={form.postcode}
                    onChange={(e) => updateField("postcode", e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
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
