"use client";

import { motion } from "framer-motion";
import type { VideoHeroSectionData, WebsiteTheme } from "@/lib/website-sections/types";

interface VideoHeroSectionProps {
  data: VideoHeroSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

export function VideoHeroSection({ data, theme, isEditor }: VideoHeroSectionProps) {
  const Container = isEditor ? "div" : motion.section;
  const containerProps = isEditor
    ? {}
    : {
        initial: { opacity: 0 },
        whileInView: { opacity: 1 },
        viewport: { once: true },
        transition: { duration: 0.8, ease },
      };

  return (
    <Container
      {...containerProps}
      className="relative min-h-[70vh] flex items-center justify-center overflow-hidden"
    >
      {/* Video or placeholder background */}
      {data.videoUrl && !isEditor ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={data.videoUrl} type="video/mp4" />
        </video>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: theme.backgroundColor,
            backgroundImage: data.videoUrl
              ? undefined
              : `linear-gradient(135deg, ${theme.primaryColor}30, ${theme.backgroundColor})`,
          }}
        >
          {isEditor && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center opacity-30">
                <svg className="w-16 h-16 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
                <p className="text-sm" style={{ color: theme.textColor }}>
                  {data.videoUrl ? "Video preview hidden in editor" : "Add a video URL"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: `rgba(0,0,0,${data.overlayOpacity})` }}
      />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center py-24">
        <h1
          className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4"
          style={{ color: "#ffffff", fontFamily: theme.headingFont }}
        >
          {data.heading}
        </h1>
        {data.subheading && (
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8 text-white/80">
            {data.subheading}
          </p>
        )}
        {data.primaryButton?.text && (
          <a
            href={data.primaryButton.url}
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-200"
            style={{
              backgroundColor: theme.primaryColor,
              color: theme.backgroundColor,
            }}
          >
            {data.primaryButton.text}
          </a>
        )}
      </div>
    </Container>
  );
}
