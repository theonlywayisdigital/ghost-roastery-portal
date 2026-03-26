import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

const VALID_ACTIONS = ["mark_read", "mark_unread", "archive", "delete"] as const;
type BulkAction = (typeof VALID_ACTIONS)[number];

/**
 * POST /api/inbox/bulk — Bulk actions on inbox messages
 * Body: { ids: string[], action: "mark_read" | "mark_unread" | "archive" | "delete" }
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { ids, action } = body as { ids: string[]; action: BulkAction };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
  }

  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}` }, { status: 400 });
  }

  const supabase = createServerClient();
  let affected = 0;

  if (action === "delete") {
    const { count, error } = await supabase
      .from("inbox_messages")
      .delete({ count: "exact" })
      .in("id", ids)
      .eq("roaster_id", user.roaster.id);

    if (error) {
      return NextResponse.json({ error: "Failed to delete messages" }, { status: 500 });
    }
    affected = count ?? 0;
  } else {
    const updates: Record<string, boolean> = {};
    if (action === "mark_read") updates.is_read = true;
    if (action === "mark_unread") updates.is_read = false;
    if (action === "archive") updates.is_archived = true;

    const { count, error } = await supabase
      .from("inbox_messages")
      .update(updates, { count: "exact" })
      .in("id", ids)
      .eq("roaster_id", user.roaster.id);

    if (error) {
      return NextResponse.json({ error: "Failed to update messages" }, { status: 500 });
    }
    affected = count ?? 0;
  }

  return NextResponse.json({ ok: true, affected });
}
