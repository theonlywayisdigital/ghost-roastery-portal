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
    const { activity_type, description, metadata } = body;

    if (!activity_type || !description) {
      return NextResponse.json(
        { error: "Activity type and description are required" },
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

    const { data: activity, error } = await supabase
      .from("business_activity")
      .insert({
        business_id: id,
        author_id: user.id,
        activity_type,
        description,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error("Activity create error:", error);
      return NextResponse.json(
        { error: "Failed to log activity" },
        { status: 500 }
      );
    }

    // Update last_activity_at
    await supabase
      .from("businesses")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ activity });
  } catch (error) {
    console.error("Activity create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
