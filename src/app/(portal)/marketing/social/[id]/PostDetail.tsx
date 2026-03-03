"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Trash2,
  Pencil,
  RotateCcw,
  Loader2,
  Eye,
  MousePointerClick,
  Heart,
  Share,
  MessageCircle,
  Users,
  ImageIcon,
} from "lucide-react";
import type { SocialPost, SocialPostAnalytics, SocialPlatform } from "@/types/social";
import { useMarketingContext } from "@/lib/marketing-context";
import { PlatformBadge } from "../components/PlatformBadge";
import { StatusBadge } from "../components/StatusBadge";

export function PostDetail({ postId }: { postId: string }) {
  const router = useRouter();
  const { pageBase } = useMarketingContext();
  const [post, setPost] = useState<SocialPost | null>(null);
  const [analytics, setAnalytics] = useState<SocialPostAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function loadPost() {
    try {
      const res = await fetch(`/api/social/posts/${postId}`);
      if (res.ok) {
        const data = await res.json();
        setPost(data.post);
        setAnalytics(data.analytics || []);
      } else {
        router.replace(`${pageBase}/social`);
      }
    } catch {
      router.replace(`${pageBase}/social`);
    }
    setLoading(false);
  }

  async function handleRefreshAnalytics() {
    setRefreshing(true);
    // Trigger a sync for this specific post via the analytics endpoint
    // For now, just reload the post data
    await loadPost();
    setRefreshing(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/social/posts/${postId}`, { method: "DELETE" });
      if (res.ok) {
        router.push(`${pageBase}/social`);
      }
    } catch {
      // Ignore
    }
    setDeleting(false);
  }

  async function handleRetry() {
    setRetrying(true);
    try {
      const res = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (res.ok) {
        await loadPost();
      }
    } catch {
      // Ignore
    }
    setRetrying(false);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading || !post) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  // Redirect drafts/scheduled to composer
  if (post.status === "draft" || post.status === "scheduled") {
    router.replace(`${pageBase}/social/compose?postId=${postId}`);
    return null;
  }

  const enabledPlatforms = (Object.entries(post.platforms) as [SocialPlatform, { enabled?: boolean }][])
    .filter(([, config]) => config?.enabled)
    .map(([platform]) => platform);

  const totalAnalytics = analytics.reduce(
    (acc, a) => ({
      impressions: acc.impressions + a.impressions,
      clicks: acc.clicks + a.clicks,
      likes: acc.likes + a.likes,
      shares: acc.shares + a.shares,
      comments: acc.comments + a.comments,
      reach: acc.reach + a.reach,
    }),
    { impressions: 0, clicks: 0, likes: 0, shares: 0, comments: 0, reach: 0 }
  );

  const ANALYTICS_CARDS = [
    { label: "Impressions", value: totalAnalytics.impressions, icon: Eye },
    { label: "Clicks", value: totalAnalytics.clicks, icon: MousePointerClick },
    { label: "Likes", value: totalAnalytics.likes, icon: Heart },
    { label: "Shares", value: totalAnalytics.shares, icon: Share },
    { label: "Comments", value: totalAnalytics.comments, icon: MessageCircle },
    { label: "Reach", value: totalAnalytics.reach, icon: Users },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`${pageBase}/social`)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Post Details</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={post.status} />
              <span className="text-xs text-slate-400">
                {post.published_at ? `Published ${formatDate(post.published_at)}` : `Created ${formatDate(post.created_at)}`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(post.status === "failed" || post.status === "partially_failed") && (
            <>
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {retrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Retry
              </button>
              <button
                onClick={() => router.push(`${pageBase}/social/compose?postId=${postId}`)}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
            </>
          )}
          {post.status !== "published" && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Failure reason */}
      {post.failure_reason && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm font-medium text-red-800 mb-1">Publishing errors</p>
          {Object.entries(post.failure_reason).map(([platform, reason]) => (
            <p key={platform} className="text-sm text-red-700">
              <span className="font-medium">{platform}:</span> {reason}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Post content */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              {enabledPlatforms.map((p) => (
                <PlatformBadge key={p} platform={p} size="md" />
              ))}
            </div>
            <p className="text-sm text-slate-800 whitespace-pre-wrap">{post.content || "No content"}</p>

            {post.media_urls.length > 0 && (
              <div className={`mt-4 rounded-lg overflow-hidden ${post.media_urls.length > 1 ? "grid grid-cols-2 gap-1" : ""}`}>
                {post.media_urls.map((url, i) => {
                  const isVideo = !!url.match(/\.(mp4|mov)$/i);
                  return (
                    <div key={url} className="aspect-square bg-slate-100">
                      {isVideo ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-10 h-10 text-slate-400" />
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt={`Media ${i + 1}`} className="w-full h-full object-cover" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {post.tags.length > 0 && (
              <div className="flex items-center gap-1 mt-3 flex-wrap">
                {post.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Analytics */}
          {(post.status === "published" || post.status === "partially_failed") && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">Analytics</h3>
                <button
                  onClick={handleRefreshAnalytics}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                >
                  <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ANALYTICS_CARDS.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-500">{label}</span>
                    </div>
                    <p className="text-xl font-semibold text-slate-900">{value.toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {/* Per-platform breakdown */}
              {analytics.length > 1 && (
                <div className="mt-3 bg-white rounded-xl border border-slate-200 p-4">
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">By Platform</h4>
                  <div className="space-y-2">
                    {analytics.map((a) => (
                      <div key={a.platform} className="flex items-center justify-between text-sm">
                        <PlatformBadge platform={a.platform as SocialPlatform} size="md" />
                        <div className="flex items-center gap-4 text-slate-600">
                          <span>{a.impressions} impressions</span>
                          <span>{a.likes} likes</span>
                          <span>{a.clicks} clicks</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Metadata */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Details</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="mt-0.5"><StatusBadge status={post.status} /></dd>
              </div>
              <div>
                <dt className="text-slate-500">Created</dt>
                <dd className="text-slate-900 mt-0.5">{formatDate(post.created_at)}</dd>
              </div>
              {post.scheduled_for && (
                <div>
                  <dt className="text-slate-500">Scheduled for</dt>
                  <dd className="text-slate-900 mt-0.5">{formatDate(post.scheduled_for)}</dd>
                </div>
              )}
              {post.published_at && (
                <div>
                  <dt className="text-slate-500">Published</dt>
                  <dd className="text-slate-900 mt-0.5">{formatDate(post.published_at)}</dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500">Platforms</dt>
                <dd className="flex gap-1 mt-0.5 flex-wrap">
                  {enabledPlatforms.map((p) => (
                    <PlatformBadge key={p} platform={p} size="md" />
                  ))}
                </dd>
              </div>
            </dl>
          </div>

          {/* Platform post IDs */}
          {Object.keys(post.platform_post_ids).length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-medium text-slate-700 mb-3">Platform IDs</h3>
              <dl className="space-y-2 text-xs">
                {Object.entries(post.platform_post_ids).map(([platform, id]) => (
                  <div key={platform}>
                    <dt className="text-slate-500 capitalize">{platform}</dt>
                    <dd className="text-slate-700 font-mono break-all mt-0.5">{id}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
