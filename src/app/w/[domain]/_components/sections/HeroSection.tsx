"use client";

import { motion } from "framer-motion";
import type { HeroSectionData, WebsiteTheme } from "@/lib/website-sections/types";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  data: HeroSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

export function HeroSection({ data, theme, isEditor }: HeroSectionProps) {
  const Wrapper = isEditor ? "div" : motion.div;
  const wrapperProps = isEditor
    ? {}
    : {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.8, ease },
      };

  return (
    <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Background image */}
      {data.backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${data.backgroundImage})` }}
        />
      )}

      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: theme.backgroundColor,
          opacity: data.backgroundImage ? data.overlayOpacity : 1,
        }}
      />

      {/* Subtle texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 text-center py-24">
        <Wrapper {...wrapperProps}>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-6"
            style={{ color: theme.textColor, fontFamily: theme.headingFont }}
          >
            {data.heading}
          </h1>
        </Wrapper>

        <p
          className={cn(
            "text-lg sm:text-xl md:text-2xl max-w-2xl mx-auto mb-10 opacity-80"
          )}
          style={{ color: theme.textColor, fontFamily: theme.bodyFont }}
        >
          {data.subheading}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {data.primaryButton?.text && (
            <a
              href={data.primaryButton.url}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-200 active:scale-[0.98]"
              style={{
                backgroundColor: theme.primaryColor,
                color: theme.backgroundColor,
              }}
            >
              {data.primaryButton.text}
            </a>
          )}
          {data.secondaryButton?.text && (
            <a
              href={data.secondaryButton.url}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-lg border-2 transition-all duration-200 active:scale-[0.98]"
              style={{
                borderColor: theme.primaryColor,
                color: theme.primaryColor,
              }}
            >
              {data.secondaryButton.text}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
