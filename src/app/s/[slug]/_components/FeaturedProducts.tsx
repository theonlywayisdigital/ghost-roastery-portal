"use client";

import Link from "next/link";
import { useStorefront } from "./StorefrontProvider";
import { ProductCard } from "./ProductCard";
import { MotionSection } from "./MotionWrapper";
import type { Product } from "./types";

export function FeaturedProducts({ products }: { products: Product[] }) {
  const { slug, primary } = useStorefront();

  if (products.length === 0) return null;

  const featured = products.slice(0, 6);

  return (
    <MotionSection className="py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2
              className="text-2xl md:text-3xl font-bold mb-1"
              style={{ color: primary }}
            >
              Our Coffees
            </h2>
            <p style={{ color: "color-mix(in srgb, var(--sf-text) 55%, transparent)" }}>
              Freshly roasted, ready to enjoy.
            </p>
          </div>
          <Link
            href={`/s/${slug}/shop`}
            className="hidden sm:inline-flex items-center gap-1 text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ color: primary }}
          >
            View All
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>

        {/* Desktop grid */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Mobile horizontal scroll */}
        <div className="sm:hidden -mx-6 px-6">
          <div className="flex gap-4 overflow-x-auto scroll-snap-x snap-mandatory pb-4 -mb-4">
            {featured.map((product) => (
              <div
                key={product.id}
                className="snap-start shrink-0 w-[280px]"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>

        {/* Mobile "View All" link */}
        <div className="sm:hidden mt-6 text-center">
          <Link
            href={`/s/${slug}/shop`}
            className="inline-flex items-center gap-1 text-sm font-medium"
            style={{ color: primary }}
          >
            View All Products
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </MotionSection>
  );
}
