import { NextRequest, NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: post, error } = await supabase
    .from("social_posts")
    .select("*")
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .single();

  if (error || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Fetch analytics
  const { data: analytics } = await supabase
    .from("social_post_analytics")
    .select("*")
    .eq("post_id", id);

  return NextResponse.json({ post, analytics: analytics || [] });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const supabase = createServerClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from("social_posts")
      .select("id, status")
      .eq("id", id)
      .eq("roaster_id", roaster.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Don't allow editing published posts
    if (existing.status === "published" || existing.status === "publishing") {
      return NextResponse.json({ error: "Cannot edit a published post" }, { status: 400 });
    }

    const allowedFields: Record<string, unknown> = {};
    const editableKeys = [
      "content", "media_urls", "platforms", "scheduled_for",
      "status", "tags",
    ];

    for (const key of editableKeys) {
      if (key in body) {
        allowedFields[key] = body[key];
      }
    }

    const { data: post, error } = await supabase
      .from("social_posts")
      .update(allowedFields)
      .eq("id", id)
      .eq("roaster_id", roaster.id)
      .select()
      .single();

    if (error) {
      console.error("Social post update error:", error);
      return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Social post update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("social_posts")
    .select("id, status")
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (existing.status === "published" || existing.status === "publishing") {
    return NextResponse.json({ error: "Cannot delete a published post" }, { status: 400 });
  }

  const { error } = await supabase
    .from("social_posts")
    .delete()
    .eq("id", id)
    .eq("roaster_id", roaster.id);

  if (error) {
    console.error("Social post delete error:", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
