"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutTemplate,
  Loader2,
  Trash2,
  Copy,
  X,
  Mail,
  Rocket,
  Newspaper,
  PartyPopper,
  CalendarDays,
  Zap,
  Heart,
  UserCheck,
  Monitor,
  Smartphone,
  Eye,
} from "lucide-react";
import type { EmailTemplate, TemplateCategory } from "@/types/marketing";
import { renderEmailHtmlForPreview } from "@/lib/render-email-html";
import { SocialTemplatesContent } from "./SocialTemplatesContent";
import { useMarketingContext } from "@/lib/marketing-context";

const CATEGORY_TABS: { id: TemplateCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "welcome", label: "Welcome" },
  { id: "product_launch", label: "Product Launch" },
  { id: "newsletter", label: "Newsletter" },
  { id: "promotion", label: "Promotion" },
  { id: "event", label: "Event" },
  { id: "flash_sale", label: "Flash Sale" },
  { id: "thank_you", label: "Thank You" },
  { id: "re_engagement", label: "Re-engagement" },
];

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  welcome: Mail,
  product_launch: Rocket,
  newsletter: Newspaper,
  promotion: PartyPopper,
  event: CalendarDays,
  flash_sale: Zap,
  thank_you: Heart,
  re_engagement: UserCheck,
  general: LayoutTemplate,
};

const CATEGORY_COLORS: Record<string, string> = {
  welcome: "bg-blue-50 text-blue-700",
  product_launch: "bg-purple-50 text-purple-700",
  newsletter: "bg-green-50 text-green-700",
  promotion: "bg-amber-50 text-amber-700",
  event: "bg-pink-50 text-pink-700",
  flash_sale: "bg-red-50 text-red-700",
  thank_you: "bg-rose-50 text-rose-700",
  re_engagement: "bg-teal-50 text-teal-700",
  general: "bg-slate-100 text-slate-600",
};

