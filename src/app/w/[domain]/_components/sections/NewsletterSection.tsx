"use client";

import { motion } from "framer-motion";
import { getButtonRadius } from "@/lib/website-sections/types";
import type { NewsletterSectionData, WebsiteTheme } from "@/lib/website-sections/types";

interface NewsletterSectionProps {
  data: NewsletterSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

function getBackground(bg: NewsletterSectionData["background"], theme: WebsiteTheme) {
  switch (bg) {
    case "white": return { backgroundColor: "#ffffff", textColor: "#1a1a1a" };
    case "light": return { backgroundColor: `${theme.textColor}06`, textColor: theme.textColor };
    case "dark": return { backgroundColor: theme.backgroundColor, textColor: theme.textColor };
  }
}

export function NewsletterSection({ data, theme, isEditor }: NewsletterSectionProps) {
  const Container = isEditor ? "div" : motion.section;
  const containerProps = isEditor ? {} : {
    initial: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-50px" },
    transition: { duration: 0.6, ease },
  };

  const bg = getBackground(data.background, theme);

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

          <form className="flex flex-col sm:flex-row gap-3" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Your email address"
              className="flex-1 border px-4 py-3 text-base outline-none"
              style={{
                backgroundColor: `${bg.textColor}06`,
                borderColor: `${bg.textColor}15`,
                color: bg.textColor,
                borderRadius: getButtonRadius(theme),
              }}
            />
            <button
              type="submit"
              className="px-6 py-3 text-base font-semibold transition-all duration-200 active:scale-[0.98] shrink-0"
              style={{ backgroundColor: theme.primaryColor, color: theme.backgroundColor, borderRadius: getButtonRadius(theme) }}
            >
              {data.buttonText}
            </button>
          </form>
        </div>
      </div>
    </Container>
  );
}
