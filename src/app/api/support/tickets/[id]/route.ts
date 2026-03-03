import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  // Fetch ticket (only own)
  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", id)
    .eq("created_by", user.id)
    .single();

  if (error || !ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Fetch messages (excluding internal notes)
  const { data: messages } = await supabase
    .from("support_ticket_messages")
    .select("*")
    .eq("ticket_id", id)
    .eq("is_internal", false)
    .order("created_at", { ascending: true });

  // Resolve sender names
  const senderIds = Array.from(new Set((messages || []).map((m) => m.sender_id)));
  const { data: senders } = await supabase
    .from("profiles")
    .select("id, people_id, people(first_name, last_name)")
    .in("id", senderIds.length > 0 ? senderIds : ["none"]);

  const senderMap = new Map(
    (senders || []).map((s) => {
      const peopleRaw = s.people as unknown;
      const p = (Array.isArray(peopleRaw) ? peopleRaw[0] : peopleRaw) as { first_name: string; last_name: string } | null;
      return [s.id, p ? `${p.first_name} ${p.last_name}`.trim() : "Support"];
    })
  );

  const enrichedMessages = (messages || []).map((m) => ({
    ...m,
    sender_name: senderMap.get(m.sender_id) || "Support",
  }));

  return NextResponse.json({ ticket, messages: enrichedMessages });
}
