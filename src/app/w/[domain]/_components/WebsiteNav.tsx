"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import type { WebsiteTheme, NavLayout } from "@/lib/website-sections/types";

const TEXT_SIZES: Record<NonNullable<WebsiteTheme["navTextSize"]>, number> = {
  small: 14,
  medium: 16,
  large: 18,
};

const LOGO_SIZES: Record<NonNullable<WebsiteTheme["navLogoSize"]>, number> = {
  small: 48,
  medium: 80,
  large: 120,
};

interface WebsiteNavProps {
  siteName: string;
  logoUrl?: string;
  pages: { title: string; slug: string; is_nav_button?: boolean }[];
  theme: WebsiteTheme;
}

export function WebsiteNav({ siteName, logoUrl, pages, theme }: WebsiteNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const layout: NavLayout = theme.navLayout ?? "logo-left";
  const bgColor = theme.navBgColor ?? "#ffffff";
  const textColor = theme.navTextColor ?? "#475569";
  const textHoverColor = theme.navTextHoverColor ?? "#0f172a";
  const textSize = TEXT_SIZES[theme.navTextSize ?? "medium"];
  const logoHeight = LOGO_SIZES[theme.navLogoSize ?? "medium"];

  // Button colours
  const btnBg = theme.navButtonBgColor ?? "#0f172a";
  const btnText = theme.navButtonTextColor ?? "#ffffff";
  const btnBorder = theme.navButtonBorderColor ?? "#0f172a";
  const btnHoverBg = theme.navButtonHoverBgColor ?? "#1e293b";
  const btnHoverText = theme.navButtonHoverTextColor ?? "#ffffff";
  const btnHoverBorder = theme.navButtonHoverBorderColor ?? "#1e293b";

  // Filter out "home" — logo already links to /
  const allNavPages = pages.filter((p) => p.slug !== "home");
  const navPages = allNavPages.filter((p) => !p.is_nav_button);
  const buttonLinks = allNavPages
    .filter((p) => p.is_nav_button)
    .map((p) => ({ label: p.title, href: `/${p.slug}` }));

  const logo = (
    <Link href="/" className="flex items-center gap-2.5 no-underline shrink-0">
      {logoUrl ? (
        <img src={logoUrl} alt={siteName} style={{ height: logoHeight }} className="w-auto" />
      ) : (
        <span
          className="font-bold"
          style={{
            fontFamily: `'${theme.headingFont}', sans-serif`,
            color: textColor,
            fontSize: logoHeight * 0.5,
          }}
        >
          {siteName}
        </span>
      )}
    </Link>
  );

  const navLinks = (
    <div className="flex items-center gap-6">
      {navPages.map((page) => (
        <Link
          key={page.slug}
          href={`/${page.slug}`}
          className="font-medium transition-colors no-underline"
          style={{ color: textColor, fontSize: textSize }}
          onMouseEnter={(e) => (e.currentTarget.style.color = textHoverColor)}
          onMouseLeave={(e) => (e.currentTarget.style.color = textColor)}
        >
          {page.title}
        </Link>
      ))}
    </div>
  );

  const ctaButtons = buttonLinks.length > 0 && (
    <div className="flex items-center gap-3">
      {buttonLinks.map((btn) => (
        <Link
          key={btn.label}
          href={btn.href}
          className="no-underline font-semibold rounded-lg transition-colors"
          style={{
            fontSize: textSize - 1,
            color: btnText,
            backgroundColor: btnBg,
            border: `1px solid ${btnBorder}`,
            padding: "8px 20px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = btnHoverBg;
            e.currentTarget.style.color = btnHoverText;
            e.currentTarget.style.borderColor = btnHoverBorder;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = btnBg;
            e.currentTarget.style.color = btnText;
            e.currentTarget.style.borderColor = btnBorder;
          }}
        >
          {btn.label}
        </Link>
      ))}
    </div>
  );

  // ── logo-minimal: always shows hamburger ──
  if (layout === "logo-minimal") {
    return (
      <header
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{ backgroundColor: bgColor, borderBottom: `1px solid ${bgColor === "transparent" ? "transparent" : "#e2e8f0"}` }}
      >
        <nav className="max-w-7xl mx-auto px-6 flex items-center justify-between h-auto py-3">
          {logo}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 transition-colors"
            style={{ color: textColor }}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>

        {mobileOpen && (
          <div
            className="px-6 py-3"
            style={{ backgroundColor: bgColor, borderTop: "1px solid #e2e8f0" }}
          >
            {navPages.map((page) => (
              <Link
                key={page.slug}
                href={`/${page.slug}`}
                onClick={() => setMobileOpen(false)}
                className="block py-2 font-medium no-underline"
                style={{ color: textColor, fontSize: textSize }}
              >
                {page.title}
              </Link>
            ))}
            {buttonLinks.map((btn) => (
              <Link
                key={btn.label}
                href={btn.href}
                onClick={() => setMobileOpen(false)}
                className="block py-2 font-semibold no-underline"
                style={{ color: btnBg, fontSize: textSize }}
              >
                {btn.label}
              </Link>
            ))}
          </div>
        )}
      </header>
    );
  }

  // ── logo-center: logo centred top, links centred below ──
  if (layout === "logo-center") {
    return (
      <header
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{ backgroundColor: bgColor, borderBottom: `1px solid ${bgColor === "transparent" ? "transparent" : "#e2e8f0"}` }}
      >
        {/* Logo row */}
        <div className="flex items-center justify-center py-3">
          {logo}
        </div>
        {/* Links row — hidden on mobile */}
        <nav className="hidden md:flex items-center justify-center gap-6 pb-3">
          {navPages.map((page) => (
            <Link
              key={page.slug}
              href={`/${page.slug}`}
              className="font-medium transition-colors no-underline"
              style={{ color: textColor, fontSize: textSize }}
              onMouseEnter={(e) => (e.currentTarget.style.color = textHoverColor)}
              onMouseLeave={(e) => (e.currentTarget.style.color = textColor)}
            >
              {page.title}
            </Link>
          ))}
          {ctaButtons}
        </nav>

        {/* Mobile hamburger */}
        <div className="md:hidden absolute top-3 right-4">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 transition-colors"
            style={{ color: textColor }}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileOpen && (
          <div
            className="md:hidden px-6 py-3"
            style={{ backgroundColor: bgColor, borderTop: "1px solid #e2e8f0" }}
          >
            {navPages.map((page) => (
              <Link
                key={page.slug}
                href={`/${page.slug}`}
                onClick={() => setMobileOpen(false)}
                className="block py-2 font-medium no-underline"
                style={{ color: textColor, fontSize: textSize }}
              >
                {page.title}
              </Link>
            ))}
            {buttonLinks.map((btn) => (
              <Link
                key={btn.label}
                href={btn.href}
                onClick={() => setMobileOpen(false)}
                className="block py-2 font-semibold no-underline"
                style={{ color: btnBg, fontSize: textSize }}
              >
                {btn.label}
              </Link>
            ))}
          </div>
        )}
      </header>
    );
  }

  // ── logo-left (default): logo left, links centre, buttons right ──
  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md"
      style={{ backgroundColor: bgColor, borderBottom: `1px solid ${bgColor === "transparent" ? "transparent" : "#e2e8f0"}` }}
    >
      <nav className="max-w-7xl mx-auto px-6 flex items-center justify-between h-auto py-3">
        {logo}

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks}
          {ctaButtons}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 transition-colors"
          style={{ color: textColor }}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile nav */}
      {mobileOpen && (
        <div
          className="md:hidden px-6 py-3"
          style={{ backgroundColor: bgColor, borderTop: "1px solid #e2e8f0" }}
        >
          {navPages.map((page) => (
            <Link
              key={page.slug}
              href={`/${page.slug}`}
              onClick={() => setMobileOpen(false)}
              className="block py-2 font-medium no-underline"
              style={{ color: textColor, fontSize: textSize }}
            >
              {page.title}
            </Link>
          ))}
          {buttonLinks.map((btn) => (
            <Link
              key={btn.label}
              href={btn.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 font-semibold no-underline"
              style={{ color: btnBg, fontSize: textSize }}
            >
              {btn.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
