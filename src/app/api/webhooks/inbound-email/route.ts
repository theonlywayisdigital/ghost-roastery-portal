import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase";

/**
 * POST /api/webhooks/inbound-email
 *
 * Receives inbound email webhooks from Resend (event type: email.received).
 * Parses the "to" address to extract the roaster slug, fetches the full
 * email content from Resend's API, and stores it in inbox_messages.
 *
 * DNS configuration required for inbox.ghostroastery.com:
 *   MX record: inbox.ghostroastery.com → inbound-smtp.us-east-1.amazonaws.com (priority 10)
 *   Configure "inbox.ghostroastery.com" as a receiving domain in Resend dashboard.
 *   Add a webhook subscribed to "email.received" pointing to this endpoint.
 *
 * Inbound address format: {roaster_slug}@inbox.ghostroastery.com
 */

const resend = new Resend(process.env.RESEND_API_KEY);

function parseFromField(from: string): { email: string; name: string | null } {
  // Format: "Name <email@example.com>" or just "email@example.com"
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: null, email: from.trim() };
}

function extractSlugFromAddress(address: string): string | null {
  // Extract from "slug@inbox.ghostroastery.com" or "Name <slug@inbox.ghostroastery.com>"
  const emailMatch = address.match(/<(.+?)>/) || [null, address];
  const email = (emailMatch[1] || address).trim().toLowerCase();
  const match = email.match(/^([a-z0-9_-]+)@inbox\.ghostroastery\.com$/);
  return match ? match[1] : null;
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let payload: Record<string, unknown>;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Resend webhook payload: { type: "email.received", data: { email_id, from, to, subject, ... } }
    const eventType = payload.type as string;
    if (eventType !== "email.received") {
      // Acknowledge non-email events
      return NextResponse.json({ ok: true });
    }

    const eventData = payload.data as Record<string, unknown>;
    const resendEmailId = eventData.email_id as string;
    const from = eventData.from as string;
    const toAddresses = eventData.to as string[];
    const subject = (eventData.subject as string) || "(No subject)";

    if (!resendEmailId || !from || !toAddresses?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find the roaster slug from any of the to addresses
    let slug: string | null = null;
    let toEmail = toAddresses[0];
    for (const addr of toAddresses) {
      const extracted = extractSlugFromAddress(addr);
      if (extracted) {
        slug = extracted;
        toEmail = addr;
        break;
      }
    }

    if (!slug) {
      console.error("[inbound-email] No roaster slug found in to addresses:", toAddresses);
      return NextResponse.json({ error: "No matching roaster address" }, { status: 400 });
    }

    // Look up roaster by slug
    const supabase = createServerClient();
    const { data: roaster } = await supabase
      .from("partner_roasters")
      .select("id")
      .eq("roaster_slug", slug)
      .single();

    if (!roaster) {
      console.error("[inbound-email] No roaster found for slug:", slug);
      return NextResponse.json({ error: "Unknown roaster" }, { status: 404 });
    }

    // Fetch full email content from Resend API (webhook only contains metadata)
    let bodyHtml: string | null = null;
    let bodyText: string | null = null;
    let attachmentsMeta: { filename: string; content_type: string; size: number; url: string }[] = [];

    try {
      const emailResponse = await fetch(
        `https://api.resend.com/emails/receiving/${resendEmailId}`,
        { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } }
      );

      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        bodyHtml = emailData.html || null;
        bodyText = emailData.text || null;

        // Fetch attachment details if any exist
        const webhookAttachments = eventData.attachments as Array<{ id: string; filename: string; content_type: string }> | undefined;
        if (webhookAttachments?.length) {
          const attachResponse = await fetch(
            `https://api.resend.com/emails/receiving/${resendEmailId}/attachments`,
            { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } }
          );

          if (attachResponse.ok) {
            const attachData = await attachResponse.json();
            const items = attachData.data || [];
            attachmentsMeta = items.map((a: { filename: string; content_type: string; size: number; download_url: string }) => ({
              filename: a.filename,
              content_type: a.content_type,
              size: a.size || 0,
              url: a.download_url || "",
            }));
          }
        }
      } else {
        console.error("[inbound-email] Failed to fetch email content:", emailResponse.status);
      }
    } catch (err) {
      console.error("[inbound-email] Error fetching email content:", err);
    }

    // Parse from field
    const parsed = parseFromField(from);

    // Store in inbox_messages
    const { error: insertError } = await supabase
      .from("inbox_messages")
      .insert({
        roaster_id: roaster.id,
        from_email: parsed.email,
        from_name: parsed.name,
        to_email: toEmail,
        subject,
        body_text: bodyText,
        body_html: bodyHtml,
        attachments: attachmentsMeta,
        resend_email_id: resendEmailId,
        received_at: eventData.created_at || new Date().toISOString(),
      });

    if (insertError) {
      console.error("[inbound-email] Failed to insert message:", insertError);
      return NextResponse.json({ error: "Failed to store message" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[inbound-email] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
