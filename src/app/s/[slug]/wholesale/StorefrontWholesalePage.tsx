"use client";

import { useStorefront } from "../_components/StorefrontProvider";
import { Header } from "../_components/Header";
import { Cart } from "../_components/Cart";
import { Footer } from "../_components/Footer";
import { WholesaleAuthGate } from "@/components/wholesale/WholesaleAuthGate";
import { StorefrontWholesaleCatalogue } from "@/components/wholesale/StorefrontWholesaleCatalogue";

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
  products,
  initialAccess,
}: {
  roaster: {
    id: string;
    businessName: string;
    logoUrl: string | null;
    slug: string;
    stripeAccountId: string | null;
    platformFeePercent: number | null;
  };
  products: Product[];
  initialAccess: AccessResponse | null;
}) {
  const { slug, primary, accent, accentText, embedded } = useStorefront();

  return (
    <div
      style={{ fontFamily: "var(--sf-font)" }}
      className="min-h-screen bg-white"
    >
      <Header />
      <Cart />

      {/* Spacer for fixed header */}
      {!embedded && <div className="h-16 md:h-20" />}

      <div className="max-w-6xl mx-auto px-6 py-8 md:py-12">
        <h1
          className="text-3xl md:text-4xl font-bold mb-2"
          style={{ color: primary }}
        >
          Trade
        </h1>
        <p className="text-slate-500 mb-8">
          Wholesale pricing for approved trade accounts.
        </p>

        <WholesaleAuthGate
          roasterId={roaster.id}
          slug={slug}
          accentColour={accent}
          accentText={accentText}
          primaryColour={primary}
          initialAccess={initialAccess}
        >
          {({ wholesaleAccessId, paymentTerms }) => (
            <StorefrontWholesaleCatalogue
              roaster={roaster}
              products={products}
              wholesaleAccessId={wholesaleAccessId}
              paymentTerms={paymentTerms}
              accentColour={accent}
              accentText={accentText}
              context={{ type: "storefront", slug }}
            />
          )}
        </WholesaleAuthGate>
      </div>

      <Footer />
    </div>
  );
}
