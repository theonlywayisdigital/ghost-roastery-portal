"use client";

import { useState, useCallback } from "react";
import { Check, Copy, Code, ShoppingBag, FileText, Palette, Loader2 } from "@/components/icons";
import { RETAIL_ENABLED } from "@/lib/feature-flags";

/* ─── Embed Settings shape ─── */
interface EmbedSettings {
  bg_colour?: string | null;
  bg_transparent?: boolean;
  button_colour?: string | null;
  button_text_colour?: string | null;
  corner_style?: "sharp" | "rounded" | "pill";
  text_colour?: string | null;
  label_colour?: string | null;
  input_bg_colour?: string | null;
  input_border_colour?: string | null;
  input_text_colour?: string | null;
}

/* ─── Helpers ─── */
const CORNER_OPTIONS = [
  { value: "sharp", label: "Sharp" },
  { value: "rounded", label: "Rounded" },
  { value: "pill", label: "Pill" },
] as const;

function borderRadiusFromStyle(style: string) {
  return style === "sharp" ? "0px" : style === "pill" ? "9999px" : "8px";
}

/* ─── Code Block ─── */
function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {label}
        </p>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-sm overflow-x-auto whitespace-pre-wrap break-all">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/* ─── Copy Button ─── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5" />
          Copied
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          Copy
        </>
      )}
    </button>
  );
}

