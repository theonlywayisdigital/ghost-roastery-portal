import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

/**
 * GET /api/inbox — List inbox messages with filters, search, pagination
 * Query params: filter (all|unread|converted|archived), search, page, pageSize
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

  let query = supabase
    .from("inbox_messages")
    .select("id, from_email, from_name, subject, body_text, is_read, is_archived, is_converted, converted_order_id, attachments, received_at", { count: "exact" })
    .eq("roaster_id", roasterId);

  // Apply filter
  switch (filter) {
    case "unread":
      query = query.eq("is_read", false).eq("is_archived", false);
      break;
    case "converted":
      query = query.eq("is_converted", true);
      break;
    case "archived":
      query = query.eq("is_archived", true);
      break;
    default:
      // "all" shows non-archived messages
      query = query.eq("is_archived", false);
      break;
  }

  if (search) {
    query = query.or(
      `from_email.ilike.%${search}%,from_name.ilike.%${search}%,subject.ilike.%${search}%`
    );
  }

  query = query.order("received_at", { ascending: false }).range(offset, offset + pageSize - 1);

  const { data: messages, error, count } = await query;

  if (error) {
    console.error("Inbox fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }

  // Also fetch unread count for badge
  const { count: unreadCount } = await supabase
    .from("inbox_messages")
    .select("id", { count: "exact", head: true })
    .eq("roaster_id", roasterId)
    .eq("is_read", false)
    .eq("is_archived", false);

  return NextResponse.json({
    data: messages || [],
    total: count || 0,
    unreadCount: unreadCount || 0,
    page,
    pageSize,
  });
}
