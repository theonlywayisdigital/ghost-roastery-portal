"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  BookOpen,
  HelpCircle,
  FileText,
  Calendar,
  Eye,
  ExternalLink,
} from "@/components/icons";
import type { KBArticle } from "@/types/support";

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; className: string }
> = {
  faq: {
    label: "FAQ",
    icon: HelpCircle,
    className: "bg-blue-50 text-blue-700",
  },
  tutorial: {
    label: "Tutorial",
    icon: BookOpen,
    className: "bg-purple-50 text-purple-700",
  },
  guide: {
    label: "Guide",
    icon: FileText,
    className: "bg-green-50 text-green-700",
  },
};

export function ArticleView({ slug }: { slug: string }) {
  const router = useRouter();
  const [article, setArticle] = useState<KBArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState<boolean | null>(null);
  const [voting, setVoting] = useState(false);

  const fetchArticle = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/support/kb/${slug}`);
    if (res.ok) {
      const data = await res.json();
      setArticle(data.article);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  const handleVote = async (helpful: boolean) => {
    if (voted !== null || voting) return;
    setVoting(true);
    const res = await fetch(`/api/support/kb/${slug}/helpful`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ helpful }),
    });
    if (res.ok) {
      setVoted(helpful);
    }
    setVoting(false);
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

  if (!article) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-slate-900 mb-2">
          Article not found
        </h2>
        <button
          onClick={() => router.push("/help")}
          className="text-sm text-brand-600 hover:underline"
        >
          Back to Help Centre
        </button>
      </div>
    );
  }

  const typeConfig = TYPE_CONFIG[article.type];
  const TypeIcon = typeConfig?.icon || FileText;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <button
        onClick={() => router.push("/help")}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Help Centre
      </button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          {typeConfig && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${typeConfig.className}`}
            >
              <TypeIcon className="w-3 h-3" />
              {typeConfig.label}
            </span>
          )}
          {article.category && (
            <span className="text-xs text-slate-400">
              {article.category.name}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{article.title}</h1>
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(article.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {`${article.view_count} views`}
          </span>
        </div>
      </div>

      {/* Video embed */}
      {article.video_url && getYouTubeId(article.video_url) && (
        <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 mb-8">
          <iframe
            src={`https://www.youtube.com/embed/${getYouTubeId(article.video_url)}`}
            className="w-full h-full"
            allowFullScreen
            title={article.title}
          />
        </div>
      )}

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200 p-8">
        <div className="prose prose-slate prose-sm max-w-none prose-headings:text-slate-900 prose-a:text-brand-600 prose-code:text-brand-600 prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-900">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {article.content}
          </ReactMarkdown>
        </div>
      </div>

      {/* Media gallery */}
      {article.media && article.media.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Attachments
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {article.media.map((m, i) => (
              <a
                key={i}
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block border border-slate-200 rounded-lg p-2 hover:border-brand-300 transition-colors"
              >
                {m.type?.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.url}
                    alt={m.name}
                    className="w-full h-24 object-cover rounded"
                  />
                ) : (
                  <div className="w-full h-24 bg-slate-100 rounded flex items-center justify-center">
                    <span className="text-xs text-slate-500">{m.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 mt-1">
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                  <span className="text-xs text-slate-500 truncate">
                    {m.name}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-6">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 rounded-full bg-slate-100 text-xs text-slate-500"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Helpful voting */}
      <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6 text-center">
        {voted !== null ? (
          <p className="text-sm text-slate-600">
            Thanks for your feedback!
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-600 mb-3">
              Was this article helpful?
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => handleVote(true)}
                disabled={voting}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors"
              >
                <ThumbsUp className="w-4 h-4" />
                Yes
              </button>
              <button
                onClick={() => handleVote(false)}
                disabled={voting}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
              >
                <ThumbsDown className="w-4 h-4" />
                No
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
