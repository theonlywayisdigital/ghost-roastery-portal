"use client";

import { motion } from "framer-motion";
import type { AboutSectionData, WebsiteTheme } from "@/lib/website-sections/types";

interface AboutSectionProps {
  data: AboutSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

export function AboutSection({ data, theme, isEditor }: AboutSectionProps) {
  const imageFirst = data.imagePosition === "left";

  const Container = isEditor ? "div" : motion.section;
  const containerProps = isEditor
    ? {}
    : {
        initial: { opacity: 0, y: 40 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-50px" },
        transition: { duration: 0.6, ease },
      };

  const TextContent = (
    <div className="flex flex-col justify-center">
      <h2
        className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-6"
        style={{ color: theme.textColor, fontFamily: theme.headingFont }}
      >
        {data.heading}
      </h2>
      <div
        className="text-lg opacity-80 whitespace-pre-line leading-relaxed"
        style={{ color: theme.textColor, fontFamily: theme.bodyFont }}
      >
        {data.body}
      </div>
      {data.showSocialLinks && (
        <div className="flex gap-4 mt-8">
          {["instagram", "twitter", "facebook"].map((platform) => (
            <div
              key={platform}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: `${theme.textColor}10` }}
            >
              <div
                className="w-5 h-5 rounded-full"
                style={{ backgroundColor: `${theme.textColor}30` }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const ImageContent = (
    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
      {data.image ? (
        <img
          src={data.image}
          alt={data.heading}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: `${theme.primaryColor}10` }}
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

  return (
    <Container
      {...containerProps}
      className="py-16 md:py-24"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
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
