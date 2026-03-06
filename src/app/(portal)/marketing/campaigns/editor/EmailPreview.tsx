"use client";

import { useState } from "react";
import { Monitor, Smartphone } from "@/components/icons";
import type { EmailBlock } from "@/types/marketing";
import { renderEmailHtml } from "./renderEmailHtml";

interface EmailPreviewProps {
  blocks: EmailBlock[];
}

export function EmailPreview({ blocks }: EmailPreviewProps) {
  const [view, setView] = useState<"desktop" | "mobile">("desktop");
  const html = renderEmailHtml(blocks, "Your Business", "");

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
