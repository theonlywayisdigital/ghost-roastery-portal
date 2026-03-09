"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BrewingGuideSectionData, BrewingMethod, WebsiteTheme } from "@/lib/website-sections/types";

interface BrewingGuideSectionProps {
  data: BrewingGuideSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

function MethodCard({ method, theme, isEditor }: { method: BrewingMethod; theme: WebsiteTheme; isEditor?: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden border transition-shadow hover:shadow-md"
      style={{ borderColor: `${theme.textColor}15`, backgroundColor: `${theme.textColor}04` }}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-6 py-5 flex items-center justify-between"
      >
        <div>
          <h3
            className="text-xl font-bold"
            style={{ color: theme.textColor, fontFamily: theme.headingFont }}
          >
            {method.name}
          </h3>
          <div className="flex items-center gap-4 mt-1.5">
            <span className="text-sm opacity-60" style={{ color: theme.textColor }}>
              Grind: <strong>{method.grind}</strong>
            </span>
            <span className="text-sm opacity-60" style={{ color: theme.textColor }}>
              Ratio: <strong>{method.ratio}</strong>
            </span>
          </div>
        </div>
        <svg
          className="w-5 h-5 transition-transform shrink-0"
          style={{ color: theme.primaryColor, transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={isEditor ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease }}
          >
            <div className="px-6 pb-6">
              <div className="relative pl-8">
                {/* Vertical line */}
                <div
                  className="absolute left-3 top-3 bottom-3 w-px"
                  style={{ backgroundColor: `${theme.primaryColor}30` }}
                />

                {method.steps.map((step, i) => (
                  <div key={i} className="relative pb-6 last:pb-0">
                    {/* Step circle */}
                    <div
                      className="absolute left-[-20px] w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: theme.primaryColor,
                        color: theme.backgroundColor,
                      }}
                    >
                      {i + 1}
                    </div>

                    {/* Step content */}
                    <div className="ml-2">
                      <div className="flex items-center gap-2">
                        <h4
                          className="font-semibold text-base"
                          style={{ color: theme.textColor, fontFamily: theme.headingFont }}
                        >
                          {step.title}
                        </h4>
                        {step.duration && (
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${theme.primaryColor}15`,
                              color: theme.primaryColor,
                            }}
                          >
                            {step.duration}
                          </span>
                        )}
                      </div>
                      <p
                        className="text-sm mt-1 opacity-70"
                        style={{ color: theme.textColor, fontFamily: theme.bodyFont }}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function BrewingGuideSection({ data, theme, isEditor }: BrewingGuideSectionProps) {
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
    <Container {...containerProps} className="py-16 md:py-24" style={{ backgroundColor: theme.backgroundColor }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <div className="text-center mb-12">
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-4"
            style={{ color: theme.textColor, fontFamily: theme.headingFont }}
          >
            {data.heading}
          </h2>
          {data.subheading && (
            <p
              className="text-lg md:text-xl max-w-2xl mx-auto opacity-70"
              style={{ color: theme.textColor, fontFamily: theme.bodyFont }}
            >
              {data.subheading}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {data.methods.map((method, i) => (
            <MethodCard key={i} method={method} theme={theme} isEditor={isEditor} />
          ))}
        </div>
      </div>
    </Container>
  );
}
