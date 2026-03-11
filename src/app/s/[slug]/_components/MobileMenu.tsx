"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useStorefront } from "./StorefrontProvider";
import { getSocialUrl } from "./utils";
import { SocialIcon } from "./SocialIcons";

interface NavLink {
  label: string;
  href: string;
}

export function MobileMenu({
  isOpen,
  onClose,
  navLinks,
  onNavClick,
  showWholesaleLogin,
}: {
  isOpen: boolean;
  onClose: () => void;
  navLinks: NavLink[];
  onNavClick: (href: string) => void;
  showWholesaleLogin: boolean;
}) {
  const { roaster, slug, primary, accent, accentText } = useStorefront();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 z-50 h-full w-72 shadow-xl flex flex-col"
            style={{ backgroundColor: primary }}
          >
            {/* Close button */}
            <div className="flex items-center justify-end p-4">
              <button
                onClick={onClose}
                className="p-2 text-white/70 hover:text-white"
                aria-label="Close menu"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 px-4 space-y-1">
              {navLinks.map((link) =>
                link.href.startsWith("#") ? (
                  <button
                    key={link.label}
                    onClick={() => onNavClick(link.href)}
                    className="block w-full text-left px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg text-base font-medium transition-colors"
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={onClose}
                    className="block px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg text-base font-medium transition-colors"
                  >
                    {link.label}
                  </Link>
                )
              )}

              {showWholesaleLogin && (
                <Link
                  href={`/s/${slug}/wholesale/login`}
                  onClick={onClose}
                  className="block mx-4 mt-3 px-4 py-3 text-center text-sm font-semibold rounded-lg border transition-colors"
                  style={{
                    borderColor: accent,
                    color: accent,
                  }}
                >
                  Wholesale Login
                </Link>
              )}
            </nav>

            {/* Social Links */}
            <div className="px-8 py-6 border-t border-white/10">
              <div className="flex items-center gap-4">
                {roaster.brand_instagram && (
                  <SocialIcon
                    type="instagram"
                    href={getSocialUrl("instagram", roaster.brand_instagram)}
                    className="text-white/60 hover:text-white"
                  />
                )}
                {roaster.brand_facebook && (
                  <SocialIcon
                    type="facebook"
                    href={getSocialUrl("facebook", roaster.brand_facebook)}
                    className="text-white/60 hover:text-white"
                  />
                )}
                {roaster.brand_tiktok && (
                  <SocialIcon
                    type="tiktok"
                    href={getSocialUrl("tiktok", roaster.brand_tiktok)}
                    className="text-white/60 hover:text-white"
                  />
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
