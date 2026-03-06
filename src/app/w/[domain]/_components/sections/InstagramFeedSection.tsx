"use client";

import { motion } from "framer-motion";
import type { InstagramFeedSectionData, WebsiteTheme } from "@/lib/website-sections/types";

interface InstagramFeedSectionProps {
  data: InstagramFeedSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

export function InstagramFeedSection({ data, theme, isEditor }: InstagramFeedSectionProps) {
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
        <div className="text-center mb-12">
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-4"
            style={{ color: theme.textColor, fontFamily: theme.headingFont }}
          >
            {data.heading}
          </h2>
          {data.handle && (
            <a
              href={`https://instagram.com/${data.handle.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-medium transition-opacity hover:opacity-80"
              style={{ color: theme.primaryColor }}
            >
              @{data.handle.replace("@", "")}
            </a>
          )}
        </div>

        {/* Placeholder grid — real integration would use Instagram API */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg"
              style={{ backgroundColor: `${theme.primaryColor}${(10 + i * 3).toString(16).padStart(2, "0")}` }}
            />
          ))}
        </div>

        {!data.handle && (
          <p className="text-center text-sm opacity-40 mt-4" style={{ color: theme.textColor }}>
            Add your Instagram handle to connect your feed
          </p>
        )}
      </div>
    </Container>
  );
}
