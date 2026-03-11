"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useStorefront } from "../_components/StorefrontProvider";
import { Header } from "../_components/Header";
import { Cart } from "../_components/Cart";
import { Footer } from "../_components/Footer";
import { StorefrontWholesaleCatalogue } from "@/components/wholesale/StorefrontWholesaleCatalogue";
import { Package } from "@/components/icons";

interface PreviewProduct {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  unit: string;
  sort_order: number;
}

interface ProductVariant {
  id: string;
  weight_grams: number | null;
  unit: string | null;
  wholesale_price: number | null;
  is_active: boolean;
  grind_type: { id: string; name: string } | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  unit: string;
  price: number;
  sort_order: number;
  wholesale_price: number | null;
  minimum_wholesale_quantity: number;
  product_variants?: ProductVariant[] | null;
}

interface AccessResponse {
  authenticated: boolean;
  user?: { id: string; email: string; name: string };
  access?: {
    id: string;
    status: string;
    paymentTerms: string;
  } | null;
}

export function StorefrontWholesalePage({
  roaster,
  previewProducts,
  products,
  initialAccess,
  isApproved,
}: {
  roaster: {
    id: string;
    businessName: string;
    logoUrl: string | null;
    slug: string;
    stripeAccountId: string | null;
    platformFeePercent: number | null;
  };
  previewProducts: PreviewProduct[];
  products: Product[];
  initialAccess: AccessResponse | null;
  isApproved: boolean;
}) {
  const router = useRouter();
  const { roaster: brandData, slug, primary, accent, accentText, embedded } =
    useStorefront();

  const isAuthenticated = initialAccess?.authenticated === true;
  const accessStatus = initialAccess?.access?.status;
  const userName = initialAccess?.user?.name || initialAccess?.user?.email || "";
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "";

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
  }

  // STATE B — Authenticated + pending
  if (isAuthenticated && accessStatus === "pending") {
    return (
      <div
        style={{ fontFamily: "var(--sf-font)" }}
        className="min-h-screen"
      >
        <Header />
        <Cart />
        {!embedded && <div className="h-16 md:h-20" />}
        <div className="max-w-6xl mx-auto px-6 py-8 md:py-12">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${accent}15` }}
              >
                <svg
                  className="w-7 h-7"
                  fill="none"
                  stroke={accent}
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
        </div>
        <Footer />
      </div>
    );
  }

  // STATE C — Authenticated + rejected
  if (isAuthenticated && accessStatus === "rejected") {
    return (
      <div
        style={{ fontFamily: "var(--sf-font)" }}
        className="min-h-screen"
      >
        <Header />
        <Cart />
        {!embedded && <div className="h-16 md:h-20" />}
        <div className="max-w-6xl mx-auto px-6 py-8 md:py-12">
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
                Unfortunately your wholesale account application was not
                approved at this time. Please contact us for more information.
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // STATE D — Authenticated + approved
  if (isApproved && initialAccess?.access) {
    return (
      <div
        style={{ fontFamily: "var(--sf-font)" }}
        className="min-h-screen"
      >
        <Header />
        <Cart />
        {!embedded && <div className="h-16 md:h-20" />}

        {/* Signed-in bar */}
        <div className="bg-slate-50 border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-center justify-between">
            <span className="text-sm text-slate-600">
              {`Signed in as ${userName}`}
            </span>
            <div className="flex items-center gap-4">
              <a
                href={`${portalUrl}/my-orders`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline"
                style={{ color: accent }}
              >
                My Orders
              </a>
              <button
                onClick={handleSignOut}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8 md:py-12">
          <h1
            className="text-3xl md:text-4xl font-bold mb-2"
            style={{ color: primary }}
          >
            Wholesale
          </h1>
          <p className="mb-8" style={{ color: "color-mix(in srgb, var(--sf-text) 55%, transparent)" }}>
            Wholesale pricing and ordering for approved accounts.
          </p>

          <StorefrontWholesaleCatalogue
            roaster={roaster}
            products={products}
            wholesaleAccessId={initialAccess.access.id}
            paymentTerms={initialAccess.access.paymentTerms}
            accentColour={accent}
            accentText={accentText}
            context={{ type: "storefront", slug }}
          />
        </div>

        <Footer />
      </div>
    );
  }

  // STATE A — Not authenticated OR authenticated with no access record
  // Show public wholesale landing page with blurred product preview
  const displayProducts = previewProducts.slice(0, 6);

  return (
    <div
      style={{ fontFamily: "var(--sf-font)" }}
      className="min-h-screen"
    >
      <Header />
      <Cart />
      {!embedded && <div className="h-16 md:h-20" />}

      <div className="max-w-6xl mx-auto px-6 py-8 md:py-12">
        {/* Hero area */}
        <div className="text-center mb-12">
          {roaster.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={roaster.logoUrl}
              alt={roaster.businessName}
              className="w-auto mx-auto mb-5"
              style={{ height: 60 }}
            />
          )}
          <h1
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{ color: primary }}
          >
            {`${roaster.businessName} Wholesale`}
          </h1>
          {brandData.brand_about && (
            <p className="text-base md:text-lg max-w-xl mx-auto mb-6" style={{ color: "color-mix(in srgb, var(--sf-text) 55%, transparent)" }}>
              {brandData.brand_about}
            </p>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/s/${slug}/wholesale/apply`}
              className="px-6 py-3 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: accent, color: accentText }}
            >
              Apply for Wholesale Account
            </Link>
            <Link
              href={`/s/${slug}/wholesale/login`}
              className="px-6 py-3 rounded-lg font-semibold text-sm border transition-colors hover:bg-slate-50"
              style={{ borderColor: accent, color: accent }}
            >
              Already have an account? Sign in
            </Link>
          </div>
        </div>

        {/* Blurred product preview grid */}
        {displayProducts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {displayProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden"
              >
                {product.image_url ? (
                  <div className="relative aspect-square bg-slate-50">
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-slate-50 flex items-center justify-center">
                    <Package className="w-12 h-12 text-slate-300" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900 mb-1">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  {/* Blurred price/action area */}
                  <div className="relative">
                    <div
                      className="pointer-events-none select-none"
                      style={{ filter: "blur(4px)" }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-lg font-bold text-slate-900">
                            {"\u00a3XX.XX"}
                          </span>
                          <span className="text-sm text-slate-500 ml-1">
                            {`/ ${product.unit}`}
                          </span>
                        </div>
                      </div>
                      <div className="w-full py-2.5 rounded-lg text-sm font-medium text-center bg-slate-200 text-slate-500">
                        Add to Order
                      </div>
                    </div>
                    {/* Lock overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <svg
                        className="w-5 h-5 text-slate-400 mb-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      <span className="text-xs text-slate-500 font-medium">
                        Approved accounts only
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Full-width CTA banner */}
        <div
          className="rounded-xl p-8 md:p-12 text-center"
          style={{ backgroundColor: primary }}
        >
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4">
            Ready to order wholesale?
          </h2>
          <Link
            href={`/s/${slug}/wholesale/apply`}
            className="inline-block px-8 py-3.5 rounded-lg font-semibold text-sm bg-white hover:bg-white/90 transition-colors"
            style={{ color: primary }}
          >
            Apply for an Account
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
