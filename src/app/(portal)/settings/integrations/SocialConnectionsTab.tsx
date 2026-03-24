"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Facebook,
  Instagram,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Unplug,
  ExternalLink,
  Lock,
} from "lucide-react";
import type { SocialConnection, SocialPlatform } from "@/types/social";

interface PlatformCard {
  id: SocialPlatform;
  label: string;
  description: string;
  icon: typeof Facebook;
  color: string;
  bgColor: string;
  iconColor: string;
}

const PLATFORMS: PlatformCard[] = [
  {
    id: "facebook",
    label: "Facebook Page",
    description: "Post to your Facebook business page. Manage content and track engagement.",
    icon: Facebook,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    iconColor: "text-indigo-600",
  },
  {
    id: "instagram",
    label: "Instagram Business",
    description: "Publish photos and carousels to your Instagram business account.",
    icon: Instagram,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    iconColor: "text-pink-600",
  },
];

export function SocialConnectionsTab() {
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
    // Check URL params for success/error from OAuth callback
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
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
      // Ignore
    }
  }

  function getConnection(platform: SocialPlatform): SocialConnection | undefined {
    return connections.find((c) => c.platform === platform);
  }

  async function handleConnect(platform: SocialPlatform) {
    setConnectingPlatform(platform);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/social/meta/auth");
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
    if (!confirm(`Disconnect ${platform === "facebook" ? "Facebook" : "Instagram"}? You won't be able to post to this platform until you reconnect.`)) return;

    setDisconnectingPlatform(platform);

    try {
      const res = await fetch("/api/social/meta/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
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
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Platform cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PLATFORMS.map((platform) => {
          const connection = getConnection(platform.id);
          const isConnected = connection?.status === "connected";
          const isExpired = connection?.status === "expired";
          const isMetaUnavailable = metaSetupRequired;
          const Icon = platform.icon;

          return (
            <section
              key={platform.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${platform.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${platform.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">{platform.label}</h3>
                      {isConnected && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Connected
                        </span>
                      )}
                      {isExpired && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                          <AlertTriangle className="w-3 h-3" />
                          Expired
                        </span>
                      )}
                      {!isConnected && !isExpired && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                          Not connected
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{platform.description}</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Connected state — show account info */}
                {isConnected && connection && (
                  <div className="bg-slate-50 rounded-lg p-4 mb-4">
                    {connection.page_name && (
                      <p className="text-sm text-slate-700">
                        <span className="text-slate-500">Account:</span>{" "}
                        <span className="font-medium">{connection.page_name}</span>
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      Connected {formatDate(connection.connected_at)}
                    </p>
                  </div>
                )}

                {/* Actions */}
                {isMetaUnavailable ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Lock className="w-4 h-4" />
                    <span>Meta integration setup required — contact support</span>
                  </div>
                ) : isConnected ? (
                  <button
                    onClick={() => handleDisconnect(platform.id)}
                    disabled={disconnectingPlatform === platform.id}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    {disconnectingPlatform === platform.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Unplug className="w-4 h-4" />
                    )}
                    Disconnect
                  </button>
                ) : isExpired ? (
                  <button
                    onClick={() => handleConnect(platform.id)}
                    disabled={connectingPlatform === platform.id}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
                  >
                    {connectingPlatform === platform.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                    Reconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(platform.id)}
                    disabled={connectingPlatform === platform.id}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                  >
                    {connectingPlatform === platform.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                    Connect
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
