"use client";

import { useState } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import type { WebBlock } from "./web-block-types";
import { renderWebHtml } from "./renderWebHtml";

interface WebPreviewProps {
  blocks: WebBlock[];
}

export function WebPreview({ blocks }: WebPreviewProps) {
  const [view, setView] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const html = renderWebHtml(blocks);

  const widths = {
    desktop: "w-full max-w-[1024px]",
    tablet: "w-[768px]",
    mobile: "w-[375px]",
  };

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
          onClick={() => setView("tablet")}
          className={`p-2 rounded-lg transition-colors ${
            view === "tablet" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Tablet className="w-4 h-4" />
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
          className={`bg-white border border-slate-200 rounded-lg overflow-hidden transition-all ${widths[view]}`}
        >
          <iframe
            srcDoc={html}
            title="Page Preview"
            className="w-full border-0"
            style={{ height: "600px" }}
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
