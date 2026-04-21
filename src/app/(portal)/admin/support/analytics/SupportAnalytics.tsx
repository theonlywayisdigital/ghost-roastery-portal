"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Ticket,
  Clock,
  Bot,
  Loader2,
} from "@/components/icons";

interface ArticleStat {
  id: string;
  title: string;
  slug: string;
  view_count: number;
  helpful_yes: number;
  helpful_no: number;
}

interface TicketBreakdown {
  type: string;
  count: number;
}

interface PriorityBreakdown {
  priority: string;
  count: number;
}

interface Stats {
  totalTickets: number;
  openTickets: number;
  avgResolutionHours: number;
  chatbotConversations: number;
  chatbotEscalated: number;
  topArticles: ArticleStat[];
  ticketsByType: TicketBreakdown[];
  ticketsByPriority: PriorityBreakdown[];
}

export function SupportAnalytics() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch multiple data sources in parallel
      const [articlesRes, ticketsRes, chatbotRes] = await Promise.all([
        fetch("/api/admin/support/kb/articles?pageSize=100&sort=view_count&order=desc"),
        fetch("/api/admin/support/tickets?pageSize=1000"),
        // We don't have a dedicated chatbot stats endpoint, so we'll count from the tickets data
        Promise.resolve(null),
      ]);

      let topArticles: ArticleStat[] = [];
      if (articlesRes.ok) {
        const data = await articlesRes.json();
        topArticles = (data.data || [])
          .filter((a: ArticleStat) => a.view_count > 0)
          .slice(0, 10)
          .map((a: ArticleStat) => ({
            id: a.id,
            title: a.title,
            slug: a.slug,
            view_count: a.view_count,
            helpful_yes: a.helpful_yes,
            helpful_no: a.helpful_no,
          }));
      }

      let totalTickets = 0;
      let openTickets = 0;
      let avgResolutionHours = 0;
      let ticketsByType: TicketBreakdown[] = [];
      let ticketsByPriority: PriorityBreakdown[] = [];

      if (ticketsRes.ok) {
        const data = await ticketsRes.json();
        totalTickets = data.total || 0;
        openTickets = data.stats?.open || 0;
        avgResolutionHours = data.stats?.avgResolutionHours || 0;

        // Count by type
        const typeMap: Record<string, number> = {};
        const priorityMap: Record<string, number> = {};
        for (const t of data.data || []) {
          typeMap[t.type] = (typeMap[t.type] || 0) + 1;
          priorityMap[t.priority] = (priorityMap[t.priority] || 0) + 1;
        }
        ticketsByType = Object.entries(typeMap)
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count);
        ticketsByPriority = Object.entries(priorityMap)
          .map(([priority, count]) => ({ priority, count }))
          .sort((a, b) => b.count - a.count);
      }

      setStats({
        totalTickets,
        openTickets,
        avgResolutionHours,
        chatbotConversations: 0,
        chatbotEscalated: 0,
        topArticles,
        ticketsByType,
        ticketsByPriority,
      });
    } catch (error) {
      console.error("Analytics fetch error:", error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Failed to load analytics.</p>
      </div>
    );
  }

  const TYPE_LABELS: Record<string, string> = {
    general: "General",
    order_issue: "Order Issue",
    billing: "Billing",
    technical: "Technical",
    dispute: "Dispute",
    payout: "Payout",
    platform: "Platform",
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Ticket}
          label="Total Tickets"
          value={stats.totalTickets}
          color="text-blue-600 bg-blue-50"
        />
        <StatCard
          icon={Ticket}
          label="Open Tickets"
          value={stats.openTickets}
          color="text-yellow-600 bg-yellow-50"
        />
        <StatCard
          icon={Clock}
          label="Avg Resolution"
          value={stats.avgResolutionHours ? `${stats.avgResolutionHours}h` : "—"}
          color="text-green-600 bg-green-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most viewed articles */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-slate-400" />
            Most Viewed Articles
          </h3>
          {stats.topArticles.length === 0 ? (
            <p className="text-sm text-slate-400">
              No article views yet.
            </p>
          ) : (
            <div className="space-y-3">
              {stats.topArticles.map((article, i) => (
                <div key={article.id} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-5 text-right tabular-nums">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">
                      {article.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Eye className="w-3 h-3" />
                      {article.view_count}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <ThumbsUp className="w-3 h-3" />
                      {article.helpful_yes}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      <ThumbsDown className="w-3 h-3" />
                      {article.helpful_no}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tickets by type */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Tickets by Type
          </h3>
          {stats.ticketsByType.length === 0 ? (
            <p className="text-sm text-slate-400">No tickets yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.ticketsByType.map((item) => {
                const percentage =
                  stats.totalTickets > 0
                    ? Math.round((item.count / stats.totalTickets) * 100)
                    : 0;
                return (
                  <div key={item.type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-600">
                        {TYPE_LABELS[item.type] || item.type}
                      </span>
                      <span className="text-sm font-medium text-slate-900 tabular-nums">
                        {item.count}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tickets by priority */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Tickets by Priority
          </h3>
          {stats.ticketsByPriority.length === 0 ? (
            <p className="text-sm text-slate-400">No tickets yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.ticketsByPriority.map((item) => {
                const colors: Record<string, string> = {
                  low: "bg-slate-400",
                  medium: "bg-blue-500",
                  high: "bg-orange-500",
                  urgent: "bg-red-500",
                };
                const percentage =
                  stats.totalTickets > 0
                    ? Math.round((item.count / stats.totalTickets) * 100)
                    : 0;
                return (
                  <div key={item.priority}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-600 capitalize">
                        {item.priority}
                      </span>
                      <span className="text-sm font-medium text-slate-900 tabular-nums">
                        {item.count}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors[item.priority] || "bg-slate-400"}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}
