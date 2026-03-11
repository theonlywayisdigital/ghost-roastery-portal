"use client";

import Link from "next/link";
import { useStorefront } from "./StorefrontProvider";
import { SocialLinks } from "./SocialIcons";

const mutedText = "color-mix(in srgb, var(--sf-nav-text) 60%, transparent)";
const veryMutedText = "color-mix(in srgb, var(--sf-nav-text) 40%, transparent)";
const dividerColour = "color-mix(in srgb, var(--sf-nav-text) 10%, transparent)";

export function Footer() {
  const { roaster, slug, showWholesale, embedded } = useStorefront();

  const logoSizePx =
    { small: 80, medium: 120, large: 160 }[
      roaster.storefront_logo_size || "medium"
    ];

  if (embedded) return null;

  return (
    <footer style={{ backgroundColor: "var(--sf-nav-bg)", color: "var(--sf-nav-text)" }}>
      <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              {roaster.brand_logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={roaster.brand_logo_url}
                  alt={roaster.business_name}
                  style={{ height: logoSizePx }}
                  className="w-auto"
                />
              )}
            </div>
            {roaster.brand_tagline && (
              <p className="text-sm max-w-xs mb-5" style={{ color: mutedText }}>
                {roaster.brand_tagline}
              </p>
            )}
            <SocialLinks
              roaster={roaster}
              className="opacity-50 hover:opacity-100"
            />
          </div>

          {/* Navigation */}
          <div>
            <h4
              className="font-semibold text-sm uppercase tracking-wider mb-4"
              style={{ color: "var(--sf-nav-text)" }}
            >
              Shop
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href={`/s/${slug}/shop`}
                  className="text-sm transition-opacity hover:opacity-100"
                  style={{ color: mutedText }}
                >
                  All Products
                </Link>
              </li>
              {showWholesale && (
                <li>
                  <Link
                    href={`/s/${slug}/wholesale`}
                    className="text-sm transition-opacity hover:opacity-100"
                    style={{ color: mutedText }}
                  >
                    Wholesale
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4
              className="font-semibold text-sm uppercase tracking-wider mb-4"
              style={{ color: "var(--sf-nav-text)" }}
            >
              Contact
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href={`/s/${slug}/contact`}
                  className="text-sm transition-opacity hover:opacity-100"
                  style={{ color: mutedText }}
                >
                  Get in Touch
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div
          className="mt-10 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderColor: dividerColour }}
        >
          <p className="text-xs" style={{ color: veryMutedText }}>
            &copy; {new Date().getFullYear()} {roaster.business_name}. All
            rights reserved.
          </p>
          <p className="text-xs" style={{ color: veryMutedText }}>
            Powered by{" "}
            <a
              href="https://ghostroastery.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition-opacity hover:opacity-100"
              style={{ color: mutedText }}
            >
              Ghost Roastery
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
