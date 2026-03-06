"use client";

import { motion } from "framer-motion";
import type { LogoBarSectionData, WebsiteTheme } from "@/lib/website-sections/types";

interface LogoBarSectionProps {
  data: LogoBarSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

export function LogoBarSection({ data, theme, isEditor }: LogoBarSectionProps) {
  const Container = isEditor ? "div" : motion.section;
  const containerProps = isEditor
    ? {}
    : {
        initial: { opacity: 0, y: 30 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-50px" },
        transition: { duration: 0.6, ease },
      };

  return (
    <Container {...containerProps} className="py-12 md:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {data.heading && (
          <h2
            className="text-center text-sm font-semibold uppercase tracking-widest mb-8 opacity-50"
            style={{ color: theme.textColor, fontFamily: theme.headingFont }}
          >
            {data.heading}
          </h2>
        )}
        {data.logos.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {data.logos.map((logo, i) => {
              const img = (
                <img
                  key={i}
                  src={logo.url}
                  alt={logo.alt}
                  className="h-8 md:h-10 w-auto object-contain"
                  style={{ filter: data.grayscale ? "grayscale(100%)" : "none", opacity: data.grayscale ? 0.6 : 1 }}
                />
              );
              return logo.link ? (
                <a key={i} href={logo.link} target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity">
                  {img}
                </a>
              ) : (
                img
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-8">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="h-10 w-24 rounded bg-current opacity-10"
                style={{ color: theme.textColor }}
              />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
