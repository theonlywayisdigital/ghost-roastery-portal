"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Search,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileEdit,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreHorizontal,
  Trash2,
  Copy,
  Eye,
  X,
} from "lucide-react";
import type { Campaign, CampaignsListResponse } from "@/types/marketing";
import { useMarketingContext } from "@/lib/marketing-context";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "scheduled", label: "Scheduled" },
  { id: "sent", label: "Sent" },
] as const;

type StatusTab = (typeof STATUS_TABS)[number]["id"];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  scheduled: "bg-blue-50 text-blue-700",
  sending: "bg-amber-50 text-amber-700",
  sent: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-600",
};

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  draft: FileEdit,
  scheduled: Clock,
  sending: Loader2,
  sent: CheckCircle,
  failed: AlertCircle,
};

export function CampaignsList() {
  const router = useRouter();
  const { apiBase, pageBase } = useMarketingContext();
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [counts, setCounts] = useState({ all: 0, draft: 0, scheduled: 0, sent: 0 });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      sort: sortField,
      order: sortOrder,
    });
    if (activeTab !== "all") params.set("status", activeTab);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`${apiBase}/campaigns?${params}`);
      if (res.ok) {
        const data: CampaignsListResponse = await res.json();
        setCampaigns(data.campaigns);
        setTotal(data.total);
        setCounts(data.counts);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to load campaigns.");
      }
    } catch (err) {
      console.error("Failed to load campaigns:", err);
      setError("Failed to load campaigns. Please check your connection.");
    }
    setLoading(false);
  }, [page, sortField, sortOrder, activeTab, search]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search]);

  function handleSort(field: string) {
    if (sortField === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  }

  async function handleNewCampaign() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled Campaign" }),
      });
      if (res.ok) {
        const { campaign } = await res.json();
        router.push(`${pageBase}/campaigns/${campaign.id}/edit`);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create campaign. Please try again.");
        setCreating(false);
      }
    } catch (err) {
      console.error("Failed to create campaign:", err);
      setError("Failed to create campaign. Please check your connection.");
      setCreating(false);
    }
  }

  async function handleDuplicate(id: string) {
    setMenuOpen(null);
    try {
      const res = await fetch(`${apiBase}/campaigns/${id}`);
      if (!res.ok) return;
      const { campaign } = await res.json();

      const dupeRes = await fetch(`${apiBase}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${campaign.name} (copy)`,
          subject: campaign.subject,
          preview_text: campaign.preview_text,
          from_name: campaign.from_name,
          reply_to: campaign.reply_to,
          content: campaign.content,
          template_id: campaign.template_id,
          audience_type: campaign.audience_type,
          audience_filter: campaign.audience_filter,
        }),
      });
      if (dupeRes.ok) loadCampaigns();
    } catch (err) {
      console.error("Failed to duplicate:", err);
    }
  }

  async function handleDelete(id: string) {
    setMenuOpen(null);
    if (!confirm("Delete this campaign? This cannot be undone.")) return;
    try {
      const res = await fetch(`${apiBase}/campaigns/${id}`, { method: "DELETE" });
      if (res.ok) loadCampaigns();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-sm">
            Create and manage email campaigns to engage your customers.
          </p>
        </div>
        <button
          onClick={handleNewCampaign}
          disabled={creating}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {creating ? "Creating..." : "New Campaign"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = counts[tab.id as keyof typeof counts] || 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                isActive
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              {`${tab.label}${count > 0 ? ` (${count})` : ""}`}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            className="w-full pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-visible">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16">
            <Send className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-900 mb-1">No campaigns yet</p>
            <p className="text-sm text-slate-500 mb-4">
              {search ? "No campaigns matching your search." : "Create your first email campaign to get started."}
            </p>
            {!search && (
              <button
                onClick={handleNewCampaign}
                disabled={creating}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {creating ? "Creating..." : "New Campaign"}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <SortableHeader label="Campaign" field="name" current={sortField} order={sortOrder} onSort={handleSort} />
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Status
                    </th>
                    <SortableHeader label="Subject" field="subject" current={sortField} order={sortOrder} onSort={handleSort} className="hidden md:table-cell" />
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                      Recipients
                    </th>
                    <SortableHeader label="Updated" field="updated_at" current={sortField} order={sortOrder} onSort={handleSort} className="hidden md:table-cell" />
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 w-10">
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {campaigns.map((campaign) => {
                    const StatusIcon = STATUS_ICONS[campaign.status] || FileEdit;
                    return (
                      <tr
                        key={campaign.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => {
                          if (campaign.status === "sent") {
                            router.push(`${pageBase}/campaigns/${campaign.id}/report`);
                          } else {
                            router.push(`${pageBase}/campaigns/${campaign.id}/edit`);
                          }
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0">
                              <Send className="w-4 h-4" />
                            </div>
                            <p className="text-sm font-medium text-slate-900">
                              {campaign.name}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[campaign.status] || "bg-slate-100 text-slate-600"}`}>
                            <StatusIcon className="w-3 h-3" />
                            {campaign.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-sm text-slate-600 truncate max-w-[200px] block">
                            {campaign.subject || "\u2014"}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-sm text-slate-600">
                            {campaign.recipient_count || "\u2014"}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs text-slate-500">
                            {formatDate(campaign.updated_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpen(menuOpen === campaign.id ? null : campaign.id);
                              }}
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {menuOpen === campaign.id && (
                              <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 w-36">
                                {campaign.status === "sent" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMenuOpen(null);
                                      router.push(`${pageBase}/campaigns/${campaign.id}/report`);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    View Report
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicate(campaign.id);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  Duplicate
                                </button>
                                {campaign.status === "draft" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(campaign.id);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <span className="text-sm text-slate-500">
                  {`Showing ${(page - 1) * 20 + 1}\u2013${Math.min(page * 20, total)} of ${total}`}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
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
    </div>
  );
}

function SortableHeader({
  label,
  field,
  current,
  order,
  onSort,
  className = "",
}: {
  label: string;
  field: string;
  current: string;
  order: "asc" | "desc";
  onSort: (field: string) => void;
  className?: string;
}) {
  const isActive = current === field;
  return (
    <th
      className={`text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-slate-700 select-none ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${isActive ? "text-brand-600" : "text-slate-300"}`} />
        {isActive && (
          <span className="text-brand-600">{order === "asc" ? "\u2191" : "\u2193"}</span>
        )}
      </div>
    </th>
  );
}
