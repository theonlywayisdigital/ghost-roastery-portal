"use client";

import { useRef, useEffect, useState } from "react";
import type { WebSection, WebsiteTheme } from "@/lib/website-sections/types";
import { SectionRenderer } from "@/app/w/[domain]/_components/sections/SectionRenderer";
import { cn } from "@/lib/utils";

interface LivePreviewProps {
  sections: WebSection[];
  theme: WebsiteTheme;
  selectedId: string | null;
  onSelectSection: (id: string) => void;
  siteName?: string;
  logoUrl?: string;
  pages?: { title: string; slug: string; is_nav_button?: boolean }[];
}

type Viewport = "desktop" | "tablet" | "mobile";

const viewportWidths: Record<Viewport, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

export function LivePreview({
  sections,
  theme,
  selectedId,
  onSelectSection,
  siteName = "My Coffee",
  logoUrl,
  pages = [],
}: LivePreviewProps) {
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to selected section within the preview scroll container
  useEffect(() => {
    if (!selectedId || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(
      `[data-section-id="${selectedId}"]`
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedId]);

  // Filter out "home" from nav pages
  const navPages = (pages.length > 0
    ? pages
    : [
        { title: "Home", slug: "home" },
        { title: "Shop", slug: "shop" },
        { title: "About", slug: "about" },
        { title: "Contact", slug: "contact" },
      ]
  ).filter((p) => p.slug !== "home");

  const navBgColor = theme.navBgColor ?? "#ffffff";
  const navTextColor = theme.navTextColor ?? "#475569";
  const navTextSize = { small: 14, medium: 16, large: 18 }[theme.navTextSize ?? "medium"];
  const logoHeight = { small: 48, medium: 80, large: 120 }[theme.navLogoSize ?? "medium"];
  const navLayout = theme.navLayout ?? "logo-left";

  // Split nav pages into links and buttons
  const linkPages = navPages.filter((p) => !p.is_nav_button);
  const buttonPages = navPages.filter((p) => p.is_nav_button);

  // Button colours
  const btnBg = theme.navButtonBgColor ?? "#0f172a";
  const btnText = theme.navButtonTextColor ?? "#ffffff";
  const btnBorder = theme.navButtonBorderColor ?? "#0f172a";

  const previewLogo = logoUrl ? (
    <img src={logoUrl} alt={siteName} style={{ height: logoHeight }} className="w-auto" />
  ) : (
    <span
      className="font-bold"
      style={{
        fontFamily: `'${theme.headingFont}', sans-serif`,
        color: navTextColor,
        fontSize: Math.max(16, logoHeight * 0.4),
      }}
    >
      {siteName}
    </span>
  );

  const previewLinks = linkPages.map((page) => (
    <span
      key={page.slug}
      className="font-medium cursor-default"
      style={{ color: navTextColor, fontSize: navTextSize }}
    >
      {page.title}
    </span>
  ));

  const previewButtons = buttonPages.map((page) => (
    <span
      key={page.slug}
      className="font-semibold rounded-lg cursor-default"
      style={{
        fontSize: navTextSize - 1,
        color: btnText,
        backgroundColor: btnBg,
        border: `1px solid ${btnBorder}`,
        padding: "8px 20px",
      }}
    >
      {page.title}
    </span>
  ));

  return (
    <div className="h-full flex flex-col bg-slate-100">
      {/* Viewport toggle bar */}
      <div className="flex items-center justify-center gap-1 px-4 py-2 bg-white border-b border-slate-200 shrink-0">
        <ViewportButton
          label="Desktop"
          active={viewport === "desktop"}
          onClick={() => setViewport("desktop")}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
            </svg>
          }
        />
        <ViewportButton
          label="Tablet"
          active={viewport === "tablet"}
          onClick={() => setViewport("tablet")}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 002.25-2.25V4.5a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25z" />
            </svg>
          }
        />
        <ViewportButton
          label="Mobile"
          active={viewport === "mobile"}
          onClick={() => setViewport("mobile")}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
          }
        />
      </div>

      {/* Scrollable preview area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex justify-center" ref={scrollRef}>
        <div
          className={cn(
            "bg-white transition-all duration-300",
            viewport !== "desktop" && "shadow-xl my-4 rounded-lg overflow-hidden"
          )}
          style={{
            width: viewportWidths[viewport],
            maxWidth: "100%",
            fontFamily: `'${theme.bodyFont}', sans-serif`,
            color: theme.textColor,
            backgroundColor: theme.backgroundColor,
          }}
        >
          {/* Preview nav bar — mirrors WebsiteNav layout/theme */}
          <header
            className="backdrop-blur-sm"
            style={{
              backgroundColor: navBgColor,
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            {navLayout === "logo-center" ? (
              <>
                <div className="flex items-center justify-center py-3">
                  {previewLogo}
                </div>
                <nav className="flex items-center justify-center gap-5 pb-3">
                  {previewLinks}
                  {previewButtons}
                </nav>
              </>
            ) : navLayout === "logo-minimal" ? (
              <nav
                className="max-w-7xl mx-auto px-6 flex items-center justify-between"
                style={{ height: Math.max(64, logoHeight + 24) }}
              >
                {previewLogo}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: navTextColor }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </nav>
            ) : (
              <nav
                className="max-w-7xl mx-auto px-6 flex items-center justify-between"
                style={{ height: Math.max(64, logoHeight + 24) }}
              >
                {previewLogo}
                <div className="flex items-center gap-5">
                  {previewLinks}
                  {previewButtons}
                </div>
              </nav>
            )}
          </header>

          {/* Section content */}
          {sections.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-slate-400">
              <p className="text-sm">No sections yet. Add one to get started.</p>
            </div>
          ) : (
            sections.map((section) => (
              <div
                key={section.id}
                data-section-id={section.id}
                className={cn(
                  "relative cursor-pointer transition-all",
                  selectedId === section.id && "ring-2 ring-brand-500 ring-inset",
                  !section.visible && "opacity-40"
                )}
                onClick={() => onSelectSection(section.id)}
              >
                <SectionRenderer
                  section={section}
                  theme={theme}
                  isEditor
                />
                {/* Hover highlight */}
                <div className="absolute inset-0 hover:bg-brand-500/5 transition-colors pointer-events-none" />
              </div>
            ))
          )}

          {/* Preview footer */}
          <footer className="border-t border-slate-200/60 py-8 px-6 text-center">
            <p className="text-xs text-slate-400">
              {`© ${new Date().getFullYear()} ${siteName}. All rights reserved.`}
            </p>
            <p className="text-[10px] text-slate-300 mt-1">
              Powered by Ghost Roastery
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}

function ViewportButton({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
        active
          ? "bg-brand-50 text-brand-700"
          : "text-slate-500 hover:bg-slate-100"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
