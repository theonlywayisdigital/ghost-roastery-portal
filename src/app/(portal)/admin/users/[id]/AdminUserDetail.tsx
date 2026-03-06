"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  Calendar,
  Clock,
  Shield,
  Building2,
  Contact,
  Activity,
  AlertTriangle,
  Ban,
  RefreshCw,
  Key,
  Send,
  Trash2,
  X,
  Save,
} from "@/components/icons";

// ─── Types ───

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  auth_status: string;
  associated_roaster: { id: string; business_name: string } | null;
  people_id: string | null;
  last_login_at: string | null;
  created_at: string;
}

interface ContactRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  contact_type: string | null;
  owner_type: string;
  status: string;
  business_name: string | null;
}

interface RoleRow {
  role_id: string;
}

interface ActivityItem {
  id: string;
  action: string;
  description: string;
  performed_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── Constants ───

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-50 text-red-700",
  roaster_owner: "bg-orange-50 text-orange-700",
  roaster_staff: "bg-amber-50 text-amber-700",
  customer: "bg-blue-50 text-blue-700",
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  roaster_owner: "Roaster Owner",
  roaster_staff: "Roaster Staff",
  customer: "Customer",
};

const AUTH_STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  invited: "bg-blue-50 text-blue-700",
  suspended: "bg-red-50 text-red-600",
  deactivated: "bg-slate-100 text-slate-500",
};

type TabId = "account" | "crm" | "associations" | "activity";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "account", label: "Account Info", icon: Shield },
  { id: "crm", label: "CRM Links", icon: Contact },
  { id: "associations", label: "Associations", icon: Building2 },
  { id: "activity", label: "Activity Log", icon: Activity },
];

