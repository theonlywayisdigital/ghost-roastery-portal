"use client";

import { useState, useEffect, useRef } from "react";
import { defaultTheme } from "@/lib/website-sections/types";
import type { WebsiteTheme, NavLayout } from "@/lib/website-sections/types";
import { templateOptions } from "@/lib/website-templates";
import type { TemplateId } from "@/lib/website-templates";
import { Loader2, Eye, Menu, ImageIcon } from "@/components/icons";
import { TemplatePreviewModal } from "./TemplatePreviewModal";

const NAV_TEXT_SIZES: Record<string, number> = { small: 14, medium: 16, large: 18 };
const NAV_LOGO_SIZES: Record<string, number> = { small: 48, medium: 80, large: 120 };

interface DesignSettings {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  logoUrl?: string;
  borderRadius: WebsiteTheme["borderRadius"];
  navLayout: NavLayout;
  navBgColor: string;
  navTextColor: string;
  navTextSize: "small" | "medium" | "large";
  navLogoSize: "small" | "medium" | "large";
  navTextHoverColor: string;
  navButtonBgColor: string;
  navButtonTextColor: string;
  navButtonBorderColor: string;
  navButtonHoverBgColor: string;
  navButtonHoverTextColor: string;
  navButtonHoverBorderColor: string;
  templateId?: string;
}

const fontOptions = [
  // Sans-Serif
  { value: "Inter, system-ui, sans-serif", label: "Inter", group: "Sans-Serif" },
  { value: "Figtree, system-ui, sans-serif", label: "Figtree", group: "Sans-Serif" },
  { value: "DM Sans, system-ui, sans-serif", label: "DM Sans", group: "Sans-Serif" },
  { value: "Plus Jakarta Sans, system-ui, sans-serif", label: "Plus Jakarta Sans", group: "Sans-Serif" },
  { value: "Outfit, system-ui, sans-serif", label: "Outfit", group: "Sans-Serif" },
  { value: "Space Grotesk, system-ui, sans-serif", label: "Space Grotesk", group: "Sans-Serif" },
  { value: "Manrope, system-ui, sans-serif", label: "Manrope", group: "Sans-Serif" },
  // Serif
  { value: "Playfair Display, serif", label: "Playfair Display", group: "Serif" },
  { value: "Lora, serif", label: "Lora", group: "Serif" },
  { value: "Merriweather, serif", label: "Merriweather", group: "Serif" },
  { value: "Source Serif 4, serif", label: "Source Serif 4", group: "Serif" },
  { value: "Cormorant Garamond, serif", label: "Cormorant Garamond", group: "Serif" },
  { value: "Georgia, serif", label: "Georgia", group: "Serif" },
  // System
  { value: "system-ui, sans-serif", label: "System Default", group: "System" },
];

const fontGroups = ["Sans-Serif", "Serif", "System"] as const;

