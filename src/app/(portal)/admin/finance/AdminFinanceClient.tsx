"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Wallet,
  FileText,
  ScrollText,
  RotateCcw,
} from "@/components/icons";
import { FinanceOverviewTab } from "./overview/FinanceOverviewTab";
import { PayoutsTab } from "./payouts/PayoutsTab";
import { InvoicesTab } from "./invoices/InvoicesTab";
import { LedgerTab } from "./ledger/LedgerTab";
import { RefundsTab } from "./refunds/RefundsTab";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "payouts", label: "Partner Payouts", icon: Wallet },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "ledger", label: "Transaction Ledger", icon: ScrollText },
  { id: "refunds", label: "Refunds", icon: RotateCcw },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminFinanceClient() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Finance & Payouts
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Revenue overview, partner payouts, invoices, and transaction ledger.
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

      <div className={activeTab === "overview" ? "" : "hidden"}>
        <FinanceOverviewTab />
      </div>

      <div className={activeTab === "payouts" ? "" : "hidden"}>
        <PayoutsTab />
      </div>

      <div className={activeTab === "invoices" ? "" : "hidden"}>
        <InvoicesTab />
      </div>

      <div className={activeTab === "ledger" ? "" : "hidden"}>
        <LedgerTab />
      </div>

      <div className={activeTab === "refunds" ? "" : "hidden"}>
        <RefundsTab />
      </div>
    </div>
  );
}
