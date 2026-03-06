"use client";

import type { CustomHtmlSectionData, WebsiteTheme } from "@/lib/website-sections/types";

interface CustomHtmlSectionProps {
  data: CustomHtmlSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
}

function sanitizeHtml(html: string): string {
  // Strip script tags for safety
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

export function CustomHtmlSection({ data, theme, isEditor }: CustomHtmlSectionProps) {
  if (!data.html) {
    return (
      <div className="py-16" style={{ backgroundColor: theme.backgroundColor }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm opacity-40" style={{ color: theme.textColor }}>
            {isEditor ? "Add custom HTML in the properties panel" : ""}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="py-8"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.html) }} />
      </div>
    </div>
  );
}