/* ─── Live Preview ─── */
function FormPreview({ settings, accentColour }: { settings: EmbedSettings; accentColour: string }) {
  const bgTransparent = settings.bg_transparent ?? true;
  const bgColour = bgTransparent ? "transparent" : (settings.bg_colour || "#f8fafc");
  const buttonColour = settings.button_colour || accentColour;
  const buttonTextColour = settings.button_text_colour || "#ffffff";
  const cornerStyle = settings.corner_style || "rounded";
  const btnRadius = borderRadiusFromStyle(cornerStyle);
  const inputRadius = cornerStyle === "sharp" ? "0px" : "8px";

  const labelColour = settings.label_colour || "#374151";
  const inputBg = settings.input_bg_colour || "#ffffff";
  const inputBorder = settings.input_border_colour || "#d1d5db";
  const inputText = settings.input_text_colour || "#111827";

  const inputClassName = "w-full px-3 py-2 border text-sm placeholder:opacity-40";
  const inputStyle: React.CSSProperties = {
    backgroundColor: inputBg,
    borderColor: inputBorder,
    color: inputText,
    borderRadius: inputRadius,
  };

  return (
    <div
      className="rounded-lg border border-dashed border-slate-300 p-4"
      style={{ backgroundColor: "#f1f5f9" }}
    >
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-3">
        Live preview
      </p>
      <div
        className="rounded-lg p-5 space-y-3 transition-all duration-200"
        style={{
          backgroundColor: bgColour,
          border: bgTransparent ? "none" : "1px solid #e2e8f0",
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: labelColour }}>First Name <span className="text-red-500">*</span></p>
            <input readOnly placeholder="First name" className={inputClassName} style={inputStyle} />
          </div>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: labelColour }}>Last Name <span className="text-red-500">*</span></p>
            <input readOnly placeholder="Last name" className={inputClassName} style={inputStyle} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: labelColour }}>Email <span className="text-red-500">*</span></p>
            <input readOnly placeholder="you@example.com" className={inputClassName} style={inputStyle} />
          </div>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: labelColour }}>Business Name <span className="text-red-500">*</span></p>
            <input readOnly placeholder="Your business" className={inputClassName} style={inputStyle} />
          </div>
        </div>
        <button
          type="button"
          className="w-full py-2.5 font-semibold text-sm transition-opacity"
          style={{
            backgroundColor: buttonColour,
            color: buttonTextColour,
            borderRadius: btnRadius,
          }}
        >
          Apply for Trade Account
        </button>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export function EmbedCodeGenerator({
  slug,
  storefrontType,
  storefrontUrl,
  embedUrl,
  embedSettings: initialSettings,
  accentColour,
}: {
  slug: string;
  storefrontType: string;
  storefrontUrl: string;
  embedUrl: string;
  embedSettings: Record<string, unknown>;
  accentColour: string;
}) {
  const portalUrl = typeof window !== "undefined" ? window.location.origin : "https://app.roasteryplatform.com";
  const showShop = RETAIL_ENABLED;
  const showWholesale = storefrontType === "wholesale" || storefrontType === "both";

  // Embed style state
  const [settings, setSettings] = useState<EmbedSettings>({
    bg_colour: (initialSettings.bg_colour as string) || "#f8fafc",
    bg_transparent: initialSettings.bg_transparent !== false,
    button_colour: (initialSettings.button_colour as string) || accentColour,
    button_text_colour: (initialSettings.button_text_colour as string) || "#ffffff",
    corner_style: (initialSettings.corner_style as EmbedSettings["corner_style"]) || "rounded",
    text_colour: (initialSettings.text_colour as string) || "#111827",
    label_colour: (initialSettings.label_colour as string) || "#374151",
    input_bg_colour: (initialSettings.input_bg_colour as string) || "#ffffff",
    input_border_colour: (initialSettings.input_border_colour as string) || "#d1d5db",
    input_text_colour: (initialSettings.input_text_colour as string) || "#111827",
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/wholesale-portal/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embed_settings: settings }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // Silently fail
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const update = (patch: Partial<EmbedSettings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));

  const shopScript = `<script\n  src="${portalUrl}/embed.js"\n  data-roaster="${slug}"\n  data-type="shop">\n</script>`;
  const shopEmbedUrl = `${storefrontUrl}/embed/shop`;
  const shopIframe = `<iframe\n  src="${shopEmbedUrl}"\n  width="100%"\n  height="600"\n  frameborder="0"\n  style="border:none;overflow:hidden;background:transparent;">\n</iframe>`;

  const wholesaleScript = `<script\n  src="${portalUrl}/embed.js"\n  data-roaster="${slug}"\n  data-type="wholesale-apply">\n</script>`;
  const wholesaleIframe = `<iframe\n  src="${embedUrl}"\n  width="100%"\n  height="800"\n  frameborder="0"\n  style="border:none;overflow:hidden;background:transparent;">\n</iframe>`;

  const inputClassName =
    "w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-1">
          Embed Codes
        </h2>
        <p className="text-sm text-slate-500">
          {RETAIL_ENABLED
            ? "Add your storefront or wholesale application form to any website."
            : "Add your wholesale application form to any website."}
        </p>
      </div>

      {/* Retail Shop Embed */}
      {showShop && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Retail Shop</h3>
              <p className="text-sm text-slate-500">
                Display your products on any website. Clicking &ldquo;Buy Now&rdquo; opens
                your full storefront.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <CodeBlock code={shopScript} label="Script embed (recommended)" />
            <CodeBlock code={shopIframe} label="iFrame fallback" />
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500">
              <strong>How it works:</strong> The script tag creates an
              auto-resizing embed of your product grid. Customers click
              &ldquo;Buy Now&rdquo; to be taken to your full storefront where they
              can complete their purchase.
            </p>
          </div>
        </div>
      )}

      {/* Wholesale Apply Embed */}
      {showWholesale && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                Wholesale Application
              </h3>
              <p className="text-sm text-slate-500">
                Let trade customers apply for wholesale access directly from your
                website.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <CodeBlock
              code={wholesaleScript}
              label="Script embed (recommended)"
            />
            <CodeBlock code={wholesaleIframe} label="iFrame fallback" />
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500">
              <strong>How it works:</strong> The embed renders your branded
              wholesale application form. Applications appear in your Wholesale
              Buyers page for approval.
            </p>
          </div>
        </div>
      )}

      {/* Form Style */}
      {showWholesale && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Palette className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Form Style</h3>
              <p className="text-sm text-slate-500">
                Customise how the embedded application form looks on your website.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Controls */}
            <div className="space-y-5">
              {/* Background */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Background
                </label>
                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.bg_transparent ?? true}
                    onChange={(e) => update({ bg_transparent: e.target.checked })}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-slate-600">None (transparent)</span>
                </label>
                {!settings.bg_transparent && (
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.bg_colour || "#f8fafc"}
                      onChange={(e) => update({ bg_colour: e.target.value })}
                      className="w-9 h-9 rounded border border-slate-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={settings.bg_colour || "#f8fafc"}
                      onChange={(e) => update({ bg_colour: e.target.value })}
                      className={`${inputClassName} max-w-[120px]`}
                    />
                  </div>
                )}
              </div>

              {/* Button colour */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Button colour
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.button_colour || accentColour}
                    onChange={(e) => update({ button_colour: e.target.value })}
                    className="w-9 h-9 rounded border border-slate-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={settings.button_colour || accentColour}
                    onChange={(e) => update({ button_colour: e.target.value })}
                    className={`${inputClassName} max-w-[120px]`}
                  />
                </div>
              </div>

              {/* Button text colour */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Button text colour
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.button_text_colour || "#ffffff"}
                    onChange={(e) => update({ button_text_colour: e.target.value })}
                    className="w-9 h-9 rounded border border-slate-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={settings.button_text_colour || "#ffffff"}
                    onChange={(e) => update({ button_text_colour: e.target.value })}
                    className={`${inputClassName} max-w-[120px]`}
                  />
                </div>
              </div>

              {/* Text colour */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Text colour
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.text_colour || "#111827"}
                    onChange={(e) => update({ text_colour: e.target.value })}
                    className="w-9 h-9 rounded border border-slate-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={settings.text_colour || "#111827"}
                    onChange={(e) => update({ text_colour: e.target.value })}
                    className={`${inputClassName} max-w-[120px]`}
                  />
                </div>
              </div>

              {/* Label colour */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Label colour
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.label_colour || "#374151"}
                    onChange={(e) => update({ label_colour: e.target.value })}
                    className="w-9 h-9 rounded border border-slate-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={settings.label_colour || "#374151"}
                    onChange={(e) => update({ label_colour: e.target.value })}
                    className={`${inputClassName} max-w-[120px]`}
                  />
                </div>
              </div>

              {/* Input background */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Input background
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.input_bg_colour || "#ffffff"}
                    onChange={(e) => update({ input_bg_colour: e.target.value })}
                    className="w-9 h-9 rounded border border-slate-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={settings.input_bg_colour || "#ffffff"}
                    onChange={(e) => update({ input_bg_colour: e.target.value })}
                    className={`${inputClassName} max-w-[120px]`}
                  />
                </div>
              </div>

              {/* Input border colour */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Input border colour
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.input_border_colour || "#d1d5db"}
                    onChange={(e) => update({ input_border_colour: e.target.value })}
                    className="w-9 h-9 rounded border border-slate-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={settings.input_border_colour || "#d1d5db"}
                    onChange={(e) => update({ input_border_colour: e.target.value })}
                    className={`${inputClassName} max-w-[120px]`}
                  />
                </div>
              </div>

              {/* Input text colour */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Input text colour
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.input_text_colour || "#111827"}
                    onChange={(e) => update({ input_text_colour: e.target.value })}
                    className="w-9 h-9 rounded border border-slate-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={settings.input_text_colour || "#111827"}
                    onChange={(e) => update({ input_text_colour: e.target.value })}
                    className={`${inputClassName} max-w-[120px]`}
                  />
                </div>
              </div>

              {/* Corner style */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Corner style
                </label>
                <div className="flex gap-2">
                  {CORNER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update({ corner_style: opt.value })}
                      className={`px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${
                        (settings.corner_style || "rounded") === opt.value
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save */}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg font-medium text-sm hover:bg-brand-700 transition-colors disabled:opacity-50"
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
                  "Save Style"
                )}
              </button>
            </div>

            {/* Preview */}
            <FormPreview settings={settings} accentColour={accentColour} />
          </div>
        </div>
      )}

      {/* Direct Links */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <Code className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Direct Links</h3>
            <p className="text-sm text-slate-500">
              Share these URLs directly — no embed code needed.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-700">
                {RETAIL_ENABLED ? "Full Storefront" : "Wholesale Portal"}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {storefrontUrl}
              </p>
            </div>
            <CopyButton text={storefrontUrl} />
          </div>

          {RETAIL_ENABLED && (
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-700">
                Retail Shop (embed)
              </p>
              <p className="text-xs text-slate-500 truncate">
                {shopEmbedUrl}
              </p>
            </div>
            <CopyButton text={shopEmbedUrl} />
          </div>
          )}

          {showWholesale && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700">
                  Wholesale Application (embed)
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {embedUrl}
                </p>
              </div>
              <CopyButton text={embedUrl} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
