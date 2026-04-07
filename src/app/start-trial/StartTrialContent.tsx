"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Loader2, AlertCircle } from "@/components/icons";
import Link from "next/link";

export function StartTrialContent() {
  const searchParams = useSearchParams();
  const cancelled = searchParams.get("cancelled") === "true";
  const [error, setError] = useState<string | null>(null);
  const [redirect, setRedirect] = useState<string | null>(null);
  const initiatedRef = useRef(false);

  useEffect(() => {
    if (cancelled || initiatedRef.current) return;
    initiatedRef.current = true;

    async function initiateTrial() {
      try {
        const res = await fetch("/api/billing/create-trial-session", {
          method: "POST",
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.redirect) {
            setRedirect(data.redirect);
          }
          setError(data.error || "Something went wrong");
          return;
        }

        if (data.url) {
          window.location.href = data.url;
        }
      } catch {
        setError("Something went wrong. Please try again.");
      }
    }

    initiateTrial();
  }, [cancelled]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo height={150} className="h-[150px] w-auto" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          {cancelled ? (
            <>
              <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-amber-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Card details required
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                You&apos;ll need to enter card details to start your free trial. You won&apos;t be charged until your trial ends.
              </p>
              <button
                onClick={() => {
                  initiatedRef.current = false;
                  window.location.href = "/start-trial";
                }}
                className="inline-flex items-center justify-center w-full py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
              >
                Try Again
              </button>
            </>
          ) : error ? (
            <>
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                {error === "Trial already used" ? "Trial already used" : "Something went wrong"}
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                {error === "Trial already used"
                  ? "You've already used your free trial. Subscribe to a plan to continue using the platform."
                  : error}
              </p>
              <Link
                href={redirect || "/settings/billing?tab=subscription"}
                className="inline-flex items-center justify-center w-full py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
              >
                {error === "Trial already used" ? "View Plans" : "Go to Billing"}
              </Link>
            </>
          ) : (
            <>
              <Loader2 className="w-10 h-10 text-brand-600 animate-spin mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Setting up your free trial...
              </h2>
              <p className="text-sm text-slate-500">
                You&apos;ll be redirected to enter your card details. No charge until day 15.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
