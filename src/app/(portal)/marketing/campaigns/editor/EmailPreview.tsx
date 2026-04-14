"use client";

import { useState } from "react";
import { Monitor, Smartphone } from "@/components/icons";
import type { EmailBlock } from "@/types/marketing";
import { renderEmailHtml, type MarketingEmailBranding } from "./renderEmailHtml";

interface EmailPreviewProps {
  blocks: EmailBlock[];
  businessName?: string;
  logoUrl?: string | null;
  logoSize?: "small" | "medium" | "large";
  primaryColour?: string | null;
  accentColour?: string | null;
  backgroundColour?: string | null;
  buttonColour?: string | null;
  buttonTextColour?: string | null;
  buttonStyle?: "sharp" | "rounded" | "pill" | null;
}

export function EmailPreview({ blocks, businessName, logoUrl, logoSize, primaryColour, accentColour, backgroundColour, buttonColour, buttonTextColour, buttonStyle }: EmailPreviewProps) {
  const [view, setView] = useState<"desktop" | "mobile">("desktop");
  const branding: MarketingEmailBranding = { primaryColour, accentColour, backgroundColour, buttonColour, buttonTextColour, buttonStyle, logoUrl, logoSize };
  const html = renderEmailHtml(blocks, businessName || "Your Business", "", undefined, undefined, undefined, undefined, branding);

  return (
    <div>
      <div className="flex items-center justify-center gap-1 mb-4">
        <button
          onClick={() => setView("desktop")}
          className={`p-2 rounded-lg transition-colors ${
            view === "desktop" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Monitor className="w-4 h-4" />
        </button>
        <button
          onClick={() => setView("mobile")}
          className={`p-2 rounded-lg transition-colors ${
            view === "mobile" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Smartphone className="w-4 h-4" />
        </button>
      </div>
      <div className="flex justify-center">
        <div
          className={`bg-white border border-slate-200 rounded-lg overflow-hidden transition-all ${
            view === "mobile" ? "w-[375px]" : "w-full max-w-[600px]"
          }`}
        >
          <iframe
            srcDoc={html}
            title="Email Preview"
            className="w-full border-0"
            style={{ height: "600px" }}
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
