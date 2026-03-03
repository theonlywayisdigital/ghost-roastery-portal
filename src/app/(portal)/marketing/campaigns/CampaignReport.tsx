"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Send,
  Eye,
  MousePointerClick,
  AlertTriangle,
  Ban,
  Users,
  Search,
  ExternalLink,
  CheckCircle,
} from "lucide-react";
import type { CampaignReportResponse, CampaignRecipient } from "@/types/marketing";
import { useMarketingContext } from "@/lib/marketing-context";

const STAT_CONFIGS = [
  { key: "total", label: "Recipients", icon: Users, color: "text-slate-600 bg-slate-50" },
  { key: "delivered", label: "Delivered", icon: CheckCircle, color: "text-green-600 bg-green-50" },
  { key: "opened", label: "Opened", icon: Eye, color: "text-blue-600 bg-blue-50" },
  { key: "clicked", label: "Clicked", icon: MousePointerClick, color: "text-purple-600 bg-purple-50" },
  { key: "bounced", label: "Bounced", icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
  { key: "complained", label: "Complaints", icon: Ban, color: "text-red-600 bg-red-50" },
] as const;

const RECIPIENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600",
  sent: "bg-blue-50 text-blue-700",
  delivered: "bg-green-50 text-green-700",
  opened: "bg-indigo-50 text-indigo-700",
  clicked: "bg-purple-50 text-purple-700",
  bounced: "bg-amber-50 text-amber-700",
  complained: "bg-red-50 text-red-700",
  failed: "bg-red-50 text-red-600",
};

export function CampaignReport({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const { apiBase, pageBase } = useMarketingContext();
  const [data, setData] = useState<CampaignReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientFilter, setRecipientFilter] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${apiBase}/campaigns/${campaignId}/report`);
        if (res.ok) {
          setData(await res.json());
        } else {
          router.replace(`${pageBase}/campaigns`);
        }
      } catch {
        router.replace(`${pageBase}/campaigns`);
      }
      setLoading(false);
    }
    load();
  }, [campaignId, router]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  const { campaign, stats, recipients, links } = data;

  const filteredRecipients = recipients.filter((r) => {
    if (recipientSearch && !r.email.toLowerCase().includes(recipientSearch.toLowerCase())) {
      return false;
    }
    if (recipientFilter && r.status !== recipientFilter) return false;
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push(`${pageBase}/campaigns`)}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{campaign.name}</h2>
          <p className="text-xs text-slate-500">
            {campaign.subject} — Sent {campaign.sent_at ? formatDate(campaign.sent_at) : ""}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {STAT_CONFIGS.map((conf) => {
          const Icon = conf.icon;
          const value = stats[conf.key as keyof typeof stats];
          return (
            <div
              key={conf.key}
              className="bg-white rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${conf.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500">{conf.label}</p>
            </div>
          );
        })}
      </div>

      {/* Rate Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <RateCard label="Open Rate" value={stats.open_rate} />
        <RateCard label="Click Rate" value={stats.click_rate} />
        <RateCard label="Bounce Rate" value={stats.bounce_rate} warn={stats.bounce_rate > 5} />
      </div>

      {/* Link Clicks */}
      {links.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Link Performance</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-2">URL</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider py-2">Clicks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {links.map((link) => (
                <tr key={link.id}>
                  <td className="py-2">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1 truncate max-w-[400px]"
                    >
                      {link.url}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </td>
                  <td className="py-2 text-right">
                    <span className="text-sm font-medium text-slate-900">{link.click_count}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recipients Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Recipients</h3>
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                placeholder="Search by email..."
                className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <select
              value={recipientFilter}
              onChange={(e) => setRecipientFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All statuses</option>
              <option value="delivered">Delivered</option>
              <option value="opened">Opened</option>
              <option value="clicked">Clicked</option>
              <option value="bounced">Bounced</option>
              <option value="complained">Complained</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                  Email
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                  Sent
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                  Opened
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                  Clicked
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecipients.slice(0, 100).map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-900">{r.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${RECIPIENT_STATUS_COLORS[r.status] || "bg-slate-100 text-slate-600"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">
                    {formatDate(r.sent_at)}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">
                    {formatDate(r.opened_at)}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">
                    {formatDate(r.clicked_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRecipients.length > 100 && (
          <div className="px-4 py-3 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Showing 100 of {filteredRecipients.length} recipients
            </p>
          </div>
        )}

        {filteredRecipients.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">No recipients found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RateCard({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  // CSS-only bar
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${warn ? "text-amber-600" : "text-slate-900"}`}>{value}%</p>
      <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${warn ? "bg-amber-500" : "bg-brand-600"}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
