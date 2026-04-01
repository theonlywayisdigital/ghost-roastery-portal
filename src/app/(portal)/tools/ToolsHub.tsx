"use client";

import Link from "next/link";
import {
  Package,
  Flame,
  CalendarDays,
  TestTube,
  PoundSterling,
  ShieldCheck,
  AlertTriangle,
} from "@/components/icons";

interface ToolsHubProps {
  counts: {
    greenBeans: number;
    roastLogs: number;
    cuppingSessions: number;
    certifications: number;
  };
  lowStockItems: { id: string; name: string; current_stock_kg: number; low_stock_threshold_kg: number }[];
  expiringCerts: { id: string; cert_name: string; expiry_date: string | null; status: string }[];
}

const toolCards = [
  {
    title: "Inventory",
    description: "Manage your green bean and roasted coffee stock levels.",
    icon: Package,
    href: "/tools/inventory",
    countKey: "greenBeans" as const,
    color: "text-green-600 bg-green-50",
  },
  {
    title: "Roast Log",
    description: "Log roasts, track weight loss, and monitor quality.",
    icon: Flame,
    href: "/tools/inventory/roast-log",
    countKey: "roastLogs" as const,
    color: "text-orange-600 bg-orange-50",
  },
  {
    title: "Production",
    description: "Plan upcoming roasts and manage your production schedule.",
    icon: CalendarDays,
    href: "/tools/production",
    countKey: null,
    color: "text-purple-600 bg-purple-50",
  },
  {
    title: "Cupping",
    description: "Run SCA cupping sessions and score your coffees.",
    icon: TestTube,
    href: "/tools/cupping",
    countKey: "cuppingSessions" as const,
    color: "text-pink-600 bg-pink-50",
  },
  {
    title: "Calculators",
    description: "Calculate costs per bag, break-even, and set profitable prices.",
    icon: PoundSterling,
    href: "/tools/pricing",
    countKey: null,
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    title: "Certifications",
    description: "Track food safety certs, expiry dates, and documents.",
    icon: ShieldCheck,
    href: "/tools/certifications",
    countKey: "certifications" as const,
    color: "text-cyan-600 bg-cyan-50",
  },
];

export function ToolsHub({ counts, lowStockItems, expiringCerts }: ToolsHubProps) {
  const hasAlerts = lowStockItems.length > 0 || expiringCerts.length > 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Roaster Tools</h1>
        <p className="text-slate-500 mt-1">
          Everything you need to manage your roasting operation.
        </p>
      </div>

      {/* Alerts */}
      {hasAlerts && (
        <div className="mb-6 space-y-3">
          {lowStockItems.length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-800">Low Stock Alert</p>
                <p className="text-sm text-orange-700 mt-0.5">
                  {lowStockItems.map((b) => b.name).join(", ")} — running low on stock.
                </p>
              </div>
            </div>
          )}
          {expiringCerts.length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Certification Alert</p>
                <p className="text-sm text-red-700 mt-0.5">
                  {expiringCerts.map((c) => c.cert_name).join(", ")} — {expiringCerts.some((c) => c.status === "expired") ? "expired or " : ""}expiring soon.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tool cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {toolCards.map((card) => {
          const Icon = card.icon;
          const count = card.countKey ? counts[card.countKey] : null;

          return (
            <Link
              key={card.href}
              href={card.href}
              className="group bg-white rounded-xl border border-slate-200 p-5 hover:border-brand-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {count !== null && (
                  <span className="text-2xl font-bold text-slate-900">{count}</span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-slate-900 group-hover:text-brand-700 transition-colors">
                {card.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{card.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
