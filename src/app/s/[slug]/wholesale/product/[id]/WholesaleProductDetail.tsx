"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStorefront } from "../../../_components/StorefrontProvider";
import { Header } from "../../../_components/Header";
import { Cart } from "../../../_components/Cart";
import { Footer } from "../../../_components/Footer";
import { Minus, Plus, ShoppingCart, Trash2, Package } from "@/components/icons";

interface ProductVariant {
  id: string;
  weight_grams: number | null;
  unit: string | null;
  wholesale_price: number | null;
  is_active: boolean;
  grind_type: { id: string; name: string } | null;
}

interface StockPool {
  id: string;
  current_stock_kg: number;
  low_stock_threshold_kg: number | null;
}

interface Product {
  id: string;
  name: string;
  category: string;
  origin: string | null;
  tasting_notes: string | null;
  description: string | null;
  price: number;
  unit: string;
  image_url: string | null;
  wholesale_price: number | null;
  minimum_wholesale_quantity: number;
  weight_grams: number | null;
  product_variants?: ProductVariant[] | null;
  roasted_stock?: StockPool | null;
  green_beans?: StockPool | null;
  product_images?: { id: string; url: string; sort_order: number; is_primary: boolean }[] | null;
}

interface OrderItem {
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
  minimum: number;
  weightGrams: number;
}

