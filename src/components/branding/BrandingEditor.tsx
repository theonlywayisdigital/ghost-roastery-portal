"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Loader2,
  ImageIcon,
  Check,
  ChevronDown,
  Instagram,
  Facebook,
  TikTok,
} from "@/components/icons";
import {
  FONT_LIBRARY,
  FONT_CATEGORIES,
  FONT_CATEGORY_LABELS,
  loadGoogleFont,
  type FontOption,
} from "@/lib/fonts";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface BrandingValues {
  brand_logo_url: string;
  brand_primary_colour: string;
  brand_accent_colour: string;
  brand_heading_font: string;
  brand_body_font: string;
  brand_tagline: string;
  business_name: string;
  // Extended fields
  storefront_button_colour: string;
  storefront_button_text_colour: string;
  storefront_bg_colour: string;
  storefront_text_colour: string;
  storefront_button_style: "sharp" | "rounded" | "pill";
  storefront_logo_size: "small" | "medium" | "large";
  brand_hero_image_url: string;
  brand_instagram: string;
  brand_facebook: string;
  brand_tiktok: string;
}

interface BrandingEditorProps {
  apiEndpoint: string;
  businessName: string;
  initialValues: BrandingValues;
  businessNameEditable?: boolean;
  businessNameEditHref?: string;
}

const inputClassName =
  "w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm";

