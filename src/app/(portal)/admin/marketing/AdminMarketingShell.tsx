"use client";

import { MarketingProvider } from "@/lib/marketing-context";
import { MarketingNav } from "../../marketing/MarketingNav";
import { Megaphone } from "@/components/icons";

const ADMIN_CONTEXT = {
  apiBase: "/api/admin/marketing",
  pageBase: "/admin/marketing",
  isAdmin: true,
} as const;

export function AdminMarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <MarketingProvider value={ADMIN_CONTEXT}>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Marketing Suite</h1>
          <p className="text-sm text-slate-500 mt-1">
            Platform-wide marketing tools for Roastery Platform.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center">
              <Megaphone className="w-4.5 h-4.5 text-brand-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-900">Admin Context</p>
              <p className="text-xs text-slate-500">
                Marketing data here belongs to the Roastery Platform platform, not any individual roaster.
              </p>
            </div>
          </div>
        </div>

        <MarketingNav basePath="/admin/marketing" />

        {children}
      </div>
    </MarketingProvider>
  );
}
