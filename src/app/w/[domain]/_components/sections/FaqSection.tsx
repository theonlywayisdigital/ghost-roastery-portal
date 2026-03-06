"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FaqSectionData, WebsiteTheme } from "@/lib/website-sections/types";

interface FaqSectionProps {
  data: FaqSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

function FaqItem({ question, answer, theme }: { question: string; answer: string; theme: WebsiteTheme }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b" style={{ borderColor: `${theme.textColor}10` }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left"
      >
        <span className="text-base md:text-lg font-semibold pr-4" style={{ color: theme.textColor, fontFamily: theme.headingFont }}>
          {question}
        </span>
        <svg
          className={`w-5 h-5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          style={{ color: theme.textColor }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-base opacity-70 leading-relaxed" style={{ color: theme.textColor, fontFamily: theme.bodyFont }}>
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FaqSection({ data, theme, isEditor }: FaqSectionProps) {
  const Container = isEditor ? "div" : motion.section;
  const containerProps = isEditor ? {} : {
    initial: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-50px" },
    transition: { duration: 0.6, ease },
  };

  return (
    <Container {...containerProps} className="py-16 md:py-24" style={{ backgroundColor: theme.backgroundColor }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-4"
              style={{ color: theme.textColor, fontFamily: theme.headingFont }}
            >
              {data.heading}
            </h2>
            {data.subheading && (
              <p className="text-lg opacity-70" style={{ color: theme.textColor, fontFamily: theme.bodyFont }}>
                {data.subheading}
              </p>
            )}
          </div>

          <div>
            {data.items.map((item, i) => (
              <FaqItem key={i} question={item.question} answer={item.answer} theme={theme} />
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}
