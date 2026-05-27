"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Users, Building2 } from "@/components/icons";
import { AdminContactsCRM } from "./AdminContactsCRM";
import { AdminBusinessesCRM } from "@/app/(portal)/admin/businesses/AdminBusinessesCRM";

type PrimaryTab = "people" | "businesses";

interface Roaster {
  id: string;
  business_name: string;
}

interface AdminContactsTabsProps {
  roasters: Roaster[];
}

export function AdminContactsTabs({ roasters }: AdminContactsTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as PrimaryTab) || "people";
  const [activeTab, setActiveTab] = useState<PrimaryTab>(
    initialTab === "businesses" ? "businesses" : "people"
  );

  function switchTab(tab: PrimaryTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "people") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    router.replace(`/admin/contacts${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
        <p className="text-slate-500 mt-1">
          Manage all people and businesses across the platform.
        </p>
      </div>

      {/* Primary tabs: People / Businesses */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        <button
          onClick={() => switchTab("people")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "people"
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <Users className="w-4 h-4" />
          People
        </button>
        <button
          onClick={() => switchTab("businesses")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "businesses"
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <Building2 className="w-4 h-4" />
          Businesses
        </button>
      </div>

      {activeTab === "people" && <AdminContactsCRM roasters={roasters} hideHeader />}
      {activeTab === "businesses" && <AdminBusinessesCRM roasters={roasters} hideHeader />}
    </div>
  );
}
