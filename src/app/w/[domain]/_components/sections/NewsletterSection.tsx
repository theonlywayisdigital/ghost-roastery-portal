"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { getButtonRadius } from "@/lib/website-sections/types";
import type { NewsletterSectionData, WebsiteTheme } from "@/lib/website-sections/types";

interface NewsletterSectionProps {
  data: NewsletterSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
  domain?: string;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

function getBackground(bg: NewsletterSectionData["background"], theme: WebsiteTheme) {
  switch (bg) {
    case "white": return { backgroundColor: "#ffffff", textColor: "#1a1a1a" };
    case "light": return { backgroundColor: `${theme.textColor}06`, textColor: theme.textColor };
    case "dark": return { backgroundColor: theme.backgroundColor, textColor: theme.textColor };
  }
}

export function NewsletterSection({ data, theme, isEditor, domain }: NewsletterSectionProps) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const Container = isEditor ? "div" : motion.section;
  const containerProps = isEditor ? {} : {
    initial: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-50px" },
    transition: { duration: 0.6, ease },
  };

  const bg = getBackground(data.background, theme);

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
      const res = await fetch(`/api/w/${domain}/newsletter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Failed to subscribe. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <Container {...containerProps} className="py-16 md:py-24" style={{ backgroundColor: bg.backgroundColor }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto text-center">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight mb-4"
            style={{ color: bg.textColor, fontFamily: theme.headingFont }}
          >
            {data.heading}
          </h2>
          {data.subheading && (
            <p className="text-lg opacity-70 mb-8" style={{ color: bg.textColor, fontFamily: theme.bodyFont }}>
              {data.subheading}
            </p>
          )}

          {submitted ? (
            <p
              className="text-base font-medium py-3"
              style={{ color: theme.primaryColor }}
            >
              Thanks for subscribing!
            </p>
          ) : (
            <>
              <form className="flex flex-col sm:flex-row gap-3" onSubmit={handleSubmit}>
                <input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  className="flex-1 border px-4 py-3 text-base outline-none disabled:opacity-50"
                  style={{
                    backgroundColor: `${bg.textColor}06`,
                    borderColor: `${bg.textColor}15`,
                    color: bg.textColor,
                    borderRadius: getButtonRadius(theme),
                  }}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 text-base font-semibold transition-all duration-200 active:scale-[0.98] shrink-0 disabled:opacity-50"
                  style={{ backgroundColor: theme.primaryColor, color: theme.backgroundColor, borderRadius: getButtonRadius(theme) }}
                >
                  {submitting ? "Subscribing..." : data.buttonText}
                </button>
              </form>
              {error && (
                <p className="text-sm text-red-600 mt-2">{error}</p>
              )}
            </>
          )}
        </div>
      </div>
    </Container>
  );
}
