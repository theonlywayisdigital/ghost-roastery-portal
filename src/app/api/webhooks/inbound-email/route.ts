import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

/**
 * POST /api/webhooks/inbound-email
 *
 * Receives inbound email webhooks from Resend (event type: email.received).
 * Parses the "to" address to extract the roaster slug, fetches the full
 * email content from Resend's API, and stores it in inbox_messages.
 *
 * DNS configuration required for inbox.roasteryplatform.com:
 *   MX record: inbox.roasteryplatform.com → inbound-smtp.us-east-1.amazonaws.com (priority 10)
 *   Configure "inbox.roasteryplatform.com" as a receiving domain in Resend dashboard.
 *   Add a webhook subscribed to "email.received" pointing to this endpoint.
 *
 * Inbound address format: {roaster_slug}@inbox.roasteryplatform.com
 */

function parseFromField(from: string): { email: string; name: string | null } {
  // Format: "Name <email@example.com>" or just "email@example.com"
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: null, email: from.trim() };
}

function extractSlugFromAddress(address: string): string | null {
  // Extract from "slug@inbox.roasteryplatform.com" or "Name <slug@inbox.roasteryplatform.com>"
  const emailMatch = address.match(/<(.+?)>/) || [null, address];
  const email = (emailMatch[1] || address).trim().toLowerCase();
  // Allow dots in slug (e.g. "off.your.bean") since roaster slugs can contain them
  const match = email.match(/^([a-z0-9._-]+)@inbox\.roasteryplatform\.com$/);
  return match ? match[1] : null;
}

