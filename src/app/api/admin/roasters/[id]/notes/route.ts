import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { data: notes, error } = await supabase
      .from("roaster_notes")
      .select("*")
      .eq("roaster_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Notes fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch notes" },
        { status: 500 }
      );
    }

    return NextResponse.json({ notes: notes || [] });
  } catch (error) {
    console.error("Notes fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    const { data: note, error } = await supabase
      .from("roaster_notes")
      .insert({
        roaster_id: id,
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
    await supabase.from("roaster_activity").insert({
      roaster_id: id,
      author_id: user.id,
      activity_type: "note_added",
      description: content.trim().length > 100
        ? content.trim().slice(0, 100) + "..."
        : content.trim(),
      metadata: { note_id: note.id },
    });

    return NextResponse.json({ note });
  } catch (error) {
    console.error("Note create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
