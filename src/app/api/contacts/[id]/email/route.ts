import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { sendGmailNewEmail } from "@/lib/email/send";
import { sendOutlookNewEmail } from "@/lib/email/send";
import { syncConnection } from "@/lib/email/sync";
import type { EmailConnection } from "@/types/email";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/contacts/[id]/email — Get email thread for this contact
 * Returns all direct_messages where from_email or to_emails matches contact email,
 * plus the roaster's connected email accounts for the From selector.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = createServerClient();

  // Get the contact's email
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, email")
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .single();

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  // Get connected email accounts
  const { data: connections } = await supabase
    .from("email_connections")
    .select("id, provider, email_address, status")
    .eq("roaster_id", roaster.id)
    .eq("status", "connected");

  if (!contact.email || !connections || connections.length === 0) {
    return NextResponse.json({
      messages: [],
      connections: connections || [],
      contactEmail: contact.email,
    });
  }

  // Fetch direct_messages where the contact is involved
  // Match on from_email = contact.email OR to_emails contains contact.email
  const { data: messages } = await supabase
    .from("direct_messages")
    .select("id, provider, from_email, from_name, to_emails, subject, body_text, body_html, snippet, is_read, has_attachments, folder, received_at, connection_id")
    .eq("roaster_id", roaster.id)
    .or(`from_email.eq.${contact.email},to_emails.cs.[{"email":"${contact.email}"}]`)
    .order("received_at", { ascending: true })
    .limit(200);

  return NextResponse.json({
    messages: messages || [],
    connections: connections || [],
    contactEmail: contact.email,
  });
}

/**
 * POST /api/contacts/[id]/email — Send a new email to this contact
 * Body: { subject, bodyHtml, connectionId }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  const roaster = await getCurrentRoaster();
  if (!user || !roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const { subject, bodyHtml, connectionId } = body;

  if (!subject || !bodyHtml || !connectionId) {
    return NextResponse.json(
      { error: "Subject, body, and connection are required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Verify contact belongs to roaster and has email
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, email, first_name, last_name")
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .single();

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  if (!contact.email) {
    return NextResponse.json({ error: "Contact has no email address" }, { status: 400 });
  }

  // Get the connection with tokens
  const { data: connection } = await supabase
    .from("email_connections")
    .select("*")
    .eq("id", connectionId)
    .eq("roaster_id", roaster.id)
    .eq("status", "connected")
    .single();

  if (!connection) {
    return NextResponse.json({ error: "Email connection not found or disconnected" }, { status: 404 });
  }

  const typedConnection = connection as EmailConnection;

  try {
    if (typedConnection.provider === "gmail") {
      await sendGmailNewEmail(typedConnection, supabase, {
        to: contact.email,
        subject,
        bodyHtml,
      });
    } else if (typedConnection.provider === "outlook") {
      await sendOutlookNewEmail(typedConnection, supabase, {
        to: contact.email,
        subject,
        bodyHtml,
      });
    } else {
      return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }

    // Log to contact activity
    const snippet = bodyHtml.replace(/<[^>]+>/g, "").trim().slice(0, 120);
    await supabase.from("contact_activity").insert({
      contact_id: id,
      activity_type: "email_sent",
      description: subject,
      metadata: {
        subject,
        snippet,
        provider: typedConnection.provider,
        from_email: typedConnection.email_address,
      },
    });

    // Update last_activity_at
    await supabase
      .from("contacts")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", id);

    // Sync to pick up the sent message in direct_messages
    try {
      await syncConnection(typedConnection, supabase);
    } catch {
      // Non-critical
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact email send error:", err);
    const message = err instanceof Error ? err.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