export async function POST(request: Request) {
  console.log("[inbound-email] Webhook handler called");

  try {
    const rawBody = await request.text();
    console.log("[inbound-email] Raw body:", rawBody.slice(0, 2000));

    let payload: Record<string, unknown>;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error("[inbound-email] Failed to parse JSON body");
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    console.log("[inbound-email] Event type:", payload.type);

    // Resend webhook payload: { type: "email.received", data: { email_id, from, to, subject, ... } }
    const eventType = payload.type as string;
    if (eventType !== "email.received") {
      console.log("[inbound-email] Ignoring non-email event:", eventType);
      return NextResponse.json({ ok: true });
    }

    const eventData = payload.data as Record<string, unknown>;
    const resendEmailId = eventData.email_id as string;
    const from = eventData.from as string;
    const subject = (eventData.subject as string) || "(No subject)";

    // Resend sends `to` as string[] — handle both array and string for safety
    const rawTo = eventData.to;
    const toAddresses: string[] = Array.isArray(rawTo)
      ? rawTo
      : typeof rawTo === "string"
        ? [rawTo]
        : [];

    console.log("[inbound-email] email_id:", resendEmailId);
    console.log("[inbound-email] from:", from);
    console.log("[inbound-email] to:", JSON.stringify(toAddresses));
    console.log("[inbound-email] subject:", subject);

    if (!resendEmailId || !from || !toAddresses.length) {
      console.error("[inbound-email] Missing required fields — email_id:", resendEmailId, "from:", from, "to:", toAddresses);
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find the roaster slug from any of the to addresses
    let slug: string | null = null;
    let toEmail = toAddresses[0];
    for (const addr of toAddresses) {
      const extracted = extractSlugFromAddress(addr);
      console.log("[inbound-email] extractSlugFromAddress:", addr, "→", extracted);
      if (extracted) {
        slug = extracted;
        toEmail = addr;
        break;
      }
    }

    if (!slug) {
      console.error("[inbound-email] No roaster slug found in to addresses:", JSON.stringify(toAddresses));
      return NextResponse.json({ error: "No matching roaster address" }, { status: 400 });
    }

    console.log("[inbound-email] Extracted slug:", slug, "| toEmail:", toEmail);

    // Look up roaster by roaster_slug or storefront_slug (either can be used as the email local part)
    const supabase = createServerClient();
    let { data: roaster, error: roasterError } = await supabase
      .from("roasters")
      .select("id")
      .or(`roaster_slug.eq.${slug},storefront_slug.eq.${slug}`)
      .limit(1)
      .maybeSingle();

    console.log("[inbound-email] Roaster lookup (exact):", roaster ? `found (${roaster.id})` : "not found", roasterError ? `error: ${roasterError.message}` : "");

    // Fallback: try matching with hyphens stripped (e.g. "offyourbean" → "off-your-bean")
    if (!roaster) {
      const slugNoHyphens = slug.replace(/[-_.]/g, "");
      console.log("[inbound-email] Trying fuzzy match, stripped slug:", slugNoHyphens);

      const { data: allRoasters } = await supabase
        .from("roasters")
        .select("id, roaster_slug, storefront_slug");

      const match = (allRoasters || []).find(
        (r) =>
          r.roaster_slug?.replace(/[-_.]/g, "") === slugNoHyphens ||
          r.storefront_slug?.replace(/[-_.]/g, "") === slugNoHyphens
      );

      if (match) {
        roaster = { id: match.id };
        console.log("[inbound-email] Fuzzy match found:", match.roaster_slug || match.storefront_slug, "→", match.id);
      }
    }

    if (!roaster) {
      console.error("[inbound-email] No roaster found for slug:", slug);
      return NextResponse.json({ error: "Unknown roaster" }, { status: 404 });
    }

    // Fetch full email content from Resend API (webhook only contains metadata)
    let bodyHtml: string | null = null;
    let bodyText: string | null = null;
    let attachmentsMeta: { filename: string; content_type: string; size: number; url: string }[] = [];

    try {
      const emailApiUrl = `https://api.resend.com/emails/receiving/${resendEmailId}`;
      console.log("[inbound-email] Fetching email content from:", emailApiUrl);

      const emailResponse = await fetch(emailApiUrl, {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      });

      console.log("[inbound-email] Email content API status:", emailResponse.status);

      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        bodyHtml = emailData.html || null;
        bodyText = emailData.text || null;
        console.log("[inbound-email] Email content fetched — html:", bodyHtml ? `${bodyHtml.length} chars` : "null", "text:", bodyText ? `${bodyText.length} chars` : "null");

        // Fetch attachment details if any exist
        const webhookAttachments = eventData.attachments as Array<{ id: string; filename: string; content_type: string }> | undefined;
        if (webhookAttachments?.length) {
          console.log("[inbound-email] Fetching", webhookAttachments.length, "attachments");
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
            console.log("[inbound-email] Attachments fetched:", attachmentsMeta.length);
          } else {
            console.error("[inbound-email] Attachments API failed:", attachResponse.status);
          }
        }
      } else {
        const errorText = await emailResponse.text();
        console.error("[inbound-email] Failed to fetch email content:", emailResponse.status, errorText);
      }
    } catch (err) {
      console.error("[inbound-email] Error fetching email content:", err);
    }

    // Parse from field
    const parsed = parseFromField(from);

    // Try to match sender email to a contact for this roaster
    let contactId: string | null = null;
    try {
      const { data: matchedContact } = await supabase
        .from("contacts")
        .select("id")
        .eq("roaster_id", roaster.id)
        .ilike("email", parsed.email)
        .limit(1)
        .maybeSingle();

      if (matchedContact) {
        contactId = matchedContact.id;
        console.log("[inbound-email] Matched sender to contact:", contactId);
      } else {
        console.log("[inbound-email] No contact match for:", parsed.email);
      }
    } catch (err) {
      console.error("[inbound-email] Contact lookup error:", err);
    }

    const insertPayload = {
      roaster_id: roaster.id,
      from_email: parsed.email,
      from_name: parsed.name,
      to_email: toEmail,
      subject,
      body_text: bodyText,
      body_html: bodyHtml,
      attachments: attachmentsMeta,
      resend_email_id: resendEmailId,
      received_at: (eventData.created_at as string) || new Date().toISOString(),
      contact_id: contactId,
    };

    console.log("[inbound-email] Inserting message:", JSON.stringify({
      ...insertPayload,
      body_html: insertPayload.body_html ? `${insertPayload.body_html.length} chars` : null,
      body_text: insertPayload.body_text ? `${insertPayload.body_text.length} chars` : null,
    }));

    // Store in inbox_messages
    const { data: inserted, error: insertError } = await supabase
      .from("inbox_messages")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertError) {
      console.error("[inbound-email] Failed to insert message:", JSON.stringify(insertError));
      return NextResponse.json({ error: "Failed to store message" }, { status: 500 });
    }

    console.log("[inbound-email] Message inserted successfully:", inserted?.id);
    return NextResponse.json({ ok: true, id: inserted?.id });
  } catch (err) {
    console.error("[inbound-email] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