export function AdminUserDetail({ userId }: { userId: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("account");
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUserData(data.user);
        setContacts(data.contacts || []);
        setRoles(data.roles || []);
      }
    } catch (err) {
      console.error("Failed to load user:", err);
    }
    setLoading(false);
  }, [userId]);

  const loadActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/activity`);
      if (res.ok) {
        const data = await res.json();
        setActivity(data.activity || []);
      }
    } catch (err) {
      console.error("Failed to load activity:", err);
    }
  }, [userId]);

  useEffect(() => {
    loadUser();
    loadActivity();
  }, [loadUser, loadActivity]);

  async function handleAction(action: string) {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      let endpoint = `/api/admin/users/${userId}/${action}`;
      if (action === "delete") {
        await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
        router.push("/admin/users");
        return;
      }
      await fetch(endpoint, { method: "POST" });
      loadUser();
      loadActivity();
    } catch (err) {
      console.error(`Action ${action} failed:`, err);
    }
    setActionLoading(false);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="text-center py-24">
        <p className="text-slate-500">User not found.</p>
        <Link href="/admin/users" className="text-brand-600 hover:underline text-sm mt-2 inline-block">
          Back to Users
        </Link>
      </div>
    );
  }

  const initials = (userData.full_name || userData.email || "?")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </Link>

        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-lg flex-shrink-0">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900">
              {userData.full_name || userData.email}
            </h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-sm text-slate-500">{userData.email}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                ROLE_COLORS[userData.role] || "bg-slate-100 text-slate-600"
              }`}>
                {ROLE_LABELS[userData.role] || userData.role}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                AUTH_STATUS_COLORS[userData.auth_status] || "bg-slate-100 text-slate-600"
              }`}>
                {userData.auth_status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Email</p>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-900 truncate">{userData.email}</span>
              </div>
            </div>
            {userData.phone && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Phone</p>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-900">{userData.phone}</span>
                </div>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Created</p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-900">{formatDate(userData.created_at)}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Last Login</p>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-900">{formatDate(userData.last_login_at)}</span>
              </div>
            </div>
            {userData.associated_roaster && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Roaster</p>
                <Link
                  href={`/admin/roasters/${userData.associated_roaster.id}`}
                  className="text-sm text-brand-600 hover:underline flex items-center gap-2"
                >
                  <Building2 className="w-4 h-4" />
                  {userData.associated_roaster.business_name}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-slate-200">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
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

          {/* Tab Content */}
          {activeTab === "account" && (
            <AccountTab
              user={userData}
              onAction={handleAction}
              actionLoading={actionLoading}
              showDeleteConfirm={showDeleteConfirm}
              setShowDeleteConfirm={setShowDeleteConfirm}
            />
          )}
          {activeTab === "crm" && (
            <CRMLinksTab contacts={contacts} />
          )}
          {activeTab === "associations" && (
            <AssociationsTab user={userData} roles={roles} />
          )}
          {activeTab === "activity" && (
            <ActivityTab activity={activity} formatDate={formatDate} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab Components ───

function AccountTab({
  user,
  onAction,
  actionLoading,
  showDeleteConfirm,
  setShowDeleteConfirm,
}: {
  user: UserData;
  onAction: (action: string) => void;
  actionLoading: boolean;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (v: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Info Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Account Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-400 mb-1">Full Name</p>
            <p className="text-sm text-slate-900">{user.full_name || "\u2014"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Email</p>
            <p className="text-sm text-slate-900">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Phone</p>
            <p className="text-sm text-slate-900">{user.phone || "\u2014"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Role</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              ROLE_COLORS[user.role] || "bg-slate-100 text-slate-600"
            }`}>
              {ROLE_LABELS[user.role] || user.role}
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Auth Status</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              AUTH_STATUS_COLORS[user.auth_status] || "bg-slate-100 text-slate-600"
            }`}>
              {user.auth_status}
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">People ID</p>
            <p className="text-sm text-slate-500 font-mono text-xs">{user.people_id || "\u2014"}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          {user.auth_status === "active" && (
            <button
              onClick={() => onAction("suspend")}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <Ban className="w-4 h-4" />
              Suspend User
            </button>
          )}
          {(user.auth_status === "suspended" || user.auth_status === "deactivated") && (
            <button
              onClick={() => onAction("reactivate")}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 border border-green-300 rounded-lg text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              Reactivate
            </button>
          )}
          <button
            onClick={() => onAction("reset-password")}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Key className="w-4 h-4" />
            Reset Password
          </button>
          {user.auth_status === "invited" && (
            <button
              onClick={() => onAction("resend-invite")}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Resend Invite
            </button>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Delete Account</h3>
                <p className="text-sm text-slate-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              {`Are you sure you want to permanently delete the account for ${user.email}? This will remove their auth account and profile data.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onAction("delete");
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CRMLinksTab({ contacts }: { contacts: ContactRow[] }) {
  const router = useRouter();

  const TYPE_COLORS: Record<string, string> = {
    customer: "bg-blue-50 text-blue-700",
    wholesale: "bg-purple-50 text-purple-700",
    supplier: "bg-amber-50 text-amber-700",
    lead: "bg-green-50 text-green-700",
    roaster: "bg-orange-50 text-orange-700",
    partner: "bg-teal-50 text-teal-700",
  };

  if (contacts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <Contact className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">No linked contacts found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900">
          {`Linked Contacts (${contacts.length})`}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">Contacts sharing the same person record</p>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Name</th>
            <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Email</th>
            <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Type</th>
            <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Owner</th>
            <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {contacts.map((c) => (
            <tr
              key={c.id}
              className="hover:bg-slate-50 cursor-pointer"
              onClick={() => router.push(`/admin/contacts/${c.id}`)}
            >
              <td className="px-4 py-3">
                <p className="text-sm font-medium text-slate-900">
                  {[c.first_name, c.last_name].filter(Boolean).join(" ") || "\u2014"}
                </p>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <span className="text-sm text-slate-600">{c.email || "\u2014"}</span>
              </td>
              <td className="px-4 py-3">
                {c.contact_type ? (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    TYPE_COLORS[c.contact_type] || "bg-slate-100 text-slate-600"
                  }`}>
                    {c.contact_type}
                  </span>
                ) : "\u2014"}
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <span className="text-xs text-slate-500">{c.owner_type}</span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  c.status === "active" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"
                }`}>
                  {c.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssociationsTab({ user, roles }: { user: UserData; roles: RoleRow[] }) {
  return (
    <div className="space-y-6">
      {/* Associated Roaster */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Associated Roaster</h3>
        {user.associated_roaster ? (
          <Link
            href={`/admin/roasters/${user.associated_roaster.id}`}
            className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Building2 className="w-8 h-8 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-900">{user.associated_roaster.business_name}</p>
              <p className="text-xs text-slate-500">Click to view roaster details</p>
            </div>
          </Link>
        ) : (
          <p className="text-sm text-slate-500">No associated roaster.</p>
        )}
      </div>

      {/* Roles */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Platform Roles</h3>
        {roles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <span
                key={r.role_id}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-700"
              >
                {r.role_id}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No roles assigned.</p>
        )}
      </div>
    </div>
  );
}

function ActivityTab({
  activity,
  formatDate,
}: {
  activity: ActivityItem[];
  formatDate: (d: string | null) => string;
}) {
  if (activity.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900">Activity Timeline</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {activity.map((item) => (
          <div key={item.id} className="px-4 py-3 flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-slate-300 mt-2 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-900">{item.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-400">{formatDate(item.created_at)}</span>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {item.action}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
