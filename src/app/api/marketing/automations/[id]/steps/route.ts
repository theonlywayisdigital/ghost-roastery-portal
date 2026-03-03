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

  // Verify ownership
  const { data: automation } = await applyOwnerFilter(
    supabase.from("automations").select("id").eq("id", id),
    owner
  ).single();

  if (!automation) {
    return NextResponse.json({ error: "Automation not found" }, { status: 404 });
  }

  const { data: steps } = await supabase
    .from("automation_steps")
    .select("*")
    .eq("automation_id", id)
    .order("step_order", { ascending: true });

  return NextResponse.json({ steps: steps || [] });
}

export async function POST(
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
    const { data: automation } = await applyOwnerFilter(
      supabase.from("automations").select("id").eq("id", id),
      owner
    ).single();

    if (!automation) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    // Get max step order
    const { data: existing } = await supabase
      .from("automation_steps")
      .select("step_order")
      .eq("automation_id", id)
      .order("step_order", { ascending: false })
      .limit(1);

    const maxOrder = existing && existing.length > 0 ? existing[0].step_order : 0;
    const insertAfter = body.after_order ?? maxOrder;

    // If inserting in the middle, shift existing steps up
    if (body.after_order != null) {
      await supabase.rpc("increment_step_orders_after", {
        p_automation_id: id,
        p_after_order: insertAfter,
      }).then(() => {});

      // Fallback: manual shift if RPC doesn't exist
      const { data: stepsToShift } = await supabase
        .from("automation_steps")
        .select("id, step_order")
        .eq("automation_id", id)
        .gt("step_order", insertAfter)
        .order("step_order", { ascending: false });

      if (stepsToShift) {
        for (const s of stepsToShift) {
          await supabase
            .from("automation_steps")
            .update({ step_order: s.step_order + 1 })
            .eq("id", s.id);
        }
      }
    }

    const { data: step, error } = await supabase
      .from("automation_steps")
      .insert({
        automation_id: id,
        step_order: insertAfter + 1,
        step_type: body.step_type || "email",
        config: body.config || {},
      })
      .select()
      .single();

    if (error) {
      console.error("Add step error:", error);
      return NextResponse.json({ error: "Failed to add step" }, { status: 500 });
    }

    return NextResponse.json({ step });
  } catch (error) {
    console.error("Add step error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
