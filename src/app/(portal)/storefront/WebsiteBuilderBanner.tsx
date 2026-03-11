"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Globe } from "@/components/icons";

export function WebsiteBuilderBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative mb-6 rounded-xl overflow-hidden bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 p-6 md:p-8">
      {/* Close button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-6">
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white mb-1.5">
            Want a fully customised website?
          </h3>
          <p className="text-sm text-white/75 mb-5 max-w-lg">
            Our Website Builder includes conversion-optimised templates,
            custom domain support, and built-in SEO tools — all designed
            for coffee roasters.
          </p>
          <Link
            href="/website"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors"
          >
            Try Website Builder
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>

        {/* Decorative icon */}
        <div className="hidden md:flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 flex-shrink-0">
          <Globe className="w-10 h-10 text-white/60" />
        </div>
      </div>
    </div>
  );
}
