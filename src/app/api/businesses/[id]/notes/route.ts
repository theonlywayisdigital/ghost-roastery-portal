import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const roaster = await getCurrentRoaster();
  if (!user || !roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
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

    // Create note
    const { data: note, error } = await supabase
      .from("business_notes")
      .insert({
        business_id: id,
        author_id: user.id,
        content: content.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error("Note create error:", error);
      return NextResponse.json(
        { error: "Failed to add note" },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from("business_activity").insert({
      business_id: id,
      author_id: user.id,
      activity_type: "note_added",
      description: content.trim().length > 100
        ? content.trim().slice(0, 100) + "..."
        : content.trim(),
      metadata: { note_id: note.id },
    });

    // Update last_activity_at
    await supabase
      .from("businesses")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ note });
  } catch (error) {
    console.error("Note create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
