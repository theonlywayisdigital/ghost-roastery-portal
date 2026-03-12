"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useStorefront } from "./StorefrontProvider";
import { useCart } from "./CartProvider";
import type { Product } from "./types";

export function ProductCard({ product }: { product: Product }) {
  const { slug, accent, accentText, retailEnabled, embedded } = useStorefront();
  const { addItem } = useCart();

  // Variant prices take priority over product-level retail_price
  const retailVariantPrices = (product.product_variants || [])
    .filter((v) => v.is_active && v.channel === "retail" && v.retail_price != null && v.retail_price > 0)
    .map((v) => v.retail_price as number);

  const hasVariantPrices = retailVariantPrices.length > 0;
  const variantMin = hasVariantPrices ? Math.min(...retailVariantPrices) : 0;
  const variantMax = hasVariantPrices ? Math.max(...retailVariantPrices) : 0;
  const displayPrice = hasVariantPrices ? variantMin : (product.retail_price ?? product.price);
  const isRange = hasVariantPrices && variantMin !== variantMax;

  const canPurchase =
    retailEnabled &&
    product.is_purchasable &&
    product.is_retail;

  const outOfStock =
    product.track_stock &&
    product.retail_stock_count != null &&
    product.retail_stock_count <= 0;

  const lowStock =
    product.track_stock &&
    product.retail_stock_count != null &&
    product.retail_stock_count > 0 &&
    product.retail_stock_count < 5;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
  }

  function handleViewProduct(e: React.MouseEvent) {
    e.stopPropagation();
    // Let the parent <Link> handle navigation
  }

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
          {product.image_url ? (
            <Image
              src={product.image_url}
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
          {product.description && (
            <p
              className="text-sm mb-3 line-clamp-2"
              style={{ color: "color-mix(in srgb, var(--sf-text) 55%, transparent)" }}
            >
              {product.description}
            </p>
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
              <span
                className="text-sm font-normal ml-1"
                style={{ color: "color-mix(in srgb, var(--sf-text) 55%, transparent)" }}
              >
                / {product.unit}
              </span>
            </span>
          </div>

          {canPurchase ? (
            <button
              onClick={handleAddToCart}
              disabled={outOfStock}
              style={
                outOfStock
                  ? { borderRadius: "var(--sf-btn-radius)" }
                  : {
                      backgroundColor: "var(--sf-btn-colour)",
                      color: "var(--sf-btn-text)",
                      borderRadius: "var(--sf-btn-radius)",
                    }
              }
              className={`w-full mt-3 py-2.5 text-sm font-semibold transition-opacity ${
                outOfStock
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "hover:opacity-90"
              }`}
            >
              {outOfStock ? "Sold Out" : "Add to Cart"}
            </button>
          ) : (
            <button
              onClick={handleViewProduct}
              style={{
                backgroundColor: "var(--sf-btn-colour)",
                color: "var(--sf-btn-text)",
                borderRadius: "var(--sf-btn-radius)",
              }}
              className="w-full mt-3 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Buy Now
            </button>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
