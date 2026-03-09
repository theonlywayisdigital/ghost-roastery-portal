"use client";

import { motion } from "framer-motion";
import { getButtonRadius } from "@/lib/website-sections/types";
import type { WholesaleInfoSectionData, WebsiteTheme } from "@/lib/website-sections/types";

interface WholesaleInfoSectionProps {
  data: WholesaleInfoSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

export function WholesaleInfoSection({ data, theme, isEditor }: WholesaleInfoSectionProps) {
  const Container = isEditor ? "div" : motion.section;
  const containerProps = isEditor ? {} : {
    initial: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-50px" },
    transition: { duration: 0.6, ease },
  };

  return (
    <Container {...containerProps} className="py-16 md:py-24" style={{ backgroundColor: `${theme.textColor}04` }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-6"
            style={{ color: theme.textColor, fontFamily: theme.headingFont }}
          >
            {data.heading}
          </h2>
          <p className="text-lg opacity-80 mb-8 whitespace-pre-line" style={{ color: theme.textColor, fontFamily: theme.bodyFont }}>
            {data.body}
          </p>

          {data.features.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10 max-w-lg mx-auto">
              {data.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-left">
                  <svg className="w-5 h-5 shrink-0" style={{ color: theme.primaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-sm" style={{ color: theme.textColor }}>{feature}</span>
                </div>
              ))}
            </div>
          )}

          {data.button?.text && (
            <a
              href={data.button.url}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold transition-all duration-200 active:scale-[0.98]"
              style={{ backgroundColor: theme.primaryColor, color: theme.backgroundColor, borderRadius: getButtonRadius(theme) }}
            >
              {data.button.text}
            </a>
          )}
        </div>
      </div>
    </Container>
  );
}
