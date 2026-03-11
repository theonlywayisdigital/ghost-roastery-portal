"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { WholesaleApplyForm } from "@/app/s/[slug]/WholesaleApplyForm";

interface WholesaleAccess {
  id: string;
  status: string;
  paymentTerms: string;
}

interface AccessResponse {
  authenticated: boolean;
  user?: { id: string; email: string; name: string };
  access?: WholesaleAccess | null;
}

interface WholesaleAuthGateProps {
  roasterId: string;
  slug: string;
  accentColour: string;
  accentText: string;
  primaryColour: string;
  initialAccess?: AccessResponse | null;
  logoUrl?: string | null;
  businessName?: string;
  children: (ctx: {
    wholesaleAccessId: string;
    paymentTerms: string;
  }) => ReactNode;
}

export function WholesaleAuthGate({
  roasterId,
  slug,
  accentColour,
  accentText,
  primaryColour,
  initialAccess,
  logoUrl,
  businessName,
  children,
}: WholesaleAuthGateProps) {
  const router = useRouter();
  const [accessData, setAccessData] = useState<AccessResponse | null>(
    initialAccess ?? null
  );
  const [loading, setLoading] = useState(!initialAccess);

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);

  const fetchAccess = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/s/wholesale-access?roasterId=${encodeURIComponent(roasterId)}`
      );
      if (res.ok) {
        const data = await res.json();
        setAccessData(data);
      }
    } catch {
      // silently fail — user sees login form
    } finally {
      setLoading(false);
    }
  }, [roasterId]);

  useEffect(() => {
    if (!initialAccess) {
      fetchAccess();
    }
  }, [initialAccess, fetchAccess]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || "Login failed. Please try again.");
        return;
      }

      if (data.requiresMfa) {
        // MFA not supported in storefront context — redirect to portal login
        setLoginError(
          "Your account requires two-factor authentication. Please log in via the main portal first."
        );
        return;
      }

      // Login success — refresh page data and re-check access
      router.refresh();
      await fetchAccess();
    } catch {
      setLoginError("Something went wrong. Please try again.");
    } finally {
      setLoggingIn(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: `${accentColour}30`, borderTopColor: accentColour }}
        />
      </div>
    );
  }

  // State 1: Not authenticated — show branded login or apply form
  if (!accessData?.authenticated) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8">
          {/* Branded header */}
          <div className="text-center mb-6">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={businessName || ""}
                className="h-16 w-auto mx-auto mb-4"
              />
            )}
            <h3 className="text-xl font-semibold text-slate-900 mb-1">
              {businessName ? `${businessName} Wholesale` : "Wholesale Login"}
            </h3>
            <p className="text-sm text-slate-500">
              {showApplyForm
                ? "Apply for a wholesale account to access trade pricing."
                : "Sign in to access wholesale pricing and ordering."}
            </p>
          </div>

          {showApplyForm ? (
            <>
              <WholesaleApplyForm
                roasterId={roasterId}
                slug={slug}
                accentColour={accentColour}
                accentText={accentText}
              />
              <p className="text-center text-sm text-slate-500 mt-4">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setShowApplyForm(false)}
                  className="font-medium hover:underline"
                  style={{ color: accentColour }}
                >
                  Back to sign in
                </button>
              </p>
            </>
          ) : (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent"
                    style={
                      { "--tw-ring-color": accentColour } as React.CSSProperties
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent"
                    style={
                      { "--tw-ring-color": accentColour } as React.CSSProperties
                    }
                  />
                </div>

                {loginError && (
                  <p className="text-red-600 text-sm">{loginError}</p>
                )}

                <button
                  type="submit"
                  disabled={loggingIn}
                  style={{ backgroundColor: accentColour, color: accentText }}
                  className="w-full py-3 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loggingIn ? "Signing in..." : "Sign In"}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-4">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setShowApplyForm(true)}
                  className="font-medium hover:underline"
                  style={{ color: accentColour }}
                >
                  Apply for a wholesale account
                </button>
              </p>
            </>
          )}

          {/* Powered-by footer */}
          <p className="text-center text-[11px] text-slate-400 mt-6">
            Powered by Ghost Roastery Platform
          </p>
        </div>
      </div>
    );
  }

  // State 2: Authenticated but no approved wholesale access
  const access = accessData.access;

  if (!access || access.status !== "approved") {
    // Pending
    if (access?.status === "pending") {
      return (
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${accentColour}15` }}
            >
              <svg
                className="w-7 h-7"
                fill="none"
                stroke={accentColour}
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
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Application Under Review
            </h3>
            <p className="text-slate-500">
              Your wholesale account application is currently being reviewed.
              We&apos;ll notify you by email once it&apos;s approved.
            </p>
          </div>
        </div>
      );
    }

    // Rejected
    if (access?.status === "rejected") {
      return (
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-50">
              <svg
                className="w-7 h-7 text-red-500"
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
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Application Not Approved
            </h3>
            <p className="text-slate-500">
              Unfortunately your wholesale account application was not approved at
              this time. Please contact us for more information.
            </p>
          </div>
        </div>
      );
    }

    // No access record — show apply form
    return (
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            Apply for a Wholesale Account
          </h3>
          <p className="text-slate-500 text-sm">
            Fill out the form below to apply for wholesale access and trade
            pricing.
          </p>
        </div>
        <WholesaleApplyForm
          roasterId={roasterId}
          slug={slug}
          accentColour={accentColour}
          accentText={accentText}
        />
      </div>
    );
  }

  // State 3: Authenticated + approved — render catalogue
  return (
    <>
      {children({
        wholesaleAccessId: access.id,
        paymentTerms: access.paymentTerms,
      })}
    </>
  );
}
