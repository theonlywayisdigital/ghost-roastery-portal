import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { sendSupportTicketReplyEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const supabase = createServerClient();

    // Verify ticket exists
    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("id, status, created_by, ticket_number, subject, created_by_type")
      .eq("id", id)
      .single();

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const { data: message, error } = await supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: id,
        sender_id: user.id,
        sender_type: "admin",
        message: body.message,
        attachments: body.attachments || [],
        is_internal: body.is_internal ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error("Admin message create error:", error);
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    // If not internal note, update ticket status based on creator type
    if (!body.is_internal && ticket.status === "open") {
      const newStatus =
        ticket.created_by_type === "roaster"
          ? "waiting_on_roaster"
          : "waiting_on_customer";

      await supabase
        .from("support_tickets")
        .update({ status: newStatus })
        .eq("id", id);
    }

    // Send email notification for non-internal replies (fire-and-forget)
    if (!body.is_internal) {
      // Look up creator from the users table (reliably populated for all user types)
      const { data: creator } = await supabase
        .from("users")
        .select("email, full_name")
        .eq("id", ticket.created_by)
        .single();

      if (creator?.email) {
        const contactName = creator.full_name || creator.email;
        const replyPreview = (body.message as string).slice(0, 200) + ((body.message as string).length > 200 ? "…" : "");
        sendSupportTicketReplyEmail(
          creator.email,
          contactName,
          ticket.ticket_number,
          ticket.id,
          replyPreview
        ).catch((err) => console.error("[reply-email] Failed to send ticket reply email:", err));
      }

      // In-app notification for ticket creator
      createNotification({
        userId: ticket.created_by,
        type: "support_ticket_reply",
        title: "New reply on your ticket",
        body: `Your ticket #${ticket.ticket_number} has a new reply.`,
        link: `/support/tickets/${ticket.id}`,
        metadata: { ticket_id: ticket.id },
      });
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Admin message create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
