"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Eye,
  Loader2,
  Upload,
  X,
  Plus,
  ExternalLink,
} from "lucide-react";
import type { KBArticle, KBCategory, ArticleType, AudienceType } from "@/types/support";

const ARTICLE_TYPES: { value: ArticleType; label: string }[] = [
  { value: "faq", label: "FAQ" },
  { value: "tutorial", label: "Tutorial" },
  { value: "guide", label: "Guide" },
];

const AUDIENCES: { value: AudienceType; label: string }[] = [
  { value: "customer", label: "Customer" },
  { value: "roaster", label: "Roaster" },
  { value: "admin", label: "Admin" },
];

interface Props {
  articleId?: string;
}

export function ArticleEditor({ articleId }: Props) {
  const router = useRouter();
  const isNew = !articleId;

  const [categories, setCategories] = useState<KBCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [tagInput, setTagInput] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [type, setType] = useState<ArticleType>("faq");
  const [categoryId, setCategoryId] = useState("");
  const [audience, setAudience] = useState<AudienceType[]>(["customer", "roaster"]);
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [media, setMedia] = useState<{ url: string; name: string; type: string }[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManual && isNew) {
      setSlug(
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      );
    }
  }, [title, slugManual, isNew]);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/admin/support/kb/categories");
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories);
    }
  }, []);

  const fetchArticle = useCallback(async () => {
    if (!articleId) return;
    setLoading(true);
    const res = await fetch(`/api/admin/support/kb/articles/${articleId}`);
    if (res.ok) {
      const data = await res.json();
      const a: KBArticle = data.article;
      setTitle(a.title);
      setSlug(a.slug);
      setSlugManual(true);
      setType(a.type);
      setCategoryId(a.category_id || "");
      setAudience(a.audience);
      setContent(a.content);
      setExcerpt(a.excerpt);
      setVideoUrl(a.video_url || "");
      setMedia(a.media || []);
      setTags(a.tags || []);
      setIsFeatured(a.is_featured);
      setIsActive(a.is_active);
    } else {
      router.push("/admin/support");
    }
    setLoading(false);
  }, [articleId, router]);

  useEffect(() => {
    fetchCategories();
    fetchArticle();
  }, [fetchCategories, fetchArticle]);

  const handleSave = async (publish?: boolean) => {
    if (!title.trim()) {
      alert("Title is required");
      return;
    }
    setSaving(true);

    const body = {
      title: title.trim(),
      slug: slug.trim(),
      type,
      category_id: categoryId || null,
      audience,
      content,
      excerpt: excerpt.trim(),
      video_url: videoUrl.trim() || null,
      media,
      tags,
      is_featured: isFeatured,
      is_active: publish !== undefined ? publish : isActive,
    };

    const url = isNew
      ? "/api/admin/support/kb/articles"
      : `/api/admin/support/kb/articles/${articleId}`;

    const res = await fetch(url, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      if (isNew) {
        router.push(`/admin/support/kb/${data.article.id}/edit`);
      }
      if (publish !== undefined) setIsActive(publish);
    } else {
      const data = await res.json();
      alert(data.error || "Failed to save article");
    }
    setSaving(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/support/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      setMedia((prev) => [
        ...prev,
        { url: data.url, name: data.name, type: data.type },
      ]);
    } else {
      const data = await res.json();
      alert(data.error || "Upload failed");
    }
    e.target.value = "";
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
    }
    setTagInput("");
  };

  const getYouTubeId = (url: string): string | null => {
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/
    );
    return match?.[1] || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/support")}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isNew ? "New Article" : "Edit Article"}
            </h1>
            {!isNew && slug && (
              <p className="text-xs text-slate-400 mt-0.5">/{slug}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button
              onClick={() => window.open(`/help/${slug}`, "_blank")}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
          )}
          {isActive ? (
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
            >
              Unpublish
            </button>
          ) : (
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              Publish
            </button>
          )}
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Article title..."
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Slug
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">/help/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugManual(true);
                  }}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Excerpt
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={2}
                placeholder="Brief summary shown in article lists..."
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Content (Markdown)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              placeholder="Write your article content in Markdown..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
            />
          </div>

          {/* Video */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Video URL (YouTube)
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {videoUrl && getYouTubeId(videoUrl) && (
              <div className="aspect-video rounded-lg overflow-hidden bg-slate-100">
                <iframe
                  src={`https://www.youtube.com/embed/${getYouTubeId(videoUrl)}`}
                  className="w-full h-full"
                  allowFullScreen
                  title="Video preview"
                />
              </div>
            )}
          </div>

          {/* Media */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">
                Media Attachments
              </label>
              <label className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">
                <Upload className="w-4 h-4" />
                Upload
                <input
                  type="file"
                  onChange={handleUpload}
                  accept="image/*,video/mp4,application/pdf"
                  className="hidden"
                />
              </label>
            </div>
            {media.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {media.map((m, i) => (
                  <div
                    key={i}
                    className="relative group border border-slate-200 rounded-lg p-2"
                  >
                    {m.type.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.url}
                        alt={m.name}
                        className="w-full h-24 object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-24 bg-slate-100 rounded flex items-center justify-center">
                        <span className="text-xs text-slate-500">
                          {m.name}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-600 hover:underline flex items-center gap-0.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View
                      </a>
                      <button
                        onClick={() =>
                          setMedia((prev) => prev.filter((_, j) => j !== i))
                        }
                        className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                No media uploaded yet.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Status</h3>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  isActive
                    ? "bg-green-50 text-green-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {isActive ? "Published" : "Draft"}
              </span>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Featured
              </label>
            </div>
          </div>

          {/* Type & Category */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ArticleType)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {ARTICLE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Audience */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Audience</h3>
            <div className="space-y-2">
              {AUDIENCES.map((a) => (
                <label
                  key={a.value}
                  className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={audience.includes(a.value)}
                    onChange={() =>
                      setAudience((prev) =>
                        prev.includes(a.value)
                          ? prev.filter((v) => v !== a.value)
                          : [...prev, a.value]
                      )
                    }
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  {a.label}
                </label>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Tags</h3>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-600"
                  >
                    {tag}
                    <button
                      onClick={() =>
                        setTags((prev) => prev.filter((t) => t !== tag))
                      }
                      className="text-slate-400 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tag..."
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                onClick={addTag}
                disabled={!tagInput.trim()}
                className="p-1.5 text-slate-400 hover:text-brand-600 disabled:opacity-30"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
