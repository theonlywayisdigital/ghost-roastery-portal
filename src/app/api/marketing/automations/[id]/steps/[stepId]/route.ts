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

  // Get the step being deleted and all steps for this automation
  const { data: stepToDelete } = await supabase
    .from("automation_steps")
    .select("step_order")
    .eq("id", stepId)
    .single();

  if (!stepToDelete) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  const deletedOrder = stepToDelete.step_order as number;

  // Get all remaining steps (excluding the one being deleted) to find the next valid step
  const { data: allSteps } = await supabase
    .from("automation_steps")
    .select("id, step_order")
    .eq("automation_id", id)
    .neq("id", stepId)
    .order("step_order", { ascending: true });

  // Find active enrollments that are on or past the deleted step
  const { data: affectedEnrollments } = await supabase
    .from("automation_enrollments")
    .select("id, current_step")
    .eq("automation_id", id)
    .eq("status", "active");

  const { error } = await supabase
    .from("automation_steps")
    .delete()
    .eq("id", stepId)
    .eq("automation_id", id);

  if (error) {
    console.error("Delete step error:", error);
    return NextResponse.json({ error: "Failed to delete step" }, { status: 500 });
  }

  // Reorder remaining steps to close the gap
  const stepsAfter = (allSteps || []).filter(s => (s.step_order as number) > deletedOrder);
  for (const s of stepsAfter) {
    await supabase
      .from("automation_steps")
      .update({ step_order: (s.step_order as number) - 1 })
      .eq("id", s.id);
  }

  // Adjust active enrollments affected by the deletion
  if (affectedEnrollments && affectedEnrollments.length > 0) {
    // Build a map of old step_order → new step_order after the shift
    const orderMap = new Map<number, number>();
    for (const s of allSteps || []) {
      const oldOrder = s.step_order as number;
      orderMap.set(oldOrder, oldOrder > deletedOrder ? oldOrder - 1 : oldOrder);
    }

    // Find the next valid step after the deleted one (using pre-shift orders)
    const nextStepAfterDeleted = (allSteps || []).find(s => (s.step_order as number) > deletedOrder);
    const newOrderForDeleted = nextStepAfterDeleted
      ? orderMap.get(nextStepAfterDeleted.step_order as number)
      : null;

    for (const enrollment of affectedEnrollments) {
      const currentStep = enrollment.current_step as number;

      if (currentStep === deletedOrder) {
        // Enrollment was on the deleted step — move to next valid step or complete
        if (newOrderForDeleted != null) {
          await supabase
            .from("automation_enrollments")
            .update({ current_step: newOrderForDeleted, next_step_at: new Date().toISOString() })
            .eq("id", enrollment.id);
        } else {
          await supabase
            .from("automation_enrollments")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", enrollment.id);
        }
      } else if (currentStep > deletedOrder) {
        // Enrollment was past the deleted step — shift current_step down by 1 to match reorder
        await supabase
          .from("automation_enrollments")
          .update({ current_step: currentStep - 1 })
          .eq("id", enrollment.id);
      }
      // currentStep < deletedOrder — no adjustment needed
    }
  }

  return NextResponse.json({ success: true });
}
