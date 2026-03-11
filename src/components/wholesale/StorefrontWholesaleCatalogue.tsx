"use client";

import { useState } from "react";
import Image from "next/image";
import { Minus, Plus, Package, Trash2, ShoppingCart } from "@/components/icons";

interface ProductVariant {
  id: string;
  weight_grams: number | null;
  unit: string | null;
  wholesale_price: number | null;
  is_active: boolean;
  grind_type: { id: string; name: string } | null;
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
  product_variants?: ProductVariant[] | null;
}

interface OrderItem {
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
  minimum: number;
}

type CatalogueContext =
  | { type: "storefront"; slug: string }
  | { type: "website"; domain: string };

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
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [showOrder, setShowOrder] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addToOrder(product: Product, variant?: ProductVariant) {
    const price = variant?.wholesale_price ?? product.wholesale_price ?? product.price;
    const min = product.minimum_wholesale_quantity || 1;
    const itemKey = variant ? `${product.id}:${variant.id}` : product.id;
    const unitLabel = variant?.unit || product.unit;
    const variantLabel = variant
      ? [variant.unit, variant.grind_type?.name].filter(Boolean).join(" — ")
      : null;
    const displayName = variantLabel ? `${product.name} (${variantLabel})` : product.name;

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
    } else {
      setOrder((prev) =>
        prev.map((i) =>
          i.productId === itemKey ? { ...i, quantity } : i
        )
      );
    }
  }

  function removeFromOrder(itemKey: string) {
    setOrder((prev) => prev.filter((i) => i.productId !== itemKey));
  }

  const orderTotal = order.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const orderCount = order.reduce((sum, item) => sum + item.quantity, 0);

  function getSuccessUrl(): string {
    if (context.type === "storefront") {
      return `/s/${context.slug}/wholesale/success`;
    }
    return `/w/${context.domain}/wholesale/success`;
  }

  function getCancelUrl(): string {
    if (context.type === "storefront") {
      return `/s/${context.slug}/wholesale`;
    }
    return `/w/${context.domain}/wholesale`;
  }

  async function handleCheckout() {
    if (order.length === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      const isInvoiceCheckout = paymentTerms !== "prepay";
      const endpoint = isInvoiceCheckout
        ? "/api/s/invoice-checkout"
        : "/api/s/checkout";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roasterId: roaster.id,
          items: order.map((item) => ({
            productId: item.productId.split(":")[0],
            variantId: item.variantId,
            quantity: item.quantity,
          })),
          wholesaleAccessId,
          slug: roaster.slug,
          successUrl: getSuccessUrl(),
          cancelUrl: getCancelUrl(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create checkout.");
        return;
      }

      const data = await res.json();

      if (isInvoiceCheckout && data.success) {
        const params = new URLSearchParams({
          invoice_id: data.invoiceId || "",
          invoice_number: data.invoiceNumber || "",
          order_id: data.orderId || "",
          ...(data.accessToken ? { access_token: data.accessToken } : {}),
        });
        window.location.href = `${getSuccessUrl()}?${params.toString()}`;
      } else if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
          {paymentTerms === "prepay" ? "Prepay" : `${paymentTerms.replace("net", "Net ")} days`}
        </span>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">
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

            // For products without variants, check order by product.id
            const inOrder = !hasVariants
              ? order.find((i) => i.productId === product.id)
              : null;

            return (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden"
              >
                {product.image_url ? (
                  <div className="relative aspect-square bg-slate-50">
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-slate-50 flex items-center justify-center">
                    <Package className="w-12 h-12 text-slate-300" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900 mb-1">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  {hasVariants ? (
                    /* Variant list — each variant is individually orderable */
                    <div className="space-y-2">
                      {wholesaleVariants.map((variant) => {
                        const vPrice = variant.wholesale_price!;
                        const itemKey = `${product.id}:${variant.id}`;
                        const inVariantOrder = order.find((i) => i.productId === itemKey);
                        const label = [variant.unit, variant.grind_type?.name].filter(Boolean).join(" — ");

                        return (
                          <div key={variant.id} className="flex items-center justify-between gap-2 py-1.5 border-t border-slate-100 first:border-t-0">
                            <div className="min-w-0">
                              <span className="text-sm text-slate-700">{label}</span>
                              <span className="text-sm font-semibold text-slate-900 ml-2">
                                {`\u00a3${vPrice.toFixed(2)}`}
                              </span>
                            </div>
                            {inVariantOrder ? (
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => updateQuantity(itemKey, inVariantOrder.quantity - 1)}
                                  className="w-7 h-7 rounded border border-slate-300 flex items-center justify-center hover:bg-slate-50"
                                >
                                  <Minus className="w-3 h-3 text-slate-600" />
                                </button>
                                <span className="text-xs font-medium text-slate-900 w-6 text-center">
                                  {inVariantOrder.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(itemKey, inVariantOrder.quantity + 1)}
                                  className="w-7 h-7 rounded border border-slate-300 flex items-center justify-center hover:bg-slate-50"
                                >
                                  <Plus className="w-3 h-3 text-slate-600" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToOrder(product, variant)}
                                style={{ backgroundColor: accentColour, color: accentText }}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity flex-shrink-0"
                              >
                                Add
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
                          <span className="text-lg font-bold text-slate-900">
                            {`\u00a3${basePrice.toFixed(2)}`}
                          </span>
                          <span className="text-sm text-slate-500 ml-1">
                            {`/ ${product.unit}`}
                          </span>
                        </div>
                        {product.minimum_wholesale_quantity > 1 && (
                          <span className="text-xs text-slate-400">
                            {`Min ${product.minimum_wholesale_quantity}`}
                          </span>
                        )}
                      </div>
                      {inOrder ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateQuantity(
                                product.id,
                                inOrder.quantity - 1
                              )
                            }
                            className="w-9 h-9 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-50"
                          >
                            <Minus className="w-4 h-4 text-slate-600" />
                          </button>
                          <span className="text-sm font-medium text-slate-900 w-10 text-center">
                            {inOrder.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(
                                product.id,
                                inOrder.quantity + 1
                              )
                            }
                            className="w-9 h-9 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-50"
                          >
                            <Plus className="w-4 h-4 text-slate-600" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToOrder(product)}
                          style={{ backgroundColor: accentColour, color: accentText }}
                          className="w-full py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                          Add to Order
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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-30">
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
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-slate-700">
                        {`${item.name} \u00d7 ${item.quantity}`}
                      </span>
                    </div>
                    <span className="font-medium text-slate-900">
                      {`\u00a3${(item.price * item.quantity).toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowOrder(!showOrder)}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="font-medium">
                  {`${orderCount} item${orderCount !== 1 ? "s" : ""}`}
                </span>
                <span className="text-slate-400">|</span>
                <span className="font-bold text-slate-900">
                  {`\u00a3${orderTotal.toFixed(2)}`}
                </span>
              </button>
              <div className="flex items-center gap-3">
                {error && (
                  <span className="text-sm text-red-600">{error}</span>
                )}
                <button
                  onClick={handleCheckout}
                  disabled={submitting}
                  style={{ backgroundColor: accentColour, color: accentText }}
                  className="px-6 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {submitting
                    ? "Processing..."
                    : paymentTerms === "prepay"
                      ? "Checkout"
                      : "Place Order on Account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
