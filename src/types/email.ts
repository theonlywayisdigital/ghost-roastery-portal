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

// ═══════════════════════════════════════════════════════════
// Direct Message Types
// ═══════════════════════════════════════════════════════════

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface DirectMessageAttachment {
  filename: string;
  content_type: string;
  size: number;
}

export interface DirectMessage {
  id: string;
  roaster_id: string;
  connection_id: string;
  provider: EmailProvider;
  external_id: string;
  thread_id: string;
  from_email: string;
  from_name: string | null;
  to_emails: EmailRecipient[];
  cc_emails: EmailRecipient[];
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  snippet: string | null;
  is_read: boolean;
  is_starred: boolean;
  has_attachments: boolean;
  attachments: DirectMessageAttachment[];
  labels: string[];
  folder: string | null;
  received_at: string;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface DirectThread {
  thread_id: string;
  subject: string | null;
  snippet: string | null;
  from_email: string;
  from_name: string | null;
  last_received_at: string;
  message_count: number;
  unread_count: number;
  provider: EmailProvider;
  connection_id: string;
}
