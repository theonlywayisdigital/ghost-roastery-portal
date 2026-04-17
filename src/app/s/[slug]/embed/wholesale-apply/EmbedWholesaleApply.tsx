"use client";

import { useEffect } from "react";
import { WholesaleApplyForm } from "../../WholesaleApplyForm";

function postHeight() {
  const height = document.documentElement.scrollHeight;
  window.parent.postMessage({ type: "gr-embed-resize", height }, "*");
}

interface EmbedSettings {
  bg_colour?: string | null;
  bg_transparent?: boolean;
  button_colour?: string | null;
  button_text_colour?: string | null;
  corner_style?: "sharp" | "rounded" | "pill";
}

export function EmbedWholesaleApply({
  roasterId,
  slug,
  accentColour,
  accentText,
  embedSettings,
}: {
  roasterId: string;
  slug: string;
  accentColour: string;
  accentText: string;
  embedSettings: Record<string, unknown>;
}) {
  const settings = embedSettings as unknown as EmbedSettings;
  const bgTransparent = settings.bg_transparent !== false;

  useEffect(() => {
    postHeight();
    const observer = new ResizeObserver(() => postHeight());
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);

  // When transparent background is selected, override any parent layout
  // background so the iframe content shows through cleanly.
  useEffect(() => {
    if (bgTransparent) {
      document.documentElement.style.backgroundColor = "transparent";
      document.body.style.backgroundColor = "transparent";
      // The storefront layout wrapper sets backgroundColor via inline style —
      // walk up from body to clear it on all parent divs within the embed.
      let el = document.body.firstElementChild as HTMLElement | null;
      while (el) {
        el.style.backgroundColor = "transparent";
        if (el.children.length === 1) {
          el = el.firstElementChild as HTMLElement | null;
        } else {
          break;
        }
      }
    }
  }, [bgTransparent]);

  return (
    <div className="p-4" style={{ backgroundColor: "transparent" }}>
      <WholesaleApplyForm
        roasterId={roasterId}
        slug={slug}
        accentColour={accentColour}
        accentText={accentText}
        embedStyle={{
          bgTransparent: settings.bg_transparent !== false,
          bgColour: settings.bg_colour || undefined,
          buttonColour: settings.button_colour || undefined,
          buttonTextColour: settings.button_text_colour || undefined,
          cornerStyle: settings.corner_style || undefined,
        }}
      />
      <div className="mt-4 text-center">
        <a
          href={`/s/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Powered by Roastery Platform
        </a>
      </div>
    </div>
  );
}
