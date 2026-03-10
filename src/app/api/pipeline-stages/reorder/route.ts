import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { checkFeature } from "@/lib/feature-gates";

export async function POST(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Feature gate — paid plan only
  const gate = await checkFeature(roaster.id, "customPipelineStages");
  if (!gate.allowed) {
    return NextResponse.json(
      { error: gate.message || "Upgrade to customise pipeline stages." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { stages } = body as {
      stages?: { id: string; sort_order: number }[];
    };

    if (!stages || !Array.isArray(stages) || stages.length === 0) {
      return NextResponse.json({ error: "stages array is required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Validate all ids belong to current roaster
    const ids = stages.map((s) => s.id);
    const { data: existing } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("roaster_id", roaster.id)
      .in("id", ids);

    const existingIds = new Set((existing || []).map((e) => e.id));
    const invalidIds = ids.filter((id) => !existingIds.has(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: "Some stage IDs do not belong to this roaster" },
        { status: 400 }
      );
    }

    // Bulk update sort_order
    for (const stage of stages) {
      await supabase
        .from("pipeline_stages")
        .update({ sort_order: stage.sort_order })
        .eq("id", stage.id)
        .eq("roaster_id", roaster.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pipeline stages reorder error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
