"use client";

import { useState, useCallback } from "react";
import { Save, Eye, Loader2 } from "lucide-react";
import type { WebBlock } from "@/app/(portal)/website/editor/web-block-types";
import { WebPageEditor } from "@/app/(portal)/website/editor/WebPageEditor";

interface BlogEditorClientProps {
  postId: string;
  initialTitle: string;
  initialSlug: string;
  initialExcerpt: string;
  initialBlocks: WebBlock[];
  isPublished: boolean;
  publishedAt: string | null;
}

export function BlogEditorClient({
  postId,
  initialTitle,
  initialSlug,
  initialExcerpt,
  initialBlocks,
  isPublished,
  publishedAt,
}: BlogEditorClientProps) {
  const [blocks, setBlocks] = useState<WebBlock[]>(initialBlocks);
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(initialSlug);
  const [excerpt, setExcerpt] = useState(initialExcerpt);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [published, setPublished] = useState(isPublished);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/marketing/blog/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, excerpt, content: blocks }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // save failed
    }
    setSaving(false);
  }, [blocks, title, slug, excerpt, postId]);

  const handleTogglePublish = useCallback(async () => {
    const newState = !published;
    const res = await fetch(`/api/marketing/blog/${postId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: newState }),
    });
    if (res.ok) setPublished(newState);
  }, [published, postId]);

  return (
    <div>
      {/* Post metadata */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 mr-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title"
            className="w-full text-xl font-bold text-slate-900 border-0 outline-none bg-transparent placeholder:text-slate-300"
          />
          <div className="flex items-center gap-3 mt-1">
            <span className="text-slate-400 text-sm">/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="post-slug"
              className="text-slate-500 text-sm border-0 outline-none bg-transparent placeholder:text-slate-300"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTogglePublish}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              published
                ? "bg-green-50 text-green-700 hover:bg-green-100"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            {published ? "Published" : "Draft"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      {/* Excerpt */}
      <div className="mb-4">
        <input
          type="text"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Post excerpt (optional)"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
        />
      </div>

      {published && publishedAt && (
        <p className="text-xs text-slate-400 mb-4">
          {`Published on ${new Date(publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}
        </p>
      )}

      {/* Block editor */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <WebPageEditor blocks={blocks} onChange={setBlocks} />
      </div>
    </div>
  );
}
