import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

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
      .select("id, status")
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
      const { data: ticketFull } = await supabase
        .from("support_tickets")
        .select("created_by_type")
        .eq("id", id)
        .single();

      const newStatus =
        ticketFull?.created_by_type === "roaster"
          ? "waiting_on_roaster"
          : "waiting_on_customer";

      await supabase
        .from("support_tickets")
        .update({ status: newStatus })
        .eq("id", id);
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Admin message create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
