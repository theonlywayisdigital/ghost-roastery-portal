import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import type { EmailConnection } from "@/types/email";
import { sendGmailReply } from "@/lib/email/send";
import { sendOutlookReply } from "@/lib/email/send";
import { syncConnection } from "@/lib/email/sync";

interface RouteContext {
  params: Promise<{ threadId: string }>;
}

/**
 * GET /api/inbox/direct/[threadId] — Get all messages in a thread
 * Marks unread messages as read.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await context.params;
  const supabase = createServerClient();

  // Fetch all messages in this thread
  const { data: messages, error } = await supabase
    .from("direct_messages")
    .select("*")
    .eq("roaster_id", user.roaster.id)
    .eq("thread_id", threadId)
    .order("received_at", { ascending: true });

  if (error) {
    console.error("Thread fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch thread" }, { status: 500 });
  }

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  // Mark unread messages as read
  const unreadIds = messages.filter((m) => !m.is_read).map((m) => m.id);
  if (unreadIds.length > 0) {
    await supabase
      .from("direct_messages")
      .update({ is_read: true })
      .in("id", unreadIds)
      .eq("roaster_id", user.roaster.id);

    // Update local data to reflect read status
    for (const msg of messages) {
      msg.is_read = true;
    }
  }

  // Get the connection info for reply capability
  const connectionId = messages[0].connection_id;
  const { data: connection } = await supabase
    .from("email_connections")
    .select("id, provider, email_address, status")
    .eq("id", connectionId)
    .single();

  return NextResponse.json({
    messages,
    connection: connection || null,
    threadId,
  });
}

/**
 * POST /api/inbox/direct/[threadId] — Reply to a thread
 * Body: { bodyHtml: string }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await context.params;
  const body = await request.json();
  const { bodyHtml } = body;

  if (!bodyHtml || typeof bodyHtml !== "string" || bodyHtml.trim().length === 0) {
    return NextResponse.json({ error: "Reply body is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Get the latest message in this thread to determine reply-to info
  const { data: threadMessages, error: threadError } = await supabase
    .from("direct_messages")
    .select("*")
    .eq("roaster_id", user.roaster.id)
    .eq("thread_id", threadId)
    .order("received_at", { ascending: false })
    .limit(1);

  if (threadError || !threadMessages || threadMessages.length === 0) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const latestMessage = threadMessages[0];
  const connectionId = latestMessage.connection_id;

  // Get the full connection with tokens
  const { data: connection, error: connError } = await supabase
    .from("email_connections")
    .select("*")
    .eq("id", connectionId)
    .eq("roaster_id", user.roaster.id)
    .single();

  if (connError || !connection) {
    return NextResponse.json({ error: "Email connection not found" }, { status: 404 });
  }

  if (connection.status !== "connected") {
    return NextResponse.json({ error: "Email account is disconnected" }, { status: 400 });
  }

  const typedConnection = connection as EmailConnection;

  try {
    if (typedConnection.provider === "gmail") {
      const result = await sendGmailReply(typedConnection, supabase, {
        to: latestMessage.from_email,
        subject: latestMessage.subject || "",
        bodyHtml,
        threadId,
        inReplyTo: latestMessage.external_id ? `<${latestMessage.external_id}>` : null,
        references: null,
      });

      // Sync the thread to pick up the sent message
      try {
        await syncConnection(typedConnection, supabase);
      } catch {
        // Non-critical — the sent message will appear on next sync
      }

      return NextResponse.json({ success: true, messageId: result.messageId });
    } else if (typedConnection.provider === "outlook") {
      await sendOutlookReply(typedConnection, supabase, {
        originalMessageId: latestMessage.external_id,
        bodyHtml,
      });

      // Sync to pick up the sent message
      try {
        await syncConnection(typedConnection, supabase);
      } catch {
        // Non-critical
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  } catch (err) {
    console.error("Reply send error:", err);
    const message = err instanceof Error ? err.message : "Failed to send reply";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/inbox/direct/[threadId] — Mark thread as read/unread
 * Body: { is_read: boolean }
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await context.params;
  const body = await request.json();

  if (typeof body.is_read !== "boolean") {
    return NextResponse.json({ error: "is_read is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { error } = await supabase
    .from("direct_messages")
    .update({ is_read: body.is_read })
    .eq("roaster_id", user.roaster.id)
    .eq("thread_id", threadId);

  if (error) {
    return NextResponse.json({ error: "Failed to update thread" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
