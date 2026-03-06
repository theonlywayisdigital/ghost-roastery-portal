"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Facebook,
  Instagram,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Unplug,
  ExternalLink,
  Lock,
  ArrowLeft,
} from "@/components/icons";
import type { SocialConnection, SocialPlatform } from "@/types/social";
import { useMarketingContext } from "@/lib/marketing-context";

interface PlatformCard {
  id: SocialPlatform;
  label: string;
  description: string;
  icon: typeof Building2;
  color: string;
  bgColor: string;
}

const PLATFORMS: PlatformCard[] = [
  {
    id: "google_business",
    label: "Google Business Profile",
    description: "Publish updates to your Google Business listing. Appears in Google Search and Maps.",
    icon: Building2,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: "facebook",
    label: "Facebook Page",
    description: "Post to your Facebook business page. Manage content and track engagement.",
    icon: Facebook,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
  {
    id: "instagram",
    label: "Instagram Business",
    description: "Publish photos and carousels to your Instagram business account.",
    icon: Instagram,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
  },
];

export function ConnectionsPage() {
  const router = useRouter();
  const { pageBase } = useMarketingContext();
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [disconnectingPlatform, setDisconnectingPlatform] = useState<string | null>(null);
  const [metaSetupRequired, setMetaSetupRequired] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadConnections();
    // Check URL params for success/error
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected === "google") setSuccessMessage("Google Business Profile connected successfully!");
    if (connected === "meta") setSuccessMessage("Facebook & Instagram connected successfully!");
    if (error) setErrorMessage(getErrorMessage(error));
  }, [searchParams]);

  async function loadConnections() {
    try {
      const res = await fetch("/api/social/connections");
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections || []);
      }
    } catch (err) {
      console.error("Failed to load connections:", err);
    }
    setLoading(false);

    // Check Meta availability
    try {
      const res = await fetch("/api/social/meta/auth");
      if (res.ok) {
        const data = await res.json();
        if (data.setup_required) setMetaSetupRequired(true);
      }
    } catch {
      // Ignore — just means Meta won't be available
    }
  }

  function getConnection(platform: SocialPlatform): SocialConnection | undefined {
    return connections.find((c) => c.platform === platform);
  }

  async function handleConnect(platform: SocialPlatform) {
    setConnectingPlatform(platform);
    setErrorMessage(null);

    try {
      let authEndpoint: string;
      if (platform === "google_business") {
        authEndpoint = "/api/social/google/auth";
      } else {
        authEndpoint = "/api/social/meta/auth";
      }

      const res = await fetch(authEndpoint);
      const data = await res.json();

      if (data.setup_required) {
        setMetaSetupRequired(true);
        setConnectingPlatform(null);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        setErrorMessage("Failed to get authorization URL");
        setConnectingPlatform(null);
      }
    } catch {
      setErrorMessage("Failed to start connection process");
      setConnectingPlatform(null);
    }
  }

  async function handleDisconnect(platform: SocialPlatform) {
    if (!confirm(`Disconnect ${platform === "google_business" ? "Google Business" : platform}? You won't be able to post to this platform until you reconnect.`)) return;

    setDisconnectingPlatform(platform);

    try {
      let endpoint: string;
      if (platform === "google_business") {
        endpoint = "/api/social/google/disconnect";
      } else {
        endpoint = "/api/social/meta/disconnect";
      }

      const body = platform !== "google_business" ? JSON.stringify({ platform }) : undefined;
      const headers: Record<string, string> = {};
      if (body) headers["Content-Type"] = "application/json";

      const res = await fetch(endpoint, { method: "POST", headers, body });
      if (res.ok) {
        await loadConnections();
      }
    } catch {
      setErrorMessage("Failed to disconnect");
    }
    setDisconnectingPlatform(null);
  }

  function getErrorMessage(error: string): string {
    const messages: Record<string, string> = {
      google_denied: "Google authorization was denied. Please try again.",
      meta_denied: "Facebook authorization was denied. Please try again.",
      meta_not_configured: "Meta integration is not yet configured.",
      missing_params: "Missing authorization parameters. Please try again.",
      invalid_state: "Invalid authorization state. Please try again.",
      invalid_nonce: "Security verification failed. Please try again.",
      save_failed: "Failed to save connection. Please try again.",
      callback_failed: "Authorization callback failed. Please try again.",
    };
    return messages[error] || "An error occurred during authorization.";
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push(`${pageBase}/social`)}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Platform Connections</h2>
          <p className="text-sm text-slate-500">Connect your social media accounts to start publishing.</p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Platform cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLATFORMS.map((platform) => {
          const connection = getConnection(platform.id);
          const isConnected = connection?.status === "connected";
          const isExpired = connection?.status === "expired";
          const isMetaUnavailable = (platform.id === "facebook" || platform.id === "instagram") && metaSetupRequired;
          const Icon = platform.icon;

          return (
            <div
              key={platform.id}
              className={`bg-white rounded-xl border p-5 ${
                isMetaUnavailable ? "border-slate-100 opacity-60" : "border-slate-200"
              }`}
            >
              {/* Icon + Status */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${platform.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${platform.color}`} />
                </div>
                {isConnected && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Connected
                  </span>
                )}
                {isExpired && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    Expired
                  </span>
                )}
              </div>

              <h3 className="text-sm font-semibold text-slate-900 mb-1">{platform.label}</h3>
              <p className="text-xs text-slate-500 mb-4">{platform.description}</p>

              {/* Connected state */}
              {isConnected && connection && (
                <div className="space-y-2 mb-4">
                  {connection.page_name && (
                    <p className="text-xs text-slate-600">
                      <span className="text-slate-400">Account:</span> {connection.page_name}
                    </p>
                  )}
                  <p className="text-xs text-slate-400">
                    Connected {formatDate(connection.connected_at)}
                  </p>
                </div>
              )}

              {/* Actions */}
              {isMetaUnavailable ? (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Setup required — contact support</span>
                </div>
              ) : isConnected ? (
                <button
                  onClick={() => handleDisconnect(platform.id)}
                  disabled={disconnectingPlatform === platform.id}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  {disconnectingPlatform === platform.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Unplug className="w-3.5 h-3.5" />
                  )}
                  Disconnect
                </button>
              ) : isExpired ? (
                <button
                  onClick={() => handleConnect(platform.id)}
                  disabled={connectingPlatform === platform.id}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 disabled:opacity-50"
                >
                  {connectingPlatform === platform.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5" />
                  )}
                  Reconnect
                </button>
              ) : (
                <button
                  onClick={() => handleConnect(platform.id)}
                  disabled={connectingPlatform === platform.id}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-xs font-medium hover:bg-brand-700 disabled:opacity-50"
                >
                  {connectingPlatform === platform.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5" />
                  )}
                  Connect
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
