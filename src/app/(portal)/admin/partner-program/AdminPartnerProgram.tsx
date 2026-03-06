"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  FileText,
  Globe,
  Loader2,
  AlertTriangle,
  Search,
  Check,
  X,
  Clock,
  Eye,
  ChevronRight,
} from "@/components/icons";

// ── Types ──

interface Partner {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  country: string;
  city: string | null;
  is_active: boolean;
  is_verified: boolean;
  ghost_roaster_approved_at: string | null;
  territories: string[];
  bag_sizes: string[];
  active_orders: number;
  total_fulfilled: number;
  sla_compliance: number | null;
}

interface Application {
  id: string;
  roaster_id: string;
  roaster_name: string;
  status: string;
  applied_at: string;
  reviewed_at: string | null;
  proposed_countries: string[];
  application_notes: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
}

interface Territory {
  id: string;
  roaster_id: string;
  country_code: string;
  country_name: string;
  region: string | null;
  is_active: boolean;
  assigned_at: string;
}

// ── Tab config ──

type Tab = "partners" | "applications" | "territories";

const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: "partners", label: "Partners", icon: Users },
  { key: "applications", label: "Applications", icon: FileText },
  { key: "territories", label: "Territory Map", icon: Globe },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  under_review: "bg-blue-50 text-blue-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  withdrawn: "bg-slate-100 text-slate-600",
};

// ── Main Component ──

export function AdminPartnerProgram() {
  const [activeTab, setActiveTab] = useState<Tab>("partners");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPartners = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/partners");
      if (!res.ok) throw new Error("Failed to fetch partners");
      const data = await res.json();
      setPartners(data.partners || []);
    } catch {
      setError("Failed to load partners");
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/partner-applications");
      if (!res.ok) throw new Error("Failed to fetch applications");
      const data = await res.json();
      setApplications(data.applications || []);
    } catch {
      // Silent
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPartners(), fetchApplications()]).finally(() => setLoading(false));
  }, [fetchPartners, fetchApplications]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-500">Loading partner program...</span>
      </div>
    );
  }

  const pendingCount = applications.filter((a) => a.status === "pending" || a.status === "under_review").length;

  return (
    <div className="p-6 md:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Partner Program</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage fulfilment partners, territories, and applications.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.key === "applications" && pendingCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "partners" && (
        <PartnersTab partners={partners} />
      )}
      {activeTab === "applications" && (
        <ApplicationsTab
          applications={applications}
          onRefresh={async () => {
            await Promise.all([fetchPartners(), fetchApplications()]);
          }}
        />
      )}
      {activeTab === "territories" && (
        <TerritoriesTab partners={partners} onRefresh={fetchPartners} />
      )}
    </div>
  );
}

// ── Partners Tab ──

