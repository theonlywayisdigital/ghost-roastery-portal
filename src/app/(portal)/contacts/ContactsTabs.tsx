"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { WholesaleBuyersPage } from "../wholesale-buyers/WholesaleBuyersPage";
import { Users, ShoppingBag, Truck, UserPlus, Clock } from "lucide-react";

interface ContactsTabsProps {
  buyers: unknown[];
  autoApprove: boolean;
  roasterId: string;
}

const TABS = [
  { id: "wholesale", label: "Wholesale Buyers", icon: Users },
  { id: "customers", label: "Customers", icon: ShoppingBag },
  { id: "suppliers", label: "Suppliers", icon: Truck },
  { id: "leads", label: "Leads", icon: UserPlus },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ContactsTabs({ buyers, autoApprove, roasterId }: ContactsTabsProps) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "wholesale";
  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.some((t) => t.id === initialTab) ? initialTab : "wholesale"
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
        <p className="text-slate-500 mt-1">
          Manage your wholesale buyers, customers, suppliers, and leads.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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

      {/* Tab content */}
      {activeTab === "wholesale" && (
        <WholesaleBuyersPage
          buyers={buyers as Parameters<typeof WholesaleBuyersPage>[0]["buyers"]}
          autoApprove={autoApprove}
          roasterId={roasterId}
        />
      )}

      {activeTab === "customers" && (
        <PlaceholderTab
          title="Customers"
          description="View and manage customers who have purchased from your storefront. Track order history, contact details, and customer value."
        />
      )}

      {activeTab === "suppliers" && (
        <PlaceholderTab
          title="Suppliers"
          description="Manage your green coffee suppliers, packaging vendors, and other business contacts."
        />
      )}

      {activeTab === "leads" && (
        <PlaceholderTab
          title="Leads"
          description="Track enquiries from your storefront, wholesale applications, and potential business opportunities."
        />
      )}
    </div>
  );
}

function PlaceholderTab({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
        <Clock className="w-6 h-6 text-slate-400" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900 mb-2">
        {`${title} — Coming Soon`}
      </h2>
      <p className="text-slate-500 text-sm">{description}</p>
    </div>
  );
}
