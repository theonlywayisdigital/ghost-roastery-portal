"use client";

import { Calendar, ImageIcon } from "lucide-react";
import type { SocialPost, SocialPlatform } from "@/types/social";
import { PlatformBadge } from "./PlatformBadge";
import { StatusBadge } from "./StatusBadge";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "No date";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PostCard({
  post,
  onClick,
}: {
  post: SocialPost;
  onClick?: () => void;
}) {
  const platforms = Object.entries(post.platforms)
    .filter(([, config]) => config?.enabled)
    .map(([platform]) => platform as SocialPlatform);

  const displayDate = post.published_at || post.scheduled_for;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {platforms.map((p) => (
            <PlatformBadge key={p} platform={p} />
          ))}
        </div>
        <StatusBadge status={post.status} />
      </div>

      <p className="text-sm text-slate-900 line-clamp-2 mb-2">
        {post.content || "No content"}
      </p>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(displayDate)}
        </div>
        {post.media_urls.length > 0 && (
          <div className="flex items-center gap-1">
            <ImageIcon className="w-3 h-3" />
            {post.media_urls.length}
          </div>
        )}
      </div>

      {post.tags.length > 0 && (
        <div className="flex items-center gap-1 mt-2 flex-wrap">
          {post.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">
              {tag}
            </span>
          ))}
          {post.tags.length > 3 && (
            <span className="text-xs text-slate-400">+{post.tags.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}
