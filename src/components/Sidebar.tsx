"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Store,
  Coffee,
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
  Bell,
  Building2,
  LifeBuoy,
  BookOpen,
  Wallet,
  ScrollText,
  Sliders,
  Users,
  PoundSterling,
  Receipt,
  Palette,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

interface SidebarUser {
  email: string;
  fullName: string | null;
  roles: string[];
  businessName: string | null;
  isGhostRoaster: boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string | null;
  items: NavItem[];
}

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isRoaster = user.roles.includes("roaster");
  const isAdmin = user.roles.includes("admin");

  // Build nav sections based on roles
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
        { label: "Partner Program", href: "/admin/partner-program", icon: Coffee },
      ],
    });
    sections.push({
      title: "Operations",
      items: [
        { label: "Support & Disputes", href: "/admin/support", icon: LifeBuoy },
        { label: "Finance & Payouts", href: "/admin/finance", icon: Wallet },
        { label: "Notification Centre", href: "/admin/notifications", icon: Bell },
      ],
    });
    sections.push({
      title: "Growth",
      items: [
        { label: "Marketing Suite", href: "/admin/marketing", icon: Megaphone },
        { label: "Revenue & Analytics", href: "/admin/analytics", icon: BarChart3 },
      ],
    });
    sections.push({
      title: "System",
      items: [
        { label: "Pricing", href: "/admin/pricing", icon: PoundSterling },
        { label: "Builder Config", href: "/admin/builder-config", icon: Package },
        { label: "Branding", href: "/admin/settings/branding", icon: Palette },
        { label: "Platform Settings", href: "/admin/settings", icon: Sliders },
        { label: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText },
      ],
    });
  }

  // ── Roaster Portal ──
  if (isRoaster) {
    if (!isAdmin) {
      sections.push({
        title: null,
        items: [
          { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        ],
      });
    }
    sections.push({
      title: "Roaster",
      items: [
        { label: "Products", href: "/products", icon: Package },
        { label: "Orders", href: "/orders", icon: ShoppingCart },
        { label: "My Storefront", href: "/storefront", icon: Store },
        { label: "Businesses", href: "/businesses", icon: Building2 },
        { label: "Contacts", href: "/contacts", icon: Contact },
        { label: "Marketing", href: "/marketing", icon: Megaphone },
        { label: "Invoices", href: "/invoices", icon: Receipt },
        { label: "Analytics", href: "/analytics", icon: BarChart3 },
      ],
    });
  }

  // ── Roaster Support ──
  if (isRoaster) {
    sections.push({
      title: "Support",
      items: [
        { label: "Support", href: "/support", icon: LifeBuoy },
        { label: "Help Centre", href: "/help", icon: BookOpen },
      ],
    });
  }

  // ── Wholesale Buyer ──
  if (user.roles.includes("wholesale_buyer")) {
    sections.push({
      title: "Wholesale",
      items: [
        { label: "My Suppliers", href: "/wholesale", icon: Store },
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

  // My Account section — shown for customers and roasters (not in admin-only view)
  if (!isAdmin || isRoaster) {
    sections.push({
      title: "My Account",
      items: [
        { label: "My Orders", href: "/my-orders", icon: ClipboardList },
        { label: "My Invoices", href: "/my-invoices", icon: Receipt },
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
        { label: "Help Centre", href: "/help", icon: BookOpen },
      ],
    });
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  // Determine settings path based on role
  const settingsHref = isAdmin ? "/admin/settings" : "/settings";

  const displayName = user.businessName || user.fullName || user.email;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo area */}
      <div className="p-6 border-b border-slate-200">
        <Link href={isAdmin ? "/admin/dashboard" : "/dashboard"} className="block">
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            GHOST ROASTERY
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin ? "Admin Portal" : "Partner Portal"}
          </p>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {sections.map((section, sectionIdx) => (
          <div key={sectionIdx}>
            {section.title && (
              <p className="px-3 mb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      active
                        ? "bg-brand-50 text-brand-700 font-medium"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-slate-200 space-y-2">
        {/* Settings link in bottom for non-admin users (admin has it in System section) */}
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
            <Settings className="w-5 h-5 flex-shrink-0" />
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
    </>
  );
}
