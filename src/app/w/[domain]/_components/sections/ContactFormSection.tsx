"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { getButtonRadius } from "@/lib/website-sections/types";
import type { ContactFormSectionData, WebsiteTheme } from "@/lib/website-sections/types";

interface ContactFormSectionProps {
  data: ContactFormSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
  domain?: string;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

function FormInput({
  label,
  type = "text",
  theme,
  multiline,
  value,
  onChange,
  disabled,
}: {
  label: string;
  type?: string;
  theme: WebsiteTheme;
  multiline?: boolean;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const inputStyle = {
    backgroundColor: `${theme.textColor}06`,
    borderColor: `${theme.textColor}15`,
    color: theme.textColor,
    fontFamily: theme.bodyFont,
  };

  return (
    <div>
      <label
        className="block text-sm font-medium mb-2 opacity-70"
        style={{ color: theme.textColor, fontFamily: theme.bodyFont }}
      >
        {label}
      </label>
      {multiline ? (
        <textarea
          rows={5}
          className="w-full border px-4 py-3 text-base outline-none transition-colors focus:border-current"
          style={{ ...inputStyle, borderRadius: getButtonRadius(theme) }}
          placeholder={`Your ${label.toLowerCase()}...`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      ) : (
        <input
          type={type}
          className="w-full border px-4 py-3 text-base outline-none transition-colors focus:border-current"
          style={{ ...inputStyle, borderRadius: getButtonRadius(theme) }}
          placeholder={`Your ${label.toLowerCase()}...`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      )}
    </div>
  );
}

export function ContactFormSection({ data, theme, isEditor, domain }: ContactFormSectionProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const Container = isEditor ? "div" : motion.section;
  const containerProps = isEditor
    ? {}
    : {
        initial: { opacity: 0, y: 40 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-50px" },
        transition: { duration: 0.6, ease },
      };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEditor || !domain) return;
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/w/${domain}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, subject, message }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Failed to send. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <Container
      {...containerProps}
      className="py-16 md:py-24"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-4"
              style={{ color: theme.textColor, fontFamily: theme.headingFont }}
            >
              {data.heading}
            </h2>
            {data.subheading && (
              <p
                className="text-lg md:text-xl opacity-70"
                style={{ color: theme.textColor, fontFamily: theme.bodyFont }}
              >
                {data.subheading}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {submitted ? (
              <div
                className="flex items-center justify-center p-8 rounded-xl"
                style={{ backgroundColor: `${theme.primaryColor}10` }}
              >
                <div className="text-center">
                  <p
                    className="text-lg font-semibold mb-2"
                    style={{ color: theme.textColor, fontFamily: theme.headingFont }}
                  >
                    Thank you!
                  </p>
                  <p
                    className="opacity-70"
                    style={{ color: theme.textColor, fontFamily: theme.bodyFont }}
                  >
                    Your message has been sent. We&apos;ll be in touch soon.
                  </p>
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                {data.showName && (
                  <FormInput label="Name" theme={theme} value={name} onChange={setName} disabled={submitting} />
                )}
                {data.showEmail && (
                  <FormInput label="Email" type="email" theme={theme} value={email} onChange={setEmail} disabled={submitting} />
                )}
                {data.showPhone && (
                  <FormInput label="Phone" type="tel" theme={theme} value={phone} onChange={setPhone} disabled={submitting} />
                )}
                {data.showSubject && (
                  <FormInput label="Subject" theme={theme} value={subject} onChange={setSubject} disabled={submitting} />
                )}
                {data.showMessage && (
                  <FormInput label="Message" theme={theme} multiline value={message} onChange={setMessage} disabled={submitting} />
                )}
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-3 text-base font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                  style={{
                    backgroundColor: theme.primaryColor,
                    color: theme.backgroundColor,
                    borderRadius: getButtonRadius(theme),
                  }}
                >
                  {submitting ? "Sending..." : data.submitText}
                </button>
              </form>
            )}

            {data.showMap && data.mapAddress && (
              <div className="rounded-xl overflow-hidden min-h-[300px]">
                <iframe
                  title="Map"
                  className="w-full h-full min-h-[300px]"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(data.mapAddress)}&output=embed`}
                  style={{ border: 0 }}
                  loading="lazy"
                />
              </div>
            )}

            {data.showMap && !data.mapAddress && (
              <div
                className="rounded-xl flex items-center justify-center min-h-[300px]"
                style={{ backgroundColor: `${theme.textColor}06` }}
              >
                <p className="opacity-40 text-sm" style={{ color: theme.textColor }}>
                  Add a map address in settings
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
}
