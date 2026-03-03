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

  const { data: history, error } = await supabase
    .from("support_ticket_history")
    .select("*")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Ticket history fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }

  // Resolve names
  const changerIds = Array.from(new Set((history || []).filter((h) => h.changed_by).map((h) => h.changed_by)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, people(first_name, last_name)")
    .in("id", changerIds.length > 0 ? changerIds : ["none"]);

  const nameMap = new Map(
    (profiles || []).map((p) => {
      const peopleRaw = p.people as unknown;
      const person = (Array.isArray(peopleRaw) ? peopleRaw[0] : peopleRaw) as { first_name: string; last_name: string } | null;
      return [p.id, person ? `${person.first_name} ${person.last_name}`.trim() : "System"];
    })
  );

  const enriched = (history || []).map((h) => ({
    ...h,
    changed_by_name: h.changed_by ? nameMap.get(h.changed_by) || "Unknown" : "System",
  }));

  return NextResponse.json({ history: enriched });
}
