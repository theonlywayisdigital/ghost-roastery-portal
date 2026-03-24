"use client";

import { Facebook, Instagram } from "@/components/icons";
import type { SocialPlatform } from "@/types/social";

const PLATFORM_CONFIG: Record<SocialPlatform, { label: string; icon: typeof Facebook; color: string; bg: string }> = {
  facebook: { label: "Facebook", icon: Facebook, color: "text-indigo-700", bg: "bg-indigo-50" },
  instagram: { label: "Instagram", icon: Instagram, color: "text-pink-700", bg: "bg-pink-50" },
};

export function PlatformBadge({ platform, size = "sm" }: { platform: SocialPlatform; size?: "sm" | "md" }) {
  const config = PLATFORM_CONFIG[platform];
  if (!config) return null;
  const Icon = config.icon;
  const isSmall = size === "sm";

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
      <Icon className={isSmall ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {!isSmall && config.label}
    </span>
  );
}

export function PlatformIcon({ platform, className = "w-5 h-5" }: { platform: SocialPlatform; className?: string }) {
  const config = PLATFORM_CONFIG[platform];
  if (!config) return null;
  const Icon = config.icon;
  return <Icon className={`${className} ${config.color}`} />;
}

export function getPlatformLabel(platform: SocialPlatform): string {
  return PLATFORM_CONFIG[platform]?.label || platform;
}
