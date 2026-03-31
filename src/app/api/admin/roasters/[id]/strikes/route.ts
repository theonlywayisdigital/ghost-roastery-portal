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
    const { action, reason } = body as { action: "add" | "remove"; reason?: string };

    if (!action || !["add", "remove"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'add' or 'remove'" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch current strikes
    const { data: roaster, error: fetchError } = await supabase
      .from("roasters")
      .select("id, strikes")
      .eq("id", id)
      .single();

    if (fetchError || !roaster) {
      return NextResponse.json({ error: "Roaster not found" }, { status: 404 });
    }

    const currentStrikes = roaster.strikes ?? 0;
    const newCount =
      action === "add"
        ? Math.min(currentStrikes + 1, 3)
        : Math.max(currentStrikes - 1, 0);

    // Update strikes
    const { error: updateError } = await supabase
      .from("roasters")
      .update({ strikes: newCount })
      .eq("id", id);

    if (updateError) {
      console.error("Strike update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update strikes" },
        { status: 500 }
      );
    }

    // Log activity
    const activityType = action === "add" ? "strike_added" : "strike_removed";
    await supabase.from("roaster_activity").insert({
      roaster_id: id,
      author_id: user.id,
      activity_type: activityType,
      description: reason || `Strike ${action === "add" ? "added" : "removed"} (${newCount}/3)`,
      metadata: { previous_strikes: currentStrikes, new_strikes: newCount, reason },
    });

    return NextResponse.json({ strikes: newCount });
  } catch (error) {
    console.error("Strike update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
