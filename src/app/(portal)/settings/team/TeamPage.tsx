"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Shield,
  ShieldCheck,
  Crown,
  MoreHorizontal,
  Send,
  X,
  Clock,
  Mail,
} from "lucide-react";
import { SettingsHeader } from "@/components/SettingsHeader";

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  email: string;
  name: string;
  is_current_user: boolean;
}

interface TeamInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export function TeamPage({ currentUserId }: { currentUserId: string }) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "staff">("staff");
  const [sending, setSending] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  // Action menu
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Confirm dialog
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    action: "remove" | "role_change";
    label: string;
    newRole?: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/team");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
        setInvites(data.invites);
      }
    } catch (err) {
      console.error("Failed to load team:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleInvite() {
    if (!inviteEmail.includes("@")) return;
    setSending(true);
    setError(null);
    setInviteSent(false);

    try {
      const res = await fetch("/api/settings/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (res.ok) {
        setInviteSent(true);
        setInviteEmail("");
        setTimeout(() => setInviteSent(false), 3000);
        loadData();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to send invite");
      }
    } catch {
      setError("Failed to send invite");
    }
    setSending(false);
  }

  async function handleChangeRole(memberId: string, newRole: string) {
    try {
      const res = await fetch(`/api/settings/team/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        loadData();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update role");
      }
    } catch {
      setError("Failed to update role");
    }
    setConfirmAction(null);
    setActiveMenu(null);
  }

  async function handleRemove(id: string) {
    try {
      const res = await fetch(`/api/settings/team/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadData();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to remove");
      }
    } catch {
      setError("Failed to remove member");
    }
    setConfirmAction(null);
    setActiveMenu(null);
  }

  async function handleCancelInvite(id: string) {
    try {
      const res = await fetch(`/api/settings/team/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadData();
      }
    } catch {
      setError("Failed to cancel invite");
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function getRoleIcon(role: string) {
    switch (role) {
      case "owner":
        return <Crown className="w-4 h-4 text-amber-500" />;
      case "admin":
        return <ShieldCheck className="w-4 h-4 text-blue-500" />;
      default:
        return <Shield className="w-4 h-4 text-slate-400" />;
    }
  }

  function getRoleBadge(role: string) {
    const config: Record<string, { label: string; className: string }> = {
      owner: { label: "Owner", className: "bg-amber-50 text-amber-700" },
      admin: { label: "Admin", className: "bg-blue-50 text-blue-700" },
      staff: { label: "Staff", className: "bg-slate-100 text-slate-600" },
    };
    const c = config[role] || config.staff;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}>
        {getRoleIcon(role)}
        {c.label}
      </span>
    );
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="text-slate-500 mt-1">Manage team members and roles.</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <SettingsHeader
        title="Team"
        description="Manage team members and roles."
        breadcrumb="Team"
      />

      <div className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ─── Section 1: Current Team ─── */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Team Members</h2>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {members.map((member) => (
              <div
                key={member.id}
                className="px-6 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-slate-600">
                      {(member.name || member.email)[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {member.name}
                      </p>
                      {member.is_current_user && (
                        <span className="text-xs text-slate-400">(you)</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getRoleBadge(member.role)}
                  <span className="text-xs text-slate-400 hidden sm:block">
                    {formatDate(member.joined_at)}
                  </span>
                  {!member.is_current_user && member.role !== "owner" && (
                    <div className="relative">
                      <button
                        onClick={() =>
                          setActiveMenu(activeMenu === member.id ? null : member.id)
                        }
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {activeMenu === member.id && (
                        <div className="absolute right-0 top-8 bg-white rounded-lg border border-slate-200 shadow-lg py-1 w-44 z-10">
                          <button
                            onClick={() =>
                              setConfirmAction({
                                id: member.id,
                                action: "role_change",
                                label: `Change to ${member.role === "admin" ? "Staff" : "Admin"}`,
                                newRole: member.role === "admin" ? "staff" : "admin",
                              })
                            }
                            className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                          >
                            {`Change to ${member.role === "admin" ? "Staff" : "Admin"}`}
                          </button>
                          <button
                            onClick={() =>
                              setConfirmAction({
                                id: member.id,
                                action: "remove",
                                label: `Remove ${member.name || member.email}`,
                              })
                            }
                            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                          >
                            Remove from team
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pending invites */}
          {invites.length > 0 && (
            <>
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Pending Invites
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="px-6 py-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-700">{invite.email}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-slate-400">
                            {`Invited ${formatDate(invite.created_at)}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getRoleBadge(invite.role)}
                      <button
                        onClick={() => handleCancelInvite(invite.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ─── Section 2: Invite ─── */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Invite Team Member</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
              <div className="flex-1">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "admin" | "staff")}
                className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={handleInvite}
                disabled={sending || !inviteEmail.includes("@")}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {sending ? "Sending..." : "Send Invite"}
              </button>
            </div>
            {inviteSent && (
              <p className="text-sm text-green-600 flex items-center gap-1 mt-3">
                <CheckCircle2 className="w-4 h-4" />
                Invite sent successfully
              </p>
            )}
          </div>
        </section>

        {/* ─── Section 3: Roles Explanation ─── */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Roles & Permissions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <h4 className="text-sm font-semibold text-slate-900">Owner</h4>
                </div>
                <ul className="text-xs text-slate-500 space-y-1">
                  <li>Full access to everything</li>
                  <li>Billing & payment settings</li>
                  <li>Team management</li>
                  <li>Account deletion</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                  <h4 className="text-sm font-semibold text-slate-900">Admin</h4>
                </div>
                <ul className="text-xs text-slate-500 space-y-1">
                  <li>Full access to everything</li>
                  <li>Except billing settings</li>
                  <li>Except team management</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-slate-400" />
                  <h4 className="text-sm font-semibold text-slate-900">Staff</h4>
                </div>
                <ul className="text-xs text-slate-500 space-y-1">
                  <li>Orders management</li>
                  <li>Products management</li>
                  <li>Contacts management</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Confirm Action Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {confirmAction.action === "remove" ? "Remove Team Member" : "Change Role"}
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              {confirmAction.action === "remove"
                ? `Are you sure you want to remove this person from your team? They will lose access to the portal immediately.`
                : `${confirmAction.label}? This will change their access level.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setConfirmAction(null);
                  setActiveMenu(null);
                }}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction.action === "remove") {
                    handleRemove(confirmAction.id);
                  } else if (confirmAction.newRole) {
                    handleChangeRole(confirmAction.id, confirmAction.newRole);
                  }
                }}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                  confirmAction.action === "remove"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-brand-600 hover:bg-brand-700"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
