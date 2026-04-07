"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Loader2,
  Lock,
  FileText,
  Layout,
  ShoppingBag,
  Calendar,
  Mail,
  HelpCircle,
  Truck,
  Newspaper,
  Coffee,
  Image,
} from "@/components/icons";
import { createDefaultSection } from "@/lib/website-sections/defaults";
import type { SectionType } from "@/lib/website-sections/types";

interface PageTemplate {
  name: string;
  description: string;
  defaultSlug: string;
  icon: React.ComponentType<{ className?: string }>;
  sections: SectionType[];
  requiresPaidMarketing?: boolean;
}

const PAGE_TEMPLATES: PageTemplate[] = [
  {
    name: "Blank Page",
    description: "Start from scratch with an empty page.",
    defaultSlug: "untitled",
    icon: FileText,
    sections: [],
  },
  {
    name: "Landing Page",
    description: "Hero, products, testimonials, CTA, and newsletter.",
    defaultSlug: "landing",
    icon: Layout,
    sections: ["hero", "featured_products", "cta_banner", "testimonials", "newsletter"],
  },
  {
    name: "About",
    description: "Tell your story with team members and a call to action.",
    defaultSlug: "about",
    icon: FileText,
    sections: ["hero_split", "about", "about_team", "cta_banner"],
  },
  {
    name: "Shop",
    description: "Full product catalogue with search and filters.",
    defaultSlug: "shop",
    icon: ShoppingBag,
    sections: ["all_products"],
  },
  {
    name: "Events",
    description: "Showcase upcoming tastings, workshops, and more.",
    defaultSlug: "events",
    icon: Calendar,
    sections: ["hero_split", "events", "location", "cta_banner"],
  },
  {
    name: "Contact",
    description: "Contact form, FAQ, and location map.",
    defaultSlug: "contact",
    icon: Mail,
    sections: ["contact_form", "faq", "location"],
  },
  {
    name: "Wholesale",
    description: "Trade information, pricing, and enquiry form.",
    defaultSlug: "wholesale",
    icon: Truck,
    sections: ["wholesale_info", "pricing_table", "contact_form"],
  },
  {
    name: "FAQ",
    description: "Frequently asked questions with a CTA.",
    defaultSlug: "faq",
    icon: HelpCircle,
    sections: ["faq", "cta_banner"],
  },
  {
    name: "Blog",
    description: "Display your latest blog posts.",
    defaultSlug: "blog",
    icon: Newspaper,
    sections: ["blog_latest"],
    requiresPaidMarketing: true,
  },
  {
    name: "Brewing Guide",
    description: "Interactive step-by-step brewing methods.",
    defaultSlug: "brewing",
    icon: Coffee,
    sections: ["brewing_guide"],
  },
  {
    name: "Gallery",
    description: "Photo gallery with a call to action.",
    defaultSlug: "gallery",
    icon: Image,
    sections: ["image_gallery", "cta_banner"],
  },
];

interface NewPageModalProps {
  open: boolean;
  onClose: () => void;
  marketingTier?: string;
}

export function NewPageModal({ open, onClose, marketingTier }: NewPageModalProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PageTemplate | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const isFree = !marketingTier;

  function handleSelectTemplate(template: PageTemplate) {
    if (template.requiresPaidMarketing && isFree) return;
    setSelectedTemplate(template);
    setTitle(template.name === "Blank Page" ? "" : template.name);
    setError(null);
  }

  function handleBack() {
    setSelectedTemplate(null);
    setTitle("");
    setError(null);
  }

  async function handleCreate() {
    if (!selectedTemplate) return;
    const pageTitle = title.trim() || selectedTemplate.name;
    const slug = pageTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      || selectedTemplate.defaultSlug;

    setCreating(true);
    setError(null);

    try {
      const content = selectedTemplate.sections.map((type) => createDefaultSection(type));

      const res = await fetch("/api/website/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: pageTitle, slug, content }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create page");
        setCreating(false);
        return;
      }

      const data = await res.json();
      onClose();
      router.push(`/website/pages/${data.page.id}`);
    } catch {
      setError("Failed to create page");
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {selectedTemplate ? "Name your page" : "Choose a template"}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {selectedTemplate
                ? `Creating a ${selectedTemplate.name} page`
                : "Pick a starting point for your new page."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedTemplate ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PAGE_TEMPLATES.map((template) => {
                const locked = template.requiresPaidMarketing && isFree;
                const Icon = template.icon;
                return (
                  <button
                    key={template.name}
                    onClick={() => handleSelectTemplate(template)}
                    disabled={locked}
                    className={`relative text-left p-4 rounded-xl border transition-all ${
                      locked
                        ? "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
                        : "border-slate-200 hover:border-brand-300 hover:shadow-md cursor-pointer"
                    }`}
                  >
                    {locked && (
                      <div className="absolute top-3 right-3">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    )}
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${
                        locked ? "bg-slate-100 text-slate-400" : "bg-brand-50 text-brand-600"
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900 mb-0.5">{template.name}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{template.description}</p>
                    {locked && (
                      <p className="text-[10px] text-amber-600 font-medium mt-2">Requires paid Marketing plan</p>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="max-w-sm mx-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Page Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={selectedTemplate.name}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !creating) handleCreate();
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  {`Slug: /${(title.trim() || selectedTemplate.name).toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || selectedTemplate.defaultSlug}`}
                </p>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
          {selectedTemplate ? (
            <>
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="inline-flex items-center gap-2 px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {creating ? "Creating..." : "Create Page"}
              </button>
            </>
          ) : (
            <>
              <div />
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
