// ═══════════════════════════════════════════════════════════
// Email Connection Types
// ═══════════════════════════════════════════════════════════

export type EmailProvider = "gmail" | "outlook";
export type EmailConnectionStatus = "connected" | "disconnected" | "expired";

export interface EmailConnection {
  id: string;
  roaster_id: string;
  provider: EmailProvider;
  email_address: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  scopes: string[];
  status: EmailConnectionStatus;
  connected_at: string;
  last_used_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
