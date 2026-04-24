"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Overview", href: "/inventory" },
  { label: "Green Stock", href: "/inventory/green" },
  { label: "Roast Profiles", href: "/inventory/roasted" },
  { label: "Products", href: "/inventory/products" },
  { label: "Cupping", href: "/inventory/cupping" },
  { label: "Roast Log", href: "/inventory/roast-log" },
  { label: "Import", href: "/inventory/import" },
];

export function InventoryTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
      {tabs.map((tab) => {
        const active =
          tab.href === "/inventory"
            ? pathname === "/inventory"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
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
