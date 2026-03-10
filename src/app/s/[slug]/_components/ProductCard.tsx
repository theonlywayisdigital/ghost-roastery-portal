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

  const displayPrice = product.retail_price ?? product.price;

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

  function handleEnquire(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById("enquiry")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Link
        href={`/s/${slug}/shop/product/${product.id}${embedded ? "?embedded=true" : ""}`}
        className="block bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
      >
        {/* Image */}
        <div className="relative aspect-square bg-slate-100">
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
                className="w-12 h-12 text-slate-300"
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
          <h3 className="font-semibold text-slate-900 mb-1">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-sm text-slate-500 mb-3 line-clamp-2">
              {product.description}
            </p>
          )}
          <div className="flex items-center justify-between mt-auto">
            <span className="text-lg font-bold text-slate-900">
              {"\u00A3"}
              {displayPrice.toFixed(2)}
              <span className="text-sm font-normal text-slate-400 ml-1">
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
                  ? undefined
                  : { backgroundColor: accent, color: accentText }
              }
              className={`w-full mt-3 py-2.5 rounded-lg text-sm font-semibold transition-opacity ${
                outOfStock
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "hover:opacity-90"
              }`}
            >
              {outOfStock ? "Sold Out" : "Add to Cart"}
            </button>
          ) : (
            <button
              onClick={handleEnquire}
              style={{ backgroundColor: accent, color: accentText }}
              className="w-full mt-3 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Enquire
            </button>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
