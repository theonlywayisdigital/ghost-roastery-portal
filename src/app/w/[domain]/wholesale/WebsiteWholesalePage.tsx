"use client";

import { useWebsiteTheme } from "@/app/(portal)/website/section-editor/WebsiteThemeProvider";
import { WholesaleAuthGate } from "@/components/wholesale/WholesaleAuthGate";
import { StorefrontWholesaleCatalogue } from "@/components/wholesale/StorefrontWholesaleCatalogue";
import { isLightColour } from "@/app/s/[slug]/_components/utils";

interface Product {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  unit: string;
  price: number;
  sort_order: number;
  product_type: string;
  wholesale_price_standard: number | null;
  wholesale_price_preferred: number | null;
  wholesale_price_vip: number | null;
  minimum_wholesale_quantity: number;
}

interface AccessResponse {
  authenticated: boolean;
  user?: { id: string; email: string; name: string };
  access?: {
    id: string;
    status: string;
    priceTier: string;
    paymentTerms: string;
  } | null;
}

export function WebsiteWholesalePage({
  roaster,
  domain,
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
  domain: string;
  products: Product[];
  initialAccess: AccessResponse | null;
}) {
  const theme = useWebsiteTheme();
  const accent = theme.accentColor;
  const accentText = isLightColour(accent) ? "#1e293b" : "#ffffff";

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 md:py-12">
      <h1
        className="text-3xl md:text-4xl font-bold mb-2"
        style={{ color: theme.primaryColor, fontFamily: `'${theme.headingFont}', sans-serif` }}
      >
        Trade
      </h1>
      <p className="text-slate-500 mb-8" style={{ fontFamily: `'${theme.bodyFont}', sans-serif` }}>
        Wholesale pricing for approved trade accounts.
      </p>

      <WholesaleAuthGate
        roasterId={roaster.id}
        slug={roaster.slug}
        accentColour={accent}
        accentText={accentText}
        primaryColour={theme.primaryColor}
        initialAccess={initialAccess}
      >
        {({ wholesaleAccessId, priceTier, paymentTerms }) => (
          <StorefrontWholesaleCatalogue
            roaster={roaster}
            products={products}
            priceTier={priceTier}
            wholesaleAccessId={wholesaleAccessId}
            paymentTerms={paymentTerms}
            accentColour={accent}
            accentText={accentText}
            context={{ type: "website", domain }}
          />
        )}
      </WholesaleAuthGate>
    </div>
  );
}
