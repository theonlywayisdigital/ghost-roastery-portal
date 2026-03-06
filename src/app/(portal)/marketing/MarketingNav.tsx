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
  Lock,
} from "@/components/icons";
import { getEffectiveFeatures, getEffectiveLimits, type TierLevel, type FeatureKey, type LimitKey } from "@/lib/tier-config";

interface TabDef {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  requiredFeature?: FeatureKey;
  /** Lock tab when this limit is 0 for the user's tier */
  requiredMinLimit?: LimitKey;
}

const TAB_DEFS: TabDef[] = [
  { label: "Content Calendar", path: "", icon: CalendarDays, exact: true, requiredFeature: "contentCalendar" },
  { label: "Campaigns", path: "/campaigns", icon: Send },
  { label: "Social", path: "/social", icon: Share2, requiredFeature: "socialScheduling" },
  { label: "Automations", path: "/automations", icon: Zap, requiredFeature: "automations" },
  { label: "Templates", path: "/templates", icon: LayoutTemplate },
  { label: "Discount Codes", path: "/discount-codes", icon: Ticket },
  { label: "Forms", path: "/forms", icon: FileText },
  { label: "AI Studio", path: "/ai", icon: Sparkles, requiredMinLimit: "aiCreditsPerMonth" },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
];

interface MarketingNavProps {
  /** Base path for navigation links. Defaults to "/marketing". */
  basePath?: string;
  salesTier?: string;
  marketingTier?: string;
}

export function MarketingNav({ basePath = "/marketing", salesTier, marketingTier }: MarketingNavProps) {
  const pathname = usePathname();

  const features = salesTier && marketingTier
    ? getEffectiveFeatures(salesTier as TierLevel, marketingTier as TierLevel)
    : null;
  const limits = salesTier && marketingTier
    ? getEffectiveLimits(salesTier as TierLevel, marketingTier as TierLevel)
    : null;

  return (
    <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
      {TAB_DEFS.map((tab) => {
        const Icon = tab.icon;
        const href = basePath + tab.path;
        const active = tab.exact
          ? pathname === href
          : pathname.startsWith(href);
        const lockedByFeature = tab.requiredFeature && features && !features[tab.requiredFeature];
        const lockedByLimit = tab.requiredMinLimit && limits && limits[tab.requiredMinLimit] === 0;
        const locked = lockedByFeature || lockedByLimit;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              locked
                ? "border-transparent text-slate-400 hover:text-slate-500 hover:border-slate-200"
                : active
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
            {locked && <Lock className="w-3 h-3 ml-0.5 text-slate-300" />}
          </Link>
        );
      })}
    </div>
  );
}
