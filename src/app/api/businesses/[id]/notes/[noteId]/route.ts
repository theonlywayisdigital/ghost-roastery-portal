import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const user = await getCurrentUser();
  const roaster = await getCurrentRoaster();
  if (!user || !roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, noteId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Note content is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify business belongs to roaster
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", id)
      .eq("roaster_id", roaster.id)
      .single();

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Verify note exists and belongs to this business
    const { data: note } = await supabase
      .from("business_notes")
      .select("id, author_id")
      .eq("id", noteId)
      .eq("business_id", id)
      .single();

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Update note
    const { error } = await supabase
      .from("business_notes")
      .update({ content: content.trim() })
      .eq("id", noteId);

    if (error) {
      console.error("Note update error:", error);
      return NextResponse.json(
        { error: "Failed to update note" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Note update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const user = await getCurrentUser();
  const roaster = await getCurrentRoaster();
  if (!user || !roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, noteId } = await params;
    const supabase = createServerClient();

    // Verify business belongs to roaster
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", id)
      .eq("roaster_id", roaster.id)
      .single();

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Delete note
    const { error } = await supabase
      .from("business_notes")
      .delete()
      .eq("id", noteId)
      .eq("business_id", id);

    if (error) {
      console.error("Note delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete note" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Note delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
