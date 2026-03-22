import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmailConnection } from "@/types/email";
import { ensureFreshGmailToken } from "./gmail";
import { ensureFreshOutlookToken } from "./outlook";

// ═══════════════════════════════════════════════════════════
// Gmail — send reply via Gmail API using raw RFC 2822
// ═══════════════════════════════════════════════════════════

function buildRfc2822Reply(opts: {
  from: string;
  to: string;
  subject: string;
  inReplyTo: string | null;
  references: string | null;
  bodyHtml: string;
}): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const lines = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];

  if (opts.inReplyTo) {
    lines.push(`In-Reply-To: ${opts.inReplyTo}`);
  }
  if (opts.references) {
    lines.push(`References: ${opts.references}`);
  }

  lines.push("", `--${boundary}`);
  lines.push("Content-Type: text/plain; charset=UTF-8", "");
  // Strip HTML for plain text
  lines.push(opts.bodyHtml.replace(/<[^>]+>/g, "").trim());
  lines.push(`--${boundary}`);
  lines.push("Content-Type: text/html; charset=UTF-8", "");
  lines.push(opts.bodyHtml);
  lines.push(`--${boundary}--`);

  return lines.join("\r\n");
}

/**
 * Send a reply via Gmail API.
 * Returns the sent message ID.
 */
export async function sendGmailReply(
  connection: EmailConnection,
  supabase: SupabaseClient,
  opts: {
    to: string;
    subject: string;
    bodyHtml: string;
    threadId: string;
    inReplyTo: string | null;
    references: string | null;
  }
): Promise<{ messageId: string; threadId: string }> {
  const accessToken = await ensureFreshGmailToken(connection, supabase);

  const raw = buildRfc2822Reply({
    from: connection.email_address,
    to: opts.to,
    subject: opts.subject.startsWith("Re: ") ? opts.subject : `Re: ${opts.subject}`,
    inReplyTo: opts.inReplyTo,
    references: opts.references,
    bodyHtml: opts.bodyHtml,
  });

  const encodedRaw = Buffer.from(raw).toString("base64url");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: encodedRaw,
      threadId: opts.threadId,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail send failed: ${err}`);
  }

  const data = await res.json();
  return { messageId: data.id, threadId: data.threadId };
}

// ═══════════════════════════════════════════════════════════
// Outlook — send reply via Microsoft Graph API
// ═══════════════════════════════════════════════════════════

/**
 * Send a reply via Microsoft Graph API.
 * Uses POST /me/messages/{messageId}/reply
 */
export async function sendOutlookReply(
  connection: EmailConnection,
  supabase: SupabaseClient,
  opts: {
    originalMessageId: string;
    bodyHtml: string;
  }
): Promise<void> {
  const accessToken = await ensureFreshOutlookToken(connection, supabase);

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${opts.originalMessageId}/reply`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          body: {
            contentType: "html",
            content: opts.bodyHtml,
          },
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Outlook reply failed: ${err}`);
  }
}
