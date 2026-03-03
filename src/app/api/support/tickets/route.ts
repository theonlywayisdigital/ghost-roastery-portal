import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const page = parseInt(params.get("page") || "1");
  const pageSize = parseInt(params.get("pageSize") || "25");
  const status = params.get("status") || "";
  const offset = (page - 1) * pageSize;

  const supabase = createServerClient();

  let query = supabase
    .from("support_tickets")
    .select("*", { count: "exact" })
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data: tickets, error, count } = await query;

  if (error) {
    console.error("Tickets fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }

  return NextResponse.json({
    data: tickets || [],
    total: count || 0,
    page,
    pageSize,
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const supabase = createServerClient();

    // Determine creator type
    let createdByType = "customer";
    if (user.roles.includes("admin") || user.roles.includes("super_admin")) {
      createdByType = "admin";
    } else if (user.roles.includes("roaster")) {
      createdByType = "roaster";
    }

    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({
        subject: body.subject,
        description: body.description || "",
        type: body.type || "general",
        priority: body.priority || "medium",
        created_by: user.id,
        created_by_type: createdByType,
        order_id: body.order_id || null,
        roaster_id: user.roaster?.id || null,
        chatbot_conversation: body.chatbot_conversation || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Ticket create error:", error);
      return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
    }

    // Add initial message from description if provided
    if (body.description) {
      await supabase.from("support_ticket_messages").insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        sender_type: createdByType,
        message: body.description,
        attachments: body.attachments || [],
      });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Ticket create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
