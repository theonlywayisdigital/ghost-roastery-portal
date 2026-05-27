"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Users, Building2 } from "@/components/icons";
import { AdminUsersList } from "./AdminUsersList";
import { AdminRoastersCRM } from "@/app/(portal)/admin/roasters/AdminRoastersCRM";

type PrimaryTab = "users" | "roasters";

interface Roaster {
  id: string;
  business_name: string;
}

interface AdminUsersTabsProps {
  roasters: Roaster[];
  countries: string[];
}

export function AdminUsersTabs({ roasters, countries }: AdminUsersTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as PrimaryTab) || "users";
  const [activeTab, setActiveTab] = useState<PrimaryTab>(
    initialTab === "roasters" ? "roasters" : "users"
  );

  function switchTab(tab: PrimaryTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "users") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    router.replace(`/admin/users${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-slate-500 mt-1">
          Manage all platform users and partner roasters.
        </p>
      </div>

      {/* Primary tabs: Users / Roasters */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        <button
          onClick={() => switchTab("users")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "users"
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <Users className="w-4 h-4" />
          Users
        </button>
        <button
          onClick={() => switchTab("roasters")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "roasters"
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <Building2 className="w-4 h-4" />
          Roasters
        </button>
      </div>

      {activeTab === "users" && <AdminUsersList roasters={roasters} hideHeader />}
      {activeTab === "roasters" && <AdminRoastersCRM countries={countries} hideHeader />}
    </div>
  );
}
