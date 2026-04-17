"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Package, Trash2, ShoppingCart } from "@/components/icons";

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
  description: string | null;
  image_url: string | null;
  unit: string;
  price: number;
  sort_order: number;
  wholesale_price: number | null;
  minimum_wholesale_quantity: number;
  weight_grams: number | null;
  product_variants?: ProductVariant[] | null;
  roasted_stock?: StockPool | null;
  green_beans?: StockPool | null;
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

type CatalogueContext =
  | { type: "storefront"; slug: string }
  | { type: "website"; domain: string };

/** Get total available stock KG (roasted + green bean combined), or null if no pools linked */
function getAvailableKg(product: Product): number | null {
  if (!product.roasted_stock && !product.green_beans) return null;
  let totalKg = 0;
  if (product.roasted_stock) totalKg += Number(product.roasted_stock.current_stock_kg);
  if (product.green_beans) totalKg += Number(product.green_beans.current_stock_kg);
  return totalKg;
}

/** Convert available KG to available units for a given weight */
function kgToUnits(availableKg: number, weightGrams: number): number {
  if (weightGrams <= 0) return Infinity;
  return Math.floor(availableKg / (weightGrams / 1000));
}

/** Calculate how many KG of a product's stock pool are consumed by current cart items */
function getCartConsumedKg(
  order: OrderItem[],
  product: Product,
  products: Product[]
): number {
  let consumedKg = 0;
  for (const item of order) {
    const baseProductId = item.productId.split(":")[0];
    // Only count items that share the same stock pool
    const cartProduct = products.find((p) => p.id === baseProductId);
    if (!cartProduct) continue;
    const sharesRoasted =
      product.roasted_stock &&
      cartProduct.roasted_stock &&
      product.roasted_stock.id === cartProduct.roasted_stock.id;
    const sharesGreen =
      product.green_beans &&
      cartProduct.green_beans &&
      product.green_beans.id === cartProduct.green_beans.id;
    if (sharesRoasted || sharesGreen) {
      consumedKg += (item.weightGrams / 1000) * item.quantity;
    }
  }
  return consumedKg;
}

