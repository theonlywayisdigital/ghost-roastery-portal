"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useMarketingContext } from "@/lib/marketing-context";
import {
  ArrowLeft,
  Search,
  Download,
  Share2,
  MoreHorizontal,
  Trash2,
  ExternalLink,
  Check,
  X,
  FileText,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Shield,
  Clock,
  Globe,
  Code,
  Minus,
} from "@/components/icons";
import { ActionMenu } from "@/components/admin";

// ─── Types ───────────────────────────────────────────────────

interface FormField {
  id: string;
  label: string;
  type: string;
  order: number;
}

interface FormData {
  id: string;
  name: string;
  form_type: string;
  fields: FormField[];
  status: string;
  submission_count: number;
}

interface Submission {
  id: string;
  data: Record<string, unknown>;
  source: string;
  email_verified: boolean;
  consent_given: boolean;
  created_at: string;
  contact_id: string | null;
  contacts?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

// ─── Helpers ─────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Pick the best columns to show in the table. Prefer email and name-like fields first. */
function pickDisplayColumns(fields: FormField[], maxCols: number = 4): FormField[] {
  const sorted = [...fields].sort((a, b) => {
    const priority = (f: FormField) => {
      const id = f.id.toLowerCase();
      if (id === "email") return 0;
      if (id.includes("name")) return 1;
      if (id === "phone") return 2;
      return 10 + f.order;
    };
    return priority(a) - priority(b);
  });
  return sorted.slice(0, maxCols);
}

function displayValue(val: unknown): string {
  if (val === null || val === undefined) return "\u2014";
  if (Array.isArray(val)) return val.join(", ");
  return String(val);
}

const LIMIT = 25;

// ─── Component ───────────────────────────────────────────────

export function SubmissionsPage({ formId }: { formId: string }) {
  const { apiBase, pageBase } = useMarketingContext();
  // Data state
  const [form, setForm] = useState<FormData | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(false);

  // Filters & pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Action menus
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const menuAnchors = useRef<Record<string, HTMLButtonElement | null>>({});

  // Detail drawer
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

  // Share modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Deleting state
  const [deleting, setDeleting] = useState<string | null>(null);

  // Search debounce
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ─── Data fetching ──────────────────────────────────────────

  const loadForm = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/forms/${formId}`);
      if (res.ok) {
        const data = await res.json();
        setForm(data.form);
      }
    } catch {
      // silent
    }
  }, [formId]);

  const loadSubmissions = useCallback(async () => {
    setLoadingSubs(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`${apiBase}/forms/${formId}/submissions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
        setTotal(data.total || 0);
      }
    } catch {
      // silent
    }
    setLoadingSubs(false);
  }, [formId, page, debouncedSearch, statusFilter]);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  // Debounce search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  // ─── Actions ────────────────────────────────────────────────

  async function handleDelete(subId: string) {
    setMenuOpen(null);
    if (!confirm("Delete this submission? This cannot be undone.")) return;

    setDeleting(subId);
    try {
      const res = await fetch(`${apiBase}/forms/${formId}/submissions/${subId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== subId));
        setTotal((prev) => Math.max(0, prev - 1));
        if (selectedSub?.id === subId) setSelectedSub(null);
        // Update form submission count locally
        if (form) {
          setForm({ ...form, submission_count: Math.max(0, form.submission_count - 1) });
        }
      }
    } catch {
      // silent
    }
    setDeleting(null);
  }

  async function handleExport() {
    try {
      const res = await fetch(`${apiBase}/forms/${formId}/export`);
      if (!res.ok) return;

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/csv")) return;

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("content-disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      a.download = filenameMatch ? filenameMatch[1] : "submissions.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // silent
    }
  }

  function handleCopy(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  // ─── Computed values ────────────────────────────────────────

  const fields = form?.fields || [];
  const displayCols = pickDisplayColumns(fields);
  const totalPages = Math.ceil(total / LIMIT);
  const showFrom = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const showTo = Math.min(page * LIMIT, total);

  const hostedUrl = typeof window !== "undefined" ? `${window.location.origin}/f/${formId}` : "";
  const embedCode = typeof window !== "undefined"
    ? `<div id="gr-form-${formId}"></div>\n<script src="${window.location.origin}/api/forms/embed?id=${formId}"></script>`
    : "";
  const iframeCode = typeof window !== "undefined"
    ? `<iframe\n  src="${window.location.origin}/f/${formId}?embed=1"\n  width="100%"\n  height="800"\n  frameborder="0"\n  style="border:none;overflow:hidden;background:transparent;">\n</iframe>`
    : "";

  // ─── Loading state ──────────────────────────────────────────

  if (loading && !form) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="text-center py-24">
        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-900 mb-1">Form not found</p>
        <Link
          href={`${pageBase}/forms`}
          className="text-sm text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 mt-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Forms
        </Link>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`${pageBase}/forms`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Forms
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{form.name}</h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            {`${total} submission${total !== 1 ? "s" : ""}`}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search submissions..."
            className="w-full pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All statuses</option>
          <option value="verified">Verified</option>
          <option value="pending">Unverified</option>
        </select>

        {/* Export CSV */}
        <button
          onClick={handleExport}
          disabled={total === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>

        {/* Share */}
        <button
          onClick={() => setShowShareModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loadingSubs && submissions.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : submissions.length === 0 ? (
          /* Empty state */
          <div className="text-center py-16">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-900 mb-1">No submissions yet</p>
            <p className="text-sm text-slate-500">
              Share your form to start collecting responses.
            </p>
            <button
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share Form
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {displayCols.map((col) => (
                      <th
                        key={col.id}
                        className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3"
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Source
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Verified
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                      Date
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 w-10">
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissions.map((sub) => (
                    <tr
                      key={sub.id}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${deleting === sub.id ? "opacity-50" : ""}`}
                      onClick={() => setSelectedSub(sub)}
                    >
                      {displayCols.map((col) => (
                        <td key={col.id} className="px-4 py-3">
                          <span className="text-sm text-slate-900 truncate block max-w-[200px]">
                            {displayValue(sub.data[col.id])}
                          </span>
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          sub.source === "embedded"
                            ? "bg-purple-50 text-purple-700"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {sub.source === "embedded" ? (
                            <><Code className="w-3 h-3" /> Embedded</>
                          ) : (
                            <><Globe className="w-3 h-3" /> Hosted</>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {sub.email_verified ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <Check className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-300">
                            <Minus className="w-4 h-4" />
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-slate-500" title={formatFullDate(sub.created_at)}>
                          {timeAgo(sub.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          ref={(el) => { menuAnchors.current[sub.id] = el; }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(menuOpen === sub.id ? null : sub.id);
                          }}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        <ActionMenu
                          anchorRef={{ current: menuAnchors.current[sub.id] }}
                          open={menuOpen === sub.id}
                          onClose={() => setMenuOpen(null)}
                          width="w-36"
                        >
                          <button
                            onClick={() => {
                              setMenuOpen(null);
                              setSelectedSub(sub);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                          <button
                            onClick={() => handleDelete(sub.id)}
                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </ActionMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <span className="text-sm text-slate-500">
                  {`Showing ${showFrom}\u2013${showTo} of ${total}`}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Submission Detail Drawer ─────────────────────────── */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={() => setSelectedSub(null)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
            {/* Drawer header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-slate-900">Submission Details</h2>
              <button
                onClick={() => setSelectedSub(null)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Field values */}
              <div>
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                  Form Data
                </h3>
                <div className="space-y-3">
                  {fields.map((field) => {
                    const val = selectedSub.data[field.id];
                    return (
                      <div key={field.id} className="flex flex-col">
                        <span className="text-xs font-medium text-slate-500 mb-0.5">
                          {field.label}
                        </span>
                        <span className="text-sm text-slate-900 whitespace-pre-wrap">
                          {displayValue(val)}
                        </span>
                      </div>
                    );
                  })}
                  {/* Show any extra data keys not in fields */}
                  {Object.keys(selectedSub.data)
                    .filter((key) => !fields.some((f) => f.id === key))
                    .map((key) => (
                      <div key={key} className="flex flex-col">
                        <span className="text-xs font-medium text-slate-500 mb-0.5">
                          {key}
                        </span>
                        <span className="text-sm text-slate-900 whitespace-pre-wrap">
                          {displayValue(selectedSub.data[key])}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Metadata */}
              <div>
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                  Metadata
                </h3>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Source
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      selectedSub.source === "embedded"
                        ? "bg-purple-50 text-purple-700"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {selectedSub.source === "embedded" ? "Embedded" : "Hosted"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Consent
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                      selectedSub.consent_given ? "text-green-600" : "text-slate-400"
                    }`}>
                      {selectedSub.consent_given ? (
                        <><Check className="w-3.5 h-3.5" /> Given</>
                      ) : (
                        <><X className="w-3.5 h-3.5" /> Not given</>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Verified
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                      selectedSub.email_verified ? "text-green-600" : "text-slate-400"
                    }`}>
                      {selectedSub.email_verified ? (
                        <><Check className="w-3.5 h-3.5" /> Verified</>
                      ) : (
                        <><Minus className="w-3.5 h-3.5" /> Unverified</>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Submitted
                    </span>
                    <span className="text-xs text-slate-700">
                      {formatFullDate(selectedSub.created_at)}
                    </span>
                  </div>

                  {/* Linked contact */}
                  {selectedSub.contact_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 flex items-center gap-2">
                        <ExternalLink className="w-4 h-4" />
                        Linked Contact
                      </span>
                      <Link
                        href={`/contacts/${selectedSub.contact_id}`}
                        className="text-xs text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1"
                      >
                        {selectedSub.contacts
                          ? [selectedSub.contacts.first_name, selectedSub.contacts.last_name].filter(Boolean).join(" ") || selectedSub.contacts.email
                          : "View contact"
                        }
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Delete button */}
              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={() => handleDelete(selectedSub.id)}
                  disabled={deleting === selectedSub.id}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deleting === selectedSub.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {deleting === selectedSub.id ? "Deleting..." : "Delete Submission"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Share Modal ──────────────────────────────────────── */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900">Share Form</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Hosted URL */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Hosted URL
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  A standalone page where people can fill in your form.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={hostedUrl}
                    className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-600 bg-slate-50 focus:outline-none"
                  />
                  <button
                    onClick={() => handleCopy(hostedUrl, "hosted")}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {copiedField === "hosted" ? (
                      <><Check className="w-4 h-4 text-green-600" /> Copied</>
                    ) : (
                      <><Copy className="w-4 h-4" /> Copy</>
                    )}
                  </button>
                </div>
              </div>

              {/* Script embed */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Script Embed <span className="text-xs font-normal text-slate-400">(recommended)</span>
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Auto-resizing embed. Paste this into your website HTML.
                </p>
                <div className="relative">
                  <pre className="px-3.5 py-3 border border-slate-300 rounded-lg text-xs text-slate-600 bg-slate-50 overflow-x-auto whitespace-pre-wrap break-all font-mono">
                    {embedCode}
                  </pre>
                  <button
                    onClick={() => handleCopy(embedCode, "embed")}
                    className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-sm transition-colors"
                  >
                    {copiedField === "embed" ? (
                      <><Check className="w-3 h-3 text-green-600" /> Copied</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copy</>
                    )}
                  </button>
                </div>
              </div>

              {/* iFrame fallback */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  iFrame Fallback
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Use this if your website blocks scripts (Squarespace, Wix, etc.).
                </p>
                <div className="relative">
                  <pre className="px-3.5 py-3 border border-slate-300 rounded-lg text-xs text-slate-600 bg-slate-50 overflow-x-auto whitespace-pre-wrap break-all font-mono">
                    {iframeCode}
                  </pre>
                  <button
                    onClick={() => handleCopy(iframeCode, "iframe")}
                    className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-sm transition-colors"
                  >
                    {copiedField === "iframe" ? (
                      <><Check className="w-3 h-3 text-green-600" /> Copied</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copy</>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowShareModal(false)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
