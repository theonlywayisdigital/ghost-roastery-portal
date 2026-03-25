"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useState, useRef, useEffect } from "react";
import {
  BarChart3,
  ShoppingCart,
  Package,
  Users,
  Flame,
  TrendingUp,
  ArrowRight,
  Calendar,
  Download,
} from "@/components/icons";
import type { DatePreset } from "@/lib/analytics/types";

// ── Date Range Selector ──

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

export function DateRangeSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get("range") as DatePreset) || "30d";
  const customFrom = searchParams.get("from") || "";
  const customTo = searchParams.get("to") || "";
  const isCustom = current === "custom";

  const [showCustom, setShowCustom] = useState(isCustom);
  const [fromDate, setFromDate] = useState(customFrom);
  const [toDate, setToDate] = useState(customTo);
  const customRef = useRef<HTMLDivElement>(null);

  // Close custom picker when clicking outside
  useEffect(() => {
    if (!showCustom) return;
    function handleClick(e: MouseEvent) {
      if (customRef.current && !customRef.current.contains(e.target as Node)) {
        setShowCustom(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showCustom]);

  const setRange = useCallback(
    (preset: DatePreset) => {
      const params = new URLSearchParams();
      params.set("range", preset);
      // Remove custom date params for non-custom presets
      router.replace(`${pathname}?${params.toString()}`);
      setShowCustom(false);
    },
    [router, pathname]
  );

  const applyCustomRange = useCallback(() => {
    if (!fromDate || !toDate) return;
    const params = new URLSearchParams();
    params.set("range", "custom");
    params.set("from", fromDate);
    params.set("to", toDate);
    router.replace(`${pathname}?${params.toString()}`);
    setShowCustom(false);
  }, [router, pathname, fromDate, toDate]);

  return (
    <div className="flex gap-1.5 flex-wrap items-center relative">
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
      {/* Custom date range button */}
      <button
        onClick={() => setShowCustom(!showCustom)}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
          isCustom
            ? "bg-brand-600 text-white"
            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
        }`}
      >
        <Calendar className="w-3.5 h-3.5" />
        {isCustom && customFrom && customTo
          ? `${customFrom} — ${customTo}`
          : "Custom"}
      </button>
      {/* Custom date picker dropdown */}
      {showCustom && (
        <div
          ref={customRef}
          className="absolute right-0 top-full mt-2 bg-white rounded-xl border border-slate-200 shadow-lg p-4 z-50 min-w-[280px]"
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={applyCustomRange}
              disabled={!fromDate || !toDate}
              className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </div>
      )}
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
  // Preserve all date params (range, from, to) when navigating between tabs
  const params = new URLSearchParams();
  const range = searchParams.get("range");
  if (range) params.set("range", range);
  if (range === "custom") {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from) params.set("from", from);
    if (to) params.set("to", to);
  }
  const queryString = params.toString() ? `?${params.toString()}` : "";

  return (
    <nav className="border-b border-slate-200 flex gap-6 mb-6 overflow-x-auto">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/analytics" ? pathname === "/analytics" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={`${item.href}${queryString}`}
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

// ── Download Report Modal ──

type ExportSection = "sales" | "inventory" | "customers" | "production";
type ExportFormat = "csv" | "pdf";

export function DownloadReportModal({ onClose }: { onClose: () => void }) {
  const searchParams = useSearchParams();
  const [sections, setSections] = useState<Record<ExportSection, boolean>>({
    sales: true,
    inventory: true,
    customers: true,
    production: true,
  });
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [generating, setGenerating] = useState(false);

  const toggleSection = (s: ExportSection) =>
    setSections((prev) => ({ ...prev, [s]: !prev[s] }));

  const selectedSections = (Object.entries(sections) as [ExportSection, boolean][])
    .filter(([, v]) => v)
    .map(([k]) => k);

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.set("sections", selectedSections.join(","));
    const range = searchParams.get("range") || "30d";
    params.set("range", range);
    if (range === "custom") {
      const from = searchParams.get("from");
      const to = searchParams.get("to");
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    }
    return params.toString();
  };

  const handleGenerate = async () => {
    if (selectedSections.length === 0) return;
    setGenerating(true);
    try {
      if (format === "pdf") {
        // Download PDF directly
        const url = `/api/analytics/export/pdf?${buildQueryParams()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to generate PDF");
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "analytics-report.pdf";
        a.click();
        URL.revokeObjectURL(a.href);
      } else {
        // CSV: get data, zip if multiple sections
        const url = `/api/analytics/export/csv?${buildQueryParams()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to generate CSV");
        const data = await res.json();

        const csvEntries = Object.entries(data.sections) as [string, string][];
        if (csvEntries.length === 1) {
          // Single file — download directly
          const [name, csv] = csvEntries[0];
          const blob = new Blob([csv], { type: "text/csv" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `analytics-${name}.csv`;
          a.click();
          URL.revokeObjectURL(a.href);
        } else {
          // Multiple files — zip
          const JSZip = (await import("jszip")).default;
          const zip = new JSZip();
          for (const [name, csv] of csvEntries) {
            zip.file(`analytics-${name}.csv`, csv);
          }
          const blob = await zip.generateAsync({ type: "blob" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "analytics-report.zip";
          a.click();
          URL.revokeObjectURL(a.href);
        }
      }
      onClose();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  const sectionLabels: Record<ExportSection, string> = {
    sales: "Sales & Revenue",
    inventory: "Stock & Inventory",
    customers: "Customers & Buyers",
    production: "Production & Roasting",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Download Report</h2>

        {/* Scope selector */}
        <div className="mb-5">
          <p className="text-sm font-medium text-slate-700 mb-2">Sections to include</p>
          <div className="space-y-2">
            {(Object.keys(sectionLabels) as ExportSection[]).map((key) => (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sections[key]}
                  onChange={() => toggleSection(key)}
                  className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-700">{sectionLabels[key]}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Format selector */}
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-700 mb-2">Format</p>
          <div className="flex gap-3">
            {(["csv", "pdf"] as ExportFormat[]).map((f) => (
              <label key={f} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value={f}
                  checked={format === f}
                  onChange={() => setFormat(f)}
                  className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-700">{f.toUpperCase()}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={selectedSections.length === 0 || generating}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Analytics Header (shared across all pages) ──

interface AnalyticsHeaderProps {
  title?: string;
  subtitle: string;
}

export function AnalyticsHeader({ title = "Analytics", subtitle }: AnalyticsHeaderProps) {
  const [showDownload, setShowDownload] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between mb-2 gap-4">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={() => setShowDownload(true)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
          <DateRangeSelector />
        </div>
      </div>
      <p className="text-slate-500 mb-4">{subtitle}</p>
      <AnalyticsNav />
      {showDownload && <DownloadReportModal onClose={() => setShowDownload(false)} />}
    </>
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

/** Build the query string for analytics API calls, including custom date params */
export function useAnalyticsParams() {
  const searchParams = useSearchParams();
  const range = searchParams.get("range") || "30d";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const queryString = (() => {
    const params = new URLSearchParams();
    params.set("range", range);
    if (range === "custom" && from) params.set("from", from);
    if (range === "custom" && to) params.set("to", to);
    return params.toString();
  })();

  return { range, from, to, queryString };
}

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
