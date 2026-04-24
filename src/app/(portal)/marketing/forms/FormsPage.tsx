"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMarketingContext } from "@/lib/marketing-context";
import {
  FileText,
  Loader2,
  Plus,
  MoreHorizontal,
  Trash2,
  Copy,
  Eye,
  Code,
  Archive,
  Pencil,
  Mail,
  MessageSquare,
  Building2,
  HelpCircle,
  Calendar,
  Star,
  X,
} from "@/components/icons";
import { ActionMenu } from "@/components/admin";

interface Form {
  id: string;
  name: string;
  description: string | null;
  form_type: string;
  status: string;
  submission_count: number;
  created_at: string;
}

// ─── Pre-built form templates ─────────────────────────────────
const FORM_TEMPLATES = [
  {
    id: "newsletter",
    name: "Newsletter Signup",
    description: "Simple email capture form for newsletter subscriptions.",
    form_type: "newsletter",
    icon: Mail,
    color: "text-blue-600",
    bg: "bg-blue-50",
    fields: [
      { id: "email", type: "email", label: "Email address", placeholder: "you@example.com", required: true, width: "full", order: 1 },
      { id: "first_name", type: "text", label: "First name", placeholder: "Your first name", required: false, width: "full", order: 2 },
    ],
  },
  {
    id: "contact",
    name: "Contact Form",
    description: "General contact form with name, email, phone, and message.",
    form_type: "contact",
    icon: MessageSquare,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    fields: [
      { id: "name", type: "text", label: "Full name", placeholder: "Your name", required: true, width: "full", order: 1 },
      { id: "email", type: "email", label: "Email address", placeholder: "you@example.com", required: true, width: "half", order: 2 },
      { id: "phone", type: "phone", label: "Phone number", placeholder: "+44 ...", required: false, width: "half", order: 3 },
      { id: "message", type: "textarea", label: "Message", placeholder: "How can we help?", required: true, width: "full", order: 4 },
    ],
  },
  {
    id: "wholesale",
    name: "Wholesale Enquiry",
    description: "Collect wholesale buyer applications with business details.",
    form_type: "wholesale_enquiry",
    icon: Building2,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    fields: [
      { id: "business_name", type: "text", label: "Business name", placeholder: "Your business", required: true, width: "full", order: 1 },
      { id: "name", type: "text", label: "Contact name", placeholder: "Your name", required: true, width: "half", order: 2 },
      { id: "email", type: "email", label: "Email", placeholder: "you@business.com", required: true, width: "half", order: 3 },
      { id: "phone", type: "phone", label: "Phone", placeholder: "+44 ...", required: false, width: "half", order: 4 },
      { id: "monthly_volume", type: "select", label: "Estimated monthly volume", required: false, width: "half", order: 5, options: ["Under 5kg", "5-20kg", "20-50kg", "50-100kg", "100kg+"] },
      { id: "message", type: "textarea", label: "Tell us about your business", placeholder: "", required: false, width: "full", order: 6 },
    ],
  },
  {
    id: "general_enquiry",
    name: "General Enquiry",
    description: "Enquiry form with subject categories.",
    form_type: "general_enquiry",
    icon: HelpCircle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    fields: [
      { id: "name", type: "text", label: "Name", placeholder: "Your name", required: true, width: "half", order: 1 },
      { id: "email", type: "email", label: "Email", placeholder: "you@example.com", required: true, width: "half", order: 2 },
      { id: "subject", type: "select", label: "Subject", required: true, width: "full", order: 3, options: ["Pricing", "Partnership", "Product enquiry", "Other"] },
      { id: "message", type: "textarea", label: "Message", placeholder: "Your message...", required: true, width: "full", order: 4 },
    ],
  },
  {
    id: "event",
    name: "Event Booking",
    description: "Collect event RSVPs with guest count and dietary requirements.",
    form_type: "custom",
    icon: Calendar,
    color: "text-purple-600",
    bg: "bg-purple-50",
    fields: [
      { id: "name", type: "text", label: "Name", placeholder: "Your name", required: true, width: "half", order: 1 },
      { id: "email", type: "email", label: "Email", placeholder: "you@example.com", required: true, width: "half", order: 2 },
      { id: "phone", type: "phone", label: "Phone", placeholder: "+44 ...", required: false, width: "half", order: 3 },
      { id: "guests", type: "number", label: "Number of guests", placeholder: "1", required: true, width: "half", order: 4 },
      { id: "dietary", type: "textarea", label: "Dietary requirements", placeholder: "Any allergies or preferences?", required: false, width: "full", order: 5 },
      { id: "message", type: "textarea", label: "Additional notes", placeholder: "", required: false, width: "full", order: 6 },
    ],
  },
  {
    id: "feedback",
    name: "Feedback Form",
    description: "Collect customer feedback with ratings.",
    form_type: "custom",
    icon: Star,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    fields: [
      { id: "name", type: "text", label: "Name", placeholder: "Optional", required: false, width: "half", order: 1 },
      { id: "email", type: "email", label: "Email", placeholder: "Optional", required: false, width: "half", order: 2 },
      { id: "rating", type: "radio", label: "How would you rate your experience?", required: true, width: "full", order: 3, options: ["1 - Poor", "2 - Fair", "3 - Good", "4 - Very Good", "5 - Excellent"] },
      { id: "enjoyed", type: "textarea", label: "What did you enjoy?", placeholder: "", required: false, width: "full", order: 4 },
      { id: "improve", type: "textarea", label: "What could we improve?", placeholder: "", required: false, width: "full", order: 5 },
    ],
  },
];

