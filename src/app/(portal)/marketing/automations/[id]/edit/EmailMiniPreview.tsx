"use client";

import type { EmailBlock } from "@/types/marketing";
import { renderEmailHtml, type MarketingEmailBranding } from "@/lib/render-email-html";

export function EmailMiniPreview({
  blocks,
  emailBgColor,
  businessName,
  logoUrl,
  logoSize,
  primaryColour,
  accentColour,
  backgroundColour,
  buttonColour,
  buttonTextColour,
  buttonStyle,
}: {
  blocks: EmailBlock[];
  emailBgColor?: string;
  businessName?: string;
  logoUrl?: string | null;
  logoSize?: "small" | "medium" | "large";
  primaryColour?: string | null;
  accentColour?: string | null;
  backgroundColour?: string | null;
  buttonColour?: string | null;
  buttonTextColour?: string | null;
  buttonStyle?: "sharp" | "rounded" | "pill" | null;
}) {
  const branding: MarketingEmailBranding = { primaryColour, accentColour, backgroundColour, buttonColour, buttonTextColour, buttonStyle, logoUrl, logoSize };
  const html = renderEmailHtml(blocks, businessName || "", "", emailBgColor, undefined, undefined, undefined, branding);

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
      <iframe
        srcDoc={html}
        title="Email Preview"
        className="w-full border-0"
        style={{ height: "400px" }}
        sandbox="allow-same-origin"
        tabIndex={-1}
      />
    </div>
  );
}
