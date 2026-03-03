"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { RoasterBranding } from "./types";
import { isLightColour } from "./utils";

interface StorefrontContextValue {
  roaster: RoasterBranding;
  slug: string;
  primary: string;
  accent: string;
  accentText: string;
  retailEnabled: boolean;
  showWholesale: boolean;
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
  const primary = roaster.brand_primary_colour || "#1e293b";
  const accent = roaster.brand_accent_colour || "#0083dc";
  const accentText = isLightColour(accent) ? "#1e293b" : "#ffffff";
  const retailEnabled =
    roaster.retail_enabled && !!roaster.stripe_account_id;
  const showWholesale =
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
        showWholesale,
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
