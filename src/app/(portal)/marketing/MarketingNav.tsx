"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Send,
  Share2,
  Zap,
  LayoutTemplate,
  Ticket,
  FileText,
  Sparkles,
  BarChart3,
} from "lucide-react";

const TAB_DEFS = [
  { label: "Content Calendar", path: "", icon: CalendarDays, exact: true },
  { label: "Campaigns", path: "/campaigns", icon: Send },
  { label: "Social", path: "/social", icon: Share2 },
  { label: "Automations", path: "/automations", icon: Zap },
  { label: "Templates", path: "/templates", icon: LayoutTemplate },
  { label: "Discount Codes", path: "/discount-codes", icon: Ticket },
  { label: "Forms", path: "/forms", icon: FileText },
  { label: "AI Studio", path: "/ai", icon: Sparkles },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
];

interface MarketingNavProps {
  /** Base path for navigation links. Defaults to "/marketing". */
  basePath?: string;
}

export function MarketingNav({ basePath = "/marketing" }: MarketingNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
      {TAB_DEFS.map((tab) => {
        const Icon = tab.icon;
        const href = basePath + tab.path;
        const active = tab.exact
          ? pathname === href
          : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              active
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
