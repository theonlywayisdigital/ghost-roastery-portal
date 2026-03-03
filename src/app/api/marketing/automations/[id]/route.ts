import { NextRequest, NextResponse } from "next/server";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: automation, error } = await applyOwnerFilter(
    supabase.from("automations").select("*").eq("id", id),
    owner
  ).single();

  if (error || !automation) {
    return NextResponse.json({ error: "Automation not found" }, { status: 404 });
  }

  // Get steps
  const { data: steps } = await supabase
    .from("automation_steps")
    .select("*")
    .eq("automation_id", id)
    .order("step_order", { ascending: true });

  // Get enrollment stats
  const { count: enrolledCount } = await supabase
    .from("automation_enrollments")
    .select("*", { count: "exact", head: true })
    .eq("automation_id", id)
    .eq("status", "active");

  const { count: completedCount } = await supabase
    .from("automation_enrollments")
    .select("*", { count: "exact", head: true })
    .eq("automation_id", id)
    .eq("status", "completed");

  return NextResponse.json({
    automation: { ...automation, enrolled_count: enrolledCount || 0, completed_count: completedCount || 0 },
    steps: steps || [],
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const supabase = createServerClient();

    // Verify ownership
    const { data: existing } = await applyOwnerFilter(
      supabase.from("automations").select("id").eq("id", id),
      owner
    ).single();

    if (!existing) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    const allowedFields: Record<string, unknown> = {};
    const editableKeys = ["name", "description", "trigger_type", "trigger_config", "trigger_filters", "status"];

    for (const key of editableKeys) {
      if (key in body) {
        allowedFields[key] = body[key];
      }
    }

    const { data: automation, error } = await applyOwnerFilter(
      supabase.from("automations").update(allowedFields).eq("id", id),
      owner
    )
      .select()
      .single();

    if (error) {
      console.error("Update automation error:", error);
      return NextResponse.json({ error: "Failed to update automation" }, { status: 500 });
    }

    return NextResponse.json({ automation });
  } catch (error) {
    console.error("Update automation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  // Cancel active enrollments first
  await supabase
    .from("automation_enrollments")
    .update({ status: "cancelled" })
    .eq("automation_id", id)
    .eq("status", "active");

  const { error } = await applyOwnerFilter(
    supabase.from("automations").delete().eq("id", id),
    owner
  );

  if (error) {
    console.error("Delete automation error:", error);
    return NextResponse.json({ error: "Failed to delete automation" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
