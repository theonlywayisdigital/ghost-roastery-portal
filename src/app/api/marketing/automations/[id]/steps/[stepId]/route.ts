import { NextRequest, NextResponse } from "next/server";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, stepId } = await params;

  try {
    const body = await request.json();
    const supabase = createServerClient();

    // Verify ownership
    const { data: automation } = await applyOwnerFilter(
      supabase.from("automations").select("id").eq("id", id),
      owner
    ).single();

    if (!automation) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    const updateFields: Record<string, unknown> = {};
    if ("step_type" in body) updateFields.step_type = body.step_type;
    if ("config" in body) updateFields.config = body.config;
    if ("step_order" in body) updateFields.step_order = body.step_order;

    const { data: step, error } = await supabase
      .from("automation_steps")
      .update(updateFields)
      .eq("id", stepId)
      .eq("automation_id", id)
      .select()
      .single();

    if (error) {
      console.error("Update step error:", error);
      return NextResponse.json({ error: "Failed to update step" }, { status: 500 });
    }

    return NextResponse.json({ step });
  } catch (error) {
    console.error("Update step error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, stepId } = await params;
  const supabase = createServerClient();

  // Verify ownership
  const { data: automation } = await applyOwnerFilter(
    supabase.from("automations").select("id").eq("id", id),
    owner
  ).single();

  if (!automation) {
    return NextResponse.json({ error: "Automation not found" }, { status: 404 });
  }

  // Get the step order before deleting
  const { data: stepToDelete } = await supabase
    .from("automation_steps")
    .select("step_order")
    .eq("id", stepId)
    .single();

  const { error } = await supabase
    .from("automation_steps")
    .delete()
    .eq("id", stepId)
    .eq("automation_id", id);

  if (error) {
    console.error("Delete step error:", error);
    return NextResponse.json({ error: "Failed to delete step" }, { status: 500 });
  }

  // Reorder remaining steps
  if (stepToDelete) {
    const { data: remaining } = await supabase
      .from("automation_steps")
      .select("id, step_order")
      .eq("automation_id", id)
      .gt("step_order", stepToDelete.step_order)
      .order("step_order", { ascending: true });

    if (remaining) {
      for (const s of remaining) {
        await supabase
          .from("automation_steps")
          .update({ step_order: s.step_order - 1 })
          .eq("id", s.id);
      }
    }
  }

  return NextResponse.json({ success: true });
}
