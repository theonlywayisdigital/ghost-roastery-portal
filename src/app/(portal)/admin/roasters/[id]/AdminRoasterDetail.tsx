"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Building2,
  Clock,
  StickyNote,
  Edit3,
  Save,
  X,
  Activity,
  AlertTriangle,
  ExternalLink,
  Users,
  ShoppingBag,
  Package,
  CreditCard,
  Store,
  Handshake,
  FileText,
  ChevronLeft,
  Shield,
  Power,
  Eye,
  Plus,
  DollarSign,
  BarChart3,
  UserPlus,
  Check,
  XCircle,
  Crown,
  Sparkles,
  Zap,
} from "@/components/icons";
import { UsageBar } from "@/components/shared/UsageBar";
import { StatusBadge as TierBadge } from "@/components/admin/StatusBadge";
import {
  type TierLevel,
  type LimitKey,
  TIER_NAMES,
  LIMIT_LABELS,
  getEffectivePlatformFee,
  getSalesPricing,
  getMarketingPricing,
  type AiActionType,
  AI_ACTION_LABELS,
} from "@/lib/tier-config";

// ─── Types ───

interface Roaster {
  id: string;
  email: string;
  business_name: string;
  contact_name: string;
  contact_first_name: string | null;
  contact_last_name: string | null;
  phone: string | null;
  website: string | null;
  country: string;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  postcode: string | null;
  roaster_slug: string | null;
  stripe_account_id: string | null;
  is_active: boolean;
  wholesale_enabled: boolean;
  platform_fee_percent: number;
  is_ghost_roaster: boolean;
  ghost_roaster_application_status: string | null;
  ghost_roaster_applied_at: string | null;
  ghost_roaster_approved_at: string | null;
  is_verified: boolean;
  strikes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  stripe_onboarding_complete: boolean;
  storefront_slug: string | null;
  storefront_enabled: boolean;
  brand_tagline: string | null;
  brand_about: string | null;
  brand_logo_url: string | null;
  brand_primary_colour: string | null;
  brand_accent_colour: string | null;
  sales_tier: string;
  marketing_tier: string;
  tier_override_by: string | null;
  tier_override_reason: string | null;
  tier_changed_at: string | null;
  sales_discount_percent: number;
  marketing_discount_percent: number;
  discount_note: string | null;
  website_subscription_active: boolean;
  website_discount_percent: number;
}

interface RoasterStats {
  teamCount: number;
  productCount: number;
  orderCount: number;
  revenue: number;
}

interface ActivityItem {
  id: string;
  roaster_id: string;
  actor_id: string | null;
  author_id: string | null;
  activity_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface TeamMember {
  id: string;
  user_id: string | null;
  email: string | null;
  full_name: string | null;
  role: string;
  created_at: string;
}

interface Order {
  id: string;
  roaster_id: string;
  buyer_name: string | null;
  customer_name: string | null;
  items: unknown[];
  subtotal: number;
  total: number;
  status: string;
  created_at: string;
}

interface Note {
  id: string;
  roaster_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

// ─── Constants ───

type TabId =
  | "overview"
  | "account"
  | "team"
  | "partner"
  | "subscription"
  | "orders"
  | "products"
  | "storefront"
  | "financial"
  | "activity";

const TABS: { id: TabId; label: string; icon: typeof Activity }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "account", label: "Account", icon: Building2 },
  { id: "team", label: "Team", icon: Users },
  { id: "partner", label: "Partner", icon: Handshake },
  { id: "subscription", label: "Subscription", icon: Crown },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "products", label: "Products", icon: Package },
  { id: "storefront", label: "Storefront", icon: Store },
  { id: "financial", label: "Financial", icon: CreditCard },
  { id: "activity", label: "Activity", icon: Activity },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  inactive: "bg-slate-100 text-slate-600",
};

const PARTNER_COLORS: Record<string, string> = {
  approved: "bg-green-50 text-green-700",
  pending: "bg-yellow-50 text-yellow-700",
  rejected: "bg-red-50 text-red-600",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  confirmed: "bg-blue-50 text-blue-700",
  processing: "bg-blue-50 text-blue-700",
  shipped: "bg-purple-50 text-purple-700",
  delivered: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
};

const ACTIVITY_ICONS: Record<string, typeof Activity> = {
  roaster_created: Plus,
  roaster_updated: Edit3,
  roaster_deactivated: Power,
  strike_added: AlertTriangle,
  strike_removed: Shield,
  note_added: StickyNote,
  team_invite_sent: UserPlus,
  admin_impersonation: Eye,
  order_placed: ShoppingBag,
};

// ─── Component ───

