"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useStorefront } from "../_components/StorefrontProvider";
import { Header } from "../_components/Header";
import { Cart } from "../_components/Cart";
import { Footer } from "../_components/Footer";
import { ProductCard } from "../_components/ProductCard";
import type { Product } from "../_components/types";

type SortOption = "featured" | "price-asc" | "price-desc" | "newest";

export function ShopPage({ products }: { products: Product[] }) {
  const { slug, accent, accentText, embedded } = useStorefront();
  const [activeUnit, setActiveUnit] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>("featured");

  // Extract unique units for filters
  const units = useMemo(() => {
    const set = new Set(products.map((p) => p.unit));
    return Array.from(set).sort();
  }, [products]);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = [...products];

    if (activeUnit) {
      result = result.filter((p) => p.unit === activeUnit);
    }

    switch (sort) {
      case "price-asc":
        result.sort(
          (a, b) =>
            (a.retail_price ?? a.price) - (b.retail_price ?? b.price)
        );
        break;
      case "price-desc":
        result.sort(
          (a, b) =>
            (b.retail_price ?? b.price) - (a.retail_price ?? a.price)
        );
        break;
      case "newest":
        result.reverse();
        break;
      default:
        // featured = sort_order (already sorted from server)
        break;
    }

    return result;
  }, [products, activeUnit, sort]);

  return (
    <div
      style={{ fontFamily: "var(--sf-font)" }}
      className="min-h-screen"
    >
      <Header />
      <Cart />

      {/* Spacer for fixed header */}
      {!embedded && <div className="h-16 md:h-20" />}

      <div className="max-w-6xl mx-auto px-6 py-8 md:py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6" style={{ color: "color-mix(in srgb, var(--sf-text) 45%, transparent)" }}>
          <Link
            href={`/s/${slug}${embedded ? "?embedded=true" : ""}`}
            className="hover:opacity-80 transition-opacity"
          >
            Home
          </Link>
          <span>/</span>
          <span style={{ color: "var(--sf-text)" }}>Shop</span>
        </div>

        <h1
          className="text-3xl md:text-4xl font-bold mb-2"
          style={{ color: "var(--sf-text)" }}
        >
          Shop
        </h1>
        <p className="mb-8" style={{ color: "color-mix(in srgb, var(--sf-text) 55%, transparent)" }}>
          Browse our full selection of freshly roasted coffee.
        </p>

        {/* Filters */}
        <div className={`sticky ${embedded ? "top-0" : "top-16 md:top-20"} z-30 border-b border-slate-100 -mx-6 px-6 py-3 mb-8 flex flex-wrap items-center gap-3`} style={{ backgroundColor: "var(--sf-bg)" }}>
          {/* Unit chips */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveUnit(null)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeUnit === null
                  ? "text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              style={
                activeUnit === null
                  ? { backgroundColor: accent, color: accentText }
                  : undefined
              }
            >
              All Products
            </button>
            {units.map((unit) => (
              <button
                key={unit}
                onClick={() =>
                  setActiveUnit(activeUnit === unit ? null : unit)
                }
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeUnit === unit
                    ? "text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                style={
                  activeUnit === unit
                    ? { backgroundColor: accent, color: accentText }
                    : undefined
                }
              >
                {unit}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="ml-auto">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>

        {/* Products grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <svg
              className="w-16 h-16 text-slate-200 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <p className="font-medium" style={{ color: "color-mix(in srgb, var(--sf-text) 55%, transparent)" }}>
              No products available yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
