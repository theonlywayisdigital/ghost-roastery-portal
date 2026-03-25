"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback } from "react";
import {
  BarChart3,
  ShoppingCart,
  Package,
  Users,
  Flame,
  TrendingUp,
  ArrowRight,
} from "@/components/icons";
import type { DatePreset } from "@/lib/analytics/types";

// ── Date Range Selector ──

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "year", label: "This year" },
];

export function DateRangeSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get("range") as DatePreset) || "30d";

  const setRange = useCallback(
    (preset: DatePreset) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("range", preset);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex gap-1.5 flex-wrap">
      {PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => setRange(p.value)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            current === p.value
              ? "bg-brand-600 text-white"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ── Analytics Nav Tabs ──

const NAV_ITEMS = [
  { label: "Overview", href: "/analytics", icon: BarChart3 },
  { label: "Sales", href: "/analytics/sales", icon: ShoppingCart },
  { label: "Inventory", href: "/analytics/inventory", icon: Package },
  { label: "Customers", href: "/analytics/customers", icon: Users },
  { label: "Production", href: "/analytics/production", icon: Flame },
];

export function AnalyticsNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rangeParam = searchParams.get("range") ? `?range=${searchParams.get("range")}` : "";

  return (
    <nav className="border-b border-slate-200 flex gap-6 mb-6 overflow-x-auto">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/analytics" ? pathname === "/analytics" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={`${item.href}${rangeParam}`}
            className={`flex items-center gap-1.5 pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              active
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

// ── KPI Card ──

interface KPICardProps {
  label: string;
  value: string;
  change?: number | null;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  href?: string;
}

export function KPICard({ label, value, change, icon: Icon, iconBg, iconColor, href }: KPICardProps) {
  const content = (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3 mb-1">
        <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900 truncate">{value}</p>
        </div>
      </div>
      {change != null && (
        <div className="flex items-center gap-1 mt-2 ml-[52px]">
          {change >= 0 ? (
            <TrendingUp className="w-3.5 h-3.5 text-green-600" />
          ) : (
            <TrendingUp className="w-3.5 h-3.5 text-red-500 rotate-180" />
          )}
          <span className={`text-xs font-medium ${change >= 0 ? "text-green-600" : "text-red-500"}`}>
            {change >= 0 ? "+" : ""}
            {change.toFixed(1)}% vs prev period
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:ring-1 hover:ring-slate-200 rounded-xl transition-shadow">
        {content}
      </Link>
    );
  }
  return content;
}

// ── Chart Card Wrapper ──

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, children, action, className = "" }: ChartCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Empty Chart State ──

interface EmptyChartProps {
  message?: string;
}

export function EmptyChart({ message = "No data available for the selected period." }: EmptyChartProps) {
  return (
    <div className="flex items-center justify-center h-48 text-sm text-slate-400">
      {message}
    </div>
  );
}

// ── Domain Summary Card (for overview) ──

interface DomainCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  href: string;
  children: React.ReactNode;
}

export function DomainCard({ title, icon: Icon, iconBg, iconColor, href, children }: DomainCardProps) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors block"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <ArrowRight className="w-3.5 h-3.5 text-slate-400 ml-auto" />
      </div>
      {children}
    </Link>
  );
}

// ── Recharts colour tokens ──

export const CHART_COLORS = {
  brand: "#0073c2",
  blue: "#3b82f6",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  purple: "#8b5cf6",
  indigo: "#6366f1",
  slate: "#94a3b8",
  orange: "#f97316",
};

export const DONUT_COLORS = [
  CHART_COLORS.brand,
  CHART_COLORS.green,
  CHART_COLORS.amber,
  CHART_COLORS.purple,
  CHART_COLORS.orange,
  CHART_COLORS.indigo,
  CHART_COLORS.red,
];

// ── Helpers ──

export function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v);
}

export function formatKg(v: number) {
  return `${v.toFixed(1)} kg`;
}

export function formatPercent(v: number) {
  return `${v.toFixed(1)}%`;
}

export function formatCompact(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return v.toString();
}

export function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
