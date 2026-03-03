"use client";

import type { SocialPlatform } from "@/types/social";
import { PLATFORM_CHAR_LIMITS } from "@/types/social";
import { getPlatformLabel } from "./PlatformBadge";

export function CharacterCount({
  content,
  platforms,
}: {
  content: string;
  platforms: SocialPlatform[];
}) {
  if (platforms.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {platforms.map((platform) => {
        const limit = PLATFORM_CHAR_LIMITS[platform];
        const count = content.length;
        const pct = Math.min((count / limit) * 100, 100);
        const isOver = count > limit;

        return (
          <div key={platform} className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-16 shrink-0">
              {getPlatformLabel(platform)}
            </span>
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isOver ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-brand-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`text-xs tabular-nums w-20 text-right ${isOver ? "text-red-600 font-medium" : "text-slate-400"}`}>
              {count.toLocaleString()}/{limit.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