export function StorefrontWholesaleCatalogue({
  roaster,
  products,
  wholesaleAccessId,
  paymentTerms,
  accentColour,
  accentText,
  context,
}: {
  roaster: {
    id: string;
    businessName: string;
    logoUrl: string | null;
    slug: string;
    stripeAccountId: string | null;
    platformFeePercent: number | null;
  };
  products: Product[];
  wholesaleAccessId: string;
  paymentTerms: string;
  accentColour: string;
  accentText: string;
  context: CatalogueContext;
}) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [showOrder, setShowOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Get available units for a product+variant, accounting for cart consumption */
  const getAvailableUnits = useCallback(
    (
      product: Product,
      weightGrams: number,
      excludeItemKey?: string
    ): number | null => {
      const totalKg = getAvailableKg(product);
      if (totalKg === null) return null; // No stock pool — unlimited

      // Subtract KG consumed by other cart items sharing the same pool
      const otherItems = excludeItemKey
        ? order.filter((i) => i.productId !== excludeItemKey)
        : order;
      const consumedKg = getCartConsumedKg(otherItems, product, products);
      const remainingKg = Math.max(0, totalKg - consumedKg);
      return kgToUnits(remainingKg, weightGrams);
    },
    [order, products]
  );

  /** Stock status for badge display (uses product-level weight or first variant weight) */
  function getStockBadge(
    product: Product,
    weightGrams: number
  ): { label: string; colour: "green" | "amber" | "red" } | null {
    const totalKg = getAvailableKg(product);
    if (totalKg === null) return null;
    if (totalKg <= 0) return { label: "Out of stock", colour: "red" };

    const units = kgToUnits(totalKg, weightGrams);
    if (units <= 0) return { label: "Out of stock", colour: "red" };

    // Check low stock threshold
    const pools: StockPool[] = [];
    if (product.roasted_stock) pools.push(product.roasted_stock);
    if (product.green_beans) pools.push(product.green_beans);
    const isLow = pools.some(
      (p) =>
        p.low_stock_threshold_kg &&
        Number(p.current_stock_kg) <= Number(p.low_stock_threshold_kg)
    );

    if (isLow)
      return { label: `${units} available`, colour: "amber" };
    return { label: `${units} available`, colour: "green" };
  }

  function addToOrder(product: Product, variant?: ProductVariant) {
    const price = variant?.wholesale_price ?? product.wholesale_price ?? product.price;
    const itemKey = variant ? `${product.id}:${variant.id}` : product.id;
    const unitLabel = variant?.unit || product.unit;
    const variantLabel = variant
      ? [variant.unit, variant.grind_type?.name].filter(Boolean).join(" — ")
      : null;
    const displayName = variantLabel ? `${product.name} (${variantLabel})` : product.name;
    const weightGrams = variant?.weight_grams || product.weight_grams || 0;

    // Check available units (accounting for cart)
    const available = getAvailableUnits(product, weightGrams);
    if (available !== null) {
      const existing = order.find((item) => item.productId === itemKey);
      const currentQty = existing ? existing.quantity : 0;
      if (currentQty + 1 > available) {
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
            ? { ...item, quantity: item.quantity + 1 }
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
          quantity: 1,
          minimum: 1,
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

    // Check stock limit
    const baseProductId = itemKey.split(":")[0];
    const product = products.find((p) => p.id === baseProductId);
    if (product) {
      const available = getAvailableUnits(product, item.weightGrams, itemKey);
      if (available !== null && quantity > available) {
        setError(`Maximum ${available} available for ${item.name}`);
        return;
      }
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

  const orderTotal = order.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const orderCount = order.reduce((sum, item) => sum + item.quantity, 0);

  function handleReviewOrder() {
    if (order.length === 0) return;

    // Validate minimum order weight (kg) per product
    for (const product of products) {
      const minKg = product.minimum_wholesale_quantity;
      if (!minKg || minKg <= 0) continue;

      // Sum total weight in cart for this product (across all variants)
      const productItems = order.filter(
        (item) => item.productId === product.id || item.productId.startsWith(`${product.id}:`)
      );
      if (productItems.length === 0) continue;

      const totalKg = productItems.reduce(
        (sum, item) => sum + (item.weightGrams / 1000) * item.quantity,
        0
      );
      if (totalKg < minKg) {
        setError(
          `${product.name} requires a minimum order of ${minKg}kg (currently ${totalKg.toFixed(2)}kg in cart).`
        );
        return;
      }
    }

    // Persist cart and checkout metadata to sessionStorage
    const checkoutUrl = `/wholesale/checkout`;
    const successUrl = `/wholesale/success`;
    const cancelUrl = `/wholesale`;

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
        context,
      })
    );

    router.push(checkoutUrl);
  }

  return (
    <>
      {/* Payment terms badge */}
      <div className="flex gap-2 mb-6">
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: `${accentColour}15`, color: accentColour }}
        >
          Wholesale
        </span>
        <span className="text-xs" style={{ color: "color-mix(in srgb, var(--sf-text) 55%, transparent)" }}>
          {`${paymentTerms.replace("net", "Net ")} days`}
        </span>
      </div>

      {products.length === 0 ? (
        <div
          className="rounded-xl border p-12 text-center"
          style={{
            backgroundColor: "color-mix(in srgb, var(--sf-text) 8%, transparent)",
            borderColor: "color-mix(in srgb, var(--sf-text) 15%, transparent)",
          }}
        >
          <p style={{ color: "color-mix(in srgb, var(--sf-text) 55%, transparent)" }}>
            No wholesale products available at the moment.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
          {products.map((product) => {
            const wholesaleVariants = (product.product_variants || []).filter(
              (v) => v.is_active && v.wholesale_price != null
            );
            const hasVariants = wholesaleVariants.length > 0;
            const basePrice = product.wholesale_price ?? product.price;

            // Stock badge — use first variant weight or product weight
            const displayWeight = hasVariants
              ? wholesaleVariants[0]?.weight_grams || product.weight_grams || 0
              : product.weight_grams || 0;
            const badge = getStockBadge(product, displayWeight);
            const isOutOfStock = badge?.colour === "red";

            // For products without variants, check order by product.id
            const inOrder = !hasVariants
              ? order.find((i) => i.productId === product.id)
              : null;

            return (
              <div
                key={product.id}
                className="rounded-xl border overflow-hidden"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--sf-text) 8%, transparent)",
                  borderColor: "color-mix(in srgb, var(--sf-text) 15%, transparent)",
                }}
              >
                <Link
                  href={`/wholesale/product/${product.id}`}
                  className="block hover:opacity-90 transition-opacity"
                >
                  {product.image_url ? (
                    <div
                      className="relative aspect-square"
                      style={{ backgroundColor: "color-mix(in srgb, var(--sf-text) 5%, transparent)" }}
                    >
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="aspect-square flex items-center justify-center"
                      style={{ backgroundColor: "color-mix(in srgb, var(--sf-text) 5%, transparent)" }}
                    >
                      <Package className="w-12 h-12 opacity-30" />
                    </div>
                  )}
                  <div className="px-4 pt-4">
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
                  </div>
                </Link>
                <div className="px-4 pb-4">

                  {hasVariants ? (
                    /* Variant list — each variant is individually orderable */
                    <div className="space-y-2">
                      {wholesaleVariants.map((variant) => {
                        const vPrice = variant.wholesale_price!;
                        const itemKey = `${product.id}:${variant.id}`;
                        const inVariantOrder = order.find((i) => i.productId === itemKey);
                        const label = [variant.unit, variant.grind_type?.name].filter(Boolean).join(" — ");

                        // Per-variant stock badge
                        const vWeight = variant.weight_grams || product.weight_grams || 0;
                        const vBadge = getStockBadge(product, vWeight);
                        const vOutOfStock = vBadge?.colour === "red";

                        // Available units for this variant (accounting for cart)
                        const vAvailable = getAvailableUnits(product, vWeight, inVariantOrder ? itemKey : undefined);
                        const vRemainingForAdd = vAvailable !== null && inVariantOrder
                          ? vAvailable - inVariantOrder.quantity
                          : vAvailable;

                        return (
                          <div
                            key={variant.id}
                            className="flex items-center justify-between gap-2 py-1.5 border-t first:border-t-0"
                            style={{ borderColor: "color-mix(in srgb, var(--sf-text) 10%, transparent)" }}
                          >
                            <div className="min-w-0">
                              <span className="text-sm" style={{ color: "var(--sf-text)" }}>{label}</span>
                              <span className="text-sm font-semibold ml-2" style={{ color: "var(--sf-text)" }}>
                                {`\u00a3${vPrice.toFixed(2)}`}
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
                            {inVariantOrder ? (
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => updateQuantity(itemKey, inVariantOrder.quantity - 1)}
                                  className="w-7 h-7 rounded border flex items-center justify-center hover:opacity-80"
                                  style={{ borderColor: "color-mix(in srgb, var(--sf-text) 20%, transparent)" }}
                                >
                                  <Minus className="w-3 h-3 opacity-70" />
                                </button>
                                <span className="text-xs font-medium w-6 text-center" style={{ color: "var(--sf-text)" }}>
                                  {inVariantOrder.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(itemKey, inVariantOrder.quantity + 1)}
                                  disabled={vAvailable !== null && inVariantOrder.quantity >= vAvailable}
                                  className="w-7 h-7 rounded border flex items-center justify-center hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
                                  style={{ borderColor: "color-mix(in srgb, var(--sf-text) 20%, transparent)" }}
                                >
                                  <Plus className="w-3 h-3 opacity-70" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToOrder(product, variant)}
                                disabled={vOutOfStock || (vRemainingForAdd !== null && vRemainingForAdd <= 0)}
                                style={vOutOfStock || (vRemainingForAdd !== null && vRemainingForAdd <= 0) ? {} : { backgroundColor: accentColour, color: accentText }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity flex-shrink-0 ${
                                  vOutOfStock || (vRemainingForAdd !== null && vRemainingForAdd <= 0)
                                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                    : "hover:opacity-90"
                                }`}
                              >
                                {vOutOfStock || (vRemainingForAdd !== null && vRemainingForAdd <= 0) ? "Unavailable" : "Add"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* No variants — simple price + add */
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-lg font-bold" style={{ color: "var(--sf-text)" }}>
                            {`\u00a3${basePrice.toFixed(2)}`}
                          </span>
                          <span
                            className="text-sm ml-1"
                            style={{ color: "color-mix(in srgb, var(--sf-text) 55%, transparent)" }}
                          >
                            {`/ ${product.unit}`}
                          </span>
                        </div>
                        {product.minimum_wholesale_quantity > 0 && (
                          <span
                            className="text-xs"
                            style={{ color: "color-mix(in srgb, var(--sf-text) 55%, transparent)" }}
                          >
                            {`Min ${product.minimum_wholesale_quantity}kg`}
                          </span>
                        )}
                      </div>

                      {badge && (
                        <div className="mb-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              badge.colour === "red"
                                ? "bg-red-100 text-red-700"
                                : badge.colour === "amber"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-green-100 text-green-700"
                            }`}
                          >
                            {badge.label}
                          </span>
                        </div>
                      )}

                      {inOrder ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateQuantity(
                                product.id,
                                inOrder.quantity - 1
                              )
                            }
                            className="w-9 h-9 rounded-lg border flex items-center justify-center hover:opacity-80"
                            style={{ borderColor: "color-mix(in srgb, var(--sf-text) 20%, transparent)" }}
                          >
                            <Minus className="w-4 h-4 opacity-70" />
                          </button>
                          <span className="text-sm font-medium w-10 text-center" style={{ color: "var(--sf-text)" }}>
                            {inOrder.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(
                                product.id,
                                inOrder.quantity + 1
                              )
                            }
                            disabled={(() => {
                              const avail = getAvailableUnits(product, product.weight_grams || 0, product.id);
                              return avail !== null && inOrder.quantity >= avail;
                            })()}
                            className="w-9 h-9 rounded-lg border flex items-center justify-center hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ borderColor: "color-mix(in srgb, var(--sf-text) 20%, transparent)" }}
                          >
                            <Plus className="w-4 h-4 opacity-70" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToOrder(product)}
                          disabled={isOutOfStock}
                          style={isOutOfStock ? {} : { backgroundColor: accentColour, color: accentText }}
                          className={`w-full py-2.5 rounded-lg text-sm font-medium transition-opacity ${
                            isOutOfStock
                              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                              : "hover:opacity-90"
                          }`}
                        >
                          {isOutOfStock ? "Out of Stock" : "Add to Order"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating order bar — no left offset (no sidebar) */}
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
                {order.map((item) => {
                  const baseProductId = item.productId.split(":")[0];
                  const cartProduct = products.find((p) => p.id === baseProductId);
                  const cartAvailable = cartProduct
                    ? getAvailableUnits(cartProduct, item.weightGrams, item.productId)
                    : null;
                  const overLimit = cartAvailable !== null && item.quantity > cartAvailable;
                  return (
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
                        {overLimit && (
                          <span className="text-xs text-red-600 font-medium">
                            {cartAvailable <= 0 ? "Out of stock" : `Only ${cartAvailable} available`}
                          </span>
                        )}
                      </div>
                      <span className="font-medium" style={{ color: "var(--sf-text)" }}>
                        {`\u00a3${(item.price * item.quantity).toFixed(2)}`}
                      </span>
                    </div>
                  );
                })}
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
                  {`\u00a3${orderTotal.toFixed(2)}`}
                </span>
              </button>
              <div className="flex items-center gap-3">
                {error && (
                  <span className="text-sm text-red-600">{error}</span>
                )}
                <button
                  onClick={handleReviewOrder}
                  style={{ backgroundColor: accentColour, color: accentText }}
                  className="px-6 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  Review Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
