"use client";

import { motion } from "framer-motion";
import type { PricingTableSectionData, WebsiteTheme } from "@/lib/website-sections/types";

interface PricingTableSectionProps {
  data: PricingTableSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

export function PricingTableSection({ data, theme, isEditor }: PricingTableSectionProps) {
  const Container = isEditor ? "div" : motion.section;
  const containerProps = isEditor
    ? {}
    : {
        initial: { opacity: 0, y: 40 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-50px" },
        transition: { duration: 0.6, ease },
      };

  return (
    <Container {...containerProps} className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2
            className="text-3xl md:text-4xl font-bold tracking-tight mb-3"
            style={{ color: theme.textColor, fontFamily: theme.headingFont }}
          >
            {data.heading}
          </h2>
          {data.subheading && (
            <p className="text-lg opacity-70 max-w-2xl mx-auto" style={{ color: theme.textColor }}>
              {data.subheading}
            </p>
          )}
        </div>

        <div className={`grid gap-6 ${
          data.tiers.length === 1 ? "max-w-md mx-auto" :
          data.tiers.length === 2 ? "grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto" :
          "grid-cols-1 md:grid-cols-3 max-w-5xl mx-auto"
        }`}>
          {data.tiers.map((tier, i) => (
            <div
              key={i}
              className="rounded-xl p-6 md:p-8 flex flex-col"
              style={{
                backgroundColor: tier.highlighted ? theme.primaryColor + "10" : "transparent",
                border: tier.highlighted
                  ? `2px solid ${theme.primaryColor}`
                  : `1px solid ${theme.textColor}15`,
              }}
            >
              <h3
                className="text-lg font-bold mb-2"
                style={{ color: theme.textColor, fontFamily: theme.headingFont }}
              >
                {tier.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span
                  className="text-4xl font-black"
                  style={{ color: tier.highlighted ? theme.primaryColor : theme.textColor }}
                >
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="text-sm opacity-50" style={{ color: theme.textColor }}>
                    {tier.period}
                  </span>
                )}
              </div>
              <ul className="flex-1 space-y-2.5 mb-6">
                {tier.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm" style={{ color: theme.textColor, opacity: 0.8 }}>
                    <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 20 20" fill={theme.primaryColor}>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              {tier.button?.text && (
                <a
                  href={tier.button.url}
                  className="block text-center px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200"
                  style={{
                    backgroundColor: tier.highlighted ? theme.primaryColor : "transparent",
                    color: tier.highlighted ? theme.backgroundColor : theme.primaryColor,
                    border: tier.highlighted ? "none" : `2px solid ${theme.primaryColor}`,
                  }}
                >
                  {tier.button.text}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
