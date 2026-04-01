"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useStorefront } from "./StorefrontProvider";
import type { Product } from "./types";

function getPrimaryImageUrl(product: Product): string | null {
  const imgs = product.product_images;
  if (imgs && imgs.length > 0) {
    const primary = imgs.find((i) => i.is_primary) || imgs.sort((a, b) => a.sort_order - b.sort_order)[0];
    return primary?.url || null;
  }
  return product.image_url;
}

export function ProductCard({ product }: { product: Product }) {
  const { slug, embedded } = useStorefront();
  const imageUrl = getPrimaryImageUrl(product);

  // Variant prices take priority over product-level retail_price
  const retailVariantPrices = (product.product_variants || [])
    .filter((v) => v.is_active && (v.channel === "retail" || v.channel === "both") && v.retail_price != null && v.retail_price > 0)
    .map((v) => v.retail_price as number);

  const hasVariantPrices = retailVariantPrices.length > 0;
  const variantMin = hasVariantPrices ? Math.min(...retailVariantPrices) : 0;
  const variantMax = hasVariantPrices ? Math.max(...retailVariantPrices) : 0;
  const displayPrice = hasVariantPrices ? variantMin : (product.retail_price ?? product.price);
  const isRange = hasVariantPrices && variantMin !== variantMax;

  // When roasted stock is linked, retail_stock_count is not the source
  // of truth — stock is derived from the pool's current_stock_kg.
  // Only consult the manual counter for non-pool products.
  const useManualStock = product.track_stock && !product.roasted_stock_id;

  const outOfStock =
    useManualStock &&
    product.retail_stock_count != null &&
    product.retail_stock_count <= 0;

  const lowStock =
    useManualStock &&
    product.retail_stock_count != null &&
    product.retail_stock_count > 0 &&
    product.retail_stock_count < 5;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Link
        href={`/s/${slug}/shop/product/${product.id}${embedded ? "?embedded=true" : ""}`}
        className="block rounded-xl border overflow-hidden hover:shadow-lg transition-shadow"
        style={{
          backgroundColor: "color-mix(in srgb, var(--sf-text) 8%, transparent)",
          borderColor: "color-mix(in srgb, var(--sf-text) 15%, transparent)",
        }}
      >
        {/* Image */}
        <div
          className="relative aspect-square"
          style={{ backgroundColor: "color-mix(in srgb, var(--sf-text) 5%, transparent)" }}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-12 h-12 opacity-30"
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
            </div>
          )}

          {/* Stock badges */}
          {outOfStock && (
            <div className="absolute top-3 right-3 bg-slate-700/90 text-white text-xs font-medium px-2.5 py-1 rounded-full">
              Sold Out
            </div>
          )}
          {lowStock && !outOfStock && (
            <div className="absolute top-3 right-3 bg-amber-500/90 text-white text-xs font-medium px-2.5 py-1 rounded-full">
              Low Stock
            </div>
          )}
        </div>

        {/* Details */}
        <div className="p-4">
          <h3 className="font-semibold mb-1" style={{ color: "var(--sf-text)" }}>
            {product.name}
          </h3>
          {product.category !== "other" && (product.origin || product.tasting_notes) && (
            <div className="mb-3">
              {product.origin && (
                <p
                  className="text-xs truncate"
                  style={{ color: "color-mix(in srgb, var(--sf-text) 40%, transparent)" }}
                >
                  {product.origin}
                </p>
              )}
              {product.tasting_notes && (
                <p
                  className="text-sm truncate"
                  style={{ color: "color-mix(in srgb, var(--sf-text) 55%, transparent)" }}
                >
                  {product.tasting_notes}
                </p>
              )}
            </div>
          )}
          <div className="flex items-center justify-between mt-auto">
            <span className="text-lg font-bold" style={{ color: "var(--sf-text)" }}>
              {isRange ? (
                <>
                  {`\u00A3${variantMin.toFixed(2)} – \u00A3${variantMax.toFixed(2)}`}
                </>
              ) : (
                <>
                  {"\u00A3"}
                  {displayPrice.toFixed(2)}
                </>
              )}
              {product.category !== "other" && (
                <span
                  className="text-sm font-normal ml-1"
                  style={{ color: "color-mix(in srgb, var(--sf-text) 55%, transparent)" }}
                >
                  / {product.unit}
                </span>
              )}
            </span>
          </div>

          <span
            style={
              outOfStock
                ? { borderRadius: "var(--sf-btn-radius)" }
                : {
                    backgroundColor: "var(--sf-btn-colour)",
                    color: "var(--sf-btn-text)",
                    borderRadius: "var(--sf-btn-radius)",
                  }
            }
            className={`block w-full mt-3 py-2.5 text-sm font-semibold text-center transition-opacity ${
              outOfStock
                ? "bg-slate-200 text-slate-400"
                : "hover:opacity-90"
            }`}
          >
            {outOfStock ? "Sold Out" : "View Product"}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
