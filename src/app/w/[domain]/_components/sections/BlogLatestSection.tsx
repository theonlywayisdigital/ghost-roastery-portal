"use client";

import { motion } from "framer-motion";
import type { BlogLatestSectionData, WebsiteTheme } from "@/lib/website-sections/types";

interface BlogLatestSectionProps {
  data: BlogLatestSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

export function BlogLatestSection({ data, theme, isEditor }: BlogLatestSectionProps) {
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
        <div className="text-center mb-12 md:mb-16">
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-4"
            style={{ color: theme.textColor, fontFamily: theme.headingFont }}
          >
            {data.heading}
          </h2>
          {data.subheading && (
            <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-70" style={{ color: theme.textColor, fontFamily: theme.bodyFont }}>
              {data.subheading}
            </p>
          )}
        </div>

        {/* Placeholder blog cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: data.maxPosts }, (_, i) => (
            <div key={i} className="rounded-xl overflow-hidden" style={{ backgroundColor: `${theme.textColor}06` }}>
              <div className="aspect-[16/9]" style={{ backgroundColor: `${theme.primaryColor}10` }} />
              <div className="p-5">
                <div className="h-3 rounded w-1/4 mb-3" style={{ backgroundColor: `${theme.primaryColor}20` }} />
                <div className="h-5 rounded w-3/4 mb-2" style={{ backgroundColor: `${theme.textColor}15` }} />
                <div className="h-4 rounded w-full mb-1" style={{ backgroundColor: `${theme.textColor}08` }} />
                <div className="h-4 rounded w-2/3" style={{ backgroundColor: `${theme.textColor}08` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
