"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStorefront } from "../_components/StorefrontProvider";
import { Header } from "../_components/Header";
import { Cart } from "../_components/Cart";
import { Footer } from "../_components/Footer";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  created_at: string;
}

interface WholesaleAccess {
  id: string;
  status: string;
  payment_terms: string | null;
  business_name: string | null;
  created_at: string;
}

const WS_STATUS_COLOURS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-amber-100", text: "text-amber-700" },
  approved: { bg: "bg-green-100", text: "text-green-700" },
  rejected: { bg: "bg-red-100", text: "text-red-700" },
  suspended: { bg: "bg-slate-100", text: "text-slate-700" },
};

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  prepay: "Prepay",
  net7: "Net 7",
  net14: "Net 14",
  net30: "Net 30",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function AccountPage({
  slug,
  profile,
  wholesaleAccess,
}: {
  slug: string;
  profile: Profile;
  wholesaleAccess: WholesaleAccess | null;
}) {
  const { accent, accentText, embedded } = useStorefront();
  const router = useRouter();

  async function handleSignOut() {
    await fetch(`/api/auth/logout?redirect=/s/${slug}`, { method: "POST" });
    router.push(`/s/${slug}`);
  }

  return (
    <div style={{ fontFamily: "var(--sf-font)" }} className="min-h-screen">
      <Header />
      <Cart />
      {!embedded && <div className="h-16 md:h-20" />}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-bold mb-8" style={{ color: "var(--sf-text)" }}>My Account</h1>

        {/* Profile section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Profile
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Full Name
              </label>
              <p className="text-sm text-slate-900">
                {profile.full_name || "—"}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Email
              </label>
              <p className="text-sm text-slate-900">{profile.email}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Member Since
              </label>
              <p className="text-sm text-slate-900">
                {formatDate(profile.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Wholesale account section */}
        {wholesaleAccess && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Wholesale Account
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-slate-500">
                  Status
                </label>
                {(() => {
                  const colours =
                    WS_STATUS_COLOURS[wholesaleAccess.status] ||
                    WS_STATUS_COLOURS.pending;
                  return (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colours.bg} ${colours.text}`}
                    >
                      {wholesaleAccess.status}
                    </span>
                  );
                })()}
              </div>
              {wholesaleAccess.business_name && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Business Name
                  </label>
                  <p className="text-sm text-slate-900">
                    {wholesaleAccess.business_name}
                  </p>
                </div>
              )}
              {wholesaleAccess.status === "approved" &&
                wholesaleAccess.payment_terms && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Payment Terms
                    </label>
                    <p className="text-sm text-slate-900">
                      {PAYMENT_TERMS_LABELS[wholesaleAccess.payment_terms] ||
                        wholesaleAccess.payment_terms}
                    </p>
                  </div>
                )}
              {wholesaleAccess.status === "approved" && (
                <Link
                  href={`/s/${slug}/wholesale`}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: accent, color: accentText }}
                >
                  Access Wholesale Catalogue
                </Link>
              )}
              {wholesaleAccess.status === "pending" && (
                <p className="text-sm text-amber-600">
                  Your application is under review. We&apos;ll notify you once
                  it&apos;s been processed.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-colors"
          style={{ color: "color-mix(in srgb, var(--sf-text) 65%, transparent)" }}
        >
          Sign Out
        </button>
      </div>

      <Footer />
    </div>
  );
}