const TYPE_BADGES: Record<string, string> = {
  newsletter: "bg-blue-50 text-blue-700",
  contact: "bg-emerald-50 text-emerald-700",
  wholesale_enquiry: "bg-indigo-50 text-indigo-700",
  general_enquiry: "bg-amber-50 text-amber-700",
  custom: "bg-slate-100 text-slate-600",
};

const STATUS_BADGES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-green-50 text-green-700",
  archived: "bg-slate-100 text-slate-500",
};

export function FormsPage() {
  const router = useRouter();
  const { apiBase, pageBase } = useMarketingContext();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const menuAnchors = useRef<Record<string, HTMLButtonElement | null>>({});

  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/forms`);
      if (res.ok) {
        const data = await res.json();
        setForms(data.forms || []);
      }
    } catch {
      setError("Failed to load forms.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  async function handleUseTemplate(template: (typeof FORM_TEMPLATES)[number]) {
    setCreating(template.id);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          form_type: template.form_type,
          fields: template.fields,
        }),
      });
      if (res.ok) {
        const { form } = await res.json();
        router.push(`${pageBase}/forms/${form.id}/edit`);
      } else {
        setError("Failed to create form.");
        setCreating(null);
      }
    } catch {
      setError("Failed to create form.");
      setCreating(null);
    }
  }

  async function handleCreateBlank() {
    setCreating("blank");
    try {
      const res = await fetch(`${apiBase}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled Form" }),
      });
      if (res.ok) {
        const { form } = await res.json();
        router.push(`${pageBase}/forms/${form.id}/edit`);
      } else {
        setError("Failed to create form.");
        setCreating(null);
      }
    } catch {
      setError("Failed to create form.");
      setCreating(null);
    }
  }

  async function handleDelete(id: string) {
    setMenuOpen(null);
    if (!confirm("Delete this form and all its submissions?")) return;
    try {
      await fetch(`${apiBase}/forms/${id}`, { method: "DELETE" });
      setForms((prev) => prev.filter((f) => f.id !== id));
    } catch {
      // silent
    }
  }

  async function handleDuplicate(form: Form) {
    setMenuOpen(null);
    try {
      const detailRes = await fetch(`${apiBase}/forms/${form.id}`);
      if (!detailRes.ok) return;
      const { form: full } = await detailRes.json();

      const res = await fetch(`${apiBase}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${full.name} (copy)`,
          description: full.description,
          form_type: full.form_type,
          fields: full.fields,
          settings: full.settings,
          branding: full.branding,
        }),
      });
      if (res.ok) loadForms();
    } catch {
      // silent
    }
  }

  async function handleArchive(id: string) {
    setMenuOpen(null);
    try {
      await fetch(`${apiBase}/forms/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      setForms((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: "archived" } : f))
      );
    } catch {
      // silent
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Section 1: Form Templates */}
      <div className="mb-10">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Form Templates</h2>
          <p className="text-sm text-slate-500 mt-1">
            Pre-built forms you can customise and publish.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FORM_TEMPLATES.map((template) => {
            const Icon = template.icon;
            const isLoading = creating === template.id;

            return (
              <div
                key={template.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg ${template.bg} ${template.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{template.name}</h3>
                    <span className="text-xs text-slate-500">{`${template.fields.length} fields`}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-4 line-clamp-2">{template.description}</p>
                <button
                  onClick={() => handleUseTemplate(template)}
                  disabled={!!creating}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  {isLoading ? "Creating..." : "Use Template"}
                </button>
              </div>
            );
          })}

          {/* Blank form card */}
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-5 hover:border-slate-400 transition-all flex flex-col items-center justify-center text-center min-h-[180px]">
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Plus className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Blank Form</h3>
            <p className="text-xs text-slate-500 mb-4">Start from scratch</p>
            <button
              onClick={handleCreateBlank}
              disabled={!!creating}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {creating === "blank" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {creating === "blank" ? "Creating..." : "Create Blank"}
            </button>
          </div>
        </div>
      </div>

      {/* Section 2: My Forms */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">My Forms</h2>
          <p className="text-sm text-slate-500 mt-1">Your created forms and submissions.</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-visible">
          {forms.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900 mb-1">No forms yet</p>
              <p className="text-sm text-slate-500">
                Use a template above or create a blank form to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Form</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Submissions</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Created</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {forms.map((form) => (
                    <tr
                      key={form.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => router.push(`${pageBase}/forms/${form.id}/edit`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <Link
                              href={`${pageBase}/forms/${form.id}/edit`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-sm font-medium text-slate-900 hover:text-brand-600 hover:underline"
                            >
                              {form.name}
                            </Link>
                            {form.description && (
                              <p className="text-xs text-slate-500 truncate max-w-[200px]">{form.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGES[form.form_type] || TYPE_BADGES.custom}`}>
                          {form.form_type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGES[form.status] || STATUS_BADGES.draft}`}>
                          {form.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Link
                          href={`${pageBase}/forms/${form.id}/submissions`}
                          onClick={(e) => e.stopPropagation()}
                          className={`text-sm ${form.submission_count > 0 ? "text-brand-600 font-medium hover:underline" : "text-slate-400 hover:text-slate-600"}`}
                        >
                          {form.submission_count}
                        </Link>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-slate-500">{formatDate(form.created_at)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          ref={(el) => { menuAnchors.current[form.id] = el; }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(menuOpen === form.id ? null : form.id);
                          }}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        <ActionMenu
                          anchorRef={{ current: menuAnchors.current[form.id] }}
                          open={menuOpen === form.id}
                          onClose={() => setMenuOpen(null)}
                        >
                          <button
                            onClick={() => {
                              setMenuOpen(null);
                              router.push(`${pageBase}/forms/${form.id}/edit`);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setMenuOpen(null);
                              router.push(`${pageBase}/forms/${form.id}/submissions`);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View submissions
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(form);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Duplicate
                          </button>
                          {form.status !== "archived" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchive(form.id);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Archive className="w-3.5 h-3.5" />
                              Archive
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(form.id);
                            }}
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
          )}
        </div>
      </div>
    </div>
  );
}
