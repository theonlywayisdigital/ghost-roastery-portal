"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Store,
  LogOut,
  Menu,
  X,
  ClipboardList,
  Tag,
  MapPin,
  Settings,
  Megaphone,
  BarChart3,
  Contact,
  Building2,
  LifeBuoy,
  BookOpen,
  Wallet,
  Sliders,
  Users,
  PoundSterling,
  Receipt,
  Palette,
  Sparkles,
  Lock,
  ChevronRight,
  ChevronDown,
  CalendarDays,
  Send,
  Share2,
  Ticket,
  FileText,
  Globe,
  Link2,
  Eye,
  Flame,
  Truck,
  Handshake,
  Archive,
  Mail,
  Bot,
  RefreshCw,
} from "@/components/icons";
import { NotificationBell } from "@/components/NotificationBell";
import { OnboardingWidget } from "@/components/onboarding/OnboardingWidget";
import { OnboardingPanel } from "@/components/onboarding/OnboardingPanel";
import { WelcomeModal } from "@/components/onboarding/WelcomeModal";
import {
  getEffectiveFeatures,
  getEffectiveLimits,
  type TierLevel,
  type FeatureKey,
  type LimitKey,
} from "@/lib/tier-config";
import { RETAIL_ENABLED } from "@/lib/feature-flags";

interface SidebarUser {
  email: string;
  fullName: string | null;
  roles: string[];
  businessName: string | null;
  isGhostRoaster: boolean;
  salesTier?: string;
  marketingTier?: string;
  subscriptionStatus?: string | null;
  websiteSubscriptionActive?: boolean;
  isImpersonating?: boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredFeature?: FeatureKey;
}

interface NavSection {
  title: string | null;
  items: NavItem[];
}

interface SuiteItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  requiredFeature?: FeatureKey;
  requiredMinLimit?: LimitKey;
  requiredRole?: string;
  badgeKey?: string;
}

