import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const supabase = createServerClient();

    // Verify ticket ownership
    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("id, status")
      .eq("id", id)
      .eq("created_by", user.id)
      .single();

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.status === "closed") {
      return NextResponse.json({ error: "Cannot reply to a closed ticket" }, { status: 400 });
    }

    // Determine sender type
    let senderType = "customer";
    if (user.roles.includes("admin") || user.roles.includes("super_admin")) {
      senderType = "admin";
    } else if (user.roles.includes("roaster")) {
      senderType = "roaster";
    }

    const { data: message, error } = await supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: id,
        sender_id: user.id,
        sender_type: senderType,
        message: body.message,
        attachments: body.attachments || [],
        is_internal: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Message create error:", error);
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    // If ticket was waiting on customer/roaster, set back to open
    if (
      ticket.status === "waiting_on_customer" ||
      ticket.status === "waiting_on_roaster"
    ) {
      await supabase
        .from("support_tickets")
        .update({ status: "open" })
        .eq("id", id);
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Message create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
