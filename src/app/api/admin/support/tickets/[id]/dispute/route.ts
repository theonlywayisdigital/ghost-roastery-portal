import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// POST: Escalate ticket to dispute
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

    // Get ticket
    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", id)
      .single();

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const orderId = body.order_id || ticket.order_id;
    if (!orderId) {
      return NextResponse.json(
        { error: "An order must be linked to escalate to dispute" },
        { status: 400 }
      );
    }

    // Update ticket to dispute type
    await supabase
      .from("support_tickets")
      .update({
        type: "dispute",
        order_id: orderId,
        status: "in_progress",
      })
      .eq("id", id);

    // Update order with dispute info
    await supabase
      .from("orders")
      .update({
        dispute_status: "open",
        dispute_ticket_id: id,
      })
      .eq("id", orderId);

    // Log history
    await supabase.from("support_ticket_history").insert({
      ticket_id: id,
      changed_by: user.id,
      field_changed: "type",
      old_value: ticket.type,
      new_value: "dispute",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dispute escalation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT: Resolve dispute
export async function PUT(
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
    const { resolution, notes } = body as {
      resolution: "resolved_customer" | "resolved_roaster" | "resolved_split";
      notes?: string;
    };

    if (!resolution) {
      return NextResponse.json({ error: "Resolution is required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get ticket
    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", id)
      .single();

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (!ticket.order_id) {
      return NextResponse.json({ error: "No order linked" }, { status: 400 });
    }

    // Resolve ticket
    const now = new Date().toISOString();
    await supabase
      .from("support_tickets")
      .update({
        status: "resolved",
        resolution_notes: notes || `Dispute resolved: ${resolution}`,
        resolved_at: now,
      })
      .eq("id", id);

    // Update order dispute status
    await supabase
      .from("orders")
      .update({ dispute_status: resolution })
      .eq("id", ticket.order_id);

    // Log history
    await supabase.from("support_ticket_history").insert([
      {
        ticket_id: id,
        changed_by: user.id,
        field_changed: "status",
        old_value: ticket.status,
        new_value: "resolved",
      },
      {
        ticket_id: id,
        changed_by: user.id,
        field_changed: "dispute_resolution",
        old_value: "open",
        new_value: resolution,
      },
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dispute resolution error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