function PartnersTab({ partners }: { partners: Partner[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = partners.filter((p) => {
    if (search && !p.business_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === "active" && !p.is_active) return false;
    if (statusFilter === "inactive" && p.is_active) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search partners..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Partner</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Location</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Territories</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Bag Sizes</th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Active</th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Fulfilled</th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">SLA</th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                  {partners.length === 0
                    ? "No partners yet. Approve an application to get started."
                    : "No partners match your filters."}
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/partner-program/${p.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                      {p.business_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {[p.city, p.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {p.territories.length > 0 ? (
                      <span className="text-sm text-slate-700">{p.territories.join(", ")}</span>
                    ) : (
                      <span className="text-sm text-slate-400">None assigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.bag_sizes.length > 0 ? (
                      <div className="flex gap-1">
                        {p.bag_sizes.map((s) => (
                          <span key={s} className="px-1.5 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">No rates</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-700">{p.active_orders}</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-700">{p.total_fulfilled}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    {p.sla_compliance !== null ? (
                      <span className={p.sla_compliance >= 90 ? "text-green-700" : p.sla_compliance >= 70 ? "text-amber-700" : "text-red-700"}>
                        {p.sla_compliance}%
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      p.is_active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"
                    }`}>
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/partner-program/${p.id}`}>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Applications Tab ──

function ApplicationsTab({
  applications,
  onRefresh,
}: {
  applications: Application[];
  onRefresh: () => Promise<void>;
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const filtered = applications.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    return true;
  });

  async function handleAction(appId: string, status: "approved" | "rejected" | "under_review") {
    setProcessing(appId);
    try {
      const body: Record<string, string> = { status };
      if (status === "rejected") body.rejection_reason = rejectReason;
      if (adminNotes) body.admin_notes = adminNotes;

      const res = await fetch(`/api/admin/partner-applications/${appId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      setExpandedId(null);
      setRejectReason("");
      setAdminNotes("");
      await onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Roaster</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Applied</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Countries</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Reviewed</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                  No applications found.
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <ApplicationRow
                  key={a.id}
                  app={a}
                  expanded={expandedId === a.id}
                  onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
                  processing={processing === a.id}
                  rejectReason={rejectReason}
                  setRejectReason={setRejectReason}
                  adminNotes={adminNotes}
                  setAdminNotes={setAdminNotes}
                  onAction={(status) => handleAction(a.id, status)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApplicationRow({
  app,
  expanded,
  onToggle,
  processing,
  rejectReason,
  setRejectReason,
  adminNotes,
  setAdminNotes,
  onAction,
}: {
  app: Application;
  expanded: boolean;
  onToggle: () => void;
  processing: boolean;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  adminNotes: string;
  setAdminNotes: (v: string) => void;
  onAction: (status: "approved" | "rejected" | "under_review") => void;
}) {
  return (
    <>
      <tr className="hover:bg-slate-50 cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3 text-sm font-medium text-slate-900">{app.roaster_name}</td>
        <td className="px-4 py-3 text-sm text-slate-600">
          {new Date(app.applied_at).toLocaleDateString("en-GB")}
        </td>
        <td className="px-4 py-3 text-sm text-slate-600">
          {app.proposed_countries?.length > 0 ? app.proposed_countries.join(", ") : "—"}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[app.status] || "bg-slate-100 text-slate-600"}`}>
            {app.status.replace("_", " ")}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-slate-600">
          {app.reviewed_at ? new Date(app.reviewed_at).toLocaleDateString("en-GB") : "—"}
        </td>
        <td className="px-4 py-3 text-right">
          <Eye className="w-4 h-4 text-slate-400" />
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="px-4 py-4 bg-slate-50 border-t border-slate-100">
            <div className="space-y-4 max-w-2xl">
              {app.application_notes && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Application Notes</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{app.application_notes}</p>
                </div>
              )}
              {app.rejection_reason && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-700">{app.rejection_reason}</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Admin Notes</label>
                <textarea
                  value={adminNotes || app.admin_notes || ""}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-brand-500"
                  placeholder="Internal notes..."
                />
              </div>

              {(app.status === "pending" || app.status === "under_review") && (
                <div className="flex items-center gap-3">
                  {app.status === "pending" && (
                    <button
                      onClick={() => onAction("under_review")}
                      disabled={processing}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Mark Under Review
                    </button>
                  )}
                  <button
                    onClick={() => onAction("approved")}
                    disabled={processing}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Approve
                  </button>
                  <div className="flex-1" />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Rejection reason..."
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      onClick={() => onAction("rejected")}
                      disabled={processing || !rejectReason}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {app.status === "approved" && (
                <Link
                  href={`/admin/partner-program/${app.roaster_id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
                >
                  Set Up Partner
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Territories Tab ──

function TerritoriesTab({
  partners,
  onRefresh,
}: {
  partners: Partner[];
  onRefresh: () => Promise<void>;
}) {
  const [allTerritories, setAllTerritories] = useState<(Territory & { partner_name: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Build territory list from all partners' detail data
    async function loadTerritories() {
      setLoading(true);
      try {
        // Fetch all territories directly
        const res = await fetch("/api/admin/partners");
        if (!res.ok) throw new Error();
        // We already have partner data with territory names. For the territory map,
        // we need the full territory records. Let's fetch from individual partners.
        const territories: (Territory & { partner_name: string })[] = [];

        for (const p of partners) {
          if (p.territories.length > 0) {
            const detailRes = await fetch(`/api/admin/partners/${p.id}`);
            if (detailRes.ok) {
              const data = await detailRes.json();
              for (const t of data.territories || []) {
                territories.push({ ...t, partner_name: p.business_name });
              }
            }
          }
        }

        setAllTerritories(territories);
      } catch {
        // Ignore
      } finally {
        setLoading(false);
      }
    }

    loadTerritories();
  }, [partners]);

  const activeTerritories = allTerritories.filter((t) => t.is_active);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-500">Loading territories...</span>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Territory Assignments</h2>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Country</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Region</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Partner</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Assigned</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activeTerritories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                  No territories assigned yet. Open a partner detail page to assign territories.
                </td>
              </tr>
            ) : (
              activeTerritories.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{t.country_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{t.region || "— (all)"}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/partner-program/${t.roaster_id}`}
                      className="text-sm text-brand-700 hover:underline"
                    >
                      {t.partner_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {new Date(t.assigned_at).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      t.is_active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"
                    }`}>
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Countries without a partner assignment default to head office fulfilment.
        Assign territories from each partner&apos;s detail page.
      </p>
    </div>
  );
}