export function AdminRoasterDetail({ roasterId }: { roasterId: string }) {
  const router = useRouter();

  // Core data
  const [roaster, setRoaster] = useState<Roaster | null>(null);
  const [stats, setStats] = useState<RoasterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Overview tab
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Account tab
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    business_name: "",
    contact_first_name: "",
    contact_last_name: "",
    email: "",
    phone: "",
    website: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    postcode: "",
    country: "",
  });

  // Team tab
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "member" });
  const [inviting, setInviting] = useState(false);

  // Subscription tab
  const [subSalesTier, setSubSalesTier] = useState<TierLevel>("free");
  const [subMarketingTier, setSubMarketingTier] = useState<TierLevel>("free");
  const [subOverrideReason, setSubOverrideReason] = useState("");
  const [subSalesDiscount, setSubSalesDiscount] = useState(0);
  const [subMarketingDiscount, setSubMarketingDiscount] = useState(0);
  const [subDiscountNote, setSubDiscountNote] = useState("");
  const [subWebsiteActive, setSubWebsiteActive] = useState(false);
  const [subWebsiteDiscount, setSubWebsiteDiscount] = useState(0);
  const [savingTier, setSavingTier] = useState(false);
  const [savedTier, setSavedTier] = useState(false);
  const [usageData, setUsageData] = useState<Record<string, { current: number; limit: number; percentUsed: number }> | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  // AI Credits
  const [aiCreditsData, setAiCreditsData] = useState<{
    monthlyAllocation: number;
    monthlyUsed: number;
    topupBalance: number;
    ledger: { id: string; credits_used: number; action_type: string; source: string; reason: string | null; created_at: string; metadata: Record<string, unknown> }[];
  } | null>(null);
  const [loadingAiCredits, setLoadingAiCredits] = useState(false);
  const [topupAmount, setTopupAmount] = useState(50);
  const [topupReason, setTopupReason] = useState("");
  const [grantingCredits, setGrantingCredits] = useState(false);
  const [subscriptionEvents, setSubscriptionEvents] = useState<{ id: string; event_type: string; previous_tier: string; new_tier: string; product_type: string; created_at: string; metadata: Record<string, unknown> }[]>([]);
  const [loadingSubEvents, setLoadingSubEvents] = useState(false);

  // Partner tab
  const [feeValue, setFeeValue] = useState("");
  const [savingFee, setSavingFee] = useState(false);

  // Orders tab
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Activity tab
  const [fullActivity, setFullActivity] = useState<ActivityItem[]>([]);
  const [loadingFullActivity, setLoadingFullActivity] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Action states
  const [togglingActive, setTogglingActive] = useState(false);
  const [addingStrike, setAddingStrike] = useState(false);
  const [impersonating, setImpersonating] = useState(false);

  // ─── Data Loading ───

  const loadRoaster = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/roasters/${roasterId}`);
      if (!res.ok) {
        setError("Roaster not found");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setRoaster(data.roaster);
      setStats(data.stats);
      if (data.usage) setUsageData(data.usage);
      setSubSalesTier((data.roaster.sales_tier as TierLevel) || "free");
      setSubMarketingTier((data.roaster.marketing_tier as TierLevel) || "free");
      setSubSalesDiscount(Number(data.roaster.sales_discount_percent) || 0);
      setSubMarketingDiscount(Number(data.roaster.marketing_discount_percent) || 0);
      setSubDiscountNote(data.roaster.discount_note || "");
      setSubWebsiteActive(data.roaster.website_subscription_active || false);
      setSubWebsiteDiscount(Number(data.roaster.website_discount_percent) || 0);
      setEditForm({
        business_name: data.roaster.business_name || "",
        contact_first_name: data.roaster.contact_first_name || "",
        contact_last_name: data.roaster.contact_last_name || "",
        email: data.roaster.email || "",
        phone: data.roaster.phone || "",
        website: data.roaster.website || "",
        address_line_1: data.roaster.address_line_1 || "",
        address_line_2: data.roaster.address_line_2 || "",
        city: data.roaster.city || "",
        postcode: data.roaster.postcode || "",
        country: data.roaster.country || "",
      });
      setFeeValue(String(data.roaster.platform_fee_percent ?? "4.0"));
    } catch {
      setError("Failed to load roaster");
    }
    setLoading(false);
  }, [roasterId]);

  const loadRecentActivity = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const res = await fetch(`/api/admin/roasters/${roasterId}/activity`);
      if (res.ok) {
        const data = await res.json();
        setRecentActivity((data.activity || []).slice(0, 5));
      }
    } catch {
      // silent
    }
    setLoadingActivity(false);
  }, [roasterId]);

  const loadTeam = useCallback(async () => {
    setLoadingTeam(true);
    try {
      const res = await fetch(`/api/admin/roasters/${roasterId}/team`);
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.members || []);
      }
    } catch {
      // silent
    }
    setLoadingTeam(false);
  }, [roasterId]);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch(
        `/api/admin/roasters/${roasterId}/orders?page=${ordersPage}&limit=20`
      );
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setOrdersTotal(data.total || 0);
      }
    } catch {
      // silent
    }
    setLoadingOrders(false);
  }, [roasterId, ordersPage]);

  const loadFullActivity = useCallback(async () => {
    setLoadingFullActivity(true);
    try {
      const res = await fetch(`/api/admin/roasters/${roasterId}/activity`);
      if (res.ok) {
        const data = await res.json();
        setFullActivity(data.activity || []);
      }
    } catch {
      // silent
    }
    setLoadingFullActivity(false);
  }, [roasterId]);

  useEffect(() => {
    loadRoaster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roasterId]);

  useEffect(() => {
    if (activeTab === "overview") loadRecentActivity();
    if (activeTab === "team") loadTeam();
    if (activeTab === "orders") loadOrders();
    if (activeTab === "activity") loadFullActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, roasterId, ordersPage]);

  // ─── Actions ───

  async function handleSaveAccount() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/roasters/${roasterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditing(false);
        loadRoaster();
      }
    } catch {
      // silent
    }
    setSaving(false);
  }

  async function handleToggleActive() {
    if (!roaster) return;
    setTogglingActive(true);
    try {
      const res = await fetch(`/api/admin/roasters/${roasterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !roaster.is_active }),
      });
      if (res.ok) {
        loadRoaster();
        if (activeTab === "overview") loadRecentActivity();
      }
    } catch {
      // silent
    }
    setTogglingActive(false);
  }

  async function handleAddStrike() {
    setAddingStrike(true);
    try {
      const res = await fetch(`/api/admin/roasters/${roasterId}/strikes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", reason: "Admin action" }),
      });
      if (res.ok) {
        loadRoaster();
        if (activeTab === "overview") loadRecentActivity();
        if (activeTab === "activity") loadFullActivity();
      }
    } catch {
      // silent
    }
    setAddingStrike(false);
  }

  async function handleImpersonate() {
    setImpersonating(true);
    try {
      const res = await fetch(
        `/api/admin/roasters/${roasterId}/impersonate`,
        { method: "POST" }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.redirectUrl) {
          window.open(data.redirectUrl, "_blank");
        }
      }
    } catch {
      // silent
    }
    setImpersonating(false);
  }

  async function handleInviteTeamMember() {
    if (!inviteForm.email.trim()) return;
    setInviting(true);
    try {
      const res = await fetch(
        `/api/admin/roasters/${roasterId}/team/invite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(inviteForm),
        }
      );
      if (res.ok) {
        setShowInviteModal(false);
        setInviteForm({ email: "", role: "member" });
        loadTeam();
      }
    } catch {
      // silent
    }
    setInviting(false);
  }

  async function handleSaveFee() {
    const feeNum = parseFloat(feeValue);
    if (isNaN(feeNum) || feeNum < 0 || feeNum > 100) return;
    setSavingFee(true);
    try {
      const res = await fetch(`/api/admin/roasters/${roasterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform_fee_percent: feeNum }),
      });
      if (res.ok) {
        loadRoaster();
      }
    } catch {
      // silent
    }
    setSavingFee(false);
  }

  async function handlePartnerAction(status: string) {
    try {
      const res = await fetch(`/api/admin/roasters/${roasterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ghost_roaster_application_status: status,
          is_ghost_roaster: status === "approved",
        }),
      });
      if (res.ok) {
        loadRoaster();
      }
    } catch {
      // silent
    }
  }

  async function handleAddNote() {
    if (!noteContent.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/admin/roasters/${roasterId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent.trim() }),
      });
      if (res.ok) {
        setNoteContent("");
        loadFullActivity();
      }
    } catch {
      // silent
    }
    setAddingNote(false);
  }

  // ─── Render ───

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (error || !roaster) {
    return (
      <div className="text-center py-32">
        <p className="text-slate-500">{error || "Roaster not found"}</p>
        <Link
          href="/admin/roasters"
          className="text-brand-600 hover:underline text-sm mt-2 inline-block"
        >
          Back to roasters
        </Link>
      </div>
    );
  }

  const avgOrderValue =
    stats && stats.orderCount > 0
      ? stats.revenue / stats.orderCount
      : 0;

  const ordersTotalPages = Math.ceil(ordersTotal / 20);

  return (
    <div>
      {/* Breadcrumb + Back */}
      <div className="mb-6">
        <nav className="flex items-center gap-1.5 text-sm text-slate-500 mb-3">
          <Link
            href="/admin/roasters"
            className="hover:text-slate-700 transition-colors"
          >
            Roasters
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-900 font-medium">
            {roaster.business_name}
          </span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link
              href="/admin/roasters"
              className="mt-1 w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">
                  {roaster.business_name}
                </h1>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    roaster.is_active
                      ? STATUS_COLORS.active
                      : STATUS_COLORS.inactive
                  }`}
                >
                  {roaster.is_active ? "active" : "inactive"}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-sm text-slate-500">
                  {roaster.contact_name}
                </span>
                <span className="text-sm text-slate-400">
                  {roaster.email}
                </span>
                {/* Strikes visual */}
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={`w-2.5 h-2.5 rounded-full ${
                        i < (roaster.strikes || 0)
                          ? "bg-red-500"
                          : "bg-slate-200"
                      }`}
                    />
                  ))}
                  {(roaster.strikes || 0) > 0 && (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 ml-0.5" />
                  )}
                </div>
                {/* Partner status */}
                {roaster.is_ghost_roaster && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700">
                    <Handshake className="w-3 h-3" />
                    Ghost Roaster
                  </span>
                )}
                {roaster.ghost_roaster_application_status &&
                  !roaster.is_ghost_roaster && (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        PARTNER_COLORS[
                          roaster.ghost_roaster_application_status
                        ] || "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {`partner: ${roaster.ghost_roaster_application_status}`}
                    </span>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
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

      {/* ─── Tab Content ─── */}

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              label="Total Orders"
              value={String(stats?.orderCount || 0)}
              icon={ShoppingBag}
            />
            <StatCard
              label="Revenue"
              value={formatCurrency(stats?.revenue || 0)}
              icon={DollarSign}
            />
            <StatCard
              label="Avg Order Value"
              value={formatCurrency(avgOrderValue)}
              icon={BarChart3}
            />
            <StatCard
              label="Products"
              value={String(stats?.productCount || 0)}
              icon={Package}
            />
            <StatCard
              label="Team Members"
              value={String(stats?.teamCount || 0)}
              icon={Users}
            />
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Quick Actions
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleImpersonate}
                disabled={impersonating}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <Eye className="w-3.5 h-3.5" />
                {impersonating ? "Opening..." : "View as Roaster"}
              </button>
              <button
                onClick={handleToggleActive}
                disabled={togglingActive}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                  roaster.is_active
                    ? "border border-red-200 text-red-700 hover:bg-red-50"
                    : "border border-green-200 text-green-700 hover:bg-green-50"
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                {togglingActive
                  ? "Updating..."
                  : roaster.is_active
                    ? "Deactivate"
                    : "Activate"}
              </button>
              <button
                onClick={handleAddStrike}
                disabled={addingStrike || (roaster.strikes || 0) >= 3}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-amber-200 rounded-lg text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {addingStrike
                  ? "Adding..."
                  : `Add Strike (${roaster.strikes || 0}/3)`}
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-400" />
                Recent Activity
              </h3>
            </div>
            {loadingActivity ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-10">
                <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No activity yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentActivity.map((item) => {
                  const Icon =
                    ACTIVITY_ICONS[item.activity_type] || Activity;
                  return (
                    <div key={item.id} className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-slate-100 text-slate-500">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-600">
                            {item.description}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {formatDateTime(item.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Account Details Tab */}
      {activeTab === "account" && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Account Details
            </h3>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditForm({
                      business_name: roaster.business_name || "",
                      contact_first_name: roaster.contact_first_name || "",
                      contact_last_name: roaster.contact_last_name || "",
                      email: roaster.email || "",
                      phone: roaster.phone || "",
                      website: roaster.website || "",
                      address_line_1: roaster.address_line_1 || "",
                      address_line_2: roaster.address_line_2 || "",
                      city: roaster.city || "",
                      postcode: roaster.postcode || "",
                      country: roaster.country || "",
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button
                  onClick={handleSaveAccount}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Business Name"
                value={editForm.business_name}
                editing={editing}
                onChange={(v) =>
                  setEditForm((f) => ({ ...f, business_name: v }))
                }
              />
              <FormField
                label="First Name"
                value={editForm.contact_first_name}
                editing={editing}
                onChange={(v) =>
                  setEditForm((f) => ({ ...f, contact_first_name: v }))
                }
              />
              <FormField
                label="Last Name"
                value={editForm.contact_last_name}
                editing={editing}
                onChange={(v) =>
                  setEditForm((f) => ({ ...f, contact_last_name: v }))
                }
              />
              <FormField
                label="Email"
                value={editForm.email}
                editing={editing}
                type="email"
                onChange={(v) => setEditForm((f) => ({ ...f, email: v }))}
              />
              <FormField
                label="Phone"
                value={editForm.phone}
                editing={editing}
                type="tel"
                onChange={(v) => setEditForm((f) => ({ ...f, phone: v }))}
              />
              <FormField
                label="Website"
                value={editForm.website}
                editing={editing}
                type="url"
                onChange={(v) => setEditForm((f) => ({ ...f, website: v }))}
              />
              <FormField
                label="Country"
                value={editForm.country}
                editing={editing}
                onChange={(v) => setEditForm((f) => ({ ...f, country: v }))}
              />
            </div>
            <hr className="border-slate-100" />
            <h4 className="text-sm font-medium text-slate-700">Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Address Line 1"
                value={editForm.address_line_1}
                editing={editing}
                onChange={(v) =>
                  setEditForm((f) => ({ ...f, address_line_1: v }))
                }
              />
              <FormField
                label="Address Line 2"
                value={editForm.address_line_2}
                editing={editing}
                onChange={(v) =>
                  setEditForm((f) => ({ ...f, address_line_2: v }))
                }
              />
              <FormField
                label="City"
                value={editForm.city}
                editing={editing}
                onChange={(v) => setEditForm((f) => ({ ...f, city: v }))}
              />
              <FormField
                label="Postcode"
                value={editForm.postcode}
                editing={editing}
                onChange={(v) => setEditForm((f) => ({ ...f, postcode: v }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === "team" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Team Members
            </h3>
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Invite Member
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {loadingTeam ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No team members yet</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Name
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Email
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Role
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-slate-900">
                          {member.full_name || "\u2014"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {member.email || "\u2014"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                          {member.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-500">
                          {formatDate(member.created_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Invite Modal */}
          {showInviteModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Invite Team Member
                  </h3>
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) =>
                        setInviteForm((f) => ({
                          ...f,
                          email: e.target.value,
                        }))
                      }
                      placeholder="team@example.com"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Role
                    </label>
                    <select
                      value={inviteForm.role}
                      onChange={(e) =>
                        setInviteForm((f) => ({
                          ...f,
                          role: e.target.value,
                        }))
                      }
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInviteTeamMember}
                    disabled={inviting || !inviteForm.email.trim()}
                    className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                  >
                    {inviting ? "Sending..." : "Send Invite"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Partner Program Tab */}
      {activeTab === "partner" && (
        <div className="space-y-6">
          {/* Application Status */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Handshake className="w-4 h-4 text-slate-400" />
                Partner Program Status
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">
                    Application Status
                  </p>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      PARTNER_COLORS[
                        roaster.ghost_roaster_application_status || ""
                      ] || "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {roaster.ghost_roaster_application_status || "None"}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">
                    Ghost Roaster
                  </p>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      roaster.is_ghost_roaster
                        ? "bg-green-50 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {roaster.is_ghost_roaster ? "Yes" : "No"}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Applied</p>
                  <p className="text-sm text-slate-700">
                    {roaster.ghost_roaster_applied_at
                      ? formatDate(roaster.ghost_roaster_applied_at)
                      : "\u2014"}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handlePartnerAction("approved")}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Approve
                </button>
                <button
                  onClick={() => handlePartnerAction("rejected")}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            </div>
          </div>

          {/* Platform Fee — disabled */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">
                Platform Fee
              </h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-600">
                No platform fees — roasters only pay standard Stripe processing fees.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Tab */}
      {activeTab === "subscription" && (
        <div className="space-y-6">
          {/* Current Tiers */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Crown className="w-4 h-4 text-slate-400" />
                Subscription Tiers
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Sales Suite Tier
                  </label>
                  <div className="flex items-center gap-3">
                    <select
                      value={subSalesTier}
                      onChange={(e) => setSubSalesTier(e.target.value as TierLevel)}
                      className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    >
                      {(["free", "starter", "growth", "pro", "scale"] as TierLevel[]).map((t) => (
                        <option key={t} value={t}>{TIER_NAMES[t]}</option>
                      ))}
                    </select>
                    <TierBadge status={subSalesTier} type="subscriptionTier" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Marketing Suite Tier
                  </label>
                  <div className="flex items-center gap-3">
                    <select
                      value={subMarketingTier}
                      onChange={(e) => setSubMarketingTier(e.target.value as TierLevel)}
                      className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    >
                      {(["free", "starter", "growth", "pro", "scale"] as TierLevel[]).map((t) => (
                        <option key={t} value={t}>{TIER_NAMES[t]}</option>
                      ))}
                    </select>
                    <TierBadge status={subMarketingTier} type="subscriptionTier" />
                  </div>
                </div>
              </div>
              {/* Website Add-on */}
              <div className="pt-3 border-t border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Website Add-on
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSubWebsiteActive(!subWebsiteActive)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          subWebsiteActive ? "bg-brand-600" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            subWebsiteActive ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <span className={`text-sm font-medium ${subWebsiteActive ? "text-green-700" : "text-slate-400"}`}>
                        {subWebsiteActive ? "Active" : "Inactive"}
                      </span>
                      <span className="text-xs text-slate-400">£19/mo</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Website Discount %
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={subWebsiteDiscount}
                        onChange={(e) => setSubWebsiteDiscount(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                        className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        disabled={!subWebsiteActive}
                      />
                      <span className="text-sm text-slate-500">%</span>
                      {subWebsiteActive && (
                        <span className="text-xs text-slate-400">
                          {(() => {
                            const base = 1900;
                            const discounted = Math.round(base * (1 - subWebsiteDiscount / 100));
                            return subWebsiteDiscount > 0
                              ? `£${(base / 100).toFixed(2)} → £${(discounted / 100).toFixed(2)}/mo`
                              : `£${(base / 100).toFixed(2)}/mo`;
                          })()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* Discount */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-sm font-medium text-slate-700 mb-3">Admin Discount</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Sales Discount %
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={subSalesDiscount}
                        onChange={(e) => setSubSalesDiscount(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                        className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <span className="text-sm text-slate-500">%</span>
                      {subSalesTier !== "free" && (
                        <span className="text-xs text-slate-400">
                          {(() => {
                            const p = getSalesPricing(subSalesTier);
                            const base = p.monthly;
                            const discounted = Math.round(base * (1 - subSalesDiscount / 100));
                            return subSalesDiscount > 0
                              ? `£${(base / 100).toFixed(2)} → £${(discounted / 100).toFixed(2)}/mo`
                              : `£${(base / 100).toFixed(2)}/mo`;
                          })()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Marketing Discount %
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={subMarketingDiscount}
                        onChange={(e) => setSubMarketingDiscount(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                        className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <span className="text-sm text-slate-500">%</span>
                      {subMarketingTier !== "free" && (
                        <span className="text-xs text-slate-400">
                          {(() => {
                            const p = getMarketingPricing(subMarketingTier);
                            const base = p.monthly;
                            const discounted = Math.round(base * (1 - subMarketingDiscount / 100));
                            return subMarketingDiscount > 0
                              ? `£${(base / 100).toFixed(2)} → £${(discounted / 100).toFixed(2)}/mo`
                              : `£${(base / 100).toFixed(2)}/mo`;
                          })()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Discount Note
                  </label>
                  <input
                    type="text"
                    value={subDiscountNote}
                    onChange={(e) => setSubDiscountNote(e.target.value)}
                    placeholder="e.g. Early adopter discount, partner deal..."
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    setSavingTier(true);
                    setSavedTier(false);
                    try {
                      const res = await fetch(`/api/admin/roasters/${roasterId}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          sales_tier: subSalesTier,
                          marketing_tier: subMarketingTier,
                          tier_override_reason: subOverrideReason || null,
                          sales_discount_percent: subSalesDiscount,
                          marketing_discount_percent: subMarketingDiscount,
                          discount_note: subDiscountNote || null,
                          website_subscription_active: subWebsiteActive,
                          website_discount_percent: subWebsiteDiscount,
                        }),
                      });
                      if (res.ok) {
                        setSavedTier(true);
                        setTimeout(() => setSavedTier(false), 3000);
                        const reloadRes = await fetch(`/api/admin/roasters/${roasterId}`);
                        if (reloadRes.ok) {
                          const data = await reloadRes.json();
                          setRoaster(data.roaster);
                          setStats(data.stats);
                        }
                        setUsageData(null);
                      }
                    } catch (err) {
                      console.error("Failed to save tiers:", err);
                    }
                    setSavingTier(false);
                  }}
                  disabled={savingTier}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingTier ? "Saving..." : "Save Tiers"}
                </button>
                {savedTier && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    Saved
                  </span>
                )}
              </div>
              {roaster?.tier_changed_at && (
                <p className="text-xs text-slate-400">
                  {`Last changed: ${formatDateTime(roaster.tier_changed_at)}`}
                  {roaster.discount_note && ` \u2014 ${roaster.discount_note}`}
                </p>
              )}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  {`Card payment fees: ${subSalesTier === "free" ? "5% + 20p" : "2% + 20p"} (derived from Sales tier)`}
                </p>
              </div>
            </div>
          </div>

          {/* AI Credit Top-up */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-slate-400" />
                AI Credits
              </h3>
            </div>
            <div className="p-4 space-y-4">
              {!aiCreditsData && !loadingAiCredits ? (
                <button
                  onClick={async () => {
                    setLoadingAiCredits(true);
                    try {
                      const res = await fetch(`/api/admin/roasters/${roasterId}/ai-credits`);
                      if (res.ok) setAiCreditsData(await res.json());
                    } catch (err) {
                      console.error(err);
                    }
                    setLoadingAiCredits(false);
                  }}
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                >
                  Load AI credit details
                </button>
              ) : loadingAiCredits ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                </div>
              ) : aiCreditsData ? (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-500">Monthly Allocation</p>
                      <p className="text-lg font-semibold text-slate-900">{aiCreditsData.monthlyAllocation === Infinity ? "∞" : aiCreditsData.monthlyAllocation}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-500">Used This Month</p>
                      <p className="text-lg font-semibold text-slate-900">{aiCreditsData.monthlyUsed}</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-amber-600">Top-up Balance</p>
                      <p className="text-lg font-semibold text-amber-700">{aiCreditsData.topupBalance}</p>
                    </div>
                  </div>

                  {/* Grant Credits */}
                  <div className="border-t border-slate-100 pt-3">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Grant Top-up Credits</h4>
                    <div className="flex items-end gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Credits</label>
                        <input
                          type="number"
                          min={1}
                          max={10000}
                          value={topupAmount}
                          onChange={(e) => setTopupAmount(Math.max(1, Number(e.target.value) || 0))}
                          className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-slate-500 mb-1">Reason</label>
                        <input
                          type="text"
                          value={topupReason}
                          onChange={(e) => setTopupReason(e.target.value)}
                          placeholder="e.g. Compensation, testing, promo..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <button
                        onClick={async () => {
                          setGrantingCredits(true);
                          try {
                            const res = await fetch(`/api/admin/roasters/${roasterId}/ai-credits`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ credits: topupAmount, reason: topupReason || null }),
                            });
                            if (res.ok) {
                              const data = await res.json();
                              setAiCreditsData((prev) => prev ? { ...prev, topupBalance: data.newBalance } : prev);
                              setTopupReason("");
                              // Reload ledger
                              const ledgerRes = await fetch(`/api/admin/roasters/${roasterId}/ai-credits`);
                              if (ledgerRes.ok) setAiCreditsData(await ledgerRes.json());
                            }
                          } catch (err) {
                            console.error(err);
                          }
                          setGrantingCredits(false);
                        }}
                        disabled={grantingCredits || topupAmount < 1}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        {grantingCredits ? "Granting..." : "Grant"}
                      </button>
                    </div>
                  </div>

                  {/* Ledger */}
                  {aiCreditsData.ledger.length > 0 && (
                    <div className="border-t border-slate-100 pt-3">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Recent Activity</h4>
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                              <th className="text-left text-xs font-medium text-slate-500 uppercase px-3 py-1.5">Type</th>
                              <th className="text-right text-xs font-medium text-slate-500 uppercase px-3 py-1.5">Credits</th>
                              <th className="text-left text-xs font-medium text-slate-500 uppercase px-3 py-1.5">Reason</th>
                              <th className="text-left text-xs font-medium text-slate-500 uppercase px-3 py-1.5">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {aiCreditsData.ledger.map((entry) => (
                              <tr key={entry.id}>
                                <td className="px-3 py-1.5 text-slate-700">
                                  {entry.source === "topup_admin" ? "Admin Grant" : entry.source === "topup_purchase" ? "Purchase" : AI_ACTION_LABELS[entry.action_type as AiActionType] || entry.action_type}
                                </td>
                                <td className={`px-3 py-1.5 text-right font-medium ${entry.credits_used < 0 ? "text-green-600" : "text-slate-700"}`}>
                                  {entry.credits_used < 0 ? `+${Math.abs(entry.credits_used)}` : `-${entry.credits_used}`}
                                </td>
                                <td className="px-3 py-1.5 text-slate-500 truncate max-w-[200px]">{entry.reason || "—"}</td>
                                <td className="px-3 py-1.5 text-slate-400 whitespace-nowrap">{formatDateTime(entry.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>

          {/* Usage Stats */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-400" />
                Usage Stats
              </h3>
            </div>
            <div className="p-4">
              {loadingUsage ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                </div>
              ) : usageData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Object.entries(usageData) as [string, { current: number; limit: number }][]).map(([key, data]) => (
                    <UsageBar
                      key={key}
                      label={LIMIT_LABELS[key as LimitKey] || key}
                      current={data.current}
                      limit={data.limit}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No usage data available.</p>
              )}
            </div>
          </div>

          {/* Subscription Events */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-400" />
                Subscription Events
              </h3>
            </div>
            <div className="p-4">
              {!subscriptionEvents.length && !loadingSubEvents ? (
                <button
                  onClick={async () => {
                    setLoadingSubEvents(true);
                    try {
                      const res = await fetch(`/api/admin/roasters/${roasterId}/subscription-events`);
                      if (res.ok) {
                        const data = await res.json();
                        setSubscriptionEvents(data.events || []);
                      }
                    } catch (err) {
                      console.error(err);
                    }
                    setLoadingSubEvents(false);
                  }}
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                >
                  Load subscription events
                </button>
              ) : loadingSubEvents ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                </div>
              ) : subscriptionEvents.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">No subscription events yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2">Event</th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2">Product</th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2">Change</th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {subscriptionEvents.map((evt) => (
                        <tr key={evt.id}>
                          <td className="px-4 py-2 text-sm text-slate-700">{evt.event_type}</td>
                          <td className="px-4 py-2 text-sm text-slate-600">{evt.product_type || "\u2014"}</td>
                          <td className="px-4 py-2 text-sm">
                            {evt.previous_tier && evt.new_tier ? (
                              <span className="flex items-center gap-1.5">
                                <TierBadge status={evt.previous_tier} type="subscriptionTier" />
                                <ChevronRight className="w-3 h-3 text-slate-400" />
                                <TierBadge status={evt.new_tier} type="subscriptionTier" />
                              </span>
                            ) : (
                              "\u2014"
                            )}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-500">{formatDate(evt.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-slate-400" />
              {`Orders (${ordersTotal})`}
            </h3>
          </div>
          {loadingOrders ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No orders yet</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        Order ID
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        Customer
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        Items
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        Total
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        Status
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() =>
                          router.push(`/admin/orders/${order.id}`)
                        }
                      >
                        <td className="px-4 py-3">
                          <span className="text-sm font-mono text-slate-900">
                            {order.id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">
                            {order.buyer_name ||
                              order.customer_name ||
                              "\u2014"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">
                            {Array.isArray(order.items)
                              ? order.items.length
                              : 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-slate-900">
                            {formatCurrency(order.total || order.subtotal)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              ORDER_STATUS_COLORS[order.status] ||
                              "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500">
                            {formatDate(order.created_at)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {ordersTotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <span className="text-sm text-slate-500">
                    {`Showing ${(ordersPage - 1) * 20 + 1}\u2013${Math.min(ordersPage * 20, ordersTotal)} of ${ordersTotal}`}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        setOrdersPage((p) => Math.max(1, p - 1))
                      }
                      disabled={ordersPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        setOrdersPage((p) =>
                          Math.min(ordersTotalPages, p + 1)
                        )
                      }
                      disabled={ordersPage === ordersTotalPages}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Products Tab */}
      {activeTab === "products" && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-400" />
              Products
            </h3>
          </div>
          <div className="text-center py-16">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              Product management coming soon.
            </p>
          </div>
        </div>
      )}

      {/* Storefront Tab */}
      {activeTab === "storefront" && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Store className="w-4 h-4 text-slate-400" />
              Storefront Configuration
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">
                  Storefront Enabled
                </p>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    roaster.storefront_enabled
                      ? "bg-green-50 text-green-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {roaster.storefront_enabled ? "Yes" : "No"}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">
                  Storefront Slug
                </p>
                <p className="text-sm text-slate-700">
                  {roaster.storefront_slug ? (
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono bg-slate-50 px-2 py-0.5 rounded text-xs">
                        {roaster.storefront_slug}
                      </span>
                      {roaster.storefront_enabled && (
                        <a
                          href={`/store/${roaster.storefront_slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-600 hover:text-brand-700"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </span>
                  ) : (
                    "\u2014"
                  )}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-slate-400 mb-1">Brand Tagline</p>
                <p className="text-sm text-slate-700">
                  {roaster.brand_tagline || "\u2014"}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-slate-400 mb-1">About</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {roaster.brand_about || "\u2014"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Financial Tab */}
      {activeTab === "financial" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-400" />
                Stripe Integration
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">
                    Stripe Account ID
                  </p>
                  {roaster.stripe_account_id ? (
                    <span className="text-sm font-mono text-slate-700 bg-slate-50 px-2 py-0.5 rounded">
                      {roaster.stripe_account_id}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      Not connected
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">
                    Onboarding Complete
                  </p>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      roaster.stripe_onboarding_complete
                        ? "bg-green-50 text-green-700"
                        : "bg-yellow-50 text-yellow-700"
                    }`}
                  >
                    {roaster.stripe_onboarding_complete
                      ? "Complete"
                      : "Incomplete"}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">
                    Platform Fee
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    None
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                Payment History
              </h3>
            </div>
            <div className="text-center py-16">
              <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                Payment history coming soon.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Activity Log Tab */}
      {activeTab === "activity" && (
        <div className="space-y-4">
          {/* Add Note Form */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-slate-400" />
              Add Note
            </h3>
            <div className="flex gap-3">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Write a note about this roaster..."
                rows={3}
                className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                onClick={handleAddNote}
                disabled={addingNote || !noteContent.trim()}
                className="self-end px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {addingNote ? "Adding..." : "Add Note"}
              </button>
            </div>
          </div>

          {/* Full Timeline */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-400" />
                Activity Timeline
              </h3>
            </div>
            {loadingFullActivity ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              </div>
            ) : fullActivity.length === 0 ? (
              <div className="text-center py-16">
                <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No activity yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {fullActivity.map((item) => {
                  const Icon =
                    ACTIVITY_ICONS[item.activity_type] || Activity;
                  const isNote = item.activity_type === "note_added";
                  return (
                    <div key={item.id} className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isNote
                              ? "bg-amber-50 text-amber-600"
                              : item.activity_type === "strike_added"
                                ? "bg-red-50 text-red-600"
                                : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {isNote ? (
                            <div className="bg-amber-50/50 rounded-lg px-3 py-2 border border-amber-100">
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                {item.description}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-600">
                              {item.description}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 mt-1">
                            {formatDateTime(item.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper Components ───

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-slate-400" />
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <p className="text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function FormField({
  label,
  value,
  editing,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (value: string) => void;
  type?: string;
}) {
  if (!editing) {
    return (
      <div>
        <p className="text-xs text-slate-400 mb-1">{label}</p>
        <p className="text-sm text-slate-700">{value || "\u2014"}</p>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </div>
  );
}

// ─── Helpers ───

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number) {
  return `\u00A3${Number(amount || 0).toFixed(2)}`;
}
