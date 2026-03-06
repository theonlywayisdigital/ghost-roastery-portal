"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Layout, BookOpen, Eye } from "lucide-react";
import { defaultTheme } from "@/lib/website-sections/types";
import type { TemplateId } from "@/lib/website-templates";
import { TemplatePreviewModal } from "../design/TemplatePreviewModal";

const TEMPLATES: { id: TemplateId; name: string; description: string; icon: typeof Layout }[] = [
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description: "Clean, minimal design with lots of whitespace and sans-serif fonts.",
    icon: Layout,
  },
  {
    id: "classic-traditional",
    name: "Classic Traditional",
    description: "Warmer, more traditional feel with richer colours and serif headings.",
    icon: BookOpen,
  },
];

export function ScaffoldPages() {
  const router = useRouter();
  const [selected, setSelected] = useState<TemplateId>("modern-minimal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<TemplateId | null>(null);

  async function handleSetUp(templateId?: TemplateId) {
    const template = templateId ?? selected;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/website/scaffold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Something went wrong");
    }
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8">
      <div className="max-w-lg mx-auto text-center">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          Set up your website
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Choose a template to get started. This will create 6 default pages
          (Home, About, Shop, Wholesale, Blog, Contact) pre-filled with content
          you can customise.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {TEMPLATES.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`text-left p-4 rounded-xl border-2 transition-colors ${
                  selected === t.id
                    ? "border-brand-600 bg-brand-50/50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-900">{t.name}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">{t.description}</p>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewTemplate(t.id);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}

        <button
          onClick={() => handleSetUp()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Creating pages..." : "Set up website"}
        </button>
      </div>

      {/* Template Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          templateId={previewTemplate}
          templateName={TEMPLATES.find((t) => t.id === previewTemplate)?.name ?? "Template"}
          theme={defaultTheme}
          onClose={() => setPreviewTemplate(null)}
          onApply={() => {
            const tmpl = previewTemplate;
            setPreviewTemplate(null);
            setSelected(tmpl);
            handleSetUp(tmpl);
          }}
        />
      )}
    </div>
  );
}
