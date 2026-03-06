"use client";

import { useState } from "react";
import { Monitor, Tablet, Smartphone, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type Viewport = "desktop" | "tablet" | "mobile";

const viewportConfig: Record<Viewport, { width: string; icon: typeof Monitor; label: string }> = {
  desktop: { width: "100%", icon: Monitor, label: "Desktop" },
  tablet: { width: "768px", icon: Tablet, label: "Tablet" },
  mobile: { width: "375px", icon: Smartphone, label: "Mobile" },
};

interface PreviewClientProps {
  previewUrl: string;
  slug: string;
}

export function PreviewClient({ previewUrl, slug }: PreviewClientProps) {
  const [viewport, setViewport] = useState<Viewport>("desktop");

  return (
    <div className="fixed inset-0 lg:left-64 z-40 flex flex-col bg-slate-100">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-1">
          {(Object.entries(viewportConfig) as [Viewport, typeof viewportConfig.desktop][]).map(
            ([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setViewport(key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    viewport === key
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-500 hover:bg-slate-100"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{config.label}</span>
                </button>
              );
            }
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{slug}</span>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in new tab
          </a>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-hidden flex justify-center">
        <div
          className={cn(
            "h-full transition-all duration-300",
            viewport !== "desktop" && "py-4"
          )}
          style={{
            width: viewportConfig[viewport].width,
            maxWidth: "100%",
          }}
        >
          <iframe
            src={previewUrl}
            className={cn(
              "w-full h-full border-0 bg-white",
              viewport !== "desktop" && "rounded-lg shadow-xl"
            )}
            title="Website Preview"
          />
        </div>
      </div>
    </div>
  );
}
