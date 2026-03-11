"use client";

import { useState, type FormEvent } from "react";

export function EnquiryForm({
  roasterId,
  slug,
  accentColour,
  accentText,
  showBusinessField,
}: {
  roasterId: string;
  slug: string;
  accentColour: string;
  accentText: string;
  showBusinessField: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/s/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roaster_id: roasterId,
          slug,
          name,
          email,
          phone: phone || null,
          business_name: businessName || null,
          message,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        className="rounded-xl border p-8 text-center"
        style={{
          backgroundColor: "color-mix(in srgb, var(--sf-text) 8%, transparent)",
          borderColor: "color-mix(in srgb, var(--sf-text) 15%, transparent)",
        }}
      >
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
        <h3
          className="text-xl font-semibold mb-2"
          style={{ color: "var(--sf-text)" }}
        >
          Message Sent
        </h3>
        <p style={{ color: "color-mix(in srgb, var(--sf-text) 55%, transparent)" }}>
          Thanks for your enquiry! We&apos;ll get back to you soon.
        </p>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: "color-mix(in srgb, var(--sf-text) 5%, transparent)",
    borderColor: "color-mix(in srgb, var(--sf-text) 20%, transparent)",
    color: "var(--sf-text)",
  };

  const inputClassName =
    "w-full px-4 py-3 border rounded-lg placeholder:opacity-40 focus:outline-none focus:ring-2 focus:border-transparent";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border p-6 md:p-8 space-y-4"
      style={{
        backgroundColor: "color-mix(in srgb, var(--sf-text) 8%, transparent)",
        borderColor: "color-mix(in srgb, var(--sf-text) 15%, transparent)",
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--sf-text)" }}
          >
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={inputClassName}
            style={{ ...inputStyle, "--tw-ring-color": accentColour } as React.CSSProperties}
          />
        </div>
        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--sf-text)" }}
          >
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClassName}
            style={{ ...inputStyle, "--tw-ring-color": accentColour } as React.CSSProperties}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--sf-text)" }}
          >
            Phone{" "}
            <span className="font-normal opacity-50">(optional)</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07..."
            className={inputClassName}
            style={{ ...inputStyle, "--tw-ring-color": accentColour } as React.CSSProperties}
          />
        </div>
        {showBusinessField && (
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--sf-text)" }}
            >
              Business name{" "}
              <span className="font-normal opacity-50">(optional)</span>
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Your business"
              className={inputClassName}
              style={{ ...inputStyle, "--tw-ring-color": accentColour } as React.CSSProperties}
            />
          </div>
        )}
      </div>

      <div>
        <label
          className="block text-sm font-medium mb-1.5"
          style={{ color: "var(--sf-text)" }}
        >
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what you're looking for..."
          rows={4}
          className={inputClassName}
          style={{ ...inputStyle, "--tw-ring-color": accentColour } as React.CSSProperties}
        />
      </div>

      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          backgroundColor: "var(--sf-btn-colour)",
          color: "var(--sf-btn-text)",
          borderRadius: "var(--sf-btn-radius)",
        }}
        className="w-full py-3 font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {submitting ? "Sending..." : "Send Enquiry"}
      </button>
    </form>
  );
}
