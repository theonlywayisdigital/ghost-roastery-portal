"use client";

import { motion } from "framer-motion";
import { getButtonRadius } from "@/lib/website-sections/types";
import type { HeroSplitSectionData, WebsiteTheme } from "@/lib/website-sections/types";
import { cn } from "@/lib/utils";

interface HeroSplitSectionProps {
  data: HeroSplitSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

export function HeroSplitSection({ data, theme, isEditor }: HeroSplitSectionProps) {
  const imageFirst = data.imagePosition === "left";

  const TextContent = (
    <div className="flex flex-col justify-center py-12 lg:py-20">
      <p
        className="text-sm font-semibold uppercase tracking-wider mb-4 opacity-60"
        style={{ color: theme.textColor, fontFamily: theme.bodyFont }}
      >
        {data.subheading}
      </p>
      <h1
        className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] mb-6"
        style={{ color: theme.textColor, fontFamily: theme.headingFont }}
      >
        {data.heading}
      </h1>
      <p
        className="text-lg opacity-70 mb-8 max-w-lg whitespace-pre-line"
        style={{ color: theme.textColor, fontFamily: theme.bodyFont }}
      >
        {data.body}
      </p>
      {data.button?.text && (
        <div>
          <a
            href={data.button.url}
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold transition-all duration-200 active:scale-[0.98]"
            style={{
              backgroundColor: theme.primaryColor,
              color: theme.backgroundColor,
              borderRadius: getButtonRadius(theme),
            }}
          >
            {data.button.text}
          </a>
        </div>
      )}
    </div>
  );

  const ImageContent = (
    <div className="relative aspect-[4/3] lg:aspect-auto lg:h-full min-h-[300px] rounded-2xl overflow-hidden">
      {data.image ? (
        <img
          src={data.image}
          alt={data.heading}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: `${theme.primaryColor}15` }}
        >
          <div className="text-center opacity-40" style={{ color: theme.textColor }}>
            <svg className="w-16 h-16 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
            <p className="text-sm font-medium">Upload an image</p>
          </div>
        </div>
      )}
    </div>
  );

  const Container = isEditor ? "div" : motion.section;
  const containerProps = isEditor
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.6, ease },
      };

  return (
    <Container
      {...containerProps}
      className="overflow-hidden"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div
          className={cn(
            "grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center min-h-[500px]",
            imageFirst && "lg:[&>*:first-child]:order-2"
          )}
        >
          {imageFirst ? (
            <>
              {ImageContent}
              {TextContent}
            </>
          ) : (
            <>
              {TextContent}
              {ImageContent}
            </>
          )}
        </div>
      </div>
    </Container>
  );
}
