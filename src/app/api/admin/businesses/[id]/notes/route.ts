import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
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

    // Verify business exists and is ghost_roastery
    const { data: business } = await supabase
      .from("businesses")
      .select("id, owner_type")
      .eq("id", id)
      .single();

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    if (business.owner_type !== "ghost_roastery") {
      return NextResponse.json(
        { error: "Cannot add notes to roaster-owned businesses" },
        { status: 403 }
      );
    }

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

    await supabase.from("business_activity").insert({
      business_id: id,
      author_id: user.id,
      activity_type: "note_added",
      description: content.trim().length > 100
        ? content.trim().slice(0, 100) + "..."
        : content.trim(),
      metadata: { note_id: note.id },
    });

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