interface SuiteConfig {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: SuiteItem[];
  activePrefixes: string[];
}

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSuite, setOpenSuite] = useState<string | null>(null);
  const [expandedSuite, setExpandedSuite] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});
  const [onboardingPanelOpen, setOnboardingPanelOpen] = useState(false);

  const isRoaster = user.roles.includes("roaster");
  const isAdmin = user.roles.includes("admin") && !user.isImpersonating;

  // Compute feature access for gated nav items
  const features = isRoaster && user.salesTier && user.marketingTier
    ? getEffectiveFeatures(user.salesTier as TierLevel, user.marketingTier as TierLevel)
    : null;

  // Compute limits for limit-gated nav items
  const limits = isRoaster && user.salesTier && user.marketingTier
    ? getEffectiveLimits(user.salesTier as TierLevel, user.marketingTier as TierLevel)
    : null;

  // ── Hover delay logic (150ms) ──
  const handleSuiteMouseEnter = useCallback((key: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setOpenSuite(key);
  }, []);

  const handleSuiteMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setOpenSuite(null);
    }, 150);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // ── Fetch inbox unread count ──
  useEffect(() => {
    fetch("/api/inbox?pageSize=1")
      .then((r) => r.json())
      .catch(() => ({ unreadCount: 0 }))
      .then((data) => {
        setBadgeCounts((prev) => ({ ...prev, inboxUnread: data.unreadCount || 0 }));
      });
  }, [pathname]);

  // ── Suite configs ──
  const salesSuiteConfig: SuiteConfig = {
    key: "sales",
    label: "Sales Suite",
    icon: ShoppingCart,
    items: [
      { label: "Inventory", href: "/inventory", icon: Package },
      { label: "Production", href: "/production", icon: CalendarDays, requiredFeature: "toolsProductionPlanner" },
      { label: "Dispatch", href: "/dispatch", icon: Truck },
      { label: "Orders", href: "/orders", icon: ShoppingCart },
      { label: "Wholesale Portal", href: "/wholesale-portal", icon: Store },
      { label: "Contacts", href: "/contacts", icon: Contact },
      { label: "Invoices", href: "/invoices", icon: Receipt, requiredFeature: "invoices" },
    ],
    activePrefixes: ["/inventory", "/production", "/dispatch", "/orders", "/wholesale-portal", "/contacts", "/businesses", "/invoices"],
  };

  const marketingSuiteConfig: SuiteConfig = {
    key: "marketing",
    label: "Marketing Suite",
    icon: Megaphone,
    items: [
      { label: "Campaigns", href: "/marketing/campaigns", icon: Send },
      { label: "Content Calendar", href: "/marketing", icon: CalendarDays, requiredFeature: "contentCalendar", exact: true },
      { label: "Social", href: "/marketing/social", icon: Share2, requiredFeature: "socialScheduling" },
      ...(RETAIL_ENABLED ? [{ label: "Discount Codes", href: "/marketing/discount-codes", icon: Ticket }] : []),
      { label: "Forms", href: "/marketing/forms", icon: FileText },
      ...(RETAIL_ENABLED ? [{ label: "Blog", href: "/marketing/blog", icon: BookOpen }] : []),
    ],
    activePrefixes: ["/marketing"],
  };

  const websiteSuiteConfig: SuiteConfig = {
    key: "website",
    label: "Website",
    icon: Globe,
    items: [
      { label: "Pages", href: "/website/pages", icon: FileText },
      { label: "Menus", href: "/website/menus", icon: Menu },
      { label: "Design", href: "/website/design", icon: Palette },
      { label: "Preview", href: "/website/preview", icon: Eye },
      { label: "Domain", href: "/website/domain", icon: Link2 },
    ],
    activePrefixes: ["/website"],
  };

  const suiteConfigs = [salesSuiteConfig, marketingSuiteConfig, ...(RETAIL_ENABLED && user.websiteSubscriptionActive ? [websiteSuiteConfig] : [])];

  function isSuiteActive(suite: SuiteConfig): boolean {
    return suite.activePrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
    );
  }

  function isSuiteItemLocked(item: SuiteItem): boolean {
    if (item.requiredFeature && features && !features[item.requiredFeature]) return true;
    if (item.requiredMinLimit && limits && limits[item.requiredMinLimit] === 0) return true;
    return false;
  }

  function isSuiteItemVisible(item: SuiteItem): boolean {
    if (item.requiredRole && !user.roles.includes(item.requiredRole)) return false;
    return true;
  }

  function isSuiteItemActive(item: SuiteItem): boolean {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  // Build nav sections based on roles (admin + customer — roaster uses suites now)
  const sections: NavSection[] = [];

  // ── Admin Portal ──
  if (isAdmin) {
    sections.push({
      title: null,
      items: [
        { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      ],
    });
    sections.push({
      title: "Manage",
      items: [
        { label: "All Orders", href: "/admin/orders", icon: ShoppingCart },
        { label: "All Contacts", href: "/admin/contacts", icon: Contact },
        { label: "All Businesses", href: "/admin/businesses", icon: Store },
        { label: "All Users", href: "/admin/users", icon: Users },
        { label: "All Roasters", href: "/admin/roasters", icon: Building2 },
        { label: "Products", href: "/admin/products", icon: Package },
        { label: "Wholesale", href: "/admin/wholesale", icon: Store },
      ],
    });
    sections.push({
      title: "Operations",
      items: [
        { label: "Support & Disputes", href: "/admin/support", icon: LifeBuoy },
        { label: "Finance", href: "/admin/finance", icon: Wallet },
      ],
    });
    sections.push({
      title: "Growth",
      items: [
        { label: "Marketing Suite", href: "/admin/marketing", icon: Megaphone },
      ],
    });
    sections.push({
      title: "System",
      items: [
        { label: "Pricing", href: "/admin/pricing", icon: PoundSterling },
        { label: "Builder Config", href: "/admin/builder-config", icon: Package },
        { label: "Branding", href: "/admin/settings/branding", icon: Palette },
        { label: "Platform Settings", href: "/admin/settings", icon: Sliders },
      ],
    });
  }

  // ── Customer Portal (non-roaster, non-admin) ──
  if (!isRoaster && !isAdmin) {
    sections.push({
      title: null,
      items: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      ],
    });
  }

  // My Account section — shown for customers only (roasters now use Settings)
  if (!isAdmin && !isRoaster) {
    sections.push({
      title: "My Account",
      items: [
        { label: "My Orders", href: "/my-orders", icon: ClipboardList },
        { label: "Standing Orders", href: "/my-standing-orders", icon: RefreshCw },
        { label: "My Invoices", href: "/my-invoices", icon: Receipt },
        { label: "Wholesale", href: "/wholesale", icon: Building2 },
        { label: "My Brands", href: "/my-brands", icon: Tag },
        { label: "Addresses", href: "/addresses", icon: MapPin },
      ],
    });
  }

  // ── Customer Support (non-roaster, non-admin) ──
  if (!isRoaster && !isAdmin) {
    sections.push({
      title: "Support",
      items: [
        { label: "Support", href: "/support", icon: LifeBuoy },
      ],
    });
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  // Determine settings path based on role
  const settingsHref = isAdmin ? "/admin/settings" : "/settings";

  const displayName = user.businessName || user.fullName || user.email;

  // ── Render a single suite trigger (desktop + mobile) ──
  function renderSuiteTrigger(suite: SuiteConfig) {
    const SuiteIcon = suite.icon;
    const active = isSuiteActive(suite);
    const isOpen = openSuite === suite.key;
    const isExpanded = expandedSuite === suite.key;

    return (
      <div key={suite.key}>
        {/* Desktop trigger */}
        <div
          className="hidden lg:block"
          onMouseEnter={() => handleSuiteMouseEnter(suite.key)}
          onMouseLeave={handleSuiteMouseLeave}
        >
          <button
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors w-full ${
              active
                ? "bg-brand-50 text-brand-700 font-medium"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <SuiteIcon className="w-6 h-6 flex-shrink-0 text-black" />
            <span className="flex-1 text-left">{suite.label}</span>
            <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? "text-brand-600" : "text-slate-400"}`} />
          </button>
        </div>

        {/* Mobile trigger */}
        <div className="lg:hidden">
          <button
            onClick={() => setExpandedSuite(isExpanded ? null : suite.key)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors w-full ${
              active
                ? "bg-brand-50 text-brand-700 font-medium"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <SuiteIcon className="w-6 h-6 flex-shrink-0 text-black" />
            <span className="flex-1 text-left">{suite.label}</span>
            <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""} text-slate-400`} />
          </button>

          {/* Mobile accordion items */}
          {isExpanded && (
            <div className="pl-4 mt-1 space-y-1">
              {suite.items.filter(isSuiteItemVisible).map((item) => {
                const ItemIcon = item.icon;
                const locked = isSuiteItemLocked(item);
                const itemActive = isSuiteItemActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      setMobileOpen(false);
                      setExpandedSuite(null);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      locked
                        ? "text-slate-400 hover:bg-slate-50"
                        : itemActive
                          ? "bg-brand-50 text-brand-700 font-medium"
                          : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <ItemIcon className="w-6 h-6 flex-shrink-0 text-black" />
                    <span className="flex-1">{item.label}</span>
                    {item.badgeKey && badgeCounts[item.badgeKey] > 0 && (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-brand-600 text-white rounded-full min-w-[20px] text-center">
                        {badgeCounts[item.badgeKey]}
                      </span>
                    )}
                    {locked && <Lock className="w-3.5 h-3.5 flex-shrink-0 text-slate-300" />}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Render a flat nav link for roaster top-level items ──
  function renderNavLink(label: string, href: string, Icon: React.ComponentType<{ className?: string }>) {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
          active
            ? "bg-brand-50 text-brand-700 font-medium"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        <Icon className="w-6 h-6 flex-shrink-0 text-black" />
        <span className="flex-1">{label}</span>
      </Link>
    );
  }

  // ── Desktop flyout panel ──
  function renderDesktopFlyout() {
    if (!openSuite) return null;
    const suite = suiteConfigs.find((s) => s.key === openSuite);
    if (!suite) return null;

    return (
      <div
        className="hidden lg:block fixed top-0 bottom-0 left-64 w-56 z-50 bg-white border-r border-slate-200 shadow-lg overflow-y-auto"
        onMouseEnter={() => handleSuiteMouseEnter(suite.key)}
        onMouseLeave={handleSuiteMouseLeave}
      >
        <div className="px-4 pt-6 pb-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {suite.label}
          </p>
        </div>
        <div className="px-3 pb-4 space-y-1">
          {suite.items.filter(isSuiteItemVisible).map((item) => {
            const ItemIcon = item.icon;
            const locked = isSuiteItemLocked(item);
            const itemActive = isSuiteItemActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpenSuite(null)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  locked
                    ? "text-slate-400 hover:bg-slate-50"
                    : itemActive
                      ? "bg-brand-50 text-brand-700 font-medium"
                      : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <ItemIcon className="w-6 h-6 flex-shrink-0 text-black" />
                <span className="flex-1">{item.label}</span>
                {item.badgeKey && badgeCounts[item.badgeKey] > 0 && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-brand-600 text-white rounded-full min-w-[20px] text-center">
                    {badgeCounts[item.badgeKey]}
                  </span>
                )}
                {locked && <Lock className="w-3.5 h-3.5 flex-shrink-0 text-slate-300" />}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo area */}
      <div className="px-5 py-2.5 border-b border-slate-200 flex items-center justify-center">
        <Link href={isAdmin ? "/admin/dashboard" : "/dashboard"} className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://zaryzynzbpxmscggufdc.supabase.co/storage/v1/object/public/assets/logo-main.png"
            alt="Roastery Platform"
            className="w-full h-auto max-w-[210px]"
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Roaster nav — suites + flat items */}
        {isRoaster && (
          <>
            {!isAdmin && renderNavLink("Dashboard", "/dashboard", LayoutDashboard)}
            {suiteConfigs.map((suite) => renderSuiteTrigger(suite))}
            {renderNavLink("Analytics", "/analytics", BarChart3)}
          </>
        )}

        {/* Admin + customer sections (unchanged) */}
        {sections.map((section, sectionIdx) => (
          <div key={sectionIdx} className={section.title ? "pt-3" : ""}>
            {section.title && (
              <p className="px-3 mb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const locked = item.requiredFeature && features && !features[item.requiredFeature];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      locked
                        ? "text-slate-400 hover:bg-slate-50"
                        : active
                          ? "bg-brand-50 text-brand-700 font-medium"
                          : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-6 h-6 flex-shrink-0 text-black" />
                    <span className="flex-1">{item.label}</span>
                    {locked && <Lock className="w-3.5 h-3.5 flex-shrink-0 text-slate-300" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Onboarding widget / Upgrade CTA */}
      {isRoaster && !isAdmin && (
        <OnboardingWidget
          salesTier={user.salesTier || "growth"}
          marketingTier={user.marketingTier || "growth"}
          onOpenPanel={() => setOnboardingPanelOpen(true)}
        >
          {null}
        </OnboardingWidget>
      )}

      {/* Bottom section */}
      <div className="p-4 border-t border-slate-200 space-y-1">
        {/* Inbox */}
        <Link
          href="/inbox"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            isActive("/inbox")
              ? "bg-brand-50 text-brand-700 font-medium"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Mail className="w-6 h-6 flex-shrink-0 text-black" />
          <span className="flex-1">Inbox</span>
          {badgeCounts.inboxUnread > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-brand-600 text-white rounded-full min-w-[20px] text-center">
              {badgeCounts.inboxUnread}
            </span>
          )}
        </Link>
        {/* Beans AI for roasters */}
        {isRoaster && (() => {
          const isScale = user.salesTier === "scale";
          const beansActive = isActive("/beans");
          return (
            <Link
              href="/beans"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                beansActive
                  ? "bg-brand-50 text-brand-700 font-medium"
                  : isScale
                    ? "text-slate-600 hover:bg-slate-100"
                    : "text-slate-400 hover:bg-slate-50"
              }`}
            >
              <Bot className="w-6 h-6 flex-shrink-0 text-black" />
              <span className="flex-1">Beans AI</span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 rounded">Beta</span>
              {!isScale && <Lock className="w-3.5 h-3.5 flex-shrink-0 text-slate-300" />}
            </Link>
          );
        })()}
        {/* Support for roasters */}
        {isRoaster && (
          <Link
            href="/support"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive("/support") || isActive("/help")
                ? "bg-brand-50 text-brand-700 font-medium"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <LifeBuoy className="w-6 h-6 flex-shrink-0 text-black" />
            Support
          </Link>
        )}
        {/* Settings link for non-admin users (admin has it in System section) */}
        {!isAdmin && (
          <Link
            href={settingsHref}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive(settingsHref)
                ? "bg-brand-50 text-brand-700 font-medium"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Settings className="w-6 h-6 flex-shrink-0 text-black" />
            Settings
          </Link>
        )}
        <div className={`${!isAdmin ? "pt-2 border-t border-slate-100" : ""}`}>
          <div className="mb-3 px-3 flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 truncate">
                {displayName}
              </p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
            <NotificationBell />
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors w-full px-3 py-2"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white rounded-lg border border-slate-200 shadow-sm"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-slate-600" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-slate-200">
        {sidebarContent}
      </aside>

      {/* Desktop flyout */}
      {renderDesktopFlyout()}

      {/* Welcome modal for first-time roasters */}
      {isRoaster && !isAdmin && (
        <WelcomeModal onGetStarted={() => setOnboardingPanelOpen(true)} />
      )}

      {/* Onboarding slide-out panel */}
      {isRoaster && !isAdmin && (
        <OnboardingPanel
          open={onboardingPanelOpen}
          onClose={() => setOnboardingPanelOpen(false)}
          salesTier={user.salesTier || "growth"}
          marketingTier={user.marketingTier || "growth"}
        />
      )}
    </>
  );
}
