"use client";

import Image from "next/image";
import Link from "next/link";
import { useStorefront } from "./StorefrontProvider";
import { SocialLinks } from "./SocialIcons";


export function Footer() {
  const { roaster, slug, primary, showWholesale, embedded } = useStorefront();

  if (embedded) return null;

  return (
    <footer style={{ backgroundColor: "var(--sf-nav-bg)", color: "var(--sf-nav-text)" }}>
      <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              {roaster.brand_logo_url && (
                <Image
                  src={roaster.brand_logo_url}
                  alt={roaster.business_name}
                  width={36}
                  height={36}
                  className="rounded-lg bg-white/90 p-0.5 object-contain"
                />
              )}
              <span className="font-semibold text-lg">
                {roaster.business_name}
              </span>
            </div>
            {roaster.brand_tagline && (
              <p className="text-white/60 text-sm max-w-xs mb-5">
                {roaster.brand_tagline}
              </p>
            )}
            <SocialLinks
              roaster={roaster}
              className="text-white/50 hover:text-white"
            />
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-semibold text-sm text-white/90 uppercase tracking-wider mb-4">
              Shop
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href={`/s/${slug}/shop`}
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  All Products
                </Link>
              </li>
              {showWholesale && (
                <li>
                  <a
                    href={`/s/${slug}/wholesale`}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    Trade Account
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm text-white/90 uppercase tracking-wider mb-4">
              Contact
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href={`/s/${slug}/contact`}
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  Get in Touch
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} {roaster.business_name}. All
            rights reserved.
          </p>
          <p className="text-xs text-white/40">
            Powered by{" "}
            <a
              href="https://ghostroastery.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white underline"
            >
              Ghost Roastery
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
