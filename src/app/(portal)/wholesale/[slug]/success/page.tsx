"use client";

import { useSearchParams, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle, FileText, ArrowLeft } from "@/components/icons";

function SuccessContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const sessionId = searchParams.get("session_id");
  const invoiceId = searchParams.get("invoice_id");
  const invoiceNumber = searchParams.get("invoice_number");
  const orderId = searchParams.get("order_id");
  const accessToken = searchParams.get("access_token");

  const isInvoiceOrder = !!invoiceId && !sessionId;

  const [status, setStatus] = useState<"loading" | "confirmed" | "error">(
    isInvoiceOrder ? "confirmed" : "loading"
  );

  // For Stripe-paid orders, call confirm-order
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
      .then((res) => {
        if (res.ok) {
          setStatus("confirmed");
        } else {
          setStatus("error");
        }
      })
      .catch(() => {
        setStatus("error");
      });
  }, [sessionId, isInvoiceOrder]);

  if (status === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
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
      <div className="min-h-[60vh] flex items-center justify-center px-6">
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
            href={`/wholesale/${slug}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold text-sm hover:bg-slate-800 transition-colors"
          >
            Back to Catalogue
          </Link>
        </div>
      </div>
    );
  }

  // Invoice order success
  if (isInvoiceOrder) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Order Confirmed
          </h1>
          <p className="text-slate-600 mb-4">
            Your wholesale order has been placed and an invoice will be sent to
            you shortly.
          </p>
          {invoiceNumber && (
            <p className="text-sm text-slate-500 mb-2">
              Invoice: <span className="font-mono font-medium text-slate-700">{invoiceNumber}</span>
            </p>
          )}
          {orderId && (
            <p className="text-xs text-slate-400 mb-6">
              Order ID: {orderId.slice(0, 8).toUpperCase()}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {accessToken && invoiceId && (
              <Link
                href={`/invoices/view/${invoiceId}?token=${accessToken}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                <FileText className="w-4 h-4" />
                View Invoice
              </Link>
            )}
            <Link
              href={`/wholesale/${slug}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold text-sm hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Catalogue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Stripe payment success (prepay)
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
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
          href={`/wholesale/${slug}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold text-sm hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Catalogue
        </Link>
      </div>
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
