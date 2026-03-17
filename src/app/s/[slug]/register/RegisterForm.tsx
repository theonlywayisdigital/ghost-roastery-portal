"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isLightColour } from "../_components/utils";

const LOGO_SIZE_MAP = { small: 80, medium: 120, large: 160 };

interface Props {
  slug: string;
  roasterId: string;
  prefillEmail: string;
  prefillName: string;
  roaster: {
    businessName: string;
    logoUrl: string | null;
    primaryColour: string;
    accentColour: string;
    logoSize: "small" | "medium" | "large";
  };
}

export function RegisterForm({
  slug,
  roasterId,
  prefillEmail,
  prefillName,
  roaster,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(prefillName);
  const [email] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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

    setLoading(true);

    try {
      const res = await fetch("/api/s/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, roasterId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push(`/s/${slug}/login`), 2000);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
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
            Create Your Account
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {roaster.businessName}
          </p>
        </div>

        <hr className="my-6 border-slate-200" />

        {success ? (
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
              Account created
            </p>
            <p className="text-sm text-slate-500">
              Redirecting you to sign in…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className={inputClassName}
                style={
                  { "--tw-ring-color": roaster.accentColour } as React.CSSProperties
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                readOnly
                className={`${inputClassName} bg-slate-50 text-slate-500 cursor-not-allowed`}
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
                placeholder="••••••••"
                minLength={8}
                className={inputClassName}
                style={
                  { "--tw-ring-color": roaster.accentColour } as React.CSSProperties
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                className={inputClassName}
                style={
                  { "--tw-ring-color": roaster.accentColour } as React.CSSProperties
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
              disabled={loading}
              style={{
                backgroundColor: roaster.accentColour,
                color: accentText,
              }}
              className="w-full py-3 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>
        )}

        {/* Already have an account */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              href={`/s/${slug}/login`}
              className="font-medium hover:underline"
              style={{ color: roaster.accentColour }}
            >
              Sign in
            </Link>
          </p>
        </div>

        <hr className="my-6 border-slate-200" />

        {/* Powered by */}
        <p className="text-center text-xs text-slate-400">
          Powered by Ghost Roastery Platform
        </p>
      </div>
    </div>
  );
}
