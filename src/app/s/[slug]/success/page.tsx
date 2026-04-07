"use client";

import { useSearchParams, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { useCart } from "../_components/CartProvider";

function SuccessContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const sessionId = searchParams.get("session_id");
  const invoiceId = searchParams.get("invoice_id");
  const invoiceNumber = searchParams.get("invoice_number");
  const accessToken = searchParams.get("access_token");
  const orderId = searchParams.get("order_id");
  const embedded = searchParams.get("embedded") === "true";
  const qs = embedded ? "?embedded=true" : "";

  const isInvoiceOrder = !!invoiceId && !sessionId;
  const { clearCart } = useCart();

  const [status, setStatus] = useState<"loading" | "confirmed" | "error">(
    isInvoiceOrder ? "confirmed" : "loading"
  );
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(
    orderId || null
  );
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);

  const stableClearCart = useCallback(clearCart, [clearCart]);

  useEffect(() => {
    if (isInvoiceOrder) return; // Invoice orders are already confirmed

    if (!sessionId) {
      setStatus("error");
      return;
    }

    fetch("/api/s/confirm-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.orderId) setConfirmedOrderId(data.orderId);
          if (data.customerEmail) setCustomerEmail(data.customerEmail);
          if (data.customerName) setCustomerName(data.customerName);
          stableClearCart();
          setStatus("confirmed");
        } else {
          setStatus("error");
        }
      })
      .catch(() => {
        setStatus("error");
      });
  }, [sessionId, isInvoiceOrder, stableClearCart]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <svg
              className="w-8 h-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Confirming your order...
          </h1>
          <p className="text-slate-500">Please wait a moment.</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-slate-600 mb-6">
            Your payment was received but we had trouble confirming your order.
            Don&apos;t worry — our team will follow up shortly.
          </p>
          <Link
            href={`/s/${slug}${qs}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold text-sm hover:bg-slate-800 transition-colors"
          >
            Back to Store
          </Link>
        </div>
      </div>
    );
  }

  // Invoice order confirmed
  if (isInvoiceOrder) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Order Confirmed - Invoice Sent
          </h1>
          <p className="text-slate-600 mb-4">
            Your order has been placed and an invoice will be sent to you
            shortly with payment details.
          </p>
          {invoiceNumber && (
            <p className="text-sm text-slate-500 mb-2">
              Invoice:{" "}
              <span className="font-mono font-medium text-slate-700">
                {invoiceNumber}
              </span>
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            {accessToken && invoiceId && (
              <Link
                href={`/invoice/${accessToken}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-50 transition-colors"
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                View Invoice
              </Link>
            )}
            {confirmedOrderId && (
              <Link
                href={`/s/${slug}/orders/${confirmedOrderId}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                View Order
              </Link>
            )}
            <Link
              href={`/s/${slug}${qs}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold text-sm hover:bg-slate-800 transition-colors"
            >
              Back to Store
            </Link>
          </div>
          <div className="mt-4">
            <Link
              href={`/s/${slug}/orders`}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              My Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Standard Stripe payment success
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Order Confirmed!
        </h1>
        <p className="text-slate-600 mb-6">
          Thank you for your purchase. You&apos;ll receive a confirmation email
          shortly with your order details.
        </p>
        {sessionId && (
          <p className="text-xs text-slate-400 mb-6">
            Reference: {sessionId.slice(-8).toUpperCase()}
          </p>
        )}
        <Link
          href={`/s/${slug}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold text-sm hover:bg-slate-800 transition-colors"
        >
          Back to Store
        </Link>

        {/* Account sign-up CTA — only for guest buyers */}
        {customerEmail && (
          <div className="mt-8 bg-white border border-slate-200 rounded-xl p-5 text-center">
            <p className="text-sm text-slate-600 mb-3">
              Want to track your order and reorder easily?
            </p>
            <Link
              href={`/s/${slug}/register?email=${encodeURIComponent(customerEmail)}${customerName ? `&name=${encodeURIComponent(customerName)}` : ""}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors"
            >
              Create an Account
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-slate-500">Loading...</p>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
