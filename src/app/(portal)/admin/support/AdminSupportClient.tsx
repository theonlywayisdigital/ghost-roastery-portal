"use client";

import { useState } from "react";
import { LifeBuoy, BookOpen, BarChart3 } from "@/components/icons";
import { KBManagement } from "./kb/KBManagement";
import { TicketsList } from "./tickets/TicketsList";
import { SupportAnalytics } from "./analytics/SupportAnalytics";

const TABS = [
  { id: "tickets", label: "Tickets", icon: LifeBuoy },
  { id: "kb", label: "Knowledge Base", icon: BookOpen },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminSupportClient() {
  const [activeTab, setActiveTab] = useState<TabId>("tickets");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Support & Disputes
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage support tickets, knowledge base, and view support analytics.
        </p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-brand-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className={activeTab === "tickets" ? "" : "hidden"}>
        <TicketsList />
      </div>

      <div className={activeTab === "kb" ? "" : "hidden"}>
        <KBManagement />
      </div>

      <div className={activeTab === "analytics" ? "" : "hidden"}>
        <SupportAnalytics />
      </div>
    </div>
  );
}
