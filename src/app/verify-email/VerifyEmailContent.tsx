"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CheckCircle2, XCircle, Loader2 } from "@/components/icons";

export function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (!token || verifiedRef.current) return;
    verifiedRef.current = true;

    async function verify() {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok) {
          setErrorMessage(data.error || "Verification failed");
          setStatus("error");
          return;
        }

        setStatus("success");
      } catch {
        setErrorMessage("Something went wrong. Please try again.");
        setStatus("error");
      }
    }

    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo height={150} className="h-[150px] w-auto" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="w-10 h-10 text-brand-600 animate-spin mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Verifying your email...
              </h2>
              <p className="text-sm text-slate-500">
                Please wait while we confirm your email address.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Email verified!
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Your email address has been confirmed. Let&apos;s set up your free trial.
              </p>
              <Link
                href="/start-trial"
                className="inline-flex items-center justify-center w-full py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
              >
                Start Your 14-Day Free Trial
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-7 h-7 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Verification failed
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                {errorMessage}
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                Back to Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
