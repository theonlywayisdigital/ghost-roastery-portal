"use client";

import { useSearchParams, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { Header } from "../../_components/Header";
import { Cart } from "../../_components/Cart";
import { Footer } from "../../_components/Footer";

interface OrderDetails {
  deliveryAddress: {
    label?: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
  } | null;
  notes: string | null;
  standingOrder?: boolean;
}

function formatDeliveryAddress(addr: NonNullable<OrderDetails["deliveryAddress"]>) {
  return [addr.address_line_1, addr.address_line_2, addr.city, addr.county, addr.postcode, addr.country]
    .filter(Boolean)
    .join(", ");
}

function OrderDetailsSection({ details }: { details: OrderDetails }) {
  const hasAddress = details.deliveryAddress;
  const hasNotes = details.notes;

  if (!hasAddress && !hasNotes) return null;

  return (
    <div className="rounded-xl p-5 mb-6 text-left max-w-sm mx-auto" style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
      {hasAddress && (
        <div className="mb-3 last:mb-0">
          <p className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-50">
            Delivering to
          </p>
          {details.deliveryAddress!.label && (
            <p className="text-sm font-medium">
              {details.deliveryAddress!.label}
            </p>
          )}
          <p className="text-sm opacity-70">
            {formatDeliveryAddress(details.deliveryAddress!)}
          </p>
        </div>
      )}
      {hasNotes && (
        <div>
          {hasAddress && <div className="my-3" style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }} />}
          <p className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-50">
            Order Notes
          </p>
          <p className="text-sm opacity-70">{details.notes}</p>
        </div>
      )}
    </div>
  );
}

function SuccessContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const sessionId = searchParams.get("session_id");
  const invoiceId = searchParams.get("invoice_id");
  const invoiceNumber = searchParams.get("invoice_number");
  const accessToken = searchParams.get("access_token");
  const orderId = searchParams.get("order_id");

  const isInvoiceOrder = !sessionId && (!!invoiceId || !!orderId);

  const [status, setStatus] = useState<"loading" | "confirmed" | "error">(
    isInvoiceOrder ? "confirmed" : "loading"
  );
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(
    orderId || null
  );
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);

  // Try to read order details from sessionStorage (set by checkout page)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("wholesale_order_details");
      if (raw) {
        setOrderDetails(JSON.parse(raw));
        sessionStorage.removeItem("wholesale_order_details");
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isInvoiceOrder) return;

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
          // Use confirm-order response for details if sessionStorage was empty
          if (data.deliveryAddress || data.notes) {
            setOrderDetails((prev) => prev || {
              deliveryAddress: data.deliveryAddress || null,
              notes: data.notes || null,
            });
          }
          setStatus("confirmed");
        } else {
          setStatus("error");
        }
      })
      .catch(() => {
        setStatus("error");
      });
  }, [sessionId, isInvoiceOrder]);

  const backUrl = `/s/${slug}/wholesale`;

  return (
    <div
      style={{ fontFamily: "var(--sf-font)", backgroundColor: "var(--sf-nav-bg)", color: "var(--sf-nav-text)" }}
      className="min-h-screen"
    >
      <Header />
      <Cart />

      <div className="min-h-[60vh] flex items-center justify-center px-6 pb-16">
        <div className="max-w-md w-full text-center">
          {status === "loading" && (
            <>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                <svg
                  className="w-8 h-8 opacity-50"
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
              <h1 className="text-2xl font-bold mb-2">
                Confirming your order...
              </h1>
              <p className="opacity-60">Please wait a moment.</p>
            </>
          )}

          {status === "error" && (
            <>
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
              <h1 className="text-2xl font-bold mb-2">
                Something went wrong
              </h1>
              <p className="opacity-70 mb-6">
                Your payment was received but we had trouble confirming your
                order. Don&apos;t worry — our team will follow up shortly.
              </p>
              <Link
                href={backUrl}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "var(--sf-nav-text)" }}
              >
                Back to Catalogue
              </Link>
            </>
          )}

          {status === "confirmed" && isInvoiceOrder && (
            <>
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
              <h1 className="text-2xl font-bold mb-2">
                Order Confirmed
              </h1>
              <p className="opacity-70 mb-4">
                Your wholesale order has been placed and an invoice will be sent
                to you shortly.
              </p>
              {invoiceNumber && (
                <p className="text-sm opacity-60 mb-4">
                  Invoice:{" "}
                  <span className="font-mono font-medium opacity-100">
                    {invoiceNumber}
                  </span>
                </p>
              )}

              {orderDetails && <OrderDetailsSection details={orderDetails} />}

              {orderDetails?.standingOrder && (
                <div className="rounded-xl p-5 mb-6 text-left max-w-sm mx-auto" style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <p className="text-sm font-semibold">Standing Order Created</p>
                  </div>
                  <p className="text-sm opacity-70 mb-3">
                    This order will be repeated automatically. You can manage your standing orders from your account.
                  </p>
                  <Link
                    href="/my-standing-orders"
                    className="text-sm font-medium hover:underline"
                    style={{ color: "var(--sf-accent, #818cf8)" }}
                  >
                    Manage Standing Orders &rarr;
                  </Link>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {accessToken && invoiceId && (
                  <Link
                    href={`/invoice/${accessToken}`}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "var(--sf-nav-text)" }}
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
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "var(--sf-nav-text)" }}
                  >
                    View Order
                  </Link>
                )}
                <Link
                  href={backUrl}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "var(--sf-accent)", color: "var(--sf-accent-text)" }}
                >
                  Back to Catalogue
                </Link>
              </div>
              <div className="mt-4">
                <Link
                  href={`/s/${slug}/orders`}
                  className="text-sm opacity-50 hover:opacity-70 transition-opacity"
                >
                  My Orders
                </Link>
              </div>
            </>
          )}

          {status === "confirmed" && !isInvoiceOrder && (
            <>
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
              <h1 className="text-2xl font-bold mb-2">
                Order Confirmed!
              </h1>
              <p className="opacity-70 mb-4">
                Thank you for your purchase. You&apos;ll receive a confirmation
                email shortly with your order details.
              </p>
              {sessionId && (
                <p className="text-xs opacity-40 mb-4">
                  Reference: {sessionId.slice(-8).toUpperCase()}
                </p>
              )}

              {orderDetails && <OrderDetailsSection details={orderDetails} />}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {confirmedOrderId && (
                  <Link
                    href={`/s/${slug}/orders/${confirmedOrderId}`}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "var(--sf-nav-text)" }}
                  >
                    View Order
                  </Link>
                )}
                <Link
                  href={backUrl}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "var(--sf-accent)", color: "var(--sf-accent-text)" }}
                >
                  Back to Catalogue
                </Link>
              </div>
              <div className="mt-4">
                <Link
                  href={`/s/${slug}/orders`}
                  className="text-sm opacity-50 hover:opacity-70 transition-opacity"
                >
                  My Orders
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function WholesaleSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-slate-500">Loading...</p>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
