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

        <div className="text-center py-12 rounded-xl" style={{ backgroundColor: `${theme.textColor}06` }}>
          <p className="text-sm opacity-50" style={{ color: theme.textColor }}>
            Connect your Instagram account in Marketing settings to display your feed here.
          </p>
        </div>
      </div>
    </Container>
  );
}
