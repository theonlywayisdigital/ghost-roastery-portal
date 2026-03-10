"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Save, Eye, ExternalLink, Loader2, Check, AlertCircle, ChevronDown, Plus, Settings, Trash2, X } from "@/components/icons";
import { useRouter } from "next/navigation";
import type { WebSection, WebsiteTheme } from "@/lib/website-sections/types";
import { SectionEditor } from "../../section-editor/SectionEditor";
import { AiGenerateButton } from "@/components/AiGenerateButton";
import type { ProductData } from "@/app/w/[domain]/_components/sections/FeaturedProductsSection";
import { NewPageModal } from "../NewPageModal";

interface PageEditorClientProps {
  pageId: string;
  pageTitle: string;
  pageSlug: string;
  initialSections: WebSection[];
  isPublished: boolean;
  theme: WebsiteTheme;
  roasterId: string;
  siteName?: string;
  logoUrl?: string;
  navPages?: { title: string; slug: string; is_nav_button?: boolean }[];
  allPages?: { id: string; title: string; slug: string; is_published: boolean }[];
  previewDomain?: string;
  metaTitle?: string;
  metaDescription?: string;
  products?: ProductData[];
  marketingTier?: string;
}

export function PageEditorClient({
  pageId,
  pageTitle,
  pageSlug,
  initialSections,
  isPublished,
  theme,
  roasterId,
  siteName,
  logoUrl,
  navPages,
  allPages = [],
  previewDomain,
  metaTitle: initialMetaTitle = "",
  metaDescription: initialMetaDescription = "",
  products,
  marketingTier,
}: PageEditorClientProps) {
  const router = useRouter();
  const [sections, setSections] = useState<WebSection[]>(initialSections);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [published, setPublished] = useState(isPublished);
  const [hasChanges, setHasChanges] = useState(false);
  const [pageDropdownOpen, setPageDropdownOpen] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Settings panel state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTitle, setSettingsTitle] = useState(pageTitle);
  const [settingsSlug, setSettingsSlug] = useState(pageSlug);
  const [settingsMetaTitle, setSettingsMetaTitle] = useState(initialMetaTitle);
  const [settingsMetaDescription, setSettingsMetaDescription] = useState(initialMetaDescription);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // New page modal
  const [newPageModalOpen, setNewPageModalOpen] = useState(false);

  // Close page dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPageDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSectionsChange = useCallback((newSections: WebSection[]) => {
    setSections(newSections);
    setHasChanges(true);
    setSaveStatus("idle");

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      doSave(newSections);
    }, 2000);
  }, [pageId]);

  const doSave = useCallback(async (sectionsToSave: WebSection[]) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/website/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: sectionsToSave }),
      });
      if (res.ok) {
        setSaveStatus("saved");
        setHasChanges(false);
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
    setSaving(false);
  }, [pageId]);

  const handleManualSave = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    doSave(sections);
  }, [sections, doSave]);

  const handleTogglePublish = useCallback(async () => {
    const newState = !published;
    const res = await fetch(`/api/website/pages/${pageId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: newState }),
    });
    if (res.ok) setPublished(newState);
  }, [published, pageId]);

  const handleSaveSettings = useCallback(async () => {
    setSettingsSaving(true);
    setSettingsError(null);
    try {
      const res = await fetch(`/api/website/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: settingsTitle,
          slug: settingsSlug,
          meta_title: settingsMetaTitle || null,
          meta_description: settingsMetaDescription || null,
        }),
      });
      if (res.ok) {
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 2000);
        // Refresh the page to pick up new title/slug
        router.refresh();
      } else {
        const data = await res.json();
        setSettingsError(data.error || "Failed to save settings");
      }
    } catch {
      setSettingsError("Failed to save settings");
    }
    setSettingsSaving(false);
  }, [pageId, settingsTitle, settingsSlug, settingsMetaTitle, settingsMetaDescription, router]);

  const handleDeletePage = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/website/pages/${pageId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/website/pages");
      }
    } catch {
      console.error("Delete failed");
    }
    setDeleting(false);
  }, [pageId, router]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasChanges) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [hasChanges]);

  // Build preview URL
  const previewUrl = previewDomain
    ? pageSlug === "home"
      ? `/w/${previewDomain}`
      : `/w/${previewDomain}/${pageSlug}`
    : null;

  const isHomePage = pageSlug === "home";

  return (
    // Break out of the portal layout padding to fill the viewport
    <div className="fixed inset-0 lg:left-64 z-40 flex flex-col bg-white">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          {/* Page dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setPageDropdownOpen(!pageDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="text-left">
                <h1 className="text-base font-bold text-slate-900 leading-tight">{pageTitle}</h1>
                <p className="text-slate-400 text-xs">/{pageSlug}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${pageDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {pageDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl border border-slate-200 shadow-xl z-50 py-1 max-h-80 overflow-y-auto">
                {allPages.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPageDropdownOpen(false);
                      if (p.id !== pageId) router.push(`/website/pages/${p.id}`);
                    }}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      p.id === pageId ? "bg-brand-50" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${p.id === pageId ? "text-brand-700" : "text-slate-900"}`}>
                        {p.title}
                      </p>
                      <p className="text-xs text-slate-400">/{p.slug}</p>
                    </div>
                    <span className={`shrink-0 ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      p.is_published
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {p.is_published ? "Published" : "Draft"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Settings gear icon */}
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              settingsOpen
                ? "bg-brand-50 text-brand-600"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            }`}
            title="Page settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Add Page */}
          <button
            onClick={() => setNewPageModalOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            title="Add new page"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Save status */}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5" /> Save failed
            </span>
          )}
          {saving && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
            </span>
          )}

          {/* Preview site button */}
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Preview
            </a>
          )}

          {published ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700">
                <Eye className="w-3.5 h-3.5" />
                Published
              </span>
              <button
                onClick={handleTogglePublish}
                className="text-xs text-slate-400 hover:text-red-600 transition-colors"
              >
                Unpublish
              </button>
            </div>
          ) : (
            <button
              onClick={handleTogglePublish}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Publish
            </button>
          )}
          <button
            onClick={handleManualSave}
            disabled={saving || !hasChanges}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {/* Main content area with optional settings panel */}
      <div className="flex-1 min-h-0 flex">
        {/* Section editor fills remaining space */}
        <div className="flex-1 min-h-0">
          <SectionEditor
            initialSections={sections}
            onChange={handleSectionsChange}
            theme={theme}
            roasterId={roasterId}
            siteName={siteName}
            logoUrl={logoUrl}
            pages={navPages}
            products={products}
          />
        </div>

        {/* Settings panel */}
        {settingsOpen && (
          <div className="w-80 border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-y-auto">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Page Settings</h3>
              <button
                onClick={() => setSettingsOpen(false)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-4 space-y-4 flex-1">
              {/* Page Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Page Title</label>
                <input
                  type="text"
                  value={settingsTitle}
                  onChange={(e) => setSettingsTitle(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>

              {/* Page Slug */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Page Slug</label>
                <div className="flex items-center">
                  <span className="text-sm text-slate-400 mr-1">/</span>
                  <input
                    type="text"
                    value={settingsSlug}
                    onChange={(e) => setSettingsSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">SEO</p>

                {/* SEO Meta Title */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-slate-700">Meta Title</label>
                    <AiGenerateButton
                      type="website_meta_title"
                      context={{ existingContent: settingsMetaTitle, pageTitle: settingsTitle }}
                      onSelect={(text) => setSettingsMetaTitle(text)}
                    />
                  </div>
                  <input
                    type="text"
                    value={settingsMetaTitle}
                    onChange={(e) => setSettingsMetaTitle(e.target.value)}
                    placeholder="Uses page title if empty"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    {settingsMetaTitle.length}/60 characters
                  </p>
                </div>

                {/* SEO Meta Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-slate-700">Meta Description</label>
                    <AiGenerateButton
                      type="website_meta_description"
                      context={{ existingContent: settingsMetaDescription, pageTitle: settingsTitle }}
                      onSelect={(text) => setSettingsMetaDescription(text)}
                    />
                  </div>
                  <textarea
                    value={settingsMetaDescription}
                    onChange={(e) => setSettingsMetaDescription(e.target.value)}
                    rows={3}
                    placeholder="Brief description for search engines"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    {settingsMetaDescription.length}/160 characters
                  </p>
                </div>
              </div>

              {/* Save Settings */}
              {settingsError && (
                <p className="text-xs text-red-600">{settingsError}</p>
              )}
              <button
                onClick={handleSaveSettings}
                disabled={settingsSaving}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {settingsSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {settingsSaving ? "Saving..." : settingsSaved ? "Saved!" : "Save Settings"}
              </button>

              {/* Delete Page */}
              <div className="border-t border-slate-100 pt-4">
                {isHomePage ? (
                  <p className="text-xs text-slate-400">The home page cannot be deleted.</p>
                ) : (
                  <>
                    {!confirmDelete ? (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Page
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-red-600 font-medium">
                          Are you sure? This cannot be undone.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmDelete(false)}
                            className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleDeletePage}
                            disabled={deleting}
                            className="flex-1 px-3 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            {deleting ? "Deleting..." : "Confirm"}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New page modal */}
      <NewPageModal
        open={newPageModalOpen}
        onClose={() => setNewPageModalOpen(false)}
        marketingTier={marketingTier}
      />
    </div>
  );
}
