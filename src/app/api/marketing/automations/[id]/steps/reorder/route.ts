import { NextRequest, NextResponse } from "next/server";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";

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
    const { step_ids } = body as { step_ids: string[] };

    if (!Array.isArray(step_ids)) {
      return NextResponse.json({ error: "step_ids array required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verify ownership
    const { data: automation } = await applyOwnerFilter(
      supabase.from("automations").select("id").eq("id", id),
      owner
    ).single();

    if (!automation) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    // Update each step order
    for (let i = 0; i < step_ids.length; i++) {
      await supabase
        .from("automation_steps")
        .update({ step_order: i + 1 })
        .eq("id", step_ids[i])
        .eq("automation_id", id);
    }

    // Return updated steps
    const { data: steps } = await supabase
      .from("automation_steps")
      .select("*")
      .eq("automation_id", id)
      .order("step_order", { ascending: true });

    return NextResponse.json({ steps: steps || [] });
  } catch (error) {
    console.error("Reorder steps error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
