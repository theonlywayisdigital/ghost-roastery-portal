"use client";

import { motion } from "framer-motion";
import type { TextContentSectionData, WebsiteTheme } from "@/lib/website-sections/types";
import { cn } from "@/lib/utils";

interface TextContentSectionProps {
  data: TextContentSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

const maxWidthMap = {
  narrow: "max-w-2xl",
  medium: "max-w-4xl",
  wide: "max-w-6xl",
} as const;

function getBackgroundStyle(bg: TextContentSectionData["background"], theme: WebsiteTheme) {
  switch (bg) {
    case "white":
      return { backgroundColor: "#ffffff", color: "#1a1a1a" };
    case "light":
      return { backgroundColor: `${theme.textColor}06`, color: theme.textColor };
    case "dark":
      return { backgroundColor: theme.backgroundColor, color: theme.textColor };
  }
}

export function TextContentSection({ data, theme, isEditor }: TextContentSectionProps) {
  const Container = isEditor ? "div" : motion.section;
  const containerProps = isEditor
    ? {}
    : {
        initial: { opacity: 0, y: 40 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-50px" },
        transition: { duration: 0.6, ease },
      };

  const bgStyle = getBackgroundStyle(data.background, theme);

  return (
    <Container
      {...containerProps}
      className="py-16 md:py-24"
      style={bgStyle}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className={cn("mx-auto", maxWidthMap[data.maxWidth])}>
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight mb-8"
            style={{ fontFamily: theme.headingFont }}
          >
            {data.heading}
          </h2>
          <div
            className="prose prose-lg max-w-none whitespace-pre-line leading-relaxed opacity-85"
            style={{ fontFamily: theme.bodyFont }}
            dangerouslySetInnerHTML={{ __html: data.body }}
          />
        </div>
      </div>
    </Container>
  );
}