export function BrandingEditor({
  apiEndpoint,
  businessName,
  initialValues,
  businessNameEditHref,
}: BrandingEditorProps) {
  // Core brand fields
  const [logoUrl, setLogoUrl] = useState(initialValues.brand_logo_url);
  const [primaryColour, setPrimaryColour] = useState(initialValues.brand_primary_colour);
  const [accentColour, setAccentColour] = useState(initialValues.brand_accent_colour);
  const [headingFont, setHeadingFont] = useState(initialValues.brand_heading_font);
  const [bodyFont, setBodyFont] = useState(initialValues.brand_body_font);
  const [tagline, setTagline] = useState(initialValues.brand_tagline);

  // Extended brand fields
  const [buttonColour, setButtonColour] = useState(initialValues.storefront_button_colour);
  const [buttonTextColour, setButtonTextColour] = useState(initialValues.storefront_button_text_colour);
  const [bgColour, setBgColour] = useState(initialValues.storefront_bg_colour);
  const [textColour, setTextColour] = useState(initialValues.storefront_text_colour);
  const [buttonStyle, setButtonStyle] = useState<"sharp" | "rounded" | "pill">(initialValues.storefront_button_style);
  const [logoSize, setLogoSize] = useState<"small" | "medium" | "large">(initialValues.storefront_logo_size);
  const [heroImageUrl] = useState(initialValues.brand_hero_image_url);
  const [instagram, setInstagram] = useState(initialValues.brand_instagram);
  const [facebook, setFacebook] = useState(initialValues.brand_facebook);
  const [tiktok, setTiktok] = useState(initialValues.brand_tiktok);

  // UI state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Resolve font families for preview
  const headingFamily = resolveFamily(headingFont);
  const bodyFamily = resolveFamily(bodyFont);

  // Derived values for preview
  const effectiveButtonColour = buttonColour || accentColour;
  const effectiveButtonTextColour = buttonTextColour || "#ffffff";
  const buttonRadius = { sharp: "0px", rounded: "6px", pill: "9999px" }[buttonStyle];
  const logoHeight = { small: 80, medium: 120, large: 160 }[logoSize];
  const previewLogoHeight = Math.round(logoHeight * 0.6);

  // Load selected fonts for preview
  useEffect(() => {
    loadGoogleFont(headingFamily);
    loadGoogleFont(bodyFamily);
  }, [headingFamily, bodyFamily]);

  async function handleUpload(
    file: File,
    setUrl: (url: string) => void,
    setUploading: (v: boolean) => void
  ) {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      setUrl(data.url);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch(apiEndpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_logo_url: logoUrl || null,
          brand_primary_colour: primaryColour,
          brand_accent_colour: accentColour,
          brand_heading_font: headingFont,
          brand_body_font: bodyFont,
          brand_tagline: tagline || null,
          storefront_button_colour: buttonColour || null,
          storefront_button_text_colour: buttonTextColour || null,
          storefront_bg_colour: bgColour || null,
          storefront_text_colour: textColour || null,
          storefront_button_style: buttonStyle,
          storefront_logo_size: logoSize,
          brand_hero_image_url: heroImageUrl || null,
          brand_instagram: instagram || null,
          brand_facebook: facebook || null,
          brand_tiktok: tiktok || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [apiEndpoint, logoUrl, primaryColour, accentColour, headingFont, bodyFont, tagline, buttonColour, buttonTextColour, bgColour, textColour, buttonStyle, logoSize, heroImageUrl, instagram, facebook, tiktok]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Editor column */}
      <div className="space-y-6">
        {/* Logo */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Logo</h3>
          <p className="text-xs text-slate-500 mb-4">
            Your logo appears on invoices, emails, and your wholesale portal
          </p>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file, setLogoUrl, setUploadingLogo);
              e.target.value = "";
            }}
            className="hidden"
          />
          {logoUrl ? (
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt="Logo"
                className="max-h-28 max-w-[280px] w-auto h-auto object-contain rounded-lg border border-slate-200 bg-white p-2"
              />
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => setLogoUrl("")}
                  className="text-sm text-slate-400 hover:text-slate-600"
                >
                  Remove
                </button>
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

          {/* Logo size */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Logo size
            </label>
            <p className="text-xs text-slate-500 mb-2">Controls logo display size on your wholesale portal</p>
            <select
              value={logoSize}
              onChange={(e) => setLogoSize(e.target.value as "small" | "medium" | "large")}
              className={inputClassName}
            >
              <option value="small">Small (80px)</option>
              <option value="medium">Medium (120px)</option>
              <option value="large">Large (160px)</option>
            </select>
          </div>
        </div>

        {/* Colours */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Colours</h3>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Primary colour
                </label>
                <p className="text-xs text-slate-500 mb-2">Headings, navigation, and key elements</p>
                <ColorField value={primaryColour} onChange={setPrimaryColour} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Accent colour
                </label>
                <p className="text-xs text-slate-500 mb-2">Links and highlights</p>
                <ColorField value={accentColour} onChange={setAccentColour} />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Button colour
                  </label>
                  <p className="text-xs text-slate-500 mb-2">CTA buttons across your portal</p>
                  <ColorField value={buttonColour || accentColour} onChange={setButtonColour} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Button text colour
                  </label>
                  <p className="text-xs text-slate-500 mb-2">Text on your buttons</p>
                  <ColorField value={buttonTextColour || "#ffffff"} onChange={setButtonTextColour} />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Background colour
                  </label>
                  <p className="text-xs text-slate-500 mb-2">Page background on your portal</p>
                  <ColorField value={bgColour || "#ffffff"} onChange={setBgColour} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Text colour
                  </label>
                  <p className="text-xs text-slate-500 mb-2">Body text on your portal</p>
                  <ColorField value={textColour || "#0f172a"} onChange={setTextColour} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Button Style */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Button Style</h3>
          <p className="text-xs text-slate-500 mb-4">
            Choose the corner style for buttons on your wholesale portal
          </p>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { id: "sharp" as const, label: "Sharp", radius: "0px" },
                { id: "rounded" as const, label: "Rounded", radius: "8px" },
                { id: "pill" as const, label: "Pill", radius: "9999px" },
              ] as const
            ).map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => setButtonStyle(style.id)}
                className={`text-center rounded-lg border-2 p-3 transition-colors ${
                  buttonStyle === style.id
                    ? "border-brand-600 bg-brand-50/50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex justify-center mb-2">
                  <div
                    className="h-8 w-24 flex items-center justify-center text-xs font-semibold"
                    style={{
                      backgroundColor: effectiveButtonColour,
                      color: effectiveButtonTextColour,
                      borderRadius: style.radius,
                    }}
                  >
                    Button
                  </div>
                </div>
                <p className="text-xs font-medium text-slate-700">
                  {style.label}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Fonts */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Fonts</h3>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Heading font
              </label>
              <FontSelector
                value={headingFont}
                onChange={setHeadingFont}
              />
              <p
                className="mt-2 text-base text-slate-700"
                style={{ fontFamily: `"${headingFamily}", sans-serif` }}
              >
                This is your heading font
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Body font
              </label>
              <FontSelector
                value={bodyFont}
                onChange={setBodyFont}
              />
              <p
                className="mt-2 text-sm text-slate-600"
                style={{ fontFamily: `"${bodyFamily}", sans-serif` }}
              >
                This is your body text font. It&rsquo;s used for paragraphs, descriptions, and
                general content across your invoices, emails, and wholesale portal.
              </p>
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Tagline</h3>
          <p className="text-xs text-slate-500 mb-4">
            Displayed on your wholesale portal and optionally in email footers
          </p>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="e.g. Specialty coffee, roasted fresh daily"
            className={inputClassName}
          />
        </div>

        {/* Social Links */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Social Links</h3>
          <p className="text-xs text-slate-500 mb-4">
            Displayed on your wholesale portal and optionally in email footers
          </p>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                <Instagram className="w-4 h-4 text-slate-400" />
                Instagram
              </label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@handle"
                className={inputClassName}
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                <Facebook className="w-4 h-4 text-slate-400" />
                Facebook
              </label>
              <input
                type="text"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="https://facebook.com/..."
                className={inputClassName}
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                <TikTok className="w-4 h-4 text-slate-400" />
                TikTok
              </label>
              <input
                type="text"
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                placeholder="@handle"
                className={inputClassName}
              />
            </div>
          </div>
        </div>

        {/* Save bar */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 text-sm"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : saved ? (
              <><Check className="w-4 h-4" /> Saved</>
            ) : (
              "Save Changes"
            )}
          </button>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
      </div>

      {/* Preview column */}
      <div>
        <div className="sticky top-8 space-y-6">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Live Preview
          </p>

          {/* Invoice preview */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Invoice</p>
            </div>
            <div className="p-5">
              {/* Invoice header bar */}
              <div
                className="h-1 rounded-full mb-4"
                style={{ backgroundColor: primaryColour }}
              />
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt=""
                      className="object-contain"
                      style={{
                        height: previewLogoHeight,
                        width: "auto",
                        backgroundColor: primaryColour,
                        borderRadius: 6,
                        padding: "6px 10px",
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                      <span className="text-[10px] text-slate-400">Logo</span>
                    </div>
                  )}
                  <div>
                    <p
                      className="text-sm font-bold text-slate-900"
                      style={{ fontFamily: `"${headingFamily}", sans-serif` }}
                    >
                      {businessName || "Your Business"}
                    </p>
                    {tagline && (
                      <p
                        className="text-[10px] text-slate-500"
                        style={{ fontFamily: `"${bodyFamily}", sans-serif` }}
                      >
                        {tagline}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className="text-xs font-bold text-slate-400 uppercase tracking-wider"
                    style={{ fontFamily: `"${headingFamily}", sans-serif` }}
                  >
                    Invoice
                  </p>
                  <p className="text-[10px] text-slate-400" style={{ fontFamily: `"${bodyFamily}", sans-serif` }}>
                    INV-0042
                  </p>
                </div>
              </div>
              {/* Sample line item */}
              <div className="border-t border-slate-100 pt-2">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span style={{ fontFamily: `"${bodyFamily}", sans-serif` }}>Description</span>
                  <span style={{ fontFamily: `"${bodyFamily}", sans-serif` }}>Amount</span>
                </div>
                <div className="flex justify-between text-xs text-slate-700">
                  <span style={{ fontFamily: `"${bodyFamily}", sans-serif` }}>House Blend × 10</span>
                  <span style={{ fontFamily: `"${bodyFamily}", sans-serif` }}>£85.00</span>
                </div>
              </div>
              <div className="mt-3 flex justify-between text-xs font-semibold border-t border-slate-200 pt-2">
                <span style={{ fontFamily: `"${headingFamily}", sans-serif` }}>Total</span>
                <span style={{ fontFamily: `"${headingFamily}", sans-serif` }}>£85.00</span>
              </div>
              <div className="mt-3 text-center">
                <span
                  className="inline-block px-4 py-1.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: effectiveButtonColour,
                    color: effectiveButtonTextColour,
                    borderRadius: buttonRadius,
                  }}
                >
                  Pay Now
                </span>
              </div>
            </div>
          </div>

          {/* Email preview */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Email</p>
            </div>
            <div>
              {/* Email header strip */}
              <div
                className="px-5 py-4 flex justify-center"
                style={{ backgroundColor: primaryColour }}
              >
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt=""
                    className="object-contain"
                    style={{ height: previewLogoHeight, width: "auto" }}
                  />
                ) : (
                  <p className="text-white text-xs font-semibold opacity-80">
                    {businessName || "Your Business"}
                  </p>
                )}
              </div>
              <div className="p-5">
                <h4
                  className="text-sm font-bold text-slate-900 mb-1"
                  style={{ fontFamily: `"${headingFamily}", sans-serif` }}
                >
                  Your order has been confirmed
                </h4>
                <p
                  className="text-xs text-slate-600 mb-3"
                  style={{ fontFamily: `"${bodyFamily}", sans-serif` }}
                >
                  Thank you for your order. We&rsquo;re preparing it now and will notify you when it ships.
                </p>
                <div className="text-center">
                  <span
                    className="inline-block px-5 py-1.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: effectiveButtonColour,
                      color: effectiveButtonTextColour,
                      borderRadius: buttonRadius,
                    }}
                  >
                    View Order
                  </span>
                </div>
                {tagline && (
                  <p
                    className="mt-4 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3"
                    style={{ fontFamily: `"${bodyFamily}", sans-serif` }}
                  >
                    {`${businessName || "Your Business"} · ${tagline}`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {businessNameEditHref && (
            <p className="text-xs text-slate-400">
              Business name shown in previews can be changed in{" "}
              <a href={businessNameEditHref} className="text-brand-600 hover:text-brand-700 font-medium">
                Business Settings
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared color field ──

function ColorField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer p-0.5"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClassName}
      />
    </div>
  );
}

// ── Font selector dropdown ──

function FontSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const resolved = resolveFamily(value);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = search
    ? FONT_LIBRARY.filter((f) =>
        f.label.toLowerCase().includes(search.toLowerCase())
      )
    : FONT_LIBRARY;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 hover:border-slate-400 transition-colors bg-white"
      >
        <span style={{ fontFamily: `"${resolved}", sans-serif` }}>{resolved}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-72 overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fonts…"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-56">
            {search ? (
              filtered.map((font) => (
                <FontOptionItem
                  key={font.family}
                  font={font}
                  selected={font.family === resolved}
                  onClick={() => {
                    onChange(font.family);
                    setOpen(false);
                    setSearch("");
                  }}
                />
              ))
            ) : (
              FONT_CATEGORIES.map((cat) => {
                const fonts = FONT_LIBRARY.filter((f) => f.category === cat);
                return (
                  <div key={cat}>
                    <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      {FONT_CATEGORY_LABELS[cat]}
                    </p>
                    {fonts.map((font) => (
                      <FontOptionItem
                        key={font.family}
                        font={font}
                        selected={font.family === resolved}
                        onClick={() => {
                          onChange(font.family);
                          setOpen(false);
                          setSearch("");
                        }}
                      />
                    ))}
                  </div>
                );
              })
            )}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-sm text-slate-400 text-center">No fonts found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FontOptionItem({
  font,
  selected,
  onClick,
}: {
  font: FontOption;
  selected: boolean;
  onClick: () => void;
}) {
  // Load font when it comes into view
  useEffect(() => {
    loadGoogleFont(font.family);
  }, [font.family]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between ${
        selected ? "bg-brand-50 text-brand-700" : "text-slate-700"
      }`}
    >
      <span style={{ fontFamily: `"${font.family}", sans-serif` }}>{font.label}</span>
      {selected && <Check className="w-3.5 h-3.5 text-brand-600" />}
    </button>
  );
}

// ── Helpers ──

function resolveFamily(key: string): string {
  if (!key) return "Inter";
  const legacy: Record<string, string> = {
    inter: "Inter",
    figtree: "Figtree",
    playfair: "Playfair Display",
  };
  if (legacy[key]) return legacy[key];
  const match = FONT_LIBRARY.find(
    (f) => f.family === key || f.family.toLowerCase() === key.toLowerCase()
  );
  return match?.family || key;
}
