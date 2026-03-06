"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  X,
  Hash,
  MessageSquare,
} from "@/components/icons";
import type { SocialTemplate, SocialPlatform } from "@/types/social";
import { useMarketingContext } from "@/lib/marketing-context";

const AVAILABLE_PLATFORMS: { id: SocialPlatform; label: string }[] = [
  { id: "google_business", label: "Google Business" },
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
];

export function SocialTemplatesContent() {
  const { apiBase } = useMarketingContext();
  const [templates, setTemplates] = useState<SocialTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SocialTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCaption, setFormCaption] = useState("");
  const [formHashtags, setFormHashtags] = useState("");
  const [formPlatforms, setFormPlatforms] = useState<Set<SocialPlatform>>(new Set());

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/social-templates`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      } else {
        setError("Failed to load social templates.");
      }
    } catch {
      setError("Failed to load social templates.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  function openCreate() {
    setEditingTemplate(null);
    setFormName("");
    setFormDescription("");
    setFormCaption("");
    setFormHashtags("");
    setFormPlatforms(new Set());
    setShowModal(true);
  }

  function openEdit(template: SocialTemplate) {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormDescription(template.description || "");
    setFormCaption(template.caption_structure);
    setFormHashtags(template.hashtag_groups.join(", "));
    setFormPlatforms(new Set(template.default_platforms));
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    const body = {
      name: formName.trim() || "Untitled Template",
      description: formDescription.trim() || null,
      caption_structure: formCaption,
      hashtag_groups: formHashtags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      default_platforms: Array.from(formPlatforms),
    };

    try {
      if (editingTemplate) {
        await fetch(`${apiBase}/social-templates/${editingTemplate.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch(`${apiBase}/social-templates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      setShowModal(false);
      loadTemplates();
    } catch {
      // silent
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this social template?")) return;
    try {
      const res = await fetch(`${apiBase}/social-templates/${id}`, {
        method: "DELETE",
      });
      if (res.ok) loadTemplates();
    } catch {
      // silent
    }
  }

  function togglePlatform(p: SocialPlatform) {
    setFormPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

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
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">
          Reusable post formats to speed up your social media workflow.
        </p>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-900 mb-1">No social templates yet</p>
          <p className="text-sm text-slate-500 mb-4">
            Save reusable post formats to speed up your workflow.
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => openEdit(template)}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900">{template.name}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(template.id);
                  }}
                  className="p-1 rounded text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {template.caption_structure && (
                <p className="text-xs text-slate-500 mb-3 line-clamp-3">
                  {template.caption_structure}
                </p>
              )}

              {/* Hashtag groups */}
              {template.hashtag_groups.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.hashtag_groups.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium"
                    >
                      <Hash className="w-2.5 h-2.5" />
                      {tag}
                    </span>
                  ))}
                  {template.hashtag_groups.length > 4 && (
                    <span className="text-[10px] text-slate-400">
                      {`+${template.hashtag_groups.length - 4} more`}
                    </span>
                  )}
                </div>
              )}

              {/* Platform badges */}
              {template.default_platforms.length > 0 && (
                <div className="flex gap-1">
                  {template.default_platforms.map((p) => {
                    const label = AVAILABLE_PLATFORMS.find((ap) => ap.id === p)?.label || p;
                    return (
                      <span
                        key={p}
                        className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium"
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Placeholder */}
      <p className="text-xs text-slate-400 mt-6 text-center">
        Image creation tools coming soon — logo overlays, text overlays, and more
      </p>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingTemplate ? "Edit Template" : "Create Social Template"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Product Launch Post"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Caption Structure
                </label>
                <textarea
                  value={formCaption}
                  onChange={(e) => setFormCaption(e.target.value)}
                  placeholder={"Use placeholders like {{product_name}}, {{discount_code}}\n\ne.g. Introducing {{product_name}} 🎉\n{{description}}\n\nShop now: {{link}}"}
                  rows={5}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  {`Use {{placeholders}} for dynamic content`}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Hashtag Groups
                </label>
                <input
                  type="text"
                  value={formHashtags}
                  onChange={(e) => setFormHashtags(e.target.value)}
                  placeholder="coffee, specialtycoffee, newroast"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Comma-separated hashtag groups (without the # symbol)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Default Platforms
                </label>
                <div className="flex gap-2">
                  {AVAILABLE_PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlatform(p.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        formPlatforms.has(p.id)
                          ? "bg-brand-50 text-brand-700 border-brand-200"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional description of when to use this template"
                  rows={2}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : editingTemplate ? "Update Template" : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