function getProductImages(product: Product): { url: string; id: string }[] {
  const imgs = (product.product_images || [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => ({ url: img.url, id: img.id }));
  if (imgs.length > 0) return imgs;
  if (product.image_url) return [{ url: product.image_url, id: "legacy" }];
  return [];
}

function getAvailableKg(product: Product): number | null {
  if (!product.roasted_stock && !product.green_beans) return null;
  let totalKg = 0;
  if (product.roasted_stock) totalKg += Number(product.roasted_stock.current_stock_kg);
  if (product.green_beans) totalKg += Number(product.green_beans.current_stock_kg);
  return totalKg;
}

function kgToUnits(availableKg: number, weightGrams: number): number {
  if (weightGrams <= 0) return Infinity;
  return Math.floor(availableKg / (weightGrams / 1000));
}

export function WholesaleProductDetail({
  product,
  relatedProducts,
  roaster,
  wholesaleAccessId,
  paymentTerms,
}: {
  product: Product;
  relatedProducts: Product[];
  roaster: {
    id: string;
    businessName: string;
    slug: string;
    stripeAccountId: string | null;
    platformFeePercent: number | null;
  };
  wholesaleAccessId: string;
  paymentTerms: string;
}) {
  const { slug, accent, accentText, embedded } = useStorefront();
  const router = useRouter();
  const qs = embedded ? "?embedded=true" : "";

  const [order, setOrder] = useState<OrderItem[]>([]);
  const [showOrder, setShowOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const productImages = getProductImages(product);

  const wholesaleVariants = useMemo(
    () =>
      (product.product_variants || []).filter(
        (v) => v.is_active && v.wholesale_price != null
      ),
    [product.product_variants]
  );
  const hasVariants = wholesaleVariants.length > 0;
  const basePrice = product.wholesale_price ?? product.price;

  // Stock helpers
  const getAvailableUnits = useCallback(
    (weightGrams: number, excludeItemKey?: string): number | null => {
      const totalKg = getAvailableKg(product);
      if (totalKg === null) return null;
      const otherItems = excludeItemKey
        ? order.filter((i) => i.productId !== excludeItemKey)
        : order;
      let consumedKg = 0;
      for (const item of otherItems) {
        consumedKg += (item.weightGrams / 1000) * item.quantity;
      }
      const remainingKg = Math.max(0, totalKg - consumedKg);
      return kgToUnits(remainingKg, weightGrams);
    },
    [order, product]
  );

  function getStockBadge(
    weightGrams: number
  ): { label: string; colour: "green" | "amber" | "red" } | null {
    const totalKg = getAvailableKg(product);
    if (totalKg === null) return null;
    if (totalKg <= 0) return { label: "Out of stock", colour: "red" };
    const units = kgToUnits(totalKg, weightGrams);
    if (units <= 0) return { label: "Out of stock", colour: "red" };
    const pools: StockPool[] = [];
    if (product.roasted_stock) pools.push(product.roasted_stock);
    if (product.green_beans) pools.push(product.green_beans);
    const isLow = pools.some(
      (p) =>
        p.low_stock_threshold_kg &&
        Number(p.current_stock_kg) <= Number(p.low_stock_threshold_kg)
    );
    if (isLow) return { label: `${units} available`, colour: "amber" };
    return { label: `${units} available`, colour: "green" };
  }

  function addToOrder(variant?: ProductVariant) {
    const price = variant?.wholesale_price ?? product.wholesale_price ?? product.price;
    const min = product.minimum_wholesale_quantity || 1;
    const itemKey = variant ? `${product.id}:${variant.id}` : product.id;
    const unitLabel = variant?.unit || product.unit;
    const variantLabel = variant
      ? [variant.unit, variant.grind_type?.name].filter(Boolean).join(" — ")
      : null;
    const displayName = variantLabel ? `${product.name} (${variantLabel})` : product.name;
    const weightGrams = variant?.weight_grams || product.weight_grams || 0;

    const available = getAvailableUnits(weightGrams);
    if (available !== null) {
      const existing = order.find((item) => item.productId === itemKey);
      const currentQty = existing ? existing.quantity : 0;
      if (currentQty + min > available) {
        setError(
          available <= 0
            ? `${product.name} is out of stock`
            : `Only ${available} available for ${displayName}`
        );
        return;
      }
    }

    setError(null);
    setOrder((prev) => {
      const existing = prev.find((item) => item.productId === itemKey);
      if (existing) {
        return prev.map((item) =>
          item.productId === itemKey
            ? { ...item, quantity: item.quantity + min }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: itemKey,
          variantId: variant?.id,
          name: displayName,
          price,
          unit: unitLabel,
          quantity: min,
          minimum: min,
          weightGrams,
        },
      ];
    });
    setShowOrder(true);
  }

  function updateQuantity(itemKey: string, quantity: number) {
    const item = order.find((i) => i.productId === itemKey);
    if (!item) return;
    if (quantity < item.minimum) {
      setOrder((prev) => prev.filter((i) => i.productId !== itemKey));
      setError(null);
      return;
    }
    const available = getAvailableUnits(item.weightGrams, itemKey);
    if (available !== null && quantity > available) {
      setError(`Maximum ${available} available for ${item.name}`);
      return;
    }
    setError(null);
    setOrder((prev) =>
      prev.map((i) =>
        i.productId === itemKey ? { ...i, quantity } : i
      )
    );
  }

  function removeFromOrder(itemKey: string) {
    setOrder((prev) => prev.filter((i) => i.productId !== itemKey));
    setError(null);
  }

  const orderTotal = order.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const orderCount = order.reduce((sum, item) => sum + item.quantity, 0);

  function handleReviewOrder() {
    if (order.length === 0) return;
    const checkoutUrl = `/s/${slug}/wholesale/checkout`;
    const successUrl = `/s/${slug}/wholesale/success`;
    const cancelUrl = `/s/${slug}/wholesale`;
    sessionStorage.setItem(
      "wholesale_checkout",
      JSON.stringify({
        roasterId: roaster.id,
        roasterSlug: roaster.slug,
        roasterName: roaster.businessName,
        wholesaleAccessId,
        paymentTerms,
        items: order,
        successUrl,
        cancelUrl,
        context: { type: "storefront", slug },
      })
    );
    router.push(checkoutUrl);
  }

  // Overall stock badge for product
  const displayWeight = hasVariants
    ? wholesaleVariants[0]?.weight_grams || product.weight_grams || 0
    : product.weight_grams || 0;
  const badge = getStockBadge(displayWeight);
  const isOutOfStock = badge?.colour === "red";

  // Price range across variants
  const variantPrices = wholesaleVariants.map((v) => v.wholesale_price as number);
  const priceMin = variantPrices.length > 0 ? Math.min(...variantPrices) : basePrice;
  const priceMax = variantPrices.length > 0 ? Math.max(...variantPrices) : basePrice;
  const isRange = hasVariants && priceMin !== priceMax;

  return (
    <div style={{ fontFamily: "var(--sf-font)" }} className="min-h-screen">
      <Header />
      <Cart />

      {!embedded && <div className="h-16 md:h-20" />}

      <div className="max-w-6xl mx-auto px-6 py-8 md:py-12">
        {/* Breadcrumb */}
        <div
          className="flex items-center gap-2 text-sm mb-8"
          style={{ color: "color-mix(in srgb, var(--sf-text) 45%, transparent)" }}
        >
          <Link
            href={`/s/${slug}/wholesale${qs}`}
            className="hover:opacity-80 transition-opacity"
          >
            Wholesale
          </Link>
          <span>/</span>
          <span className="truncate" style={{ color: "var(--sf-text)" }}>
            {product.name}
          </span>
        </div>

        {/* Product */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* Image Gallery */}
          <div>
            <div className="relative aspect-square rounded-xl overflow-hidden" style={{ backgroundColor: "color-mix(in srgb, var(--sf-text) 5%, transparent)" }}>
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
                  <Package className="w-20 h-20 opacity-20" />
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
                        ? "opacity-100"
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
            <div className="flex items-center gap-2 mb-3">
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: `${accent}15`, color: accent }}
              >
                Wholesale
              </span>
            </div>

            <h1
              className="text-2xl md:text-3xl font-bold mb-3"
              style={{ color: "var(--sf-text)" }}
            >
              {product.name}
            </h1>

            {/* Price display */}
            {!hasVariants && (
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-2xl font-bold" style={{ color: "var(--sf-text)" }}>
                  {`\u00A3${basePrice.toFixed(2)}`}
                </span>
                <span
                  className="text-sm"
                  style={{ color: "color-mix(in srgb, var(--sf-text) 45%, transparent)" }}
                >
                  {`/ ${product.unit}`}
                </span>
              </div>
            )}
            {hasVariants && !isRange && (
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-2xl font-bold" style={{ color: "var(--sf-text)" }}>
                  {`\u00A3${priceMin.toFixed(2)}`}
                </span>
              </div>
            )}
            {isRange && (
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-2xl font-bold" style={{ color: "var(--sf-text)" }}>
                  {`\u00A3${priceMin.toFixed(2)} \u2013 \u00A3${priceMax.toFixed(2)}`}
                </span>
              </div>
            )}

            {/* Minimum order */}
            {product.minimum_wholesale_quantity > 1 && (
              <p
                className="text-sm mb-4"
                style={{ color: "color-mix(in srgb, var(--sf-text) 55%, transparent)" }}
              >
                {`Minimum order: ${product.minimum_wholesale_quantity} units`}
              </p>
            )}

            {/* Stock badge */}
            {badge && !hasVariants && (
              <div className="mb-6">
                <span
                  className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                    badge.colour === "red"
                      ? "text-red-600"
                      : badge.colour === "amber"
                        ? "text-amber-600"
                        : "text-green-600"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      badge.colour === "red"
                        ? "bg-red-500"
                        : badge.colour === "amber"
                          ? "bg-amber-500"
                          : "bg-green-500"
                    }`}
                  />
                  {badge.label}
                </span>
              </div>
            )}

            {/* Origin & Tasting Notes — coffee products */}
            {(product.origin || product.tasting_notes) && (
              <div className="mb-6 space-y-3">
                {product.origin && (
                  <div>
                    <span
                      className="block text-xs font-medium uppercase tracking-wide mb-0.5"
                      style={{ color: "color-mix(in srgb, var(--sf-text) 40%, transparent)" }}
                    >
                      Origin
                    </span>
                    <span
                      className="text-sm"
                      style={{ color: "color-mix(in srgb, var(--sf-text) 75%, transparent)" }}
                    >
                      {product.origin}
                    </span>
                  </div>
                )}
                {product.tasting_notes && (
                  <div>
                    <span
                      className="block text-xs font-medium uppercase tracking-wide mb-0.5"
                      style={{ color: "color-mix(in srgb, var(--sf-text) 40%, transparent)" }}
                    >
                      Tasting notes
                    </span>
                    <span
                      className="text-sm"
                      style={{ color: "color-mix(in srgb, var(--sf-text) 75%, transparent)" }}
                    >
                      {product.tasting_notes}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Variants list */}
            {hasVariants ? (
              <div className="space-y-2 mb-6">
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--sf-text)" }}
                >
                  Variants
                </label>
                {wholesaleVariants.map((variant) => {
                  const vPrice = variant.wholesale_price!;
                  const itemKey = `${product.id}:${variant.id}`;
                  const inOrder = order.find((i) => i.productId === itemKey);
                  const label = [variant.unit, variant.grind_type?.name]
                    .filter(Boolean)
                    .join(" — ");

                  const vWeight = variant.weight_grams || product.weight_grams || 0;
                  const vBadge = getStockBadge(vWeight);
                  const vOutOfStock = vBadge?.colour === "red";

                  const vAvailable = getAvailableUnits(
                    vWeight,
                    inOrder ? itemKey : undefined
                  );
                  const vRemainingForAdd =
                    vAvailable !== null && inOrder
                      ? vAvailable - inOrder.quantity
                      : vAvailable;

                  return (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between gap-3 py-3 px-4 rounded-lg border"
                      style={{
                        borderColor: "color-mix(in srgb, var(--sf-text) 15%, transparent)",
                        backgroundColor: "color-mix(in srgb, var(--sf-text) 3%, transparent)",
                      }}
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-medium" style={{ color: "var(--sf-text)" }}>
                          {label}
                        </span>
                        <span className="text-sm font-bold ml-2" style={{ color: "var(--sf-text)" }}>
                          {`\u00A3${vPrice.toFixed(2)}`}
                        </span>
                        {vBadge && (
                          <span
                            className={`inline-flex items-center ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                              vBadge.colour === "red"
                                ? "bg-red-100 text-red-700"
                                : vBadge.colour === "amber"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-green-100 text-green-700"
                            }`}
                          >
                            {vBadge.label}
                          </span>
                        )}
                      </div>
                      {inOrder ? (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() =>
                              updateQuantity(itemKey, inOrder.quantity - 1)
                            }
                            className="w-8 h-8 rounded border flex items-center justify-center hover:opacity-80"
                            style={{
                              borderColor: "color-mix(in srgb, var(--sf-text) 20%, transparent)",
                            }}
                          >
                            <Minus className="w-3.5 h-3.5 opacity-70" />
                          </button>
                          <span
                            className="text-sm font-medium w-8 text-center"
                            style={{ color: "var(--sf-text)" }}
                          >
                            {inOrder.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(itemKey, inOrder.quantity + 1)
                            }
                            disabled={
                              vAvailable !== null &&
                              inOrder.quantity >= vAvailable
                            }
                            className="w-8 h-8 rounded border flex items-center justify-center hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{
                              borderColor: "color-mix(in srgb, var(--sf-text) 20%, transparent)",
                            }}
                          >
                            <Plus className="w-3.5 h-3.5 opacity-70" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToOrder(variant)}
                          disabled={
                            vOutOfStock ||
                            (vRemainingForAdd !== null && vRemainingForAdd <= 0)
                          }
                          style={
                            vOutOfStock ||
                            (vRemainingForAdd !== null && vRemainingForAdd <= 0)
                              ? { borderRadius: "var(--sf-btn-radius)" }
                              : { backgroundColor: accent, color: accentText, borderRadius: "var(--sf-btn-radius)" }
                          }
                          className={`px-4 py-2 text-sm font-medium transition-opacity flex-shrink-0 ${
                            vOutOfStock ||
                            (vRemainingForAdd !== null && vRemainingForAdd <= 0)
                              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                              : "hover:opacity-90"
                          }`}
                        >
                          {vOutOfStock ||
                          (vRemainingForAdd !== null && vRemainingForAdd <= 0)
                            ? "Unavailable"
                            : "Add to Order"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* No variants — simple add to order */
              !isOutOfStock && (
                <div className="mb-6">
                  {(() => {
                    const inOrder = order.find((i) => i.productId === product.id);
                    const available = getAvailableUnits(product.weight_grams || 0, inOrder ? product.id : undefined);
                    return inOrder ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateQuantity(product.id, inOrder.quantity - 1)
                          }
                          className="w-10 h-10 rounded-lg border flex items-center justify-center hover:opacity-80"
                          style={{
                            borderColor: "color-mix(in srgb, var(--sf-text) 20%, transparent)",
                          }}
                        >
                          <Minus className="w-4 h-4 opacity-70" />
                        </button>
                        <span
                          className="text-sm font-medium w-12 text-center"
                          style={{ color: "var(--sf-text)" }}
                        >
                          {inOrder.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(product.id, inOrder.quantity + 1)
                          }
                          disabled={
                            available !== null &&
                            inOrder.quantity >= available
                          }
                          className="w-10 h-10 rounded-lg border flex items-center justify-center hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
                          style={{
                            borderColor: "color-mix(in srgb, var(--sf-text) 20%, transparent)",
                          }}
                        >
                          <Plus className="w-4 h-4 opacity-70" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToOrder()}
                        style={{ backgroundColor: accent, color: accentText, borderRadius: "var(--sf-btn-radius)" }}
                        className="w-full py-3.5 font-semibold text-sm hover:opacity-90 transition-opacity"
                      >
                        Add to Order
                      </button>
                    );
                  })()}
                </div>
              )
            )}

            {isOutOfStock && !hasVariants && (
              <div className="mb-6">
                <button
                  disabled
                  className="w-full py-3.5 rounded-lg font-semibold text-sm bg-gray-200 text-gray-500 cursor-not-allowed"
                >
                  Out of Stock
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="mt-12 md:mt-16">
            <h2
              className="text-lg md:text-xl font-bold mb-4"
              style={{ color: "var(--sf-text)" }}
            >
              {product.category === "coffee" ? "About this coffee" : "About this product"}
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
          <div className="mt-16 md:mt-24 mb-24">
            <h2
              className="text-xl md:text-2xl font-bold mb-8"
              style={{ color: "var(--sf-text)" }}
            >
              More Wholesale Products
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((p) => {
                const pImage = (p.product_images || [])
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .find((img) => img.is_primary) || (p.product_images || [])[0];
                const imgUrl = pImage?.url || p.image_url;

                return (
                  <Link
                    key={p.id}
                    href={`/s/${slug}/wholesale/product/${p.id}${qs}`}
                    className="rounded-xl border overflow-hidden hover:opacity-90 transition-opacity"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--sf-text) 8%, transparent)",
                      borderColor: "color-mix(in srgb, var(--sf-text) 15%, transparent)",
                    }}
                  >
                    {imgUrl ? (
                      <div
                        className="relative aspect-square"
                        style={{ backgroundColor: "color-mix(in srgb, var(--sf-text) 5%, transparent)" }}
                      >
                        <Image
                          src={imgUrl}
                          alt={p.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 25vw"
                        />
                      </div>
                    ) : (
                      <div
                        className="aspect-square flex items-center justify-center"
                        style={{ backgroundColor: "color-mix(in srgb, var(--sf-text) 5%, transparent)" }}
                      >
                        <Package className="w-10 h-10 opacity-20" />
                      </div>
                    )}
                    <div className="p-3">
                      <h3
                        className="text-sm font-semibold truncate"
                        style={{ color: "var(--sf-text)" }}
                      >
                        {p.name}
                      </h3>
                      <p
                        className="text-sm font-medium mt-0.5"
                        style={{ color: "color-mix(in srgb, var(--sf-text) 55%, transparent)" }}
                      >
                        {`\u00A3${(p.wholesale_price ?? p.price).toFixed(2)} / ${p.unit}`}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating order bar */}
      {order.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 border-t shadow-lg z-30"
          style={{
            backgroundColor: "color-mix(in srgb, var(--sf-text) 8%, transparent)",
            borderColor: "color-mix(in srgb, var(--sf-text) 15%, transparent)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="max-w-5xl mx-auto px-6 py-4">
            {showOrder && (
              <div className="mb-4 space-y-2 max-h-48 overflow-y-auto">
                {order.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => removeFromOrder(item.productId)}
                        className="opacity-50 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span style={{ color: "var(--sf-text)" }}>
                        {`${item.name} \u00d7 ${item.quantity}`}
                      </span>
                    </div>
                    <span
                      className="font-medium"
                      style={{ color: "var(--sf-text)" }}
                    >
                      {`\u00A3${(item.price * item.quantity).toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowOrder(!showOrder)}
                className="flex items-center gap-2 text-sm hover:opacity-80"
                style={{ color: "var(--sf-text)" }}
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="font-medium">
                  {`${orderCount} item${orderCount !== 1 ? "s" : ""}`}
                </span>
                <span className="opacity-40">|</span>
                <span className="font-bold">
                  {`\u00A3${orderTotal.toFixed(2)}`}
                </span>
              </button>
              <div className="flex items-center gap-3">
                {error && (
                  <span className="text-sm text-red-600">{error}</span>
                )}
                <button
                  onClick={handleReviewOrder}
                  style={{ backgroundColor: accent, color: accentText, borderRadius: "var(--sf-btn-radius)" }}
                  className="px-6 py-2.5 font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  Review Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
