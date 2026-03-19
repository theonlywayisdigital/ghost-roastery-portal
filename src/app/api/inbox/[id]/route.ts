import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/inbox/[id] — Get single message detail, marks as read
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = createServerClient();

  const { data: message, error } = await supabase
    .from("inbox_messages")
    .select("*")
    .eq("id", id)
    .eq("roaster_id", user.roaster.id)
    .single();

  if (error || !message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  // Mark as read if not already
  if (!message.is_read) {
    await supabase
      .from("inbox_messages")
      .update({ is_read: true })
      .eq("id", id)
      .eq("roaster_id", user.roaster.id);
  }

  // Get adjacent message IDs for prev/next navigation
  const { data: adjacent } = await supabase
    .from("inbox_messages")
    .select("id, received_at")
    .eq("roaster_id", user.roaster.id)
    .eq("is_archived", message.is_archived)
    .order("received_at", { ascending: false });

  let prevId: string | null = null;
  let nextId: string | null = null;
  if (adjacent) {
    const idx = adjacent.findIndex((m) => m.id === id);
    if (idx > 0) prevId = adjacent[idx - 1].id;
    if (idx >= 0 && idx < adjacent.length - 1) nextId = adjacent[idx + 1].id;
  }

  return NextResponse.json({
    ...message,
    is_read: true, // already marked
    prevId,
    nextId,
  });
}

/**
 * PATCH /api/inbox/[id] — Update message (archive, read/unread)
 * Body: { is_read?, is_archived? }
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (typeof body.is_read === "boolean") updates.is_read = body.is_read;
  if (typeof body.is_archived === "boolean") updates.is_archived = body.is_archived;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid updates" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("inbox_messages")
    .update(updates)
    .eq("id", id)
    .eq("roaster_id", user.roaster.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

/**
 * DELETE /api/inbox/[id] — Delete message permanently
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from("inbox_messages")
    .delete()
    .eq("id", id)
    .eq("roaster_id", user.roaster.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
