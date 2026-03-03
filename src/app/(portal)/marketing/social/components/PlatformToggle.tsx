"use client";

import { Building2, Facebook, Instagram, Lock } from "lucide-react";
import type { SocialPlatform, PlatformConfigs, SocialConnection } from "@/types/social";

const PLATFORMS: { id: SocialPlatform; label: string; icon: typeof Building2 }[] = [
  { id: "google_business", label: "Google Business", icon: Building2 },
  { id: "facebook", label: "Facebook", icon: Facebook },
  { id: "instagram", label: "Instagram", icon: Instagram },
];

export function PlatformToggle({
  platforms,
  onChange,
  connections,
}: {
  platforms: PlatformConfigs;
  onChange: (platforms: PlatformConfigs) => void;
  connections: SocialConnection[];
}) {
  const connectedPlatforms = new Set(
    connections.filter((c) => c.status === "connected").map((c) => c.platform)
  );

  function togglePlatform(platformId: SocialPlatform) {
    if (!connectedPlatforms.has(platformId)) return;

    const current = platforms[platformId];
    onChange({
      ...platforms,
      [platformId]: { ...current, enabled: !current?.enabled },
    });
  }

  return (
    <div className="flex gap-2">
      {PLATFORMS.map(({ id, label, icon: Icon }) => {
        const isConnected = connectedPlatforms.has(id);
        const isEnabled = !!platforms[id]?.enabled;

        return (
          <button
            key={id}
            type="button"
            onClick={() => togglePlatform(id)}
            disabled={!isConnected}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all
              ${isEnabled
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : isConnected
                  ? "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  : "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed"
              }
            `}
          >
            {isConnected ? (
              <Icon className="w-4 h-4" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
            {label}
          </button>
        );
      })}
    </div>
  );
}
