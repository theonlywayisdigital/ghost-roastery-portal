import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

/**
 * GET /api/inbox/direct — List direct message threads with search, pagination, unread filter
 * Query params: filter (all|unread), search, page, pageSize
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roasterId = user.roaster.id;
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "all";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "25");
  const offset = (page - 1) * pageSize;

  const supabase = createServerClient();

  // Check if roaster has any email connections
  const { data: connections } = await supabase
    .from("email_connections")
    .select("id, provider, email_address, status")
    .eq("roaster_id", roasterId)
    .eq("status", "connected");

  const hasConnections = (connections || []).length > 0;

  if (!hasConnections) {
    return NextResponse.json({
      data: [],
      total: 0,
      unreadCount: 0,
      page,
      pageSize,
      hasConnections: false,
    });
  }

  // Build a query for threads using GROUP BY on thread_id
  // We need to aggregate: latest message per thread, count messages, count unread
  // Supabase doesn't support GROUP BY directly, so we use a raw SQL approach via RPC
  // Instead, we'll query all messages and group in JS (efficient for reasonable message counts)
  // OR we query using a subquery pattern

  // Approach: Fetch distinct thread_ids with their latest message
  // Step 1: Get latest message per thread via a window function approach
  // Since Supabase JS client doesn't support window functions, we'll use a simpler approach:
  // Fetch direct_messages grouped by thread_id using a materialized approach

  // Get total thread count and unread thread count
  const { data: threadStats, error: statsError } = await supabase.rpc("get_direct_thread_stats", {
    p_roaster_id: roasterId,
  });

  // If RPC doesn't exist, fall back to JS-based aggregation
  if (statsError) {
    // Fallback: fetch messages and aggregate in JS
    return await fallbackThreadList(supabase, roasterId, filter, search, page, pageSize, offset);
  }

  return NextResponse.json(threadStats);
}

/**
 * Fallback thread list — fetches messages and aggregates threads in JS.
 * This is the primary implementation since we don't rely on custom RPCs.
 */
async function fallbackThreadList(
  supabase: ReturnType<typeof createServerClient>,
  roasterId: string,
  filter: string,
  search: string,
  page: number,
  pageSize: number,
  offset: number
) {
  // Fetch all messages for this roaster, ordered by received_at desc
  // For performance, we limit to a reasonable number and paginate threads from that
  let query = supabase
    .from("direct_messages")
    .select("thread_id, subject, snippet, from_email, from_name, is_read, provider, connection_id, received_at")
    .eq("roaster_id", roasterId)
    .order("received_at", { ascending: false });

  if (search) {
    query = query.or(
      `from_email.ilike.%${search}%,from_name.ilike.%${search}%,subject.ilike.%${search}%`
    );
  }

  const { data: messages, error } = await query.limit(2000);

  if (error) {
    console.error("Direct messages fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }

  // Group by thread_id
  const threadMap = new Map<string, {
    thread_id: string;
    subject: string | null;
    snippet: string | null;
    from_email: string;
    from_name: string | null;
    last_received_at: string;
    message_count: number;
    unread_count: number;
    provider: string;
    connection_id: string;
  }>();

  for (const msg of messages || []) {
    const existing = threadMap.get(msg.thread_id);
    if (!existing) {
      threadMap.set(msg.thread_id, {
        thread_id: msg.thread_id,
        subject: msg.subject,
        snippet: msg.snippet,
        from_email: msg.from_email,
        from_name: msg.from_name,
        last_received_at: msg.received_at,
        message_count: 1,
        unread_count: msg.is_read ? 0 : 1,
        provider: msg.provider,
        connection_id: msg.connection_id,
      });
    } else {
      existing.message_count++;
      if (!msg.is_read) existing.unread_count++;
      // Keep the latest received_at and its sender info
      if (msg.received_at > existing.last_received_at) {
        existing.last_received_at = msg.received_at;
        existing.snippet = msg.snippet;
        existing.from_email = msg.from_email;
        existing.from_name = msg.from_name;
      }
    }
  }

  // Convert to sorted array
  let threads = Array.from(threadMap.values()).sort(
    (a, b) => new Date(b.last_received_at).getTime() - new Date(a.last_received_at).getTime()
  );

  // Filter by unread if needed
  if (filter === "unread") {
    threads = threads.filter((t) => t.unread_count > 0);
  }

  const total = threads.length;
  const unreadCount = threads.filter((t) => t.unread_count > 0).length;

  // Paginate
  const paginated = threads.slice(offset, offset + pageSize);

  return NextResponse.json({
    data: paginated,
    total,
    unreadCount,
    page,
    pageSize,
    hasConnections: true,
  });
}

/**
 * POST /api/inbox/direct — Trigger manual sync for current roaster
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Dynamic import to avoid loading sync code on every request
  const { syncConnection } = await import("@/lib/email/sync");
  const supabase = createServerClient();

  // Fetch all connected email connections for this roaster
  const { data: connections, error: connError } = await supabase
    .from("email_connections")
    .select("*")
    .eq("roaster_id", user.roaster.id)
    .eq("status", "connected");

  if (connError) {
    return NextResponse.json({ error: "Failed to fetch connections" }, { status: 500 });
  }

  if (!connections || connections.length === 0) {
    return NextResponse.json({ error: "No connected email accounts" }, { status: 400 });
  }

  let totalSynced = 0;
  const allErrors: string[] = [];

  for (const conn of connections) {
    try {
      const result = await syncConnection(conn, supabase);
      totalSynced += result.synced;
      allErrors.push(...result.errors);
    } catch (err) {
      allErrors.push(`${conn.provider}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return NextResponse.json({
    synced: totalSynced,
    errors: allErrors,
  });
}
