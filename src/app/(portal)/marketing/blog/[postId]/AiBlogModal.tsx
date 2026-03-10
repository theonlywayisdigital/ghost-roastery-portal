"use client";

import { useState } from "react";
import { Sparkles, Loader2, X, AlertTriangle, Info } from "@/components/icons";
import type { WebBlock } from "@/app/(portal)/website/editor/web-block-types";

interface AiBlogModalProps {
  open: boolean;
  onClose: () => void;
  onGenerated: (result: {
    title: string;
    slug: string;
    excerpt: string;
    seoTitle: string;
    seoDescription: string;
    blocks: WebBlock[];
  }) => void;
}

type Tone = "professional" | "friendly" | "casual" | "educational" | "storytelling";
type Length = "short" | "medium" | "long";

const TONES: { value: Tone; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "educational", label: "Educational" },
  { value: "storytelling", label: "Storytelling" },
];

const LENGTHS: { value: Length; label: string; desc: string }[] = [
  { value: "short", label: "Short", desc: "300-500 words" },
  { value: "medium", label: "Medium", desc: "600-900 words" },
  { value: "long", label: "Long", desc: "1000+ words" },
];

export function AiBlogModal({ open, onClose, onGenerated }: AiBlogModalProps) {
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tone, setTone] = useState<Tone>("friendly");
  const [length, setLength] = useState<Length>("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleGenerate() {
    if (!topic.trim()) {
      setError("Please describe what this blog post is about.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/generate-blog-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          keywords: keywords.trim(),
          tone,
          length,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Generation failed");
        setLoading(false);
        return;
      }

      onGenerated({
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        seoTitle: data.seo_title,
        seoDescription: data.seo_description,
        blocks: data.blocks,
      });
      onClose();
      resetForm();
    } catch {
      setError("Failed to connect. Please try again.");
    }
    setLoading(false);
  }

  function resetForm() {
    setTopic("");
    setKeywords("");
    setTone("friendly");
    setLength("medium");
    setError(null);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Generate Blog Post with AI</h2>
              <p className="text-xs text-slate-400">Describe your topic and we'll write it for you</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5">
          {/* Warning banner */}
          <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              AI-generated blog content can rank well in search, but it always helps to add your own depth, expertise, and personal feel to make it truly yours.
            </p>
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              What's this post about?
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={3}
              placeholder="e.g. The difference between washed and natural processed coffee, and how it affects flavour in the cup"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              disabled={loading}
            />
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Target keywords
              <span className="font-normal text-slate-400 ml-1">(optional)</span>
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. washed coffee, natural process, coffee processing methods"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
              disabled={loading}
            />
            <p className="text-xs text-slate-400 mt-1">Comma-separated keywords to weave into the content naturally</p>
          </div>

          {/* Tone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tone</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  disabled={loading}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    tone === t.value
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Length */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Length</label>
            <div className="flex gap-2">
              {LENGTHS.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLength(l.value)}
                  disabled={loading}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    length === l.value
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <div>{l.label}</div>
                  <div className="text-[10px] text-slate-400 font-normal mt-0.5">{l.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Writing your post...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Post
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
