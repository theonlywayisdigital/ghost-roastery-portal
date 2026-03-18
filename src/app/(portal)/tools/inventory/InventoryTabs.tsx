"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Overview", href: "/tools/inventory" },
  { label: "Green Stock", href: "/tools/inventory/green" },
  { label: "Roasted Stock", href: "/tools/inventory/roasted" },
];

export function InventoryTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-slate-200 mb-6">
      {tabs.map((tab) => {
        const active =
          tab.href === "/tools/inventory"
            ? pathname === "/tools/inventory"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              active
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
