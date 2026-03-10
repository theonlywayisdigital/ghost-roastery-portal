"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  BookOpen,
  HelpCircle,
  FileText,
  Star,
  ChevronRight,
  Loader2,
  Video,
} from "@/components/icons";
import type { KBArticle, KBCategory } from "@/types/support";

const TYPE_ICONS: Record<string, React.ElementType> = {
  faq: HelpCircle,
  tutorial: BookOpen,
  guide: FileText,
};

export function HelpCentre() {
  const [categories, setCategories] = useState<KBCategory[]>([]);
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (activeCategory) params.set("category", activeCategory);

    try {
      const res = await fetch(`/api/support/kb?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories);
        setArticles(data.articles);
      }
    } catch {
      // fetch failed
    }
    setLoading(false);
  }, [search, activeCategory]);

  useEffect(() => {
    const timer = setTimeout(fetchData, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchData, search]);

  const featured = articles.filter((a) => a.is_featured);
  const filtered = articles;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Help Centre</h1>
        <p className="text-sm text-slate-500 mt-1">
          Find answers, tutorials, and guides to help you get the most out of
          Ghost Roastery.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search articles..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Category sidebar */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Categories
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => setActiveCategory("")}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  !activeCategory
                    ? "bg-brand-50 text-brand-700 font-medium"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                All Articles
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeCategory === cat.id
                      ? "bg-brand-50 text-brand-700 font-medium"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Articles */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
            </div>
          ) : (
            <>
              {/* Featured articles */}
              {!search && !activeCategory && featured.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    Featured
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {featured.map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                </div>
              )}

              {/* All articles */}
              {filtered.length > 0 ? (
                <div className="space-y-2">
                  {!search && !activeCategory && featured.length > 0 && (
                    <h2 className="text-sm font-semibold text-slate-900 mb-3">
                      All Articles
                    </h2>
                  )}
                  {filtered.map((article) => (
                    <ArticleRow key={article.id} article={article} />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    No articles found
                  </h3>
                  <p className="text-slate-500">
                    {search
                      ? "Try a different search term."
                      : "No articles are available in this category yet."}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ArticleCard({ article }: { article: KBArticle }) {
  const Icon = TYPE_ICONS[article.type] || FileText;
  return (
    <Link
      href={`/help/${article.slug}`}
      className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-brand-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-brand-50">
          <Icon className="w-4 h-4 text-brand-600" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-slate-900 line-clamp-1">
            {article.title}
          </h3>
          {article.excerpt && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {article.excerpt}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-medium text-slate-400 uppercase">
              {article.type}
            </span>
            {article.video_url && (
              <Video className="w-3 h-3 text-slate-400" />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ArticleRow({ article }: { article: KBArticle }) {
  const Icon = TYPE_ICONS[article.type] || FileText;
  return (
    <Link
      href={`/help/${article.slug}`}
      className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 p-4 hover:border-brand-300 hover:shadow-sm transition-all"
    >
      <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-slate-900 line-clamp-1">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
            {article.excerpt}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {article.video_url && <Video className="w-3.5 h-3.5 text-slate-400" />}
        <span className="text-[10px] font-medium text-slate-400 uppercase">
          {article.type}
        </span>
        <ChevronRight className="w-4 h-4 text-slate-300" />
      </div>
    </Link>
  );
}
