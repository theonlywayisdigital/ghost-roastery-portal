"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface MarketingContextValue {
  /** Base path for API calls: "/api/marketing" or "/api/admin/marketing" */
  apiBase: string;
  /** Base path for page navigation: "/marketing" or "/admin/marketing" */
  pageBase: string;
  /** Whether this is the admin (Ghost Roastery platform) context */
  isAdmin: boolean;
}

const MarketingContext = createContext<MarketingContextValue>({
  apiBase: "/api/marketing",
  pageBase: "/marketing",
  isAdmin: false,
});

export function MarketingProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: MarketingContextValue;
}) {
  return (
    <MarketingContext.Provider value={value}>
      {children}
    </MarketingContext.Provider>
  );
}

/**
 * Hook to get the marketing context (API base, page base, isAdmin).
 * Falls back to roaster defaults if used outside a provider.
 */
export function useMarketingContext(): MarketingContextValue {
  return useContext(MarketingContext);
}
