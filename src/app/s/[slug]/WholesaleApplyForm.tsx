"use client";

import { useState, type FormEvent } from "react";

const BUSINESS_TYPES = [
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

export function WholesaleApplyForm({
  roasterId,
  slug,
  accentColour,
  accentText,
}: {
  roasterId: string;
  slug: string;
  accentColour: string;
  accentText: string;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressCounty, setAddressCounty] = useState("");
  const [addressPostcode, setAddressPostcode] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [monthlyVolume, setMonthlyVolume] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resultStatus, setResultStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/s/wholesale-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roasterId,
          slug,
          name: [firstName, lastName].filter(Boolean).join(" "),
          email,
          phone: phone || null,
          businessName,
          businessType: businessType || null,
          addressLine1: addressLine1 || null,
          addressLine2: addressLine2 || null,
          addressCity: addressCity || null,
          addressCounty: addressCounty || null,
          addressPostcode: addressPostcode || null,
          businessWebsite: businessWebsite || null,
          vatNumber: vatNumber || null,
          monthlyVolume: monthlyVolume || null,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      const data = await res.json();
      setResultStatus(data.status);
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: accentColour + "20" }}
        >
          <svg
            className="w-7 h-7"
            fill="none"
            stroke={accentColour}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">
          {resultStatus === "approved"
            ? "Application Approved!"
            : "Application Submitted"}
        </h3>
        <p className="text-slate-500">
          {resultStatus === "approved"
            ? "Your wholesale account has been approved. Check your email for details on how to get started."
            : "Thanks for applying! We\u2019ll review your application and get back to you soon."}
        </p>
      </div>
    );
  }

  const inputClassName =
    "w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            className={inputClassName}
            style={{ "--tw-ring-color": accentColour } as React.CSSProperties}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            className={inputClassName}
            style={{ "--tw-ring-color": accentColour } as React.CSSProperties}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClassName}
            style={{ "--tw-ring-color": accentColour } as React.CSSProperties}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Phone{" "}
            <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Your phone number"
            className={inputClassName}
            style={{ "--tw-ring-color": accentColour } as React.CSSProperties}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Business Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Your business"
            className={inputClassName}
            style={{ "--tw-ring-color": accentColour } as React.CSSProperties}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Business Type{" "}
            <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <select
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            className={inputClassName}
            style={{ "--tw-ring-color": accentColour } as React.CSSProperties}
          >
            <option value="">Select type...</option>
            {BUSINESS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Business Address{" "}
          <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
          placeholder="Address line 1"
          className={inputClassName}
          style={{ "--tw-ring-color": accentColour } as React.CSSProperties}
        />
      </div>
      <div>
        <input
          type="text"
          value={addressLine2}
          onChange={(e) => setAddressLine2(e.target.value)}
          placeholder="Address line 2 (optional)"
          className={inputClassName}
          style={{ "--tw-ring-color": accentColour } as React.CSSProperties}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <input
            type="text"
            value={addressCity}
            onChange={(e) => setAddressCity(e.target.value)}
            placeholder="City"
            className={inputClassName}
            style={{ "--tw-ring-color": accentColour } as React.CSSProperties}
          />
        </div>
        <div>
          <input
            type="text"
            value={addressCounty}
            onChange={(e) => setAddressCounty(e.target.value)}
            placeholder="County"
            className={inputClassName}
            style={{ "--tw-ring-color": accentColour } as React.CSSProperties}
          />
        </div>
        <div>
          <input
            type="text"
            value={addressPostcode}
            onChange={(e) => setAddressPostcode(e.target.value)}
            placeholder="Postcode"
            className={inputClassName}
            style={{ "--tw-ring-color": accentColour } as React.CSSProperties}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Website{" "}
            <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={businessWebsite}
            onChange={(e) => setBusinessWebsite(e.target.value)}
            placeholder="https://..."
            className={inputClassName}
            style={{ "--tw-ring-color": accentColour } as React.CSSProperties}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            VAT Number{" "}
            <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value)}
            placeholder="GB123456789"
            className={inputClassName}
            style={{ "--tw-ring-color": accentColour } as React.CSSProperties}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Estimated Monthly Volume{" "}
          <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <select
          value={monthlyVolume}
          onChange={(e) => setMonthlyVolume(e.target.value)}
          className={inputClassName}
          style={{ "--tw-ring-color": accentColour } as React.CSSProperties}
        >
          <option value="">Select volume...</option>
          {VOLUME_OPTIONS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Additional Notes{" "}
          <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Tell us about your business and what you're looking for..."
          rows={3}
          className={inputClassName}
          style={{ "--tw-ring-color": accentColour } as React.CSSProperties}
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        style={{ backgroundColor: accentColour, color: accentText, borderRadius: "var(--sf-btn-radius)" }}
        className="w-full py-3 font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Apply for Trade Account"}
      </button>
    </form>
  );
}
