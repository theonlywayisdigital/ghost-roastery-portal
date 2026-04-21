"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { LifeBuoy, BookOpen } from "@/components/icons";
import { SupportDashboard } from "./SupportDashboard";
import { HelpCentre } from "@/app/(portal)/help/HelpCentre";

const TABS = [
  { key: "tickets", label: "Tickets", icon: LifeBuoy },
  { key: "help", label: "Help Centre", icon: BookOpen },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function SupportTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get("tab") as TabKey) || "tickets";

  function switchTab(tab: TabKey) {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    router.replace(url.toString(), { scroll: false });
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
            <LifeBuoy className="w-5 h-5 text-brand-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Support</h1>
            <p className="text-sm text-slate-500">Get help and browse our knowledge base</p>
          </div>
        </div>

        <div className="flex gap-1 border-b border-slate-200">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => switchTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  isActive
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "tickets" && <SupportDashboard />}
      {activeTab === "help" && <HelpCentre hideHeader />}
    </>
  );
}
