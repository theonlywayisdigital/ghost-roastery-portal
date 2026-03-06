"use client";

import { useStorefront } from "./StorefrontProvider";
import { MotionSection } from "./MotionWrapper";

export function TradeSection() {
  const { primary, showWholesale } = useStorefront();

  if (!showWholesale) return null;

  return (
    <MotionSection
      className="py-16 md:py-24"
      style={{ backgroundColor: primary }}
    >
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Trade Accounts
        </h2>
        <p className="text-white/70 text-base md:text-lg mb-8 max-w-xl mx-auto">
          Are you a caf&eacute;, restaurant, hotel, or retailer? Apply for a
          wholesale account to access trade pricing and dedicated support.
        </p>
        <a
          href="/wholesale"
          className="inline-block px-8 py-3.5 rounded-lg font-semibold text-sm bg-white hover:bg-white/90 transition-colors"
          style={{ color: primary }}
        >
          Apply for Trade Account
        </a>
      </div>
    </MotionSection>
  );
}
