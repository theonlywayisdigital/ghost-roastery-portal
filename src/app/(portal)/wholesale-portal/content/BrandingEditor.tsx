"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  ImageIcon,
  ExternalLink,
  Check,
  ArrowRight,
} from "@/components/icons";
import { resolveFontFamily, loadGoogleFont } from "@/lib/fonts";

interface BrandingData {
  storefront_slug: string;
  storefront_enabled: boolean;
  brand_logo_url: string;
  brand_primary_colour: string;
  brand_accent_colour: string;
  brand_heading_font: string;
  brand_body_font: string;
  brand_tagline: string;
  brand_hero_image_url: string;
  brand_about: string;
  brand_instagram: string;
  brand_facebook: string;
  brand_tiktok: string;
  storefront_logo_size: "small" | "medium" | "large";
  business_name: string;
  storefront_nav_colour: string;
  storefront_nav_text_colour: string;
  storefront_button_colour: string;
  storefront_button_text_colour: string;
  storefront_bg_colour: string;
  storefront_text_colour: string;
  storefront_button_style: "sharp" | "rounded" | "pill";
  storefront_nav_fixed: boolean;
  storefront_nav_transparent: boolean;
}

const inputClassName =
  "w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent";

export function BrandingEditor({ branding }: { branding: BrandingData }) {
  const router = useRouter();

  // Read-only brand values (managed in Settings → Branding)
  const logoUrl = branding.brand_logo_url;
  const primaryColour = branding.brand_primary_colour;
  const accentColour = branding.brand_accent_colour;
  const headingFamily = resolveFontFamily(branding.brand_heading_font);
  const bodyFamily = resolveFontFamily(branding.brand_body_font);
  const tagline = branding.brand_tagline;

  // Logo size (persisted via API)
  const [logoSize, setLogoSize] = useState<"small" | "medium" | "large">(branding.storefront_logo_size);
  const logoHeight = { small: 80, medium: 120, large: 160 }[logoSize];

  // Portal-specific form state
  const [heroImageUrl, setHeroImageUrl] = useState(branding.brand_hero_image_url);
  const [about, setAbout] = useState(branding.brand_about);
  const [instagram, setInstagram] = useState(branding.brand_instagram);
  const [facebook, setFacebook] = useState(branding.brand_facebook);
  const [tiktok, setTiktok] = useState(branding.brand_tiktok);
  const [enabled, setEnabled] = useState(branding.storefront_enabled);

  // Portal appearance overrides (inherit from brand settings when empty)
  const [navColour, setNavColour] = useState(branding.storefront_nav_colour || branding.brand_primary_colour);
  const [navTextColour, setNavTextColour] = useState(branding.storefront_nav_text_colour || "#ffffff");
  const [buttonColour, setButtonColour] = useState(branding.storefront_button_colour || branding.brand_accent_colour);
  const [buttonTextColour, setButtonTextColour] = useState(branding.storefront_button_text_colour || "#ffffff");
  const [bgColour, setBgColour] = useState(branding.storefront_bg_colour || "#ffffff");
  const [textColour, setTextColour] = useState(branding.storefront_text_colour || "#0f172a");
  const [buttonStyle, setButtonStyle] = useState<"sharp" | "rounded" | "pill">(branding.storefront_button_style);
  const [navFixed, setNavFixed] = useState(branding.storefront_nav_fixed);
  const [navTransparent, setNavTransparent] = useState(branding.storefront_nav_transparent);

  // UI state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingHero, setUploadingHero] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);

  // Load fonts for preview
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
      const res = await fetch("/api/wholesale-portal/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_hero_image_url: heroImageUrl || null,
          brand_about: about || null,
          brand_instagram: instagram || null,
          brand_facebook: facebook || null,
          brand_tiktok: tiktok || null,
          storefront_logo_size: logoSize,
          storefront_enabled: enabled,
          storefront_nav_colour: navColour || null,
          storefront_nav_text_colour: navTextColour || null,
          storefront_button_colour: buttonColour || null,
          storefront_button_text_colour: buttonTextColour || null,
          storefront_bg_colour: bgColour || null,
          storefront_text_colour: textColour || null,
          storefront_button_style: buttonStyle,
          storefront_nav_fixed: navFixed,
          storefront_nav_transparent: navTransparent,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [heroImageUrl, about, instagram, facebook, tiktok, logoSize, enabled, navColour, navTextColour, buttonColour, buttonTextColour, bgColour, textColour, buttonStyle, navFixed, navTransparent, router]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      {/* Form column */}
      <div className="xl:col-span-3 space-y-6">
        {/* Portal status */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-900">
                Wholesale portal status
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {branding.storefront_slug}.roasteryplatform.com
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={`/s/${branding.storefront_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View
              </a>
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  enabled ? "bg-brand-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                    enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-sm text-slate-600">
                {enabled ? "Live" : "Off"}
              </span>
            </div>
          </div>
        </div>

        {/* Brand identity (read-only, managed in Settings → Branding) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Brand identity
            </h3>
            <Link
              href="/settings/branding"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Edit in Settings
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            These values are inherited from your{" "}
            <Link href="/settings/branding" className="text-brand-600 hover:text-brand-700 font-medium">
              Brand Settings
            </Link>
            . They apply across invoices, emails, and your wholesale portal.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {/* Logo */}
            <div className="col-span-2">
              <p className="text-xs font-medium text-slate-500 mb-1.5">Logo</p>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={branding.business_name}
                  style={{ height: logoHeight }}
                  className="w-auto"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg border border-dashed border-slate-300 flex items-center justify-center">
                  <span className="text-[10px] text-slate-400">None</span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <label className="text-[11px] text-slate-400">Logo size</label>
                <select
                  value={logoSize}
                  onChange={(e) => setLogoSize(e.target.value as "small" | "medium" | "large")}
                  className="text-xs border border-slate-200 rounded px-1.5 py-1 text-slate-600"
                >
                  <option value="small">Small (80px)</option>
                  <option value="medium">Medium (120px)</option>
                  <option value="large">Large (160px)</option>
                </select>
              </div>
            </div>
            {/* Fixed nav toggle */}
            <div className="col-span-2 flex items-center justify-between pt-2">
              <div>
                <p className="text-xs font-medium text-slate-700">Fixed navigation bar</p>
                <p className="text-[11px] text-slate-400">Nav bar stays visible when scrolling</p>
              </div>
              <button
                type="button"
                onClick={() => setNavFixed(!navFixed)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  navFixed ? "bg-brand-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                    navFixed ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            {/* Nav transparency toggle */}
            <div className="col-span-2 flex items-center justify-between pt-2">
              <div>
                <p className="text-xs font-medium text-slate-700">Transparent on hero</p>
                <p className="text-[11px] text-slate-400">Nav fades in as you scroll down</p>
              </div>
              <button
                type="button"
                onClick={() => setNavTransparent(!navTransparent)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  navTransparent ? "bg-brand-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                    navTransparent ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            {/* Colours */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">Colours</p>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg border border-slate-200"
                  style={{ backgroundColor: primaryColour }}
                  title={`Primary: ${primaryColour}`}
                />
                <div
                  className="w-8 h-8 rounded-lg border border-slate-200"
                  style={{ backgroundColor: accentColour }}
                  title={`Accent: ${accentColour}`}
                />
              </div>
            </div>
            {/* Fonts */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">Heading font</p>
              <p
                className="text-sm text-slate-700"
                style={{ fontFamily: `"${headingFamily}", sans-serif` }}
              >
                {headingFamily}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">Body font</p>
              <p
                className="text-sm text-slate-700"
                style={{ fontFamily: `"${bodyFamily}", sans-serif` }}
              >
                {bodyFamily}
              </p>
            </div>
            {/* Tagline */}
            {tagline && (
              <div className="col-span-2">
                <p className="text-xs font-medium text-slate-500 mb-1.5">Tagline</p>
                <p className="text-sm text-slate-700">{tagline}</p>
              </div>
            )}
          </div>
        </div>

        {/* Wholesale portal appearance */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">
            Wholesale portal appearance
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            Override colours and button style for your wholesale portal. These settings take priority over your global brand settings.
          </p>

          <div className="space-y-5">
            {/* Nav colours */}
            <div className="grid grid-cols-2 gap-4">
              <ColorField
                label="Nav background"
                value={navColour}
                onChange={setNavColour}
              />
              <ColorField
                label="Nav text"
                value={navTextColour}
                onChange={setNavTextColour}
              />
            </div>

            {/* Button colours */}
            <div className="grid grid-cols-2 gap-4">
              <ColorField
                label="Button colour"
                value={buttonColour}
                onChange={setButtonColour}
              />
              <ColorField
                label="Button text"
                value={buttonTextColour}
                onChange={setButtonTextColour}
              />
            </div>

            {/* Page colours */}
            <div className="grid grid-cols-2 gap-4">
              <ColorField
                label="Page background"
                value={bgColour}
                onChange={setBgColour}
              />
              <ColorField
                label="Page text"
                value={textColour}
                onChange={setTextColour}
              />
            </div>

            {/* Button style */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Button style
              </label>
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
                        className="h-8 w-24 flex items-center justify-center text-xs font-semibold text-white"
                        style={{
                          backgroundColor: buttonColour,
                          color: buttonTextColour,
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
          </div>
        </div>

        {/* Wholesale portal content */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Wholesale portal content
          </h3>

          <div className="space-y-5">
            {/* Hero image */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Hero image{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                ref={heroInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file, setHeroImageUrl, setUploadingHero);
                  e.target.value = "";
                }}
                className="hidden"
              />
              {heroImageUrl ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={heroImageUrl}
                    alt="Hero"
                    className="w-full h-40 object-cover rounded-lg border border-slate-200"
                  />
                  <div className="mt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => heroInputRef.current?.click()}
                      className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroImageUrl("")}
                      className="text-sm text-slate-400 hover:text-slate-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => heroInputRef.current?.click()}
                  disabled={uploadingHero}
                  className="w-full border-2 border-dashed border-slate-300 rounded-lg py-6 flex flex-col items-center gap-1.5 text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors disabled:opacity-50"
                >
                  {uploadingHero ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <ImageIcon className="w-6 h-6" />
                  )}
                  <span className="text-sm font-medium">
                    {uploadingHero ? "Uploading…" : "Upload hero image"}
                  </span>
                </button>
              )}
            </div>

            {/* About */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                About{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Share your story…"
                rows={4}
                className={inputClassName}
              />
            </div>

            {/* Social links */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
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
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Facebook
                </label>
                <input
                  type="text"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  placeholder="URL"
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
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
        </div>

        {/* Save bar */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : saved ? (
              <>
                <Check className="w-4 h-4" />
                Saved
              </>
            ) : (
              "Save Changes"
            )}
          </button>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
      </div>

      {/* Preview column */}
      <div className="xl:col-span-2">
        <div className="sticky top-8">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
            Preview
          </p>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Preview nav bar */}
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{
                backgroundColor: navColour || primaryColour,
                color: navTextColour || "#ffffff",
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                {logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={branding.business_name}
                    style={{ height: Math.min(logoHeight * 0.3, 32) }}
                    className="w-auto"
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] opacity-70">
                  Shop · Wholesale · Contact
                </span>
                {navFixed && (
                  <span className="text-[8px] font-medium bg-white/20 rounded px-1 py-0.5 leading-none">
                    Fixed
                  </span>
                )}
              </div>
            </div>

            {/* Hero area */}
            <div
              className="h-40 relative flex items-end"
              style={
                heroImageUrl
                  ? {
                      backgroundImage: `url(${heroImageUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : {
                      background: `linear-gradient(135deg, ${primaryColour} 0%, ${accentColour} 100%)`,
                    }
              }
            >
              <div className="absolute inset-0 bg-black/30" />
              <div className="relative p-4">
                <h3
                  className="text-white text-sm font-bold"
                  style={{ fontFamily: `"${headingFamily}", sans-serif` }}
                >
                  {branding.business_name}
                </h3>
                {tagline && (
                  <p
                    className="text-white/80 text-xs mt-0.5"
                    style={{ fontFamily: `"${bodyFamily}", sans-serif` }}
                  >
                    {tagline}
                  </p>
                )}
              </div>
            </div>

            {/* Product placeholders */}
            <div className="p-4" style={{ backgroundColor: bgColour }}>
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{
                  color: textColour,
                  fontFamily: `"${headingFamily}", sans-serif`,
                }}
              >
                Our Coffee
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-100 overflow-hidden"
                  >
                    <div className="h-20 bg-slate-100" />
                    <div className="p-2">
                      <div className="h-2.5 w-3/4 bg-slate-200 rounded mb-1.5" />
                      <div className="h-2 w-1/2 bg-slate-100 rounded mb-2" />
                      <button
                        className="w-full py-1.5 text-xs font-medium"
                        style={{
                          backgroundColor: buttonColour,
                          color: buttonTextColour,
                          borderRadius: { sharp: "0px", rounded: "8px", pill: "9999px" }[buttonStyle],
                        }}
                      >
                        Order
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
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
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
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
