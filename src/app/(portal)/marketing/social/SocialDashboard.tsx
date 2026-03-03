"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { useMarketingContext } from "@/lib/marketing-context";
import { SocialConnectionsBar } from "./components/SocialConnectionsBar";
import { SocialListView } from "./components/SocialListView";

export function SocialDashboard() {
  const router = useRouter();
  const { pageBase } = useMarketingContext();
  const [creating, setCreating] = useState(false);

  async function handleNewPost() {
    setCreating(true);
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const { post } = await res.json();
        router.push(`${pageBase}/social/compose?postId=${post.id}`);
      }
    } catch (err) {
      console.error("Failed to create post:", err);
    }
    setCreating(false);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-sm">
            Manage social media posts across your connected platforms.
          </p>
        </div>
        <button
          onClick={handleNewPost}
          disabled={creating}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {creating ? "Creating..." : "Create Post"}
        </button>
      </div>

      {/* Platform connections */}
      <SocialConnectionsBar />

      {/* Post history */}
      <SocialListView />
    </div>
  );
}
