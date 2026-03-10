import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { checkFeature } from "@/lib/feature-gates";
import { VALID_COLOURS } from "@/lib/pipeline";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
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

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, colour, sort_order } = body as {
      name?: string;
      colour?: string;
      sort_order?: number;
    };

    if (colour && !VALID_COLOURS.includes(colour)) {
      return NextResponse.json(
        { error: `Colour must be one of: ${VALID_COLOURS.join(", ")}` },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (colour !== undefined) updates.colour = colour;
    if (sort_order !== undefined) updates.sort_order = sort_order;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: stage, error } = await supabase
      .from("pipeline_stages")
      .update(updates)
      .eq("id", id)
      .eq("roaster_id", roaster.id)
      .select()
      .single();

    if (error || !stage) {
      return NextResponse.json({ error: "Stage not found or update failed" }, { status: 404 });
    }

    return NextResponse.json({ stage });
  } catch (error) {
    console.error("Pipeline stage update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
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

  const { id } = await params;
  const supabase = createServerClient();

  // Check if it's a default stage
  const { data: stage } = await supabase
    .from("pipeline_stages")
    .select("is_default")
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .single();

  if (!stage) {
    return NextResponse.json({ error: "Stage not found" }, { status: 404 });
  }

  if (stage.is_default) {
    return NextResponse.json(
      { error: "Default stages cannot be deleted" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("pipeline_stages")
    .delete()
    .eq("id", id)
    .eq("roaster_id", roaster.id);

  if (error) {
    console.error("Pipeline stage deletion error:", error);
    return NextResponse.json({ error: "Failed to delete pipeline stage" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
