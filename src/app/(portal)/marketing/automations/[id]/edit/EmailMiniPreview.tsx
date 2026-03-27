"use client";

import type { EmailBlock } from "@/types/marketing";
import { renderEmailHtml } from "@/lib/render-email-html";

export function EmailMiniPreview({
  blocks,
  emailBgColor,
}: {
  blocks: EmailBlock[];
  emailBgColor?: string;
}) {
  const html = renderEmailHtml(blocks, "", "", emailBgColor);

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
