"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "../_components/CartProvider";

interface AppliedDiscount {
  discountCodeId: string;
  code: string;
  discountType: string;
  discountAmountPence: number;
  displayText: string;
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { items, subtotal, clearCart } = useCart();

  const [roasterId, setRoasterId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Discount state
  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [validatingDiscount, setValidatingDiscount] = useState(false);

  // Read roasterId from sessionStorage (set by CartProvider)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`cart-${slug}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.roasterId) setRoasterId(parsed.roasterId);
      }
    } catch {
      // ignore
    }
  }, [slug]);

  // Auto-apply check on mount
  useEffect(() => {
    if (!roasterId) return;
    fetch(`/api/s/discount/auto-apply?roasterId=${roasterId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.code) {
          setDiscountInput(data.code);
          // Auto-validate
          validateDiscount(data.code);
        }
      })
      .catch(() => {
        // ignore
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roasterId]);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push(`/s/${slug}/shop`);
    }
  }, [items.length, slug, router]);

  const subtotalPence = Math.round(subtotal * 100);

  async function validateDiscount(codeOverride?: string) {
    const codeToValidate = codeOverride || discountInput.trim();
    if (!codeToValidate || !roasterId) return;

    setValidatingDiscount(true);
    setDiscountError(null);

    try {
      const res = await fetch("/api/s/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roasterId,
          code: codeToValidate,
          customerEmail: email || undefined,
          subtotalPence,
          items: items.map((item) => ({ productId: item.productId })),
        }),
      });

      const data = await res.json();

      if (data.valid) {
        setAppliedDiscount({
          discountCodeId: data.discountCodeId,
          code: data.code,
          discountType: data.discountType,
          discountAmountPence: data.discountAmountPence,
          displayText: data.displayText,
        });
        setDiscountInput(data.code);
        setDiscountError(null);
      } else {
        setDiscountError(data.error || "Invalid discount code.");
        setAppliedDiscount(null);
      }
    } catch {
      setDiscountError("Failed to validate code. Please try again.");
    }

    setValidatingDiscount(false);
  }

  function removeDiscount() {
    setAppliedDiscount(null);
    setDiscountInput("");
    setDiscountError(null);
  }

  const discountPence = appliedDiscount?.discountAmountPence || 0;
  const totalPence = subtotalPence - discountPence;
  const totalPounds = totalPence / 100;

  if (items.length === 0 || !roasterId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/s/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roasterId,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          customerEmail: email,
          customerName: name,
          deliveryAddress: {
            line1: addressLine1,
            line2: addressLine2 || undefined,
            city,
            postcode,
            country: "GB",
          },
          slug,
          // Discount fields
          ...(appliedDiscount
            ? {
                discountCodeId: appliedDiscount.discountCodeId,
                discountCode: appliedDiscount.code,
                discountType: appliedDiscount.discountType,
                discountAmountPence: appliedDiscount.discountAmountPence,
              }
            : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setIsSubmitting(false);
        return;
      }

      // Clear cart and redirect to Stripe
      clearCart();
      window.location.href = data.sessionUrl;
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  const inputClassName =
    "w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent";

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "var(--sf-font)" }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href={`/s/${slug}/shop`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to shop
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Form */}
          <div className="md:col-span-3">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h2 className="text-base font-semibold text-slate-900">
                  Your Details
                </h2>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Smith"
                    required
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    required
                    className={inputClassName}
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h2 className="text-base font-semibold text-slate-900">
                  Delivery Address
                </h2>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="123 High Street"
                    required
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Address Line 2{" "}
                    <span className="text-slate-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Flat 2"
                    className={inputClassName}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="London"
                      required
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Postcode
                    </label>
                    <input
                      type="text"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      placeholder="SW1A 1AA"
                      required
                      className={inputClassName}
                    />
                  </div>
                </div>
              </div>

              {/* Discount Code Section */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
                <h2 className="text-base font-semibold text-slate-900">
                  Discount Code
                </h2>
                {appliedDiscount ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm font-medium text-green-800">
                        <span className="font-mono">{appliedDiscount.code}</span>
                        {" — "}
                        {appliedDiscount.discountAmountPence > 0
                          ? `£${(appliedDiscount.discountAmountPence / 100).toFixed(2)} off`
                          : appliedDiscount.displayText}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removeDiscount}
                      className="text-sm text-green-700 hover:text-green-900 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={discountInput}
                      onChange={(e) => {
                        setDiscountInput(e.target.value.toUpperCase());
                        setDiscountError(null);
                      }}
                      placeholder="Enter discount code"
                      className={`flex-1 px-3.5 py-2.5 border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent font-mono uppercase ${
                        discountError ? "border-red-300" : "border-slate-300"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => validateDiscount()}
                      disabled={validatingDiscount || !discountInput.trim()}
                      className="px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      {validatingDiscount ? "Checking..." : "Apply"}
                    </button>
                  </div>
                )}
                {discountError && (
                  <p className="text-sm text-red-600">{discountError}</p>
                )}
              </div>

              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-slate-900 text-white rounded-lg font-semibold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : `Pay \u00A3${totalPounds.toFixed(2)}`}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-8">
              <h2 className="text-base font-semibold text-slate-900 mb-4">
                Order Summary
              </h2>
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-slate-600">
                      {item.name} x{item.quantity}
                    </span>
                    <span className="font-medium text-slate-900">
                      {"\u00A3"}
                      {(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium text-slate-900">
                    {"\u00A3"}{subtotal.toFixed(2)}
                  </span>
                </div>
                {appliedDiscount && discountPence > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700">
                      Discount ({appliedDiscount.code})
                    </span>
                    <span className="font-medium text-green-700">
                      -{"\u00A3"}{(discountPence / 100).toFixed(2)}
                    </span>
                  </div>
                )}
                {appliedDiscount && appliedDiscount.discountType === "free_shipping" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700">Free shipping</span>
                    <span className="font-medium text-green-700">Applied</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-100">
                  <span className="font-semibold text-slate-900">Total</span>
                  <span className="text-lg font-bold text-slate-900">
                    {"\u00A3"}{totalPounds.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
