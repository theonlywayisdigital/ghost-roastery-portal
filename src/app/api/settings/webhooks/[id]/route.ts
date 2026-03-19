import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { url, events, is_active } = body as {
    url?: string;
    events?: string[] | null;
    is_active?: boolean;
  };

  if (url) {
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
  }

  const updates: Record<string, unknown> = {};
  if (url !== undefined) updates.url = url;
  if (events !== undefined) updates.events = events && events.length > 0 ? events : null;
  if (is_active !== undefined) updates.is_active = is_active;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("roaster_webhooks")
    .update(updates)
    .eq("id", id)
    .eq("roaster_id", user.roaster.id)
    .select()
    .single();

  if (error) {
    console.error("Update webhook error:", error);
    return NextResponse.json({ error: "Failed to update webhook" }, { status: 500 });
  }

  return NextResponse.json({ webhook: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from("roaster_webhooks")
    .delete()
    .eq("id", id)
    .eq("roaster_id", user.roaster.id);

  if (error) {
    console.error("Delete webhook error:", error);
    return NextResponse.json({ error: "Failed to delete webhook" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
