import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const page = parseInt(params.get("page") || "1");
  const pageSize = parseInt(params.get("pageSize") || "25");
  const search = params.get("search") || "";
  const status = params.get("status") || "";
  const type = params.get("type") || "";
  const priority = params.get("priority") || "";
  const createdByType = params.get("created_by_type") || "";
  const assignedTo = params.get("assigned_to") || "";
  const sort = params.get("sort") || "created_at";
  const order = params.get("order") || "desc";
  const offset = (page - 1) * pageSize;

  const supabase = createServerClient();

  let query = supabase
    .from("support_tickets")
    .select("*", { count: "exact" });

  if (search) {
    query = query.or(
      `subject.ilike.%${search}%,ticket_number.ilike.%${search}%,description.ilike.%${search}%`
    );
  }
  if (status) query = query.eq("status", status);
  if (type) query = query.eq("type", type);
  if (priority) query = query.eq("priority", priority);
  if (createdByType) query = query.eq("created_by_type", createdByType);
  if (assignedTo) {
    if (assignedTo === "unassigned") {
      query = query.is("assigned_to", null);
    } else {
      query = query.eq("assigned_to", assignedTo);
    }
  }

  query = query
    .order(sort, { ascending: order === "asc" })
    .range(offset, offset + pageSize - 1);

  const { data: tickets, error, count } = await query;

  if (error) {
    console.error("Admin tickets fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }

  // Resolve creator/assignee names
  const userIds = new Set<string>();
  for (const t of tickets || []) {
    userIds.add(t.created_by);
    if (t.assigned_to) userIds.add(t.assigned_to);
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, people_id, people(first_name, last_name, email)")
    .in("id", userIds.size > 0 ? Array.from(userIds) : ["none"]);

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

  const enriched = (tickets || []).map((t) => ({
    ...t,
    creator_name: profileMap.get(t.created_by)?.name || "Unknown",
    creator_email: profileMap.get(t.created_by)?.email || "",
    assignee_name: t.assigned_to
      ? profileMap.get(t.assigned_to)?.name || "Unknown"
      : null,
  }));

  // Stats
  const { data: allTickets } = await supabase
    .from("support_tickets")
    .select("status, priority, assigned_to, created_at, resolved_at");

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const stats = {
    open: 0,
    unassigned: 0,
    urgent: 0,
    avgResolutionHours: 0,
    todayNew: 0,
  };
  let totalResolutionMs = 0;
  let resolvedCount = 0;

  for (const t of allTickets || []) {
    if (t.status !== "resolved" && t.status !== "closed") {
      stats.open++;
      if (!t.assigned_to) stats.unassigned++;
    }
    if (t.priority === "urgent" && t.status !== "resolved" && t.status !== "closed") {
      stats.urgent++;
    }
    if (new Date(t.created_at) >= todayStart) stats.todayNew++;
    if (t.resolved_at) {
      totalResolutionMs += new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime();
      resolvedCount++;
    }
  }

  if (resolvedCount > 0) {
    stats.avgResolutionHours = Math.round(
      totalResolutionMs / resolvedCount / 1000 / 60 / 60
    );
  }

  return NextResponse.json({
    data: enriched,
    total: count || 0,
    page,
    pageSize,
    stats,
  });
}
