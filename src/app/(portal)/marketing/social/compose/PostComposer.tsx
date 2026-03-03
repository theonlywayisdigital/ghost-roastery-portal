"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Send,
  Clock,
  Loader2,
  CheckCircle,
} from "lucide-react";
import type { SocialPost, SocialConnection, PlatformConfigs, SocialPlatform } from "@/types/social";
import { PlatformToggle } from "../components/PlatformToggle";
import { MediaUploader } from "../components/MediaUploader";
import { CharacterCount } from "../components/CharacterCount";
import { PlatformPreview } from "../components/PlatformPreview";
import { StatusBadge } from "../components/StatusBadge";
import { AiGenerateButton } from "@/components/AiGenerateButton";
import { useMarketingContext } from "@/lib/marketing-context";

export function PostComposer() {
  const router = useRouter();
  const { pageBase } = useMarketingContext();
  const searchParams = useSearchParams();
  const postId = searchParams.get("postId");
  const prefillDate = searchParams.get("date");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connections, setConnections] = useState<SocialConnection[]>([]);

  // Post state
  const [id, setId] = useState<string | null>(postId);
  const [content, setContent] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<PlatformConfigs>({});
  const [scheduledFor, setScheduledFor] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "schedule">("schedule");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [status, setStatus] = useState<SocialPost["status"]>("draft");

  // Google-specific
  const [googleCtaType, setGoogleCtaType] = useState<string>("");
  const [googleCtaUrl, setGoogleCtaUrl] = useState("");

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load connections
  useEffect(() => {
    fetch("/api/social/connections")
      .then((r) => (r.ok ? r.json() : { connections: [] }))
      .then((data) => setConnections(data.connections || []))
      .catch(() => {});
  }, []);

  // Load existing post or create draft
  useEffect(() => {
    async function init() {
      if (postId) {
        try {
          const res = await fetch(`/api/social/posts/${postId}`);
          if (res.ok) {
            const { post } = await res.json();
            setId(post.id);
            setContent(post.content || "");
            setMediaUrls(post.media_urls || []);
            setPlatforms(post.platforms || {});
            setTags(post.tags || []);
            setStatus(post.status);
            if (post.scheduled_for) {
              setScheduleMode("schedule");
              setScheduledFor(post.scheduled_for.slice(0, 16));
            }
            // Restore Google CTA
            if (post.platforms?.google_business?.cta_type) {
              setGoogleCtaType(post.platforms.google_business.cta_type);
              setGoogleCtaUrl(post.platforms.google_business.cta_url || "");
            }
          } else {
            router.replace(`${pageBase}/social`);
            return;
          }
        } catch {
          router.replace(`${pageBase}/social`);
          return;
        }
      } else {
        // Create a new draft
        try {
          const body: Record<string, unknown> = {};
          if (prefillDate) {
            body.scheduled_for = new Date(`${prefillDate}T10:00:00`).toISOString();
          }
          const res = await fetch("/api/social/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (res.ok) {
            const { post } = await res.json();
            setId(post.id);
            setStatus(post.status);
            if (prefillDate) {
              setScheduleMode("schedule");
              setScheduledFor(`${prefillDate}T10:00`);
            }
          }
        } catch {
          setError("Failed to create draft");
        }
      }
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build platforms object with Google CTA
  function buildPlatforms(): PlatformConfigs {
    const p = { ...platforms };
    if (p.google_business?.enabled && googleCtaType) {
      p.google_business = {
        ...p.google_business,
        cta_type: googleCtaType as GoogleCtaType,
        cta_url: googleCtaUrl,
      };
    }
    return p;
  }

  // Auto-save
  const saveDraft = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    try {
      await fetch(`/api/social/posts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          media_urls: mediaUrls,
          platforms: buildPlatforms(),
          scheduled_for: scheduleMode === "schedule" && scheduledFor
            ? new Date(scheduledFor).toISOString()
            : null,
          status: scheduleMode === "schedule" && scheduledFor ? "scheduled" : "draft",
          tags,
        }),
      });
      setLastSaved(new Date());
    } catch {
      // Silent fail on auto-save
    }
    setSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, content, mediaUrls, platforms, scheduledFor, scheduleMode, tags, googleCtaType, googleCtaUrl]);

  useEffect(() => {
    if (!id || loading) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(saveDraft, 30000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [saveDraft, id, loading]);

  async function handleSave() {
    await saveDraft();
  }

  async function handleSchedule() {
    if (!id) return;
    if (scheduleMode === "schedule" && !scheduledFor) {
      setError("Please select a date and time to schedule");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/social/posts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          media_urls: mediaUrls,
          platforms: buildPlatforms(),
          scheduled_for: new Date(scheduledFor).toISOString(),
          status: "scheduled",
          tags,
        }),
      });
      if (res.ok) {
        router.push(`${pageBase}/social`);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to schedule post");
      }
    } catch {
      setError("Failed to schedule post");
    }
    setSaving(false);
  }

  async function handlePublishNow() {
    if (!id) return;
    setPublishing(true);
    setError(null);

    // First save the latest content
    await saveDraft();

    try {
      const res = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: id }),
      });
      if (res.ok) {
        router.push(`${pageBase}/social/${id}`);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to publish post");
      }
    } catch {
      setError("Failed to publish post");
    }
    setPublishing(false);
  }

  function handleAddTag() {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  }

  function handleRemoveTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  const enabledPlatforms: SocialPlatform[] = (Object.entries(platforms) as [SocialPlatform, { enabled?: boolean }][])
    .filter(([, config]) => config?.enabled)
    .map(([platform]) => platform);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

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
            <h2 className="text-lg font-semibold text-slate-900">
              {postId ? "Edit Post" : "New Post"}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={status} />
              {saving && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </span>
              )}
              {!saving && lastSaved && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Saved
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          {scheduleMode === "schedule" ? (
            <button
              onClick={handleSchedule}
              disabled={saving || !scheduledFor}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              <Clock className="w-4 h-4" />
              Schedule
            </button>
          ) : (
            <button
              onClick={handlePublishNow}
              disabled={publishing || enabledPlatforms.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {publishing ? "Publishing..." : "Publish Now"}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Platform selection */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <label className="block text-sm font-medium text-slate-700 mb-3">Platforms</label>
            <PlatformToggle
              platforms={platforms}
              onChange={setPlatforms}
              connections={connections}
            />
            {connections.length === 0 && (
              <p className="text-xs text-slate-400 mt-2">
                No platforms connected.{" "}
                <button onClick={() => router.push(`${pageBase}/social/connections`)} className="text-brand-600 hover:underline">
                  Connect a platform
                </button>
              </p>
            )}
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">Content</label>
              <AiGenerateButton
                type="social_caption"
                context={{ existingContent: content, platforms: enabledPlatforms }}
                onSelect={setContent}
                enableShortcut
              />
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="What would you like to share?"
              className="w-full border border-slate-300 rounded-lg px-3 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
            />
            {enabledPlatforms.length > 0 && (
              <div className="mt-3">
                <CharacterCount content={content} platforms={enabledPlatforms} />
              </div>
            )}
          </div>

          {/* Media */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <label className="block text-sm font-medium text-slate-700 mb-3">Media</label>
            <MediaUploader mediaUrls={mediaUrls} onChange={setMediaUrls} />
          </div>

          {/* Google CTA (conditional) */}
          {platforms.google_business?.enabled && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <label className="block text-sm font-medium text-slate-700 mb-3">Google Business CTA</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Action type</label>
                  <select
                    value={googleCtaType}
                    onChange={(e) => setGoogleCtaType(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">None</option>
                    <option value="BOOK">Book</option>
                    <option value="ORDER">Order Online</option>
                    <option value="LEARN_MORE">Learn More</option>
                    <option value="SIGN_UP">Sign Up</option>
                    <option value="CALL">Call</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">URL</label>
                  <input
                    type="url"
                    value={googleCtaUrl}
                    onChange={(e) => setGoogleCtaUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Schedule */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <label className="block text-sm font-medium text-slate-700 mb-3">When to post</label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setScheduleMode("now")}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                  scheduleMode === "now"
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                Post Now
              </button>
              <button
                onClick={() => setScheduleMode("schedule")}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                  scheduleMode === "schedule"
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                Schedule
              </button>
            </div>
            {scheduleMode === "schedule" && (
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            )}
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="text-slate-400 hover:text-slate-600">
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
                placeholder="Add a tag..."
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-4">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Preview</h3>
            <PlatformPreview
              content={content}
              mediaUrls={mediaUrls}
              platforms={platforms}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type GoogleCtaType = "BOOK" | "ORDER" | "LEARN_MORE" | "SIGN_UP" | "CALL";
