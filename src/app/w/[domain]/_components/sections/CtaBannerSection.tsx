"use client";

import { motion } from "framer-motion";
import { getButtonRadius } from "@/lib/website-sections/types";
import type { CtaBannerSectionData, WebsiteTheme } from "@/lib/website-sections/types";

interface CtaBannerSectionProps {
  data: CtaBannerSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

function getBackgroundStyles(
  style: CtaBannerSectionData["backgroundStyle"],
  theme: WebsiteTheme
) {
  switch (style) {
    case "primary":
      return {
        backgroundColor: theme.primaryColor,
        textColor: theme.backgroundColor,
        buttonBg: theme.backgroundColor,
        buttonText: theme.primaryColor,
      };
    case "dark":
      return {
        backgroundColor: theme.backgroundColor,
        textColor: theme.textColor,
        buttonBg: theme.primaryColor,
        buttonText: theme.backgroundColor,
      };
    case "gradient":
      return {
        backgroundColor: theme.primaryColor,
        textColor: theme.backgroundColor,
        buttonBg: theme.backgroundColor,
        buttonText: theme.primaryColor,
        backgroundImage: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor})`,
      };
  }
}

export function CtaBannerSection({ data, theme, isEditor }: CtaBannerSectionProps) {
  const Container = isEditor ? "div" : motion.section;
  const containerProps = isEditor
    ? {}
    : {
        initial: { opacity: 0, y: 40 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-50px" },
        transition: { duration: 0.6, ease },
      };

  const bg = getBackgroundStyles(data.backgroundStyle, theme);

  return (
    <Container
      {...containerProps}
      className="py-16 md:py-24"
      style={{
        backgroundColor: bg.backgroundColor,
        backgroundImage: bg.backgroundImage,
      }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2
          className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-4"
          style={{ color: bg.textColor, fontFamily: theme.headingFont }}
        >
          {data.heading}
        </h2>
        {data.subheading && (
          <p
            className="text-lg md:text-xl max-w-2xl mx-auto mb-8 opacity-85"
            style={{ color: bg.textColor, fontFamily: theme.bodyFont }}
          >
            {data.subheading}
          </p>
        )}
        {data.button?.text && (
          <a
            href={data.button.url}
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold transition-all duration-200 active:scale-[0.98]"
            style={{
              backgroundColor: bg.buttonBg,
              color: bg.buttonText,
              borderRadius: getButtonRadius(theme),
            }}
          >
            {data.button.text}
          </a>
        )}
      </div>
    </Container>
  );
}
