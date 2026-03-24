"use client";

import { Facebook, Instagram, ImageIcon } from "@/components/icons";
import type { SocialPlatform, PlatformConfigs } from "@/types/social";
import { PLATFORM_CHAR_LIMITS } from "@/types/social";

const PLATFORM_ICONS: Record<SocialPlatform, typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
};

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  facebook: "Facebook Page",
  instagram: "Instagram",
};

export function PlatformPreview({
  content,
  mediaUrls,
  platforms,
}: {
  content: string;
  mediaUrls: string[];
  platforms: PlatformConfigs;
}) {
  const enabledPlatforms = (Object.entries(platforms) as [SocialPlatform, { enabled?: boolean }][])
    .filter(([, config]) => config?.enabled)
    .map(([platform]) => platform);

  if (enabledPlatforms.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p className="text-sm">Select a platform to see preview</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {enabledPlatforms.map((platform) => {
        const Icon = PLATFORM_ICONS[platform];
        const limit = PLATFORM_CHAR_LIMITS[platform];
        const truncated = content.length > limit ? content.slice(0, limit) + "..." : content;

        return (
          <div key={platform} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {/* Platform header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50">
              <Icon className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">
                {PLATFORM_LABELS[platform]}
              </span>
            </div>

            {/* Preview body */}
            <div className="p-3">
              {/* Mock post header */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-slate-200" />
                <div>
                  <div className="h-3 w-24 bg-slate-200 rounded" />
                  <div className="h-2 w-16 bg-slate-100 rounded mt-1" />
                </div>
              </div>

              {/* Content */}
              <p className="text-sm text-slate-800 whitespace-pre-wrap break-words mb-2">
                {truncated || "Your post content will appear here..."}
              </p>

              {/* Media preview */}
              {mediaUrls.length > 0 && (
                <div className={`rounded-lg overflow-hidden ${mediaUrls.length > 1 ? "grid grid-cols-2 gap-0.5" : ""}`}>
                  {mediaUrls.slice(0, 4).map((url, i) => {
                    const isVideo = !!url.match(/\.(mp4|mov)$/i);
                    return (
                      <div key={url} className="relative aspect-square bg-slate-100">
                        {isVideo ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-slate-400" />
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={url} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                        )}
                        {i === 3 && mediaUrls.length > 4 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">+{mediaUrls.length - 4}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mock engagement bar */}
              <div className="flex items-center gap-4 mt-2 pt-2 border-t border-slate-100">
                <div className="h-2 w-8 bg-slate-100 rounded" />
                <div className="h-2 w-8 bg-slate-100 rounded" />
                <div className="h-2 w-8 bg-slate-100 rounded" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
