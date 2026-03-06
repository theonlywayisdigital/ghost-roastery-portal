"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Facebook,
  Instagram,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "@/components/icons";
import type { SocialConnection, SocialPlatform } from "@/types/social";
import { useMarketingContext } from "@/lib/marketing-context";

const PLATFORMS: {
  id: SocialPlatform;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}[] = [
  { id: "google_business", label: "Google Business", icon: Building2, color: "text-blue-600", bgColor: "bg-blue-50" },
  { id: "facebook", label: "Facebook", icon: Facebook, color: "text-indigo-600", bgColor: "bg-indigo-50" },
  { id: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-600", bgColor: "bg-pink-50" },
];

export function SocialConnectionsBar() {
  const router = useRouter();
  const { pageBase } = useMarketingContext();
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/social/connections");
        if (res.ok) {
          const data = await res.json();
          setConnections(data.connections || []);
          // Auto-collapse if all connected
          const connectedCount = (data.connections || []).filter(
            (c: SocialConnection) => c.status === "connected"
          ).length;
          if (connectedCount === PLATFORMS.length) {
            setCollapsed(true);
          }
        }
      } catch (err) {
        console.error("Failed to load connections:", err);
      }
      setLoading(false);
    }
    load();
  }, []);

  function getConnection(platformId: SocialPlatform): SocialConnection | undefined {
    return connections.find((c) => c.platform === platformId);
  }

  function getStatusInfo(conn?: SocialConnection) {
    if (!conn) return { label: "Not connected", dot: "bg-slate-300" };
    if (conn.status === "connected") {
      // Check if token is expired
      if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
        return { label: "Expired", dot: "bg-amber-400" };
      }
      return { label: conn.page_name || "Connected", dot: "bg-green-500" };
    }
    if (conn.status === "expired") return { label: "Expired", dot: "bg-amber-400" };
    return { label: "Disconnected", dot: "bg-slate-300" };
  }

  async function handleConnect(platform: SocialPlatform) {
    if (platform === "google_business") {
      router.push("/api/social/auth/google");
    } else {
      router.push("/api/social/auth/meta");
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
          <span className="text-sm text-slate-400">Loading connections...</span>
        </div>
      </div>
    );
  }

  const connectedCount = connections.filter((c) => c.status === "connected").length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 mb-6">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1">
            {PLATFORMS.map((p) => {
              const conn = getConnection(p.id);
              const status = getStatusInfo(conn);
              return (
                <div
                  key={p.id}
                  className={`w-7 h-7 rounded-full ${p.bgColor} flex items-center justify-center border-2 border-white`}
                  title={`${p.label}: ${status.label}`}
                >
                  <p.icon className={`w-3.5 h-3.5 ${p.color}`} />
                </div>
              );
            })}
          </div>
          <span className="text-sm font-medium text-slate-700">
            {connectedCount === PLATFORMS.length
              ? "All platforms connected"
              : `${connectedCount}/${PLATFORMS.length} platforms connected`}
          </span>
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Expanded content */}
      {!collapsed && (
        <div className="border-t border-slate-100 px-4 py-3">
          <div className="flex flex-wrap gap-3">
            {PLATFORMS.map((platform) => {
              const conn = getConnection(platform.id);
              const status = getStatusInfo(conn);
              const Icon = platform.icon;

              return (
                <div
                  key={platform.id}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50"
                >
                  <div className={`w-7 h-7 rounded-lg ${platform.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-3.5 h-3.5 ${platform.color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-700">{platform.label}</p>
                    <div className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                      <span className="text-[10px] text-slate-500">{status.label}</span>
                    </div>
                  </div>
                  {!conn || conn.status !== "connected" ? (
                    <button
                      onClick={() => handleConnect(platform.id)}
                      className="ml-1 px-2 py-1 text-[10px] font-medium text-brand-600 bg-brand-50 rounded hover:bg-brand-100 transition-colors"
                    >
                      Connect
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
          <button
            onClick={() => router.push(`${pageBase}/social/connections`)}
            className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            Manage Connections
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
