import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmailConnection } from "@/types/email";
import { ensureFreshGmailToken } from "./gmail";
import { ensureFreshOutlookToken } from "./outlook";

// ═══════════════════════════════════════════════════════════
// Common types for normalized messages
// ═══════════════════════════════════════════════════════════

interface NormalizedMessage {
  external_id: string;
  thread_id: string;
  from_email: string;
  from_name: string | null;
  to_emails: { email: string; name?: string }[];
  cc_emails: { email: string; name?: string }[];
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  snippet: string | null;
  is_read: boolean;
  has_attachments: boolean;
  attachments: { filename: string; content_type: string; size: number }[];
  labels: string[];
  folder: string | null;
  received_at: string;
}

// ═══════════════════════════════════════════════════════════
// Gmail Sync
// ═══════════════════════════════════════════════════════════

function parseEmailHeader(raw: string): { email: string; name?: string } {
  // "John Doe <john@example.com>" → { email: "john@example.com", name: "John Doe" }
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { email: match[2], name: match[1].replace(/^"|"$/g, "").trim() };
  }
  return { email: raw.trim() };
}

function parseEmailList(value: string | undefined): { email: string; name?: string }[] {
  if (!value) return [];
  // Split on commas that are not inside angle brackets
  return value.split(/,(?=(?:[^<]*<[^>]*>)*[^>]*$)/).map((s) => parseEmailHeader(s.trim())).filter((r) => r.email);
}

function getGmailHeader(headers: { name: string; value: string }[], name: string): string | undefined {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
}

function getGmailFolder(labelIds: string[]): string | null {
  if (labelIds.includes("SENT")) return "SENT";
  if (labelIds.includes("INBOX")) return "INBOX";
  if (labelIds.includes("DRAFT")) return "DRAFT";
  if (labelIds.includes("TRASH")) return "TRASH";
  if (labelIds.includes("SPAM")) return "SPAM";
  return null;
}

function decodeGmailBody(part: Record<string, unknown>): { text: string | null; html: string | null } {
  let text: string | null = null;
  let html: string | null = null;

  const mimeType = part.mimeType as string;
  const body = part.body as { data?: string; size?: number } | undefined;
  const parts = part.parts as Record<string, unknown>[] | undefined;

  if (mimeType === "text/plain" && body?.data) {
    text = Buffer.from(body.data, "base64url").toString("utf-8");
  } else if (mimeType === "text/html" && body?.data) {
    html = Buffer.from(body.data, "base64url").toString("utf-8");
  } else if (parts) {
    for (const sub of parts) {
      const decoded = decodeGmailBody(sub);
      if (decoded.text && !text) text = decoded.text;
      if (decoded.html && !html) html = decoded.html;
    }
  }

  return { text, html };
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: { name: string; value: string }[];
    mimeType: string;
    body?: { data?: string; size?: number };
    parts?: Record<string, unknown>[];
  };
  internalDate: string;
}

function normalizeGmailMessage(msg: GmailMessage): NormalizedMessage {
  const headers = msg.payload.headers;
  const from = getGmailHeader(headers, "From") || "";
  const to = getGmailHeader(headers, "To") || "";
  const cc = getGmailHeader(headers, "Cc") || "";
  const subject = getGmailHeader(headers, "Subject") || null;
  const parsed = parseEmailHeader(from);
  const { text, html } = decodeGmailBody(msg.payload as Record<string, unknown>);

  // Extract attachments from parts
  const attachments: { filename: string; content_type: string; size: number }[] = [];
  function extractAttachments(parts: Record<string, unknown>[] | undefined) {
    if (!parts) return;
    for (const part of parts) {
      const filename = part.filename as string;
      const body = part.body as { size?: number } | undefined;
      if (filename) {
        attachments.push({
          filename,
          content_type: (part.mimeType as string) || "application/octet-stream",
          size: body?.size || 0,
        });
      }
      if (part.parts) {
        extractAttachments(part.parts as Record<string, unknown>[]);
      }
    }
  }
  extractAttachments(msg.payload.parts);

  return {
    external_id: msg.id,
    thread_id: msg.threadId,
    from_email: parsed.email,
    from_name: parsed.name || null,
    to_emails: parseEmailList(to),
    cc_emails: parseEmailList(cc),
    subject,
    body_text: text,
    body_html: html,
    snippet: msg.snippet || null,
    is_read: !msg.labelIds.includes("UNREAD"),
    has_attachments: attachments.length > 0,
    attachments,
    labels: msg.labelIds || [],
    folder: getGmailFolder(msg.labelIds || []),
    received_at: new Date(parseInt(msg.internalDate)).toISOString(),
  };
}

