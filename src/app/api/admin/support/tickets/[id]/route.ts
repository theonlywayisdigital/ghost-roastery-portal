import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Fetch all messages (including internal)
  const { data: messages } = await supabase
    .from("support_ticket_messages")
    .select("*")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  // Resolve sender names
  const senderIds = new Set<string>();
  senderIds.add(ticket.created_by);
  if (ticket.assigned_to) senderIds.add(ticket.assigned_to);
  for (const m of messages || []) senderIds.add(m.sender_id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, people_id, people(first_name, last_name, email)")
    .in("id", Array.from(senderIds));

  const profileMap = new Map(
    (profiles || []).map((p) => {
      const peopleRaw = p.people as unknown;
      const person = (Array.isArray(peopleRaw) ? peopleRaw[0] : peopleRaw) as { first_name: string; last_name: string; email: string } | null;
      return [
        p.id,
        {
          name: person ? `${person.first_name} ${person.last_name}`.trim() : "Unknown",
          email: person?.email || "",
        },
      ];
    })
  );

  const enrichedMessages = (messages || []).map((m) => ({
    ...m,
    sender_name: profileMap.get(m.sender_id)?.name || "Unknown",
    sender_email: profileMap.get(m.sender_id)?.email || "",
  }));

  // Fetch order info if linked
  let orderInfo = null;
  if (ticket.order_id) {
    const { data: order } = await supabase
      .from("orders")
      .select("id, order_number, order_status, total_price, created_at")
      .eq("id", ticket.order_id)
      .single();
    orderInfo = order;
  }

  // Fetch admin profiles for assignment dropdown
  const { data: adminRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role_id", "admin");

  const adminIds = (adminRoles || []).map((r) => r.user_id);
  const { data: adminProfiles } = await supabase
    .from("profiles")
    .select("id, people(first_name, last_name)")
    .in("id", adminIds.length > 0 ? adminIds : ["none"]);

  const admins = (adminProfiles || []).map((p) => {
    const peopleRaw = p.people as unknown;
    const person = (Array.isArray(peopleRaw) ? peopleRaw[0] : peopleRaw) as { first_name: string; last_name: string } | null;
    return {
      id: p.id,
      name: person ? `${person.first_name} ${person.last_name}`.trim() : "Admin",
    };
  });

  return NextResponse.json({
    ticket: {
      ...ticket,
      creator_name: profileMap.get(ticket.created_by)?.name || "Unknown",
      creator_email: profileMap.get(ticket.created_by)?.email || "",
      assignee_name: ticket.assigned_to
        ? profileMap.get(ticket.assigned_to)?.name || "Unknown"
        : null,
    },
    messages: enrichedMessages,
    order: orderInfo,
    admins,
  });
}

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
    const supabase = createServerClient();

    // Get current ticket for history
    const { data: current } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", id)
      .single();

    if (!current) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    const historyEntries: {
      ticket_id: string;
      changed_by: string;
      field_changed: string;
      old_value: string | null;
      new_value: string | null;
    }[] = [];

    const trackableFields = [
      "status",
      "priority",
      "assigned_to",
      "type",
      "resolution_notes",
    ];

    for (const field of trackableFields) {
      if (field in body && body[field] !== current[field]) {
        updates[field] = body[field];
        historyEntries.push({
          ticket_id: id,
          changed_by: user.id,
          field_changed: field,
          old_value: current[field]?.toString() || null,
          new_value: body[field]?.toString() || null,
        });
      }
    }

    // Set resolved_at when status changes to resolved
    if (body.status === "resolved" && current.status !== "resolved") {
      updates.resolved_at = new Date().toISOString();
    }
    if (body.status === "closed" && current.status !== "closed") {
      updates.closed_at = new Date().toISOString();
    }

    // Allow linking order
    if ("order_id" in body) updates.order_id = body.order_id;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 });
    }

    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Ticket update error:", error);
      return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
    }

    // Log history
    if (historyEntries.length > 0) {
      await supabase.from("support_ticket_history").insert(historyEntries);
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Ticket update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
