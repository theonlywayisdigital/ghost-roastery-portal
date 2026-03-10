"use client";

import type { WebSection } from "@/lib/website-sections/types";
import { useWebsiteTheme } from "@/app/(portal)/website/section-editor/WebsiteThemeProvider";
import { SectionRenderer } from "./sections/SectionRenderer";
import type { ProductData } from "./sections/FeaturedProductsSection";

interface WebPageRendererProps {
  sections: WebSection[];
  products?: ProductData[];
  domain?: string;
  basePath?: string;
}

export function WebPageRenderer({ sections, products, domain, basePath }: WebPageRendererProps) {
  const theme = useWebsiteTheme();

  if (!sections || sections.length === 0) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-slate-400 text-sm">This page has no content yet.</p>
      </div>
    );
  }

  return (
    <div>
      {sections
        .filter((s) => s.visible !== false)
        .map((section) => (
          <SectionRenderer key={section.id} section={section} theme={theme} isEditor={false} products={products} domain={domain} basePath={basePath} />
        ))}
    </div>
  );
}
