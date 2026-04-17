"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useStorefront } from "./StorefrontProvider";
import { useCart } from "./CartProvider";
import { MobileMenu } from "./MobileMenu";
import { createBrowserClient } from "@/lib/supabase";

interface AuthUser {
  id: string;
  email: string;
}

interface WholesaleAccess {
  id: string;
  status: string;
  paymentTerms: string;
}

export function Header() {
  const { roaster, slug, primary, accent, accentText, showRetail, showWholesale, embedded } =
    useStorefront();
  const navFixed = roaster.storefront_nav_fixed !== false;
  const navTransparent = navFixed && roaster.storefront_nav_transparent !== false;
  const { itemCount, openCart } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [wholesaleAccess, setWholesaleAccess] = useState<WholesaleAccess | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Auth state detection — also fetches wholesale_access for this roaster
  useEffect(() => {
    async function checkAuth() {
      const supabase = createBrowserClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser?.email) {
        setUser({ id: authUser.id, email: authUser.email });
        // Fetch wholesale access for this specific roaster
        try {
          const res = await fetch(`/api/s/wholesale-access?roasterId=${roaster.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.access) {
              setWholesaleAccess(data.access);
            }
          }
        } catch {
          // Silently fail — treat as no access
        }
      }
      setAuthLoading(false);
    }
    checkAuth();
  }, [roaster.id]);

  // Measure header height for spacer (fixed nav only)
  useEffect(() => {
    const header = headerRef.current;
    if (!header || !navFixed) return;
    const observer = new ResizeObserver(([entry]) => {
      setHeaderHeight(entry.contentRect.height);
    });
    setHeaderHeight(header.offsetHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, [navFixed]);

  // Scroll detection
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

  // Outside click to close dropdown
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  const logoSizePx =
    { small: 80, medium: 120, large: 160 }[
      roaster.storefront_logo_size || "medium"
    ];

  if (embedded) return null;

  const navLinks = [
    ...(showRetail
      ? [{ label: "Shop", href: `/s/${slug}/shop` }]
      : []),
    ...(showWholesale
      ? [{ label: showRetail ? "Wholesale" : "Catalogue", href: `/s/${slug}/wholesale` }]
      : []),
    ...(!showRetail && showWholesale
      ? [{ label: "Apply", href: `/s/${slug}/wholesale/apply` }]
      : []),
    { label: "Contact", href: `/s/${slug}/contact` },
  ];

  function handleNavClick(href: string) {
    setMobileMenuOpen(false);
    if (href.startsWith("#")) {
      const el = document.getElementById(href.slice(1));
      el?.scrollIntoView({ behavior: "smooth" });
    }
  }

  // Only show as "logged in" if user has a wholesale_access record for THIS roaster
  const isLoggedInForRoaster = !!user && !!wholesaleAccess;
  const accessStatus = wholesaleAccess?.status || null;

  const displayName = isLoggedInForRoaster
    ? user.email.split("@")[0]
    : null;

  const initial = displayName
    ? displayName.charAt(0).toUpperCase()
    : null;

  async function handleSignOut() {
    setDropdownOpen(false);
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    // Hard redirect so all cached state is cleared
    window.location.href = `/s/${slug}`;
  }

  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "";

  return (
    <>
      {/* Sentinel for scroll detection (transparent mode only) */}
      {navTransparent && (
        <div ref={sentinelRef} className="absolute top-0 left-0 w-full h-1" />
      )}

      <header
        ref={headerRef}
        className={
          navFixed
            ? "fixed top-0 left-0 right-0 z-50 transition-all duration-300"
            : "relative z-50"
        }
        style={
          navTransparent
            ? {
                backgroundColor: scrolled ? "var(--sf-nav-bg)" : "transparent",
                backdropFilter: scrolled ? "none" : "blur(8px)",
              }
            : {
                backgroundColor: "var(--sf-nav-bg)",
              }
        }
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="relative flex items-center justify-between py-3 md:py-4">
            {/* Mobile: Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2"
              style={{ color: "var(--sf-nav-text)" }}
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
              className="flex items-center gap-2.5"
            >
              {roaster.brand_logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={roaster.brand_logo_url}
                  alt={roaster.business_name}
                  style={{ height: logoSizePx }}
                  className="w-auto"
                />
              )}
            </Link>

            {/* Desktop Nav — absolutely positioned to stay truly centred */}
            <nav className="hidden md:flex items-center gap-1 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              {navLinks.map((link) =>
                link.href.startsWith("#") ? (
                  <button
                    key={link.label}
                    onClick={() => handleNavClick(link.href)}
                    className="px-3.5 py-2 text-sm font-medium rounded-lg hover:bg-white/10 transition-colors"
                    style={{ color: "var(--sf-nav-text)", opacity: 0.85 }}
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="px-3.5 py-2 text-sm font-medium rounded-lg hover:bg-white/10 transition-colors"
                    style={{ color: "var(--sf-nav-text)", opacity: 0.85 }}
                  >
                    {link.label}
                  </Link>
                )
              )}
            </nav>

            {/* Right side: auth buttons + cart */}
            <div className="flex items-center gap-1.5">
              {!authLoading && !isLoggedInForRoaster && (
                <Link
                  href={`/s/${slug}/login`}
                  className="hidden md:inline-flex items-center px-3.5 py-1.5 text-xs font-semibold border transition-colors"
                  style={{
                    borderColor: accent,
                    color: accent,
                    borderRadius: "var(--sf-btn-radius)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = accent;
                    e.currentTarget.style.color = accentText;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = accent;
                  }}
                >
                  Sign In
                </Link>
              )}

              {/* Signed-in user dropdown — only shown if user has wholesale_access for this roaster */}
              {!authLoading && isLoggedInForRoaster && (
                <div className="relative hidden md:block" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    style={{ color: "var(--sf-nav-text)" }}
                  >
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: accent, color: accentText }}
                    >
                      {initial}
                    </span>
                    <span className="text-sm font-medium max-w-[120px] truncate">
                      {displayName}
                    </span>
                    <svg
                      className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50">
                      {accessStatus === "approved" && (
                        <>
                          <Link
                            href={`/s/${slug}/orders`}
                            onClick={() => setDropdownOpen(false)}
                            className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            My Orders
                          </Link>
                          <Link
                            href={`/s/${slug}/account`}
                            onClick={() => setDropdownOpen(false)}
                            className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            My Account
                          </Link>
                        </>
                      )}
                      {accessStatus === "pending" && (
                        <span className="block px-4 py-2.5 text-sm text-amber-600">
                          Application under review
                        </span>
                      )}
                      {accessStatus === "rejected" && (
                        <span className="block px-4 py-2.5 text-sm text-red-500">
                          Application unsuccessful
                        </span>
                      )}
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Sign Out
                      </button>
                      <div className="border-t border-slate-100 my-1" />
                      {portalUrl && (
                        <a
                          href={portalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-4 py-2 text-[11px] text-slate-400 hover:text-slate-500 transition-colors"
                        >
                          Powered by Roastery Platform
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Cart Icon — retail only */}
              {showRetail && (
                <button
                  onClick={openCart}
                  className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
                  style={{ color: "var(--sf-nav-text)" }}
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
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Spacer to prevent content from being hidden behind the fixed header */}
      {navFixed && headerHeight > 0 && (
        <div style={{ height: headerHeight }} />
      )}

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        navLinks={navLinks}
        onNavClick={handleNavClick}
        user={isLoggedInForRoaster ? user : null}
        accessStatus={accessStatus}
        onSignOut={handleSignOut}
      />
    </>
  );
}
