"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox,
  UserX,
  AlertTriangle,
  Clock,
  Plus as PlusIcon,
} from "@/components/icons";
import { DataTable, FilterBar, Pagination } from "@/components/admin";
import type { Column, FilterConfig } from "@/components/admin";
import type { SupportTicket, TicketStats } from "@/types/support";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-50 text-yellow-700",
  in_progress: "bg-blue-50 text-blue-700",
  waiting_on_customer: "bg-orange-50 text-orange-700",
  waiting_on_roaster: "bg-orange-50 text-orange-700",
  resolved: "bg-green-50 text-green-700",
  closed: "bg-slate-100 text-slate-500",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting_on_customer: "Waiting on Customer",
  waiting_on_roaster: "Waiting on Roaster",
  resolved: "Resolved",
  closed: "Closed",
};

const TYPE_COLORS: Record<string, string> = {
  general: "bg-slate-100 text-slate-600",
  order_issue: "bg-blue-50 text-blue-700",
  billing: "bg-green-50 text-green-700",
  technical: "bg-purple-50 text-purple-700",
  dispute: "bg-red-50 text-red-700",
  payout: "bg-amber-50 text-amber-700",
  platform: "bg-cyan-50 text-cyan-700",
};

const TYPE_LABELS: Record<string, string> = {
  general: "General",
  order_issue: "Order Issue",
  billing: "Billing",
  technical: "Technical",
  dispute: "Dispute",
  payout: "Payout",
  platform: "Platform",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-500",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-orange-50 text-orange-700",
  urgent: "bg-red-50 text-red-700",
};

export function TicketsList() {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<TicketStats>({
    open: 0,
    unassigned: 0,
    urgent: 0,
    avgResolutionHours: 0,
    todayNew: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState<Record<string, string>>({
    search: "",
    status: "",
    type: "",
    priority: "",
    created_by_type: "",
    assigned_to: "",
  });

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sort: sortKey,
      order: sortDir,
    });
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });

    const res = await fetch(`/api/admin/support/tickets?${params}`);
    if (res.ok) {
      const data = await res.json();
      setTickets(data.data);
      setTotal(data.total);
      setStats(data.stats);
    }
    setLoading(false);
    setInitialLoad(false);
  }, [page, pageSize, sortKey, sortDir, filters]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleSort = (key: string) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  };

  const filterConfigs: FilterConfig[] = [
    { key: "search", label: "Search tickets...", type: "search" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: Object.entries(STATUS_LABELS).map(([v, l]) => ({
        value: v,
        label: l,
      })),
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: Object.entries(TYPE_LABELS).map(([v, l]) => ({
        value: v,
        label: l,
      })),
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
        { value: "urgent", label: "Urgent" },
      ],
    },
    {
      key: "created_by_type",
      label: "Creator",
      type: "select",
      options: [
        { value: "customer", label: "Customer" },
        { value: "roaster", label: "Roaster" },
        { value: "admin", label: "Admin" },
      ],
    },
    {
      key: "assigned_to",
      label: "Assignment",
      type: "select",
      options: [{ value: "unassigned", label: "Unassigned" }],
    },
  ];

  const columns: Column<SupportTicket>[] = [
    {
      key: "ticket_number",
      label: "Ticket",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-slate-600">
          {row.ticket_number}
        </span>
      ),
    },
    {
      key: "subject",
      label: "Subject",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900 line-clamp-1">
            {row.subject}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {row.creator_name}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            TYPE_COLORS[row.type] || "bg-slate-100 text-slate-600"
          }`}
        >
          {TYPE_LABELS[row.type] || row.type}
        </span>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      sortable: true,
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
            PRIORITY_COLORS[row.priority] || "bg-slate-100 text-slate-500"
          }`}
        >
          {row.priority}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            STATUS_COLORS[row.status] || "bg-slate-100 text-slate-500"
          }`}
        >
          {STATUS_LABELS[row.status] || row.status}
        </span>
      ),
    },
    {
      key: "assigned_to",
      label: "Assigned",
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-sm text-slate-500">
          {row.assignee_name || "—"}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Created",
      sortable: true,
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-sm text-slate-500">
          {new Date(row.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
        </span>
      ),
    },
  ];

  const statCards = [
    {
      label: "Open",
      value: stats.open,
      icon: Inbox,
      color: "text-yellow-600 bg-yellow-50",
    },
    {
      label: "Unassigned",
      value: stats.unassigned,
      icon: UserX,
      color: "text-orange-600 bg-orange-50",
    },
    {
      label: "Urgent",
      value: stats.urgent,
      icon: AlertTriangle,
      color: "text-red-600 bg-red-50",
    },
    {
      label: "Avg Resolution",
      value: stats.avgResolutionHours ? `${stats.avgResolutionHours}h` : "—",
      icon: Clock,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Today",
      value: stats.todayNew,
      icon: PlusIcon,
      color: "text-green-600 bg-green-50",
    },
  ];

  return (
    <div>
      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`p-1.5 rounded-lg ${stat.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs text-slate-500">{stat.label}</span>
              </div>
              <p className="text-xl font-bold text-slate-900 tabular-nums">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mb-4">
        <FilterBar
          filters={filterConfigs}
          values={filters}
          onChange={(key, value) => {
            setFilters((f) => ({ ...f, [key]: value }));
            setPage(1);
          }}
          onClear={() => {
            setFilters({
              search: "",
              status: "",
              type: "",
              priority: "",
              created_by_type: "",
              assigned_to: "",
            });
            setPage(1);
          }}
        />
      </div>

      <DataTable
        columns={columns}
        data={tickets}
        isLoading={initialLoad}
        onSort={handleSort}
        sortKey={sortKey}
        sortDirection={sortDir}
        onRowClick={(row) =>
          router.push(`/admin/support/tickets/${row.id}`)
        }
        emptyMessage="No tickets found."
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
