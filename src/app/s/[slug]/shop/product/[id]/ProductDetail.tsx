"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useStorefront } from "../../../_components/StorefrontProvider";
import { useCart } from "../../../_components/CartProvider";
import { Header } from "../../../_components/Header";
import { Cart } from "../../../_components/Cart";
import { Footer } from "../../../_components/Footer";
import { ProductCard } from "../../../_components/ProductCard";
import type { Product } from "../../../_components/types";

export function ProductDetail({
  product,
  relatedProducts,
}: {
  product: Product;
  relatedProducts: Product[];
}) {
  const { slug, primary, accent, accentText } = useStorefront();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  const displayPrice = product.retail_price ?? product.price;

  const outOfStock =
    product.track_stock &&
    product.retail_stock_count != null &&
    product.retail_stock_count <= 0;

  const lowStock =
    product.track_stock &&
    product.retail_stock_count != null &&
    product.retail_stock_count > 0 &&
    product.retail_stock_count < 5;

  function handleAddToCart() {
    for (let i = 0; i < quantity; i++) {
      addItem(product);
    }
    setQuantity(1);
  }

  return (
    <div
      style={{ fontFamily: "var(--sf-font)" }}
      className="min-h-screen bg-white"
    >
      <Header />
      <Cart />

      {/* Spacer for fixed header */}
      <div className="h-16 md:h-20" />

      <div className="max-w-6xl mx-auto px-6 py-8 md:py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-8">
          <Link
            href={`/s/${slug}`}
            className="hover:text-slate-600 transition-colors"
          >
            Home
          </Link>
          <span>/</span>
          <Link
            href={`/s/${slug}/shop`}
            className="hover:text-slate-600 transition-colors"
          >
            Shop
          </Link>
          <span>/</span>
          <span className="text-slate-700 truncate">{product.name}</span>
        </div>

        {/* Product */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* Image */}
          <div className="relative aspect-square bg-slate-100 rounded-xl overflow-hidden">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-20 h-20 text-slate-300"
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
          </div>

          {/* Details */}
          <div>
            <h1
              className="text-2xl md:text-3xl font-bold mb-3"
              style={{ color: primary }}
            >
              {product.name}
            </h1>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-2xl font-bold text-slate-900">
                {"\u00A3"}
                {displayPrice.toFixed(2)}
              </span>
              <span className="text-sm text-slate-400">/ {product.unit}</span>
            </div>

            {/* Stock status */}
            <div className="mb-6">
              {outOfStock ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  Sold Out
                </span>
              ) : lowStock ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Low Stock &mdash; Only {product.retail_stock_count} left
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  In Stock
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-slate-600 leading-relaxed whitespace-pre-line mb-8">
                {product.description}
              </p>
            )}

            {/* Quantity + Add to Cart */}
            {!outOfStock && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Quantity
                  </label>
                  <div className="inline-flex items-center border border-slate-300 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 rounded-l-lg transition-colors"
                    >
                      -
                    </button>
                    <span className="w-12 text-center text-sm font-medium border-x border-slate-300">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 rounded-r-lg transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  style={{ backgroundColor: accent, color: accentText }}
                  className="w-full py-3.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  Add to Cart
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 md:mt-24">
            <h2
              className="text-xl md:text-2xl font-bold mb-8"
              style={{ color: primary }}
            >
              You Might Also Like
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
