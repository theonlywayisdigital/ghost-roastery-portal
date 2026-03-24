"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  Share2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  MoreHorizontal,
  Trash2,
  Copy,
  Eye,
  X,
  Calendar,
} from "@/components/icons";
import type { SocialPost, SocialPostsListResponse, SocialPlatform, PostStatus } from "@/types/social";
import { useMarketingContext } from "@/lib/marketing-context";
import { PlatformBadge } from "./PlatformBadge";
import { StatusBadge } from "./StatusBadge";
import { ActionMenu } from "@/components/admin";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "scheduled", label: "Scheduled" },
  { id: "published", label: "Published" },
  { id: "failed", label: "Failed" },
] as const;

type StatusTab = (typeof STATUS_TABS)[number]["id"];

export function SocialListView() {
  const router = useRouter();
  const { pageBase } = useMarketingContext();
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [counts, setCounts] = useState({ all: 0, draft: 0, scheduled: 0, published: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const menuAnchors = useRef<Record<string, HTMLButtonElement | null>>({});

  const loadPosts = useCallback(async () => {
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
      const res = await fetch(`/api/social/posts?${params}`);
      if (res.ok) {
        const data: SocialPostsListResponse = await res.json();
        setPosts(data.posts);
        setTotal(data.total);
        setCounts(data.counts);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to load posts.");
      }
    } catch (err) {
      console.error("Failed to load posts:", err);
      setError("Failed to load posts. Please check your connection.");
    }
    setLoading(false);
  }, [page, sortField, sortOrder, activeTab, search]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

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

  async function handleDelete(id: string) {
    setMenuOpen(null);
    if (!confirm("Delete this post? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/social/posts/${id}`, { method: "DELETE" });
      if (res.ok) loadPosts();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  }

  async function handleDuplicate(id: string) {
    setMenuOpen(null);
    try {
      const res = await fetch(`/api/social/posts/${id}`);
      if (!res.ok) return;
      const { post } = await res.json();

      const dupeRes = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: post.content,
          media_urls: post.media_urls,
          platforms: post.platforms,
          tags: post.tags,
        }),
      });
      if (dupeRes.ok) loadPosts();
    } catch (err) {
      console.error("Failed to duplicate:", err);
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

  function getEnabledPlatforms(post: SocialPost): SocialPlatform[] {
    return (Object.entries(post.platforms) as [SocialPlatform, { enabled?: boolean }][])
      .filter(([, config]) => config?.enabled)
      .map(([platform]) => platform);
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
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

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts..."
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
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <Share2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-900 mb-1">No posts yet</p>
            <p className="text-sm text-slate-500">
              {search ? "No posts matching your search." : "Create your first social post to get started."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <SortableHeader label="Content" field="content" current={sortField} order={sortOrder} onSort={handleSort} />
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Platforms</th>
                    <SortableHeader label="Scheduled" field="scheduled_for" current={sortField} order={sortOrder} onSort={handleSort} className="hidden md:table-cell" />
                    <SortableHeader label="Updated" field="updated_at" current={sortField} order={sortOrder} onSort={handleSort} className="hidden lg:table-cell" />
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {posts.map((post) => {
                    const platforms = getEnabledPlatforms(post);
                    return (
                      <tr
                        key={post.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => {
                          if (post.status === "draft" || post.status === "scheduled") {
                            router.push(`${pageBase}/social/compose?postId=${post.id}`);
                          } else {
                            router.push(`${pageBase}/social/${post.id}`);
                          }
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <p className="text-sm text-slate-900 truncate max-w-[250px]">
                              {post.content || "Untitled post"}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={post.status} />
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex gap-1">
                            {platforms.map((p) => (
                              <PlatformBadge key={p} platform={p} />
                            ))}
                            {platforms.length === 0 && <span className="text-xs text-slate-400">{"\u2014"}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs text-slate-500">{formatDate(post.scheduled_for)}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs text-slate-500">{formatDate(post.updated_at)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            ref={(el) => { menuAnchors.current[post.id] = el; }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpen(menuOpen === post.id ? null : post.id);
                            }}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          <ActionMenu
                            anchorRef={{ current: menuAnchors.current[post.id] }}
                            open={menuOpen === post.id}
                            onClose={() => setMenuOpen(null)}
                            width="w-36"
                          >
                            {(post.status === "published" || post.status === "partially_failed") && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuOpen(null);
                                  router.push(`${pageBase}/social/${post.id}`);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View Details
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicate(post.id);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Duplicate
                            </button>
                            {(post.status === "draft" || post.status === "scheduled" || post.status === "failed") && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(post.id);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            )}
                          </ActionMenu>
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
        {isActive && <span className="text-brand-600">{order === "asc" ? "\u2191" : "\u2193"}</span>}
      </div>
    </th>
  );
}
