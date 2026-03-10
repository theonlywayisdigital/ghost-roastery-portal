"use client";

import { useState, useCallback, useRef } from "react";
import { Save, Eye, Loader2, ChevronDown, ChevronUp, ImageIcon, X, Sparkles, Undo2 } from "@/components/icons";
import type { WebBlock } from "@/app/(portal)/website/editor/web-block-types";
import { WebPageEditor } from "@/app/(portal)/website/editor/WebPageEditor";
import { AiGenerateButton } from "@/components/AiGenerateButton";
import { compressImage } from "@/lib/compress-image";
import { AiBlogModal } from "./AiBlogModal";

interface BlogEditorClientProps {
  postId: string;
  initialTitle: string;
  initialSlug: string;
  initialExcerpt: string;
  initialBlocks: WebBlock[];
  isPublished: boolean;
  publishedAt: string | null;
  roasterId: string;
  initialFeaturedImageUrl?: string;
  initialAuthorName?: string;
  initialSeoTitle?: string;
  initialSeoDescription?: string;
}

export function BlogEditorClient({
  postId,
  initialTitle,
  initialSlug,
  initialExcerpt,
  initialBlocks,
  isPublished,
  publishedAt,
  roasterId,
  initialFeaturedImageUrl = "",
  initialAuthorName = "",
  initialSeoTitle = "",
  initialSeoDescription = "",
}: BlogEditorClientProps) {
  const [blocks, setBlocks] = useState<WebBlock[]>(initialBlocks);
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(initialSlug);
  const [excerpt, setExcerpt] = useState(initialExcerpt);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [published, setPublished] = useState(isPublished);

  // New fields
  const [featuredImageUrl, setFeaturedImageUrl] = useState(initialFeaturedImageUrl);
  const [authorName, setAuthorName] = useState(initialAuthorName);
  const [seoTitle, setSeoTitle] = useState(initialSeoTitle);
  const [seoDescription, setSeoDescription] = useState(initialSeoDescription);
  const [seoOpen, setSeoOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // AI generation
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [preAiState, setPreAiState] = useState<{
    title: string; slug: string; excerpt: string; seoTitle: string; seoDescription: string; blocks: WebBlock[];
  } | null>(null);

  async function handleImageUpload(rawFile: File) {
    setUploading(true);
    try {
      const file = await compressImage(rawFile);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("roasterId", roasterId);
      formData.append("folder", "blog");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setFeaturedImageUrl(data.url);
    } catch (err) {
      console.error("Image upload failed:", err);
    } finally {
      setUploading(false);
    }
  }

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/marketing/blog/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          excerpt,
          content: blocks,
          featured_image_url: featuredImageUrl || null,
          author_name: authorName || null,
          seo_title: seoTitle || null,
          seo_description: seoDescription || null,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // save failed
    }
    setSaving(false);
  }, [blocks, title, slug, excerpt, featuredImageUrl, authorName, seoTitle, seoDescription, postId]);

  const handleTogglePublish = useCallback(async () => {
    const newState = !published;
    const res = await fetch(`/api/marketing/blog/${postId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: newState }),
    });
    if (res.ok) setPublished(newState);
  }, [published, postId]);

  function handleAiBlogGenerated(result: {
    title: string; slug: string; excerpt: string; seoTitle: string; seoDescription: string; blocks: WebBlock[];
  }) {
    // Save current state for undo
    setPreAiState({ title, slug, excerpt, seoTitle, seoDescription, blocks });
    setTitle(result.title);
    setSlug(result.slug);
    setExcerpt(result.excerpt);
    setSeoTitle(result.seoTitle);
    setSeoDescription(result.seoDescription);
    setBlocks(result.blocks);
    setAiGenerated(true);
  }

  function handleUndoAi() {
    if (!preAiState) return;
    setTitle(preAiState.title);
    setSlug(preAiState.slug);
    setExcerpt(preAiState.excerpt);
    setSeoTitle(preAiState.seoTitle);
    setSeoDescription(preAiState.seoDescription);
    setBlocks(preAiState.blocks);
    setAiGenerated(false);
    setPreAiState(null);
  }

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
            className="w-full text-xl font-bold text-slate-900 bg-transparent placeholder:text-slate-300 border border-transparent rounded-lg px-2 py-1 -mx-2 hover:border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
          />
          <div className="flex items-center gap-3 mt-1">
            <span className="text-slate-400 text-sm">/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="post-slug"
              className="flex-1 text-slate-500 text-sm bg-transparent placeholder:text-slate-300 border border-transparent rounded px-1.5 py-0.5 hover:border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAiModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Generate
          </button>
          {published ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700">
                <Eye className="w-3.5 h-3.5" />
                Published
              </span>
              <button
                onClick={handleTogglePublish}
                className="text-xs text-slate-400 hover:text-red-600 transition-colors"
              >
                Unpublish
              </button>
            </div>
          ) : (
            <button
              onClick={handleTogglePublish}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Publish
            </button>
          )}
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

      {/* AI Generated Banner */}
      {aiGenerated && (
        <div className="flex items-center justify-between px-4 py-2.5 mb-4 bg-violet-50 border border-violet-200 rounded-lg">
          <p className="text-xs text-violet-700 font-medium">
            AI generated — review and personalise before publishing
          </p>
          <button
            onClick={handleUndoAi}
            className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium"
          >
            <Undo2 className="w-3 h-3" />
            Undo
          </button>
        </div>
      )}

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

      {/* Featured Image */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Featured Image</label>
        {featuredImageUrl ? (
          <div className="relative rounded-lg overflow-hidden border border-slate-200">
            <img src={featuredImageUrl} alt="" className="w-full h-48 object-cover" />
            <button
              type="button"
              onClick={() => setFeaturedImageUrl("")}
              className="absolute top-2 right-2 bg-white/90 rounded-full w-7 h-7 flex items-center justify-center text-slate-500 hover:text-red-500 shadow-sm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading}
              className="w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500 hover:border-brand-400 hover:text-brand-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
              {uploading ? "Uploading..." : "Upload featured image"}
            </button>
          </>
        )}
      </div>

      {/* Author Name */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Author</label>
        <input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Author name (optional)"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
        />
      </div>

      {/* SEO Settings (collapsible) */}
      <div className="mb-4 border border-slate-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setSeoOpen(!seoOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <span className="text-sm font-medium text-slate-700">SEO Settings</span>
          {seoOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>
        {seoOpen && (
          <div className="px-4 py-4 space-y-4 bg-white">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-700">Meta Title</label>
                <AiGenerateButton
                  type="website_meta_title"
                  context={{ existingContent: seoTitle, pageTitle: title }}
                  onSelect={(text) => setSeoTitle(text)}
                />
              </div>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Uses post title if empty"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              />
              <p className="mt-1 text-xs text-slate-400">
                {`${seoTitle.length}/60 characters`}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-700">Meta Description</label>
                <AiGenerateButton
                  type="website_meta_description"
                  context={{ existingContent: seoDescription, pageTitle: title }}
                  onSelect={(text) => setSeoDescription(text)}
                />
              </div>
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                rows={3}
                placeholder="Brief description for search engines"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              />
              <p className="mt-1 text-xs text-slate-400">
                {`${seoDescription.length}/160 characters`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Block editor */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <WebPageEditor blocks={blocks} onChange={setBlocks} />
      </div>

      {/* AI Blog Generation Modal */}
      <AiBlogModal
        open={showAiModal}
        onClose={() => setShowAiModal(false)}
        onGenerated={handleAiBlogGenerated}
      />
    </div>
  );
}