export default function DesignPage() {
  const [settings, setSettings] = useState<DesignSettings>({
    primaryColor: defaultTheme.primaryColor,
    accentColor: defaultTheme.accentColor,
    backgroundColor: defaultTheme.backgroundColor,
    textColor: defaultTheme.textColor,
    headingFont: defaultTheme.headingFont,
    bodyFont: defaultTheme.bodyFont,
    borderRadius: defaultTheme.borderRadius,
    navLayout: defaultTheme.navLayout ?? "logo-left",
    navBgColor: defaultTheme.navBgColor ?? "#ffffff",
    navTextColor: defaultTheme.navTextColor ?? "#475569",
    navTextSize: defaultTheme.navTextSize ?? "medium",
    navLogoSize: defaultTheme.navLogoSize ?? "medium",
    navTextHoverColor: defaultTheme.navTextHoverColor ?? "#0f172a",
    navButtonBgColor: defaultTheme.navButtonBgColor ?? "#0f172a",
    navButtonTextColor: defaultTheme.navButtonTextColor ?? "#ffffff",
    navButtonBorderColor: defaultTheme.navButtonBorderColor ?? "#0f172a",
    navButtonHoverBgColor: defaultTheme.navButtonHoverBgColor ?? "#1e293b",
    navButtonHoverTextColor: defaultTheme.navButtonHoverTextColor ?? "#ffffff",
    navButtonHoverBorderColor: defaultTheme.navButtonHoverBorderColor ?? "#1e293b",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [confirmTemplate, setConfirmTemplate] = useState<TemplateId | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateId | null>(null);
  const [siteName, setSiteName] = useState("My Roastery");
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Load current settings
  useEffect(() => {
    fetch("/api/website/design")
      .then((r) => r.json())
      .then((data) => {
        if (data.siteName) setSiteName(data.siteName);
        if (data.brandLogoUrl) setBrandLogoUrl(data.brandLogoUrl);
        if (data.settings) {
          setSettings((prev) => ({
            ...prev,
            ...data.settings,
            // Migrate old navStyle to new defaults if present
            navLayout: data.settings.navLayout ?? prev.navLayout,
            navBgColor: data.settings.navBgColor ?? prev.navBgColor,
            navTextColor: data.settings.navTextColor ?? prev.navTextColor,
            navTextSize: data.settings.navTextSize ?? prev.navTextSize,
            navLogoSize: data.settings.navLogoSize ?? prev.navLogoSize,
            navTextHoverColor: data.settings.navTextHoverColor ?? prev.navTextHoverColor,
            navButtonBgColor: data.settings.navButtonBgColor ?? prev.navButtonBgColor,
            navButtonTextColor: data.settings.navButtonTextColor ?? prev.navButtonTextColor,
            navButtonBorderColor: data.settings.navButtonBorderColor ?? prev.navButtonBorderColor,
            navButtonHoverBgColor: data.settings.navButtonHoverBgColor ?? prev.navButtonHoverBgColor,
            navButtonHoverTextColor: data.settings.navButtonHoverTextColor ?? prev.navButtonHoverTextColor,
            navButtonHoverBorderColor: data.settings.navButtonHoverBorderColor ?? prev.navButtonHoverBorderColor,
          }));
        }
      })
      .catch(console.error);
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/website/design", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleApplyTemplate(templateId: TemplateId) {
    setApplyingTemplate(true);
    try {
      await fetch("/api/website/scaffold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: templateId }),
      });
      setConfirmTemplate(null);
      window.location.reload();
    } catch (err) {
      console.error("Template apply failed:", err);
    } finally {
      setApplyingTemplate(false);
    }
  }

  function update(partial: Partial<DesignSettings>) {
    setSettings((prev) => ({ ...prev, ...partial }));
  }

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        console.error("Logo upload failed:", data.error);
        return;
      }
      update({ logoUrl: data.url });
    } catch (err) {
      console.error("Logo upload failed:", err);
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Design</h1>
          <p className="text-slate-500 text-sm mt-1">Customise your website&apos;s look and feel.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {/* Logo */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Logo</h2>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-xs text-slate-500 mb-4">
            Upload a logo specifically for your website, or fall back to your branding logo.
          </p>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleLogoUpload(file);
              e.target.value = "";
            }}
            className="hidden"
          />
          {(settings.logoUrl || brandLogoUrl) ? (
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={settings.logoUrl ?? brandLogoUrl!}
                alt="Logo"
                className="max-h-28 max-w-[280px] w-auto h-auto object-contain rounded-lg border border-slate-200 bg-white p-2"
              />
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium disabled:opacity-50"
                >
                  {uploadingLogo ? "Uploading…" : settings.logoUrl ? "Replace" : "Upload website logo"}
                </button>
                {settings.logoUrl && (
                  <button
                    type="button"
                    onClick={() => update({ logoUrl: undefined })}
                    className="text-sm text-slate-400 hover:text-slate-600"
                  >
                    Remove override
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="w-full border-2 border-dashed border-slate-300 rounded-lg py-6 flex flex-col items-center gap-1.5 text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors disabled:opacity-50"
            >
              {uploadingLogo ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <ImageIcon className="w-6 h-6" />
              )}
              <span className="text-sm font-medium">
                {uploadingLogo ? "Uploading…" : "Upload logo"}
              </span>
            </button>
          )}
          {!settings.logoUrl && brandLogoUrl && (
            <p className="text-xs text-slate-400 mt-3">
              Using logo from{" "}
              <a href="/settings/branding" className="text-brand-600 hover:text-brand-700 font-medium">
                Branding settings
              </a>
            </p>
          )}
          {!settings.logoUrl && !brandLogoUrl && (
            <p className="text-xs text-slate-400 mt-3">
              No logo set. You can also set a global logo in{" "}
              <a href="/settings/branding" className="text-brand-600 hover:text-brand-700 font-medium">
                Branding settings
              </a>
            </p>
          )}
        </div>
      </section>

      {/* Template Selection */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Template</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templateOptions.map((tmpl) => (
            <div
              key={tmpl.id}
              className={`bg-white rounded-xl border-2 p-5 ${
                settings.templateId === tmpl.id
                  ? "border-brand-600 bg-brand-50/50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <h3 className="font-semibold text-slate-900">{tmpl.name}</h3>
              <p className="text-sm text-slate-500 mt-1 mb-4">{tmpl.description}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPreviewTemplate(tmpl.id)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </button>
                <button
                  onClick={() => setConfirmTemplate(tmpl.id)}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  {settings.templateId === tmpl.id ? "Re-apply Template" : "Apply Template"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Template confirmation dialog */}
        {confirmTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmTemplate(null)} />
            <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Apply Template?</h3>
              <p className="text-sm text-slate-500 mb-6">
                This will replace all pages with the template&apos;s default content. Your current content will be lost. This cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmTemplate(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApplyTemplate(confirmTemplate)}
                  disabled={applyingTemplate}
                  className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {applyingTemplate ? "Applying..." : "Apply Template"}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Navigation Layout */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Navigation Layout</h2>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {(
            [
              { id: "logo-left" as const, label: "Logo Left", desc: "Logo left, links centre, buttons right" },
              { id: "logo-center" as const, label: "Logo Center", desc: "Logo centred with links below" },
              { id: "logo-minimal" as const, label: "Minimal", desc: "Logo left, hamburger menu on all screens" },
            ]
          ).map((layout) => (
            <button
              key={layout.id}
              onClick={() => update({ navLayout: layout.id })}
              className={`text-left rounded-xl border-2 p-3 transition-colors ${
                settings.navLayout === layout.id
                  ? "border-brand-600 bg-brand-50/50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* Mini nav preview */}
              <div
                className="rounded-md h-10 flex flex-col justify-center px-2.5 mb-2"
                style={{ backgroundColor: settings.navBgColor, border: "1px solid #e2e8f0" }}
              >
                {layout.id === "logo-left" && (
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-2.5 rounded" style={{ backgroundColor: settings.navTextColor, opacity: 0.8 }} />
                    <div className="flex gap-1.5">
                      <div className="w-5 h-1.5 rounded" style={{ backgroundColor: settings.navTextColor, opacity: 0.4 }} />
                      <div className="w-5 h-1.5 rounded" style={{ backgroundColor: settings.navTextColor, opacity: 0.4 }} />
                      <div className="w-5 h-1.5 rounded" style={{ backgroundColor: settings.navTextColor, opacity: 0.4 }} />
                    </div>
                  </div>
                )}
                {layout.id === "logo-center" && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-2 rounded" style={{ backgroundColor: settings.navTextColor, opacity: 0.8 }} />
                    <div className="flex gap-1.5">
                      <div className="w-4 h-1 rounded" style={{ backgroundColor: settings.navTextColor, opacity: 0.4 }} />
                      <div className="w-4 h-1 rounded" style={{ backgroundColor: settings.navTextColor, opacity: 0.4 }} />
                      <div className="w-4 h-1 rounded" style={{ backgroundColor: settings.navTextColor, opacity: 0.4 }} />
                    </div>
                  </div>
                )}
                {layout.id === "logo-minimal" && (
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-2.5 rounded" style={{ backgroundColor: settings.navTextColor, opacity: 0.8 }} />
                    <div className="flex flex-col gap-0.5">
                      <div className="w-4 h-0.5 rounded" style={{ backgroundColor: settings.navTextColor, opacity: 0.5 }} />
                      <div className="w-4 h-0.5 rounded" style={{ backgroundColor: settings.navTextColor, opacity: 0.5 }} />
                      <div className="w-4 h-0.5 rounded" style={{ backgroundColor: settings.navTextColor, opacity: 0.5 }} />
                    </div>
                  </div>
                )}
              </div>
              <p className="text-sm font-semibold text-slate-900">{layout.label}</p>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{layout.desc}</p>
            </button>
          ))}
        </div>

        {/* Nav Appearance */}
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Nav Appearance</h3>
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ColorField label="Background Colour" value={settings.navBgColor} onChange={(navBgColor) => update({ navBgColor })} />
            <ColorField label="Text Colour" value={settings.navTextColor} onChange={(navTextColor) => update({ navTextColor })} />
            <ColorField label="Text Hover Colour" value={settings.navTextHoverColor} onChange={(navTextHoverColor) => update({ navTextHoverColor })} />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Menu Text Size</label>
              <select
                value={settings.navTextSize}
                onChange={(e) => update({ navTextSize: e.target.value as DesignSettings["navTextSize"] })}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="small">Small (14px)</option>
                <option value="medium">Medium (16px)</option>
                <option value="large">Large (18px)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Logo Size</label>
              <select
                value={settings.navLogoSize}
                onChange={(e) => update({ navLogoSize: e.target.value as DesignSettings["navLogoSize"] })}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="small">Small (48px)</option>
                <option value="medium">Medium (80px)</option>
                <option value="large">Large (120px)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Button Style */}
        <h3 className="text-sm font-semibold text-slate-700 mb-3 mt-6">Button Style</h3>
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <p className="text-xs text-slate-500 mb-4">Customise the appearance of navigation buttons.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
            <ColorField label="Background" value={settings.navButtonBgColor} onChange={(navButtonBgColor) => update({ navButtonBgColor })} />
            <ColorField label="Text" value={settings.navButtonTextColor} onChange={(navButtonTextColor) => update({ navButtonTextColor })} />
            <ColorField label="Border" value={settings.navButtonBorderColor} onChange={(navButtonBorderColor) => update({ navButtonBorderColor })} />
          </div>
          <p className="text-xs text-slate-500 mb-3 font-medium">Hover State</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <ColorField label="Background" value={settings.navButtonHoverBgColor} onChange={(navButtonHoverBgColor) => update({ navButtonHoverBgColor })} />
            <ColorField label="Text" value={settings.navButtonHoverTextColor} onChange={(navButtonHoverTextColor) => update({ navButtonHoverTextColor })} />
            <ColorField label="Border" value={settings.navButtonHoverBorderColor} onChange={(navButtonHoverBorderColor) => update({ navButtonHoverBorderColor })} />
          </div>
        </div>

        {/* Live Nav Preview */}
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Nav Preview</h3>
        <NavPreview settings={settings} logoUrl={settings.logoUrl ?? brandLogoUrl ?? undefined} siteName={siteName} />
      </section>

      {/* Theme Customisation */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Theme</h2>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <ColorField label="Primary Colour" value={settings.primaryColor} onChange={(primaryColor) => update({ primaryColor })} />
            <ColorField label="Accent Colour" value={settings.accentColor} onChange={(accentColor) => update({ accentColor })} />
            <ColorField label="Background Colour" value={settings.backgroundColor} onChange={(backgroundColor) => update({ backgroundColor })} />
            <ColorField label="Text Colour" value={settings.textColor} onChange={(textColor) => update({ textColor })} />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Heading Font</label>
              <select
                value={settings.headingFont}
                onChange={(e) => update({ headingFont: e.target.value })}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              >
                {fontGroups.map((group) => (
                  <optgroup key={group} label={group}>
                    {fontOptions
                      .filter((f) => f.group === group)
                      .map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Body Font</label>
              <select
                value={settings.bodyFont}
                onChange={(e) => update({ bodyFont: e.target.value })}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              >
                {fontGroups.map((group) => (
                  <optgroup key={group} label={group}>
                    {fontOptions
                      .filter((f) => f.group === group)
                      .map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Border Radius</label>
              <select
                value={settings.borderRadius}
                onChange={(e) => update({ borderRadius: e.target.value as WebsiteTheme["borderRadius"] })}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="sharp">Sharp</option>
                <option value="rounded">Rounded</option>
                <option value="pill">Pill</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Preview */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Preview</h2>
        <div
          className="rounded-xl overflow-hidden border border-slate-200 p-8"
          style={{
            backgroundColor: settings.backgroundColor,
            color: settings.textColor,
            fontFamily: settings.bodyFont,
          }}
        >
          <h3
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: settings.headingFont }}
          >
            Preview Heading
          </h3>
          <p className="opacity-70 mb-4">
            This is how your website text will look with the current theme settings.
          </p>
          <div className="flex gap-3">
            <div
              className="px-5 py-2.5 rounded-lg text-sm font-semibold"
              style={{
                backgroundColor: settings.primaryColor,
                color: settings.backgroundColor,
              }}
            >
              Primary Button
            </div>
            <div
              className="px-5 py-2.5 rounded-lg text-sm font-semibold border-2"
              style={{
                borderColor: settings.accentColor,
                color: settings.accentColor,
              }}
            >
              Secondary Button
            </div>
          </div>
        </div>
      </section>

      {/* Template Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          templateId={previewTemplate}
          templateName={templateOptions.find((t) => t.id === previewTemplate)?.name ?? "Template"}
          theme={{
            primaryColor: settings.primaryColor,
            accentColor: settings.accentColor,
            backgroundColor: settings.backgroundColor,
            textColor: settings.textColor,
            headingFont: settings.headingFont,
            bodyFont: settings.bodyFont,
            borderRadius: settings.borderRadius,
            navLayout: settings.navLayout,
            navBgColor: settings.navBgColor,
            navTextColor: settings.navTextColor,
          }}
          onClose={() => setPreviewTemplate(null)}
          onApply={() => {
            setPreviewTemplate(null);
            setConfirmTemplate(previewTemplate);
          }}
        />
      )}
    </div>
  );
}

function NavPreview({ settings, logoUrl, siteName }: { settings: DesignSettings; logoUrl?: string; siteName: string }) {
  const textSize = NAV_TEXT_SIZES[settings.navTextSize] ?? 16;
  const logoHeight = NAV_LOGO_SIZES[settings.navLogoSize] ?? 60;
  const bgColor = settings.navBgColor;
  const textColor = settings.navTextColor;
  const textHoverColor = settings.navTextHoverColor;
  const layout = settings.navLayout;

  const sampleLinks = ["Shop", "About", "Contact"];
  const activeButtons = ["Shop"] as string[];

  const logoEl = logoUrl ? (
    <img src={logoUrl} alt={siteName} style={{ height: logoHeight }} className="w-auto" />
  ) : (
    <span
      className="font-bold whitespace-nowrap"
      style={{
        fontFamily: settings.headingFont,
        color: textColor,
        fontSize: Math.max(16, logoHeight * 0.4),
      }}
    >
      {siteName}
    </span>
  );

  const linksEl = sampleLinks.map((link) => (
    <span
      key={link}
      className="font-medium cursor-default transition-colors"
      style={{ color: textColor, fontSize: textSize }}
      onMouseEnter={(e) => (e.currentTarget.style.color = textHoverColor)}
      onMouseLeave={(e) => (e.currentTarget.style.color = textColor)}
    >
      {link}
    </span>
  ));

  const ctaEl = activeButtons.length > 0 && activeButtons.map((label) => (
    <span
      key={label}
      className="font-semibold rounded-lg cursor-default transition-colors"
      style={{
        fontSize: textSize - 1,
        color: settings.navButtonTextColor,
        backgroundColor: settings.navButtonBgColor,
        border: `1px solid ${settings.navButtonBorderColor}`,
        padding: "8px 20px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = settings.navButtonHoverBgColor;
        e.currentTarget.style.color = settings.navButtonHoverTextColor;
        e.currentTarget.style.borderColor = settings.navButtonHoverBorderColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = settings.navButtonBgColor;
        e.currentTarget.style.color = settings.navButtonTextColor;
        e.currentTarget.style.borderColor = settings.navButtonBorderColor;
      }}
    >
      {label}
    </span>
  ));

  return (
    <div
      className="rounded-xl border border-slate-200 overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      {layout === "logo-left" && (
        <nav className="flex items-center justify-between px-6" style={{ height: Math.max(64, logoHeight + 24) }}>
          {logoEl}
          <div className="flex items-center gap-5">
            {linksEl}
            {ctaEl}
          </div>
        </nav>
      )}

      {layout === "logo-center" && (
        <div>
          <div className="flex items-center justify-center py-3">
            {logoEl}
          </div>
          <nav className="flex items-center justify-center gap-5 pb-3">
            {linksEl}
            {ctaEl}
          </nav>
        </div>
      )}

      {layout === "logo-minimal" && (
        <nav className="flex items-center justify-between px-6" style={{ height: Math.max(64, logoHeight + 24) }}>
          {logoEl}
          <Menu className="w-5 h-5" color={textColor} />
        </nav>
      )}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 font-mono"
        />
      </div>
    </div>
  );
}