export function TemplatesPage() {
  const router = useRouter();
  const { apiBase, pageBase } = useMarketingContext();
  const [templateTab, setTemplateTab] = useState<"email" | "social">("email");
  const [prebuilt, setPrebuilt] = useState<EmailTemplate[]>([]);
  const [custom, setCustom] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "all">("all");

  // Save template modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveForm, setSaveForm] = useState({ name: "", description: "", category: "general" as TemplateCategory });
  const [savingFrom, setSavingFrom] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // Preview modal
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [previewView, setPreviewView] = useState<"desktop" | "mobile">("desktop");

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/templates`);
      if (res.ok) {
        const data = await res.json();
        setPrebuilt(data.prebuilt);
        setCustom(data.custom);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to load templates.");
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
      setError("Failed to load templates. Please check your connection.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  async function handleUseTemplate(template: EmailTemplate) {
    setError(null);
    try {
      const res = await fetch(`${apiBase}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Campaign — ${template.name}`,
          content: template.content,
          template_id: template.id,
        }),
      });
      if (res.ok) {
        const { campaign } = await res.json();
        router.push(`${pageBase}/campaigns/${campaign.id}/edit`);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create campaign from template.");
      }
    } catch (err) {
      console.error("Failed to create campaign from template:", err);
      setError("Failed to create campaign. Please check your connection.");
    }
  }

  async function handleSaveAsCustom() {
    if (!savingFrom) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveForm.name || savingFrom.name,
          description: saveForm.description || savingFrom.description,
          category: saveForm.category,
          content: savingFrom.content,
        }),
      });
      if (res.ok) {
        setShowSaveModal(false);
        setSavingFrom(null);
        setSaveForm({ name: "", description: "", category: "general" });
        loadTemplates();
      }
    } catch (err) {
      console.error("Failed to save template:", err);
    }
    setSaving(false);
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    try {
      const res = await fetch(`${apiBase}/templates/${id}`, { method: "DELETE" });
      if (res.ok) loadTemplates();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  }

  const filteredPrebuilt = activeCategory === "all"
    ? prebuilt
    : prebuilt.filter((t) => t.category === activeCategory);

  const filteredCustom = activeCategory === "all"
    ? custom
    : custom.filter((t) => t.category === activeCategory);

  return (
    <div>
      <div className="mb-4">
        <p className="text-slate-500 text-sm">
          Reusable layouts and formats. Pick a layout as your starting point, then add your content.
        </p>
      </div>

      {/* Email / Social tab toggle */}
      <div className="flex gap-1 mb-6">
        <button
          onClick={() => setTemplateTab("email")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            templateTab === "email"
              ? "bg-brand-600 text-white"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          Email Layouts
        </button>
        <button
          onClick={() => setTemplateTab("social")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            templateTab === "social"
              ? "bg-brand-600 text-white"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          Social Templates
        </button>
      </div>

      {templateTab === "social" ? (
        <SocialTemplatesContent />
      ) : (
      <>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              activeCategory === tab.id
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pre-built Templates */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Pre-built Layouts</h2>
            {filteredPrebuilt.length === 0 ? (
              <p className="text-sm text-slate-400">No layouts in this category.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPrebuilt.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onUse={() => handleUseTemplate(template)}
                    onPreview={() => { setPreviewTemplate(template); setPreviewView("desktop"); }}
                    onSaveAs={() => {
                      setSavingFrom(template);
                      setSaveForm({
                        name: `${template.name} (custom)`,
                        description: template.description || "",
                        category: template.category,
                      });
                      setShowSaveModal(true);
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          {/* My Templates */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">My Layouts</h2>
            {filteredCustom.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <LayoutTemplate className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  No custom layouts yet. Save a pre-built layout or create one from a campaign.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCustom.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onUse={() => handleUseTemplate(template)}
                    onPreview={() => { setPreviewTemplate(template); setPreviewView("desktop"); }}
                    onDelete={() => handleDeleteTemplate(template.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      </>
      )}

      {/* Save Template Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Save as Custom Layout</h3>
              <button onClick={() => setShowSaveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={saveForm.name}
                  onChange={(e) => setSaveForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={saveForm.description}
                  onChange={(e) => setSaveForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={saveForm.category}
                  onChange={(e) => setSaveForm((f) => ({ ...f, category: e.target.value as TemplateCategory }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {CATEGORY_TABS.filter((t) => t.id !== "all").map((tab) => (
                    <option key={tab.id} value={tab.id}>{tab.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsCustom}
                disabled={saving || !saveForm.name.trim()}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{previewTemplate.name}</h3>
                <p className="text-sm text-slate-500 capitalize">
                  {previewTemplate.category.replace("_", " ")}
                  {previewTemplate.description ? ` — ${previewTemplate.description}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setPreviewView("desktop")}
                    className={`p-1.5 rounded-md transition-colors ${
                      previewView === "desktop"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPreviewView("mobile")}
                    className={`p-1.5 rounded-md transition-colors ${
                      previewView === "mobile"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-100 p-6 flex justify-center">
              <div
                className={`transition-all ${
                  previewView === "mobile" ? "w-[375px]" : "w-full max-w-[600px]"
                }`}
              >
                <iframe
                  srcDoc={renderEmailHtmlForPreview(previewTemplate.content)}
                  title="Template Preview"
                  className="w-full border-0 bg-white rounded-lg shadow-sm"
                  style={{ height: "600px" }}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleUseTemplate(previewTemplate);
                  setPreviewTemplate(null);
                }}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
              >
                Use This Layout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  onUse,
  onPreview,
  onSaveAs,
  onDelete,
}: {
  template: EmailTemplate;
  onUse: () => void;
  onPreview: () => void;
  onSaveAs?: () => void;
  onDelete?: () => void;
}) {
  const Icon = CATEGORY_ICONS[template.category] || LayoutTemplate;
  const colorClass = CATEGORY_COLORS[template.category] || "bg-slate-100 text-slate-600";
  const html = renderEmailHtmlForPreview(template.content);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 hover:shadow-md transition-all group">
      {/* Visual preview thumbnail */}
      <button
        onClick={onPreview}
        className="relative w-full h-48 overflow-hidden bg-slate-50 cursor-pointer block"
      >
        <iframe
          srcDoc={html}
          title={template.name}
          className="w-[600px] h-[600px] border-0 origin-top-left pointer-events-none"
          style={{ transform: "scale(0.40)", transformOrigin: "top left" }}
          sandbox=""
          tabIndex={-1}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-white/90 rounded-lg px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
              <Eye className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-xs font-medium text-slate-700">Preview</span>
            </div>
          </div>
        </div>
      </button>

      {/* Info + actions */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className={`w-7 h-7 rounded-md flex items-center justify-center ${colorClass}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colorClass}`}>
            {template.category.replace("_", " ")}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-slate-900 mb-0.5">{template.name}</h3>
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">
          {template.description || "No description"}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onUse}
            className="flex-1 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-medium hover:bg-brand-700 transition-colors"
          >
            Use Layout
          </button>
          {onSaveAs && (
            <button
              onClick={onSaveAs}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 hover:border-slate-300"
              title="Save as custom"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 hover:border-red-200"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
