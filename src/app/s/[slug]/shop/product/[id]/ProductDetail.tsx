"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useStorefront } from "../../../_components/StorefrontProvider";
import { useCart } from "../../../_components/CartProvider";
import { Header } from "../../../_components/Header";
import { Cart } from "../../../_components/Cart";
import { Footer } from "../../../_components/Footer";
import { ProductCard } from "../../../_components/ProductCard";
import type { Product, ProductVariant, StorefrontOptionType } from "../../../_components/types";

function getProductImages(product: Product): { url: string; id: string }[] {
  const imgs = (product.product_images || [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => ({ url: img.url, id: img.id }));
  if (imgs.length > 0) return imgs;
  if (product.image_url) return [{ url: product.image_url, id: "legacy" }];
  return [];
}

export function ProductDetail({
  product,
  relatedProducts,
  optionTypes = [],
}: {
  product: Product;
  relatedProducts: Product[];
  optionTypes?: StorefrontOptionType[];
}) {
  const { slug, accent, accentText, embedded } = useStorefront();
  const qs = embedded ? "?embedded=true" : "";
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  const productImages = getProductImages(product);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const isOther = product.category === "other";

  // ── Coffee variant logic ──
  const retailVariants = useMemo(
    () =>
      (product.product_variants || []).filter(
        (v) => v.is_active && (v.channel === "retail" || v.channel === "both") && v.retail_price != null && v.retail_price > 0
      ),
    [product.product_variants]
  );

  // Unique weight options (sorted ascending) — coffee only
  const weightOptions = useMemo(() => {
    if (isOther) return [];
    const weights = Array.from(
      new Set(
        retailVariants
          .filter((v) => v.weight_grams != null)
          .map((v) => v.weight_grams as number)
      )
    ).sort((a, b) => a - b);
    return weights;
  }, [retailVariants, isOther]);

  // Unique grind options — coffee only
  const grindOptions = useMemo(() => {
    if (isOther) return [];
    const map = new Map<string, string>();
    for (const v of retailVariants) {
      if (v.grind_type) map.set(v.grind_type.id, v.grind_type.name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [retailVariants, isOther]);

  // State for selected weight + grind — coffee only
  const [selectedWeight, setSelectedWeight] = useState<number | null>(
    weightOptions.length > 0 ? weightOptions[0] : null
  );
  const [selectedGrindId, setSelectedGrindId] = useState<string | null>(
    grindOptions.length > 0 ? grindOptions[0].id : null
  );

  // ── "Other" variant logic ──
  // Selected option values: option_type_id → option_value_id
  const [selectedOptionValues, setSelectedOptionValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const ot of optionTypes) {
      if (ot.product_option_values.length > 0) {
        const sorted = [...ot.product_option_values].sort((a, b) => a.sort_order - b.sort_order);
        initial[ot.id] = sorted[0].id;
      }
    }
    return initial;
  });

  // Resolve selected variant for "other" products by matching option_value_ids
  const otherSelectedVariant: ProductVariant | null = useMemo(() => {
    if (!isOther) return null;
    const selectedIds = Object.values(selectedOptionValues);
    if (selectedIds.length === 0) return null;
    return (
      retailVariants.find((v) => {
        const ovs = v.option_values || [];
        if (ovs.length !== selectedIds.length) return false;
        return selectedIds.every((id) =>
          ovs.some((ov) => ov.option_value?.id === id)
        );
      }) || null
    );
  }, [isOther, retailVariants, selectedOptionValues]);

  // Unified variant reference
  const hasVariants = retailVariants.length > 0;

  // Resolve coffee selected variant
  const coffeeSelectedVariant: ProductVariant | null = useMemo(() => {
    if (isOther || !hasVariants) return null;
    return (
      retailVariants.find((v) => {
        const weightMatch =
          weightOptions.length === 0 || v.weight_grams === selectedWeight;
        const grindMatch =
          grindOptions.length === 0 || v.grind_type?.id === selectedGrindId;
        return weightMatch && grindMatch;
      }) || null
    );
  }, [isOther, retailVariants, selectedWeight, selectedGrindId, weightOptions.length, grindOptions.length, hasVariants]);

  const selectedVariant = isOther ? otherSelectedVariant : coffeeSelectedVariant;

  // Price display
  const retailVariantPrices = retailVariants.map((v) => v.retail_price as number);
  const hasVariantPrices = retailVariantPrices.length > 0;
  const variantMin = hasVariantPrices ? Math.min(...retailVariantPrices) : 0;
  const variantMax = hasVariantPrices ? Math.max(...retailVariantPrices) : 0;

  // If a variant is selected, show its price; otherwise show range or product price
  const displayPrice = selectedVariant
    ? (selectedVariant.retail_price as number)
    : hasVariantPrices
      ? variantMin
      : (product.retail_price ?? product.price);
  const isRange = !selectedVariant && hasVariantPrices && variantMin !== variantMax;

  // Unit: variant unit overrides product unit
  const displayUnit = selectedVariant?.unit || product.unit;

  const outOfStock = isOther
    ? (otherSelectedVariant?.track_stock &&
       (otherSelectedVariant?.retail_stock_count ?? 1) <= 0)
    : (product.track_stock &&
       product.retail_stock_count != null &&
       product.retail_stock_count <= 0);

  const lowStock = isOther
    ? (otherSelectedVariant?.track_stock &&
       (otherSelectedVariant?.retail_stock_count ?? 1) > 0 &&
       (otherSelectedVariant?.retail_stock_count ?? 1) < 5)
    : (product.track_stock &&
       product.retail_stock_count != null &&
       product.retail_stock_count > 0 &&
       product.retail_stock_count < 5);

  const stockCount = isOther
    ? otherSelectedVariant?.retail_stock_count
    : product.retail_stock_count;

  // Build variant label for "other" products from selected option values
  const otherVariantLabel = useMemo(() => {
    if (!isOther) return null;
    const sortedTypes = [...optionTypes].sort((a, b) => a.sort_order - b.sort_order);
    const parts: string[] = [];
    for (const ot of sortedTypes) {
      const selectedValId = selectedOptionValues[ot.id];
      const val = ot.product_option_values.find((v) => v.id === selectedValId);
      if (val) parts.push(val.value);
    }
    return parts.length > 0 ? parts.join(" / ") : null;
  }, [isOther, optionTypes, selectedOptionValues]);

  function handleAddToCart() {
    addItem(product, quantity, selectedVariant ?? undefined, isOther ? (otherVariantLabel ?? undefined) : undefined);
    setQuantity(1);
  }

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
        <div className="flex items-center gap-2 text-sm mb-8" style={{ color: "color-mix(in srgb, var(--sf-text) 45%, transparent)" }}>
          <Link
            href={`/s/${slug}${qs}`}
            className="hover:opacity-80 transition-opacity"
          >
            Home
          </Link>
          <span>/</span>
          <Link
            href={`/s/${slug}/shop${qs}`}
            className="hover:opacity-80 transition-opacity"
          >
            Shop
          </Link>
          <span>/</span>
          <span className="truncate" style={{ color: "var(--sf-text)" }}>{product.name}</span>
        </div>

        {/* Product */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* Image Gallery */}
          <div>
            <div className="relative aspect-square bg-slate-100 rounded-xl overflow-hidden">
              {productImages.length > 0 ? (
                <Image
                  key={productImages[selectedImageIndex]?.id}
                  src={productImages[selectedImageIndex]?.url}
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
            {productImages.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {productImages.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
                      idx === selectedImageIndex
                        ? "border-current opacity-100"
                        : "border-transparent opacity-60 hover:opacity-80"
                    }`}
                    style={idx === selectedImageIndex ? { borderColor: accent } : undefined}
                  >
                    <Image
                      src={img.url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <h1
              className="text-2xl md:text-3xl font-bold mb-3"
              style={{ color: "var(--sf-text)" }}
            >
              {product.name}
            </h1>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-2xl font-bold" style={{ color: "var(--sf-text)" }}>
                {isRange
                  ? `\u00A3${variantMin.toFixed(2)} – \u00A3${variantMax.toFixed(2)}`
                  : `\u00A3${displayPrice.toFixed(2)}`}
              </span>
              {!isOther && (
                <span className="text-sm" style={{ color: "color-mix(in srgb, var(--sf-text) 45%, transparent)" }}>/ {displayUnit}</span>
              )}
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
                  Low Stock &mdash; Only {stockCount} left
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  In Stock
                </span>
              )}
            </div>

            {/* Origin & Tasting Notes — coffee only */}
            {!isOther && (product.origin || product.tasting_notes) && (
              <div className="mb-6 space-y-3">
                {product.origin && (
                  <div>
                    <span className="block text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: "color-mix(in srgb, var(--sf-text) 40%, transparent)" }}>
                      Origin
                    </span>
                    <span className="text-sm" style={{ color: "color-mix(in srgb, var(--sf-text) 75%, transparent)" }}>
                      {product.origin}
                    </span>
                  </div>
                )}
                {product.tasting_notes && (
                  <div>
                    <span className="block text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: "color-mix(in srgb, var(--sf-text) 40%, transparent)" }}>
                      Tasting notes
                    </span>
                    <span className="text-sm" style={{ color: "color-mix(in srgb, var(--sf-text) 75%, transparent)" }}>
                      {product.tasting_notes}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Variant selectors */}
            {hasVariants && !isOther && (
              <div className="space-y-4 mb-6">
                {weightOptions.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--sf-text)" }}>
                      Size
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {weightOptions.map((w) => {
                        const label = w >= 1000 ? `${w / 1000}kg` : `${w}g`;
                        const isSelected = selectedWeight === w;
                        return (
                          <button
                            key={w}
                            onClick={() => setSelectedWeight(w)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                              isSelected
                                ? "border-transparent"
                                : "border-slate-300 hover:border-slate-400"
                            }`}
                            style={
                              isSelected
                                ? { backgroundColor: accent, color: accentText }
                                : { color: "var(--sf-text)" }
                            }
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {grindOptions.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--sf-text)" }}>
                      Grind
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {grindOptions.map((g) => {
                        const isSelected = selectedGrindId === g.id;
                        return (
                          <button
                            key={g.id}
                            onClick={() => setSelectedGrindId(g.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                              isSelected
                                ? "border-transparent"
                                : "border-slate-300 hover:border-slate-400"
                            }`}
                            style={
                              isSelected
                                ? { backgroundColor: accent, color: accentText }
                                : { color: "var(--sf-text)" }
                            }
                          >
                            {g.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* No matching variant warning */}
                {hasVariants && !selectedVariant && (weightOptions.length > 1 || grindOptions.length > 1) && (
                  <p className="text-sm text-amber-600">
                    This combination is not available. Please select a different option.
                  </p>
                )}
              </div>
            )}

            {/* Option selectors — "other" products */}
            {isOther && hasVariants && (
              <div className="space-y-4 mb-6">
                {[...optionTypes]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .filter((ot) => ot.product_option_values.length > 1)
                  .map((ot) => {
                    const sortedValues = [...ot.product_option_values].sort(
                      (a, b) => a.sort_order - b.sort_order
                    );
                    return (
                      <div key={ot.id}>
                        <label className="block text-sm font-medium mb-2" style={{ color: "var(--sf-text)" }}>
                          {ot.name}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {sortedValues.map((val) => {
                            const isSelected = selectedOptionValues[ot.id] === val.id;
                            return (
                              <button
                                key={val.id}
                                onClick={() =>
                                  setSelectedOptionValues((prev) => ({
                                    ...prev,
                                    [ot.id]: val.id,
                                  }))
                                }
                                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                  isSelected
                                    ? "border-transparent"
                                    : "border-slate-300 hover:border-slate-400"
                                }`}
                                style={
                                  isSelected
                                    ? { backgroundColor: accent, color: accentText }
                                    : { color: "var(--sf-text)" }
                                }
                              >
                                {val.value}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                {/* No matching variant warning */}
                {!selectedVariant && (
                  <p className="text-sm text-amber-600">
                    This combination is not available. Please select a different option.
                  </p>
                )}
              </div>
            )}

            {/* Quantity + Add to Cart */}
            {!outOfStock && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "var(--sf-text)" }}>
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
                  disabled={hasVariants && !selectedVariant}
                  style={
                    hasVariants && !selectedVariant
                      ? { borderRadius: "var(--sf-btn-radius)" }
                      : { backgroundColor: accent, color: accentText, borderRadius: "var(--sf-btn-radius)" }
                  }
                  className={`w-full py-3.5 font-semibold text-sm transition-opacity ${
                    hasVariants && !selectedVariant
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "hover:opacity-90"
                  }`}
                >
                  Add to Cart
                </button>
              </div>
            )}
          </div>
        </div>

        {/* About this coffee */}
        {product.description && (
          <div className="mt-12 md:mt-16">
            <h2
              className="text-lg md:text-xl font-bold mb-4"
              style={{ color: "var(--sf-text)" }}
            >
              {isOther ? "About this product" : "About this coffee"}
            </h2>
            <p
              className="leading-relaxed whitespace-pre-line max-w-2xl"
              style={{ color: "color-mix(in srgb, var(--sf-text) 65%, transparent)" }}
            >
              {product.description}
            </p>
          </div>
        )}

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 md:mt-24">
            <h2
              className="text-xl md:text-2xl font-bold mb-8"
              style={{ color: "var(--sf-text)" }}
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
