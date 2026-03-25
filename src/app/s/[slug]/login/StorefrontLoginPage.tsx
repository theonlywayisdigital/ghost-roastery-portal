"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isLightColour } from "../_components/utils";

const LOGO_SIZE_MAP = { small: 80, medium: 120, large: 160 };

export function StorefrontLoginPage({
  slug,
  redirectTo,
  roaster,
}: {
  slug: string;
  redirectTo: string | null;
  roaster: {
    businessName: string;
    logoUrl: string | null;
    primaryColour: string;
    accentColour: string;
    logoSize: "small" | "medium" | "large";
  };
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const accentText = isLightColour(roaster.accentColour) ? "#1e293b" : "#ffffff";
  const logoHeight = LOGO_SIZE_MAP[roaster.logoSize];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed. Please try again.");
        return;
      }

      if (data.requiresMfa) {
        setError(
          "Your account requires two-factor authentication. Please log in via the main portal first."
        );
        return;
      }

      router.push(redirectTo || `/s/${slug}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

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
            {roaster.businessName}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your account</p>
        </div>

        <hr className="my-6 border-slate-200" />

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
                { "--tw-ring-color": roaster.accentColour } as React.CSSProperties
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
                { "--tw-ring-color": roaster.accentColour } as React.CSSProperties
              }
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: roaster.accentColour, color: accentText }}
            className="w-full py-3 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <hr className="my-6 border-slate-200" />

        {/* Powered by */}
        <p className="text-center text-xs text-slate-400">
          Powered by Roastery Platform
        </p>
      </div>
    </div>
  );
}
