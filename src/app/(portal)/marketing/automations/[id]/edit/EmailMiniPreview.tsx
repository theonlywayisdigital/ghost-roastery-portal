"use client";

import type { EmailBlock } from "@/types/marketing";
import { renderEmailHtmlForPreview } from "@/lib/render-email-html";

export function EmailMiniPreview({
  blocks,
  emailBgColor,
}: {
  blocks: EmailBlock[];
  emailBgColor?: string;
}) {
  const html = renderEmailHtmlForPreview(blocks, emailBgColor);

  return (
    <div className="relative w-full h-[120px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <iframe
        srcDoc={html}
        title="Email Preview"
        className="w-[600px] h-[545px] border-0 origin-top-left pointer-events-none"
        style={{ transform: "scale(0.22)", transformOrigin: "top left" }}
        sandbox=""
        tabIndex={-1}
      />
    </div>
  );
}
