"use client";

import { createContext, useContext, type ReactNode, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { RoasterBranding } from "./types";
import { isLightColour } from "./utils";
import { RETAIL_ENABLED } from "@/lib/feature-flags";

interface StorefrontContextValue {
  roaster: RoasterBranding;
  slug: string;
  primary: string;
  accent: string;
  accentText: string;
  retailEnabled: boolean;
  showRetail: boolean;
  showWholesale: boolean;
  embedded: boolean;
}

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

export function StorefrontProvider({
  roaster,
  slug,
  children,
}: {
  roaster: RoasterBranding;
  slug: string;
  children: ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <StorefrontProviderInner roaster={roaster} slug={slug}>
        {children}
      </StorefrontProviderInner>
    </Suspense>
  );
}

function StorefrontProviderInner({
  roaster,
  slug,
  children,
}: {
  roaster: RoasterBranding;
  slug: string;
  children: ReactNode;
}) {
  const searchParams = useSearchParams();
  const embedded = searchParams.get("embedded") === "true";
  const primary = roaster.brand_primary_colour || "#1e293b";
  const accent = roaster.brand_accent_colour || "#0083dc";
  const accentText = isLightColour(accent) ? "#1e293b" : "#ffffff";
  const retailEnabled =
    RETAIL_ENABLED && roaster.retail_enabled && !!roaster.stripe_account_id;
  const showRetail =
    RETAIL_ENABLED &&
    (roaster.storefront_type === "retail" ||
    roaster.storefront_type === "both");
  const showWholesale =
    !RETAIL_ENABLED ||
    roaster.storefront_type === "wholesale" ||
    roaster.storefront_type === "both";

  return (
    <StorefrontContext.Provider
      value={{
        roaster,
        slug,
        primary,
        accent,
        accentText,
        retailEnabled,
        showRetail,
        showWholesale,
        embedded,
      }}
    >
      {children}
    </StorefrontContext.Provider>
  );
}

export function useStorefront() {
  const ctx = useContext(StorefrontContext);
  if (!ctx)
    throw new Error("useStorefront must be used within a StorefrontProvider");
  return ctx;
}