/**
 * Fetch recent messages from Gmail API.
 * Uses historyId for incremental sync if available, otherwise fetches recent messages.
 * Returns normalized messages ready for DB insertion.
 */
export async function syncGmailMessages(
  connection: EmailConnection,
  supabase: SupabaseClient,
  maxMessages = 50
): Promise<{ messages: NormalizedMessage[]; newHistoryId?: string }> {
  const accessToken = await ensureFreshGmailToken(connection, supabase);

  // List recent messages (INBOX + SENT for two-way view)
  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("maxResults", String(maxMessages));
  listUrl.searchParams.set("q", "in:inbox OR in:sent");

  const listRes = await fetch(listUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listRes.ok) {
    const err = await listRes.text();
    throw new Error(`Gmail list messages failed: ${err}`);
  }

  const listData = await listRes.json();
  const messageIds: { id: string }[] = listData.messages || [];

  if (messageIds.length === 0) {
    return { messages: [] };
  }

  // Check which messages we already have
  const externalIds = messageIds.map((m) => m.id);
  const { data: existing } = await supabase
    .from("direct_messages")
    .select("external_id")
    .eq("connection_id", connection.id)
    .in("external_id", externalIds);

  const existingSet = new Set((existing || []).map((e: { external_id: string }) => e.external_id));
  const newIds = externalIds.filter((id) => !existingSet.has(id));

  if (newIds.length === 0) {
    return { messages: [] };
  }

  // Fetch full message details for new messages (batch with Promise.all, limit concurrency)
  const batchSize = 10;
  const normalized: NormalizedMessage[] = [];

  for (let i = 0; i < newIds.length; i += batchSize) {
    const batch = newIds.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (msgId) => {
        const res = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok) return null;
        return res.json();
      })
    );

    for (const msg of results) {
      if (msg) {
        normalized.push(normalizeGmailMessage(msg));
      }
    }
  }

  // Get profile for historyId
  const profileRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const profile = profileRes.ok ? await profileRes.json() : null;

  return {
    messages: normalized,
    newHistoryId: profile?.historyId,
  };
}

// ═══════════════════════════════════════════════════════════
// Outlook Sync
// ═══════════════════════════════════════════════════════════

interface OutlookRecipient {
  emailAddress: {
    name?: string;
    address: string;
  };
}

interface OutlookMessage {
  id: string;
  conversationId: string;
  from?: { emailAddress: { name?: string; address: string } };
  toRecipients?: OutlookRecipient[];
  ccRecipients?: OutlookRecipient[];
  subject?: string;
  body?: { contentType: string; content: string };
  bodyPreview?: string;
  isRead: boolean;
  hasAttachments: boolean;
  receivedDateTime: string;
  categories?: string[];
  parentFolderId?: string;
}

function normalizeOutlookRecipients(recipients: OutlookRecipient[] | undefined): { email: string; name?: string }[] {
  if (!recipients) return [];
  return recipients.map((r) => ({
    email: r.emailAddress.address,
    name: r.emailAddress.name || undefined,
  }));
}

function normalizeOutlookMessage(msg: OutlookMessage, folderMap: Record<string, string>): NormalizedMessage {
  const fromAddr = msg.from?.emailAddress;
  const bodyHtml = msg.body?.contentType === "html" ? msg.body.content : null;
  const bodyText = msg.body?.contentType === "text" ? msg.body.content : null;

  return {
    external_id: msg.id,
    thread_id: msg.conversationId,
    from_email: fromAddr?.address || "",
    from_name: fromAddr?.name || null,
    to_emails: normalizeOutlookRecipients(msg.toRecipients),
    cc_emails: normalizeOutlookRecipients(msg.ccRecipients),
    subject: msg.subject || null,
    body_text: bodyText,
    body_html: bodyHtml,
    snippet: msg.bodyPreview || null,
    is_read: msg.isRead,
    has_attachments: msg.hasAttachments,
    attachments: [], // Attachments require separate Graph API call — skip for list sync
    labels: msg.categories || [],
    folder: folderMap[msg.parentFolderId || ""] || null,
    received_at: msg.receivedDateTime,
  };
}

/**
 * Fetch recent messages from Microsoft Graph API.
 * Fetches from Inbox + SentItems folders.
 */
