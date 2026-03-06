"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";

export default function CheckEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    if (!email) return;
    setResending(true);
    setError(null);
    setResent(false);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to resend");
      } else {
        setResent(true);
        setTimeout(() => setResent(false), 5000);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setResending(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo height={150} className="h-[150px] w-auto" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-brand-600" />
          </div>

          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Check your inbox
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {email ? (
              <>
                {"We've sent a confirmation link to "}
                <strong className="text-slate-700">{email}</strong>.
                {" Click the link in the email to verify your account."}
              </>
            ) : (
              "We've sent a confirmation link to your email. Click the link to verify your account."
            )}
          </p>

          <div className="border-t border-slate-100 pt-4 mt-4">
            <p className="text-sm text-slate-500 mb-3">
              {"Didn't receive the email?"}
            </p>

            {error && (
              <p className="text-red-600 text-sm mb-3">{error}</p>
            )}

            {resent ? (
              <p className="text-sm text-green-600 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Confirmation email resent
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending || !email}
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {resending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Resending...
                  </>
                ) : (
                  "Resend confirmation email"
                )}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          <Link
            href="/login"
            className="text-brand-600 font-medium hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
