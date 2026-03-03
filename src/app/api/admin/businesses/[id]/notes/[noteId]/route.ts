import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
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

    // Verify business is ghost_roastery
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
        { error: "Cannot edit notes on roaster-owned businesses" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("business_notes")
      .update({ content: content.trim() })
      .eq("id", noteId)
      .eq("business_id", id);

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
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, noteId } = await params;
    const supabase = createServerClient();

    // Verify business is ghost_roastery
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
        { error: "Cannot delete notes on roaster-owned businesses" },
        { status: 403 }
      );
    }

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