export async function syncOutlookMessages(
  connection: EmailConnection,
  supabase: SupabaseClient,
  maxMessages = 50
): Promise<{ messages: NormalizedMessage[] }> {
  const accessToken = await ensureFreshOutlookToken(connection, supabase);
  const headers = { Authorization: `Bearer ${accessToken}` };

  // Get well-known folder IDs
  const folderMap: Record<string, string> = {};
  try {
    const foldersRes = await fetch(
      "https://graph.microsoft.com/v1.0/me/mailFolders?$select=id,displayName&$top=50",
      { headers }
    );
    if (foldersRes.ok) {
      const foldersData = await foldersRes.json();
      for (const f of foldersData.value || []) {
        folderMap[f.id] = f.displayName;
      }
    }
  } catch {
    // Non-critical — folder names just won't resolve
  }

  const normalized: NormalizedMessage[] = [];
  const select = "$select=id,conversationId,from,toRecipients,ccRecipients,subject,body,bodyPreview,isRead,hasAttachments,receivedDateTime,categories,parentFolderId";
  const orderBy = "$orderby=receivedDateTime desc";
  const top = `$top=${maxMessages}`;

  // Fetch from both Inbox and Sent Items
  for (const folder of ["Inbox", "SentItems"]) {
    const url = `https://graph.microsoft.com/v1.0/me/mailFolders/${folder}/messages?${select}&${orderBy}&${top}`;
    const res = await fetch(url, { headers });
    if (!res.ok) continue;

    const data = await res.json();
    const messages: OutlookMessage[] = data.value || [];

    for (const msg of messages) {
      normalized.push(normalizeOutlookMessage(msg, folderMap));
    }
  }

  // Deduplicate by external_id (shouldn't happen but safety)
  const seen = new Set<string>();
  const deduped = normalized.filter((m) => {
    if (seen.has(m.external_id)) return false;
    seen.add(m.external_id);
    return true;
  });

  // Filter out already-synced messages
  if (deduped.length > 0) {
    const externalIds = deduped.map((m) => m.external_id);
    const { data: existing } = await supabase
      .from("direct_messages")
      .select("external_id")
      .eq("connection_id", connection.id)
      .in("external_id", externalIds);

    const existingSet = new Set((existing || []).map((e: { external_id: string }) => e.external_id));
    return { messages: deduped.filter((m) => !existingSet.has(m.external_id)) };
  }

  return { messages: deduped };
}

// ═══════════════════════════════════════════════════════════
// Sync orchestrator — syncs a single connection and inserts into DB
// ═══════════════════════════════════════════════════════════

export async function syncConnection(
  connection: EmailConnection,
  supabase: SupabaseClient
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let messages: NormalizedMessage[] = [];

  try {
    if (connection.provider === "gmail") {
      const result = await syncGmailMessages(connection, supabase);
      messages = result.messages;
    } else if (connection.provider === "outlook") {
      const result = await syncOutlookMessages(connection, supabase);
      messages = result.messages;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown sync error";
    errors.push(`${connection.provider}: ${msg}`);
    return { synced: 0, errors };
  }

  if (messages.length === 0) {
    // Update last_used_at even if no new messages
    await supabase
      .from("email_connections")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", connection.id);
    return { synced: 0, errors };
  }

  // Prepare rows for upsert
  const rows = messages.map((m) => ({
    roaster_id: connection.roaster_id,
    connection_id: connection.id,
    provider: connection.provider,
    external_id: m.external_id,
    thread_id: m.thread_id,
    from_email: m.from_email,
    from_name: m.from_name,
    to_emails: m.to_emails,
    cc_emails: m.cc_emails,
    subject: m.subject,
    body_text: m.body_text,
    body_html: m.body_html,
    snippet: m.snippet,
    is_read: m.is_read,
    has_attachments: m.has_attachments,
    attachments: m.attachments,
    labels: m.labels,
    folder: m.folder,
    received_at: m.received_at,
    synced_at: new Date().toISOString(),
  }));

  // Upsert in batches of 50
  const batchSize = 50;
  let synced = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from("direct_messages")
      .upsert(batch, { onConflict: "connection_id,external_id" });

    if (error) {
      errors.push(`Upsert batch error: ${error.message}`);
    } else {
      synced += batch.length;
    }
  }

  // Update last_used_at
  await supabase
    .from("email_connections")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", connection.id);

  return { synced, errors };
}
