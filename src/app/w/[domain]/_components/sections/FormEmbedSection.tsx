"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { FormEmbedSectionData, WebsiteTheme } from "@/lib/website-sections/types";

interface FormEmbedSectionProps {
  data: FormEmbedSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

export function FormEmbedSection({ data, theme, isEditor }: FormEmbedSectionProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Listen for resize messages from the embedded form
  useEffect(() => {
    if (isEditor || !data.formId) return;

    function handleMessage(e: MessageEvent) {
      if (
        e.data?.type === "gr-form-resize" &&
        e.data?.formId === data.formId &&
        iframeRef.current
      ) {
        iframeRef.current.style.height = `${e.data.height}px`;
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [data.formId, isEditor]);

  const Container = isEditor ? "div" : motion.section;
  const containerProps = isEditor
    ? {}
    : {
        initial: { opacity: 0, y: 40 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-50px" },
        transition: { duration: 0.6, ease },
      };

  // In editor or no form selected — show placeholder
  if (!data.formId) {
    return (
      <Container
        {...containerProps}
        className="py-16 md:py-24"
        style={{ backgroundColor: theme.backgroundColor }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl text-center">
          {data.heading && (
            <h2
              className="text-3xl md:text-4xl font-black tracking-tight mb-4"
              style={{ color: theme.textColor, fontFamily: theme.headingFont }}
            >
              {data.heading}
            </h2>
          )}
          <div
            className="border-2 border-dashed rounded-xl py-16 px-8"
            style={{ borderColor: `${theme.textColor}20` }}
          >
            <svg
              className="w-12 h-12 mx-auto mb-3 opacity-30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
              style={{ color: theme.textColor }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75"
              />
            </svg>
            <p
              className="text-sm font-medium opacity-40"
              style={{ color: theme.textColor }}
            >
              Select a marketing form in the editor
            </p>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container
      {...containerProps}
      className="py-16 md:py-24"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
        {data.heading && (
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight mb-4 text-center"
            style={{ color: theme.textColor, fontFamily: theme.headingFont }}
          >
            {data.heading}
          </h2>
        )}
        {data.subheading && (
          <p
            className="text-lg opacity-70 mb-8 text-center"
            style={{ color: theme.textColor, fontFamily: theme.bodyFont }}
          >
            {data.subheading}
          </p>
        )}

        {isEditor ? (
          <div
            className="border rounded-xl py-12 px-8 text-center"
            style={{ borderColor: `${theme.textColor}15`, backgroundColor: `${theme.primaryColor}05` }}
          >
            <svg
              className="w-10 h-10 mx-auto mb-3 opacity-40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
              style={{ color: theme.primaryColor }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75"
              />
            </svg>
            <p
              className="text-sm font-semibold opacity-60"
              style={{ color: theme.textColor }}
            >
              Marketing Form Embedded
            </p>
            <p
              className="text-xs opacity-40 mt-1"
              style={{ color: theme.textColor }}
            >
              Form will render on the live site
            </p>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={`/f/${data.formId}?embed=1`}
            className="w-full border-0"
            style={{ minHeight: 300 }}
            title="Embedded form"
          />
        )}
      </div>
    </Container>
  );
}
