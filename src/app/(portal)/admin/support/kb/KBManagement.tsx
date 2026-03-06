"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Settings,
  Eye,
  Edit2,
  Trash2,
  Star,
  FileText,
  HelpCircle,
  BookOpen,
} from "@/components/icons";
import { DataTable, FilterBar, Pagination } from "@/components/admin";
import type { Column, FilterConfig } from "@/components/admin";
import type { KBArticle, KBCategory } from "@/types/support";
import { CategoryManager } from "./CategoryManager";

const TYPE_BADGES: Record<string, { label: string; className: string }> = {
  faq: { label: "FAQ", className: "bg-blue-50 text-blue-700" },
  tutorial: { label: "Tutorial", className: "bg-purple-50 text-purple-700" },
  guide: { label: "Guide", className: "bg-green-50 text-green-700" },
};

const AUDIENCE_BADGES: Record<string, { label: string; className: string }> = {
  customer: { label: "Customer", className: "bg-amber-50 text-amber-700" },
  roaster: { label: "Roaster", className: "bg-blue-50 text-blue-700" },
  admin: { label: "Admin", className: "bg-slate-100 text-slate-600" },
};

export function KBManagement() {
  const router = useRouter();
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [categories, setCategories] = useState<KBCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [showCategories, setShowCategories] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({
    search: "",
    type: "",
    category: "",
    audience: "",
    status: "",
  });
  const [sortKey, setSortKey] = useState("updated_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/admin/support/kb/categories");
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories);
    }
  }, []);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sort: sortKey,
      order: sortDir,
    });
    if (filters.search) params.set("search", filters.search);
    if (filters.type) params.set("type", filters.type);
    if (filters.category) params.set("category", filters.category);
    if (filters.audience) params.set("audience", filters.audience);
    if (filters.status) params.set("status", filters.status);

    const res = await fetch(`/api/admin/support/kb/articles?${params}`);
    if (res.ok) {
      const data = await res.json();
      setArticles(data.data);
      setTotal(data.total);
    }
    setLoading(false);
    setInitialLoad(false);
  }, [page, pageSize, sortKey, sortDir, filters]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    const res = await fetch(`/api/admin/support/kb/articles/${id}`, {
      method: "DELETE",
    });
    if (res.ok) fetchArticles();
  };

  const handleSort = (key: string) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const filterConfigs: FilterConfig[] = [
    { key: "search", label: "Search articles...", type: "search" },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "faq", label: "FAQ" },
        { value: "tutorial", label: "Tutorial" },
        { value: "guide", label: "Guide" },
      ],
    },
    {
      key: "category",
      label: "Category",
      type: "select",
      options: categories.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      key: "audience",
      label: "Audience",
      type: "select",
      options: [
        { value: "customer", label: "Customer" },
        { value: "roaster", label: "Roaster" },
        { value: "admin", label: "Admin" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Published" },
        { value: "draft", label: "Draft" },
      ],
    },
  ];

  const columns: Column<KBArticle>[] = [
    {
      key: "title",
      label: "Title",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.is_featured && (
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
          )}
          <div>
            <p className="font-medium text-slate-900">{row.title}</p>
            {row.excerpt && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {row.excerpt}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      sortable: true,
      render: (row) => {
        const badge = TYPE_BADGES[row.type];
        const Icon =
          row.type === "faq"
            ? HelpCircle
            : row.type === "tutorial"
              ? BookOpen
              : FileText;
        return badge ? (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
          >
            <Icon className="w-3 h-3" />
            {badge.label}
          </span>
        ) : (
          row.type
        );
      },
    },
    {
      key: "category",
      label: "Category",
      hiddenOnMobile: true,
      render: (row) =>
        row.category?.name ? (
          <span className="text-sm text-slate-600">{row.category.name}</span>
        ) : (
          <span className="text-sm text-slate-400">Uncategorized</span>
        ),
    },
    {
      key: "audience",
      label: "Audience",
      hiddenOnMobile: true,
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.audience.map((a) => {
            const badge = AUDIENCE_BADGES[a];
            return badge ? (
              <span
                key={a}
                className={`px-1.5 py-0.5 rounded text-xs font-medium ${badge.className}`}
              >
                {badge.label}
              </span>
            ) : null;
          })}
        </div>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      sortable: true,
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            row.is_active
              ? "bg-green-50 text-green-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {row.is_active ? "Published" : "Draft"}
        </span>
      ),
    },
    {
      key: "view_count",
      label: "Views",
      sortable: true,
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-sm text-slate-500 tabular-nums">
          {row.view_count}
        </span>
      ),
    },
    {
      key: "updated_at",
      label: "Updated",
      sortable: true,
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-sm text-slate-500">
          {new Date(row.updated_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      width: "100px",
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/help/${row.slug}`, "_blank");
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/admin/support/kb/${row.id}/edit`);
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row.id);
            }}
            className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCategories(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Categories
          </button>
        </div>
        <button
          onClick={() => router.push("/admin/support/kb/new")}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Article
        </button>
      </div>

      <div className="mb-4">
        <FilterBar
          filters={filterConfigs}
          values={filters}
          onChange={(key, value) => {
            setFilters((f) => ({ ...f, [key]: value }));
            setPage(1);
          }}
          onClear={() => {
            setFilters({
              search: "",
              type: "",
              category: "",
              audience: "",
              status: "",
            });
            setPage(1);
          }}
        />
      </div>

      <DataTable
        columns={columns}
        data={articles}
        isLoading={initialLoad}
        onSort={handleSort}
        sortKey={sortKey}
        sortDirection={sortDir}
        onRowClick={(row) => router.push(`/admin/support/kb/${row.id}/edit`)}
        emptyMessage="No articles found. Create your first knowledge base article."
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      {showCategories && (
        <CategoryManager
          categories={categories}
          onClose={() => setShowCategories(false)}
          onUpdated={fetchCategories}
        />
      )}
    </div>
  );
}
