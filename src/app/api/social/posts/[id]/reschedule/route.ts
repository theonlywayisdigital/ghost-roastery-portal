import { NextRequest, NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

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
    const { scheduled_for } = await request.json();

    if (!scheduled_for) {
      return NextResponse.json({ error: "scheduled_for is required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verify ownership and status
    const { data: existing } = await supabase
      .from("social_posts")
      .select("id, status")
      .eq("id", id)
      .eq("roaster_id", roaster.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (existing.status !== "draft" && existing.status !== "scheduled") {
      return NextResponse.json(
        { error: "Only draft or scheduled posts can be rescheduled" },
        { status: 400 }
      );
    }

    const { data: post, error } = await supabase
      .from("social_posts")
      .update({
        scheduled_for,
        status: "scheduled",
      })
      .eq("id", id)
      .eq("roaster_id", roaster.id)
      .select()
      .single();

    if (error) {
      console.error("Social post reschedule error:", error);
      return NextResponse.json({ error: "Failed to reschedule post" }, { status: 500 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Social post reschedule error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
