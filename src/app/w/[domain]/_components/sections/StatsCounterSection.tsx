"use client";

import { motion } from "framer-motion";
import type { StatsCounterSectionData, WebsiteTheme } from "@/lib/website-sections/types";

interface StatsCounterSectionProps {
  data: StatsCounterSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

function getBackgroundStyles(bg: StatsCounterSectionData["background"], theme: WebsiteTheme) {
  switch (bg) {
    case "light":
      return { backgroundColor: theme.textColor + "08", textColor: theme.textColor };
    case "dark":
      return { backgroundColor: theme.backgroundColor, textColor: theme.textColor };
    case "primary":
      return { backgroundColor: theme.primaryColor, textColor: "#ffffff" };
    case "white":
    default:
      return { backgroundColor: "transparent", textColor: theme.textColor };
  }
}

export function StatsCounterSection({ data, theme, isEditor }: StatsCounterSectionProps) {
  const Container = isEditor ? "div" : motion.section;
  const containerProps = isEditor
    ? {}
    : {
        initial: { opacity: 0, y: 40 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-50px" },
        transition: { duration: 0.6, ease },
      };

  const bg = getBackgroundStyles(data.background, theme);

  return (
    <Container
      {...containerProps}
      className="py-16 md:py-24"
      style={{ backgroundColor: bg.backgroundColor }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {data.heading && (
          <h2
            className="text-center text-3xl md:text-4xl font-bold tracking-tight mb-12"
            style={{ color: bg.textColor, fontFamily: theme.headingFont }}
          >
            {data.heading}
          </h2>
        )}
        <div className={`grid gap-8 ${
          data.stats.length <= 2 ? "grid-cols-1 sm:grid-cols-2 max-w-xl mx-auto" :
          data.stats.length === 3 ? "grid-cols-1 sm:grid-cols-3 max-w-3xl mx-auto" :
          "grid-cols-2 md:grid-cols-4 max-w-4xl mx-auto"
        }`}>
          {data.stats.map((stat, i) => (
            <div key={i} className="text-center">
              <p
                className="text-4xl md:text-5xl font-black tracking-tight"
                style={{ color: data.background === "primary" ? "#ffffff" : theme.primaryColor, fontFamily: theme.headingFont }}
              >
                {stat.prefix ?? ""}{stat.value}{stat.suffix ?? ""}
              </p>
              <p
                className="text-sm font-medium mt-2 uppercase tracking-wider opacity-70"
                style={{ color: bg.textColor }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
