"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useStorefront } from "./StorefrontProvider";
import { useCart } from "./CartProvider";
import { MobileMenu } from "./MobileMenu";

export function Header() {
  const { roaster, slug, primary, accent, accentText, showWholesale, embedded } =
    useStorefront();
  const { itemCount, openCart } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  if (embedded) return null;

  const navLinks = [
    { label: "Shop", href: `/s/${slug}/shop` },
    ...(showWholesale
      ? [{ label: "Trade", href: `/s/${slug}/wholesale` }]
      : []),
    ...(roaster.brand_about ? [{ label: "About", href: `#about` }] : []),
    { label: "Contact", href: `#enquiry` },
  ];

  function handleNavClick(href: string) {
    setMobileMenuOpen(false);
    if (href.startsWith("#")) {
      const el = document.getElementById(href.slice(1));
      el?.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <>
      {/* Sentinel for scroll detection */}
      <div ref={sentinelRef} className="absolute top-0 left-0 w-full h-1" />

      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: scrolled ? primary : "transparent",
          backdropFilter: scrolled ? "none" : "blur(8px)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Mobile: Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-white"
              aria-label="Open menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* Logo / Name */}
            <Link
              href={`/s/${slug}`}
              className="flex items-center gap-2.5 md:mr-8"
            >
              {roaster.brand_logo_url && (
                <Image
                  src={roaster.brand_logo_url}
                  alt={roaster.business_name}
                  width={36}
                  height={36}
                  className="object-contain w-auto"
                />
              )}
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
              {navLinks.map((link) =>
                link.href.startsWith("#") ? (
                  <button
                    key={link.label}
                    onClick={() => handleNavClick(link.href)}
                    className="px-3.5 py-2 text-sm font-medium text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="px-3.5 py-2 text-sm font-medium text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  >
                    {link.label}
                  </Link>
                )
              )}
            </nav>

            {/* Cart Icon */}
            <button
              onClick={openCart}
              className="relative p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Open cart"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              {itemCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1"
                  style={{ backgroundColor: accent, color: accentText }}
                >
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        navLinks={navLinks}
        onNavClick={handleNavClick}
      />
    </>
  );
}
