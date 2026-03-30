"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "./CartProvider";
import { useStorefront } from "./StorefrontProvider";

export function Cart() {
  const {
    items,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
    subtotal,
  } = useCart();
  const { slug, accent, accentText, embedded, showRetail } = useStorefront();
  const router = useRouter();

  // Cart is retail-only; wholesale has its own ordering flow
  if (!showRetail) return null;

  function handleCheckout() {
    closeCart();
    router.push(`/s/${slug}/checkout${embedded ? "?embedded=true" : ""}`);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30"
            onClick={closeCart}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-xl"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">
                  Your Cart
                </h2>
                <button
                  onClick={closeCart}
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <svg
                      className="w-16 h-16 text-slate-200 mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                    <p className="text-slate-500 font-medium mb-1">
                      Your cart is empty
                    </p>
                    <Link
                      href={`/s/${slug}/shop${embedded ? "?embedded=true" : ""}`}
                      onClick={closeCart}
                      className="text-sm font-medium mt-2 hover:opacity-80 transition-opacity"
                      style={{ color: accent }}
                    >
                      Start Shopping &rarr;
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div
                        key={`${item.productId}::${item.variantId ?? ""}`}
                        className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0"
                      >
                        {/* Thumbnail */}
                        <div className="relative w-14 h-14 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg
                                className="w-6 h-6 text-slate-300"
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

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-slate-900 text-sm truncate">
                            {item.name}
                          </h3>
                          {item.variantLabel && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {item.variantLabel}
                            </p>
                          )}
                          <p className="text-xs text-slate-500 mt-0.5">
                            {`\u00A3${item.price.toFixed(2)}${item.unit ? ` / ${item.unit}` : ""}`}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.productId,
                                  item.variantId,
                                  item.quantity - 1
                                )
                              }
                              className="w-7 h-7 flex items-center justify-center rounded border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm"
                            >
                              -
                            </button>
                            <span className="text-sm font-medium w-8 text-center text-slate-900">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.productId,
                                  item.variantId,
                                  item.quantity + 1
                                )
                              }
                              className="w-7 h-7 flex items-center justify-center rounded border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Price + remove */}
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {"\u00A3"}
                            {(item.price * item.quantity).toFixed(2)}
                          </p>
                          <button
                            onClick={() => removeItem(item.productId, item.variantId)}
                            className="text-xs text-red-500 hover:text-red-700 mt-1"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {items.length > 0 && (
                <div className="border-t border-slate-200 px-6 py-4 space-y-3">
                  {/* Discount code link */}
                  <button
                    onClick={handleCheckout}
                    className="text-sm text-slate-500 hover:text-slate-700 transition-colors text-left"
                  >
                    Have a discount code? Apply at checkout &rarr;
                  </button>

                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-slate-900">
                      Subtotal
                    </span>
                    <span className="text-lg font-bold text-slate-900">
                      {"\u00A3"}
                      {subtotal.toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    style={{ backgroundColor: accent, color: accentText, borderRadius: "var(--sf-btn-radius)" }}
                    className="w-full py-3 font-semibold text-sm hover:opacity-90 transition-opacity"
                  >
                    Checkout
                  </button>

                  <button
                    onClick={closeCart}
                    className="w-full text-center text-sm text-slate-500 hover:text-slate-700 transition-colors py-1"
                  >
                    Continue Shopping
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
