"use client";

import { useEffect } from "react";
import { WholesaleApplyForm } from "../../WholesaleApplyForm";

function postHeight() {
  const height = document.documentElement.scrollHeight;
  window.parent.postMessage({ type: "gr-embed-resize", height }, "*");
}

export function EmbedWholesaleApply({
  roasterId,
  slug,
  accentColour,
  accentText,
}: {
  roasterId: string;
  slug: string;
  accentColour: string;
  accentText: string;
}) {
  useEffect(() => {
    postHeight();
    const observer = new ResizeObserver(() => postHeight());
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="p-4">
      <WholesaleApplyForm
        roasterId={roasterId}
        slug={slug}
        accentColour={accentColour}
        accentText={accentText}
      />
      <div className="mt-4 text-center">
        <a
          href={`/s/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Powered by Ghost Roastery
        </a>
      </div>
    </div>
  );
}
