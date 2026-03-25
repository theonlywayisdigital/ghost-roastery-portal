"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isLightColour } from "../_components/utils";

const LOGO_SIZE_MAP = { small: 80, medium: 120, large: 160 };

interface Props {
  slug: string;
  token: string | null;
  valid: boolean;
  roaster: {
    businessName: string;
    logoUrl: string | null;
    primaryColour: string;
    accentColour: string;
    logoSize: "small" | "medium" | "large";
  };
}

export function SetupPasswordForm({ slug, token, valid, roaster }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const accentText = isLightColour(roaster.accentColour)
    ? "#1e293b"
    : "#ffffff";
  const logoHeight = LOGO_SIZE_MAP[roaster.logoSize];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      setError(
        "Password must be at least 8 characters with one uppercase letter and one special character"
      );
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push(`/s/${slug}/login`), 2000);
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  const inputClassName =
    "w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        {/* Branded header */}
        <div className="text-center">
          {roaster.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={roaster.logoUrl}
              alt={roaster.businessName}
              className="w-auto mx-auto"
              style={{ height: logoHeight }}
            />
          )}
          <h1 className="text-xl font-bold text-slate-900 mt-4">
            Set Up Your Password
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {roaster.businessName}
          </p>
        </div>

        <hr className="my-6 border-slate-200" />

        {valid && token ? (
          success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-slate-900 font-medium mb-2">
                Password created
              </p>
              <p className="text-sm text-slate-500">
                Redirecting you to sign in…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className={inputClassName}
                  style={
                    {
                      "--tw-ring-color": roaster.accentColour,
                    } as React.CSSProperties
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className={inputClassName}
                  style={
                    {
                      "--tw-ring-color": roaster.accentColour,
                    } as React.CSSProperties
                  }
                />
              </div>

              <p className="text-xs text-slate-500">
                At least 8 characters, one uppercase letter, and one special
                character.
              </p>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  backgroundColor: roaster.accentColour,
                  color: accentText,
                }}
                className="w-full py-3 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? "Setting up…" : "Set Password"}
              </button>
            </form>
          )
        ) : (
          <div className="text-center py-4">
            <p className="text-slate-900 font-medium mb-2">
              Invalid or expired link
            </p>
            <p className="text-sm text-slate-500 mb-6">
              This account setup link is no longer valid. Please contact us for
              a new one.
            </p>
            <Link
              href={`/s/${slug}/login`}
              style={{
                backgroundColor: roaster.accentColour,
                color: accentText,
              }}
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Go to Sign In
            </Link>
          </div>
        )}

        {/* Back to login */}
        <div className="mt-6 text-center">
          <Link
            href={`/s/${slug}/login`}
            className="text-sm font-medium hover:underline"
            style={{ color: roaster.accentColour }}
          >
            Back to sign in
          </Link>
        </div>

        <hr className="my-6 border-slate-200" />

        {/* Powered by */}
        <p className="text-center text-xs text-slate-400">
          Powered by Roastery Platform
        </p>
      </div>
    </div>
  );
}
