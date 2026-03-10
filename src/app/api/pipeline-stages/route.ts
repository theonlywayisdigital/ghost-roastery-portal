import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { checkFeature } from "@/lib/feature-gates";
import { VALID_COLOURS } from "@/lib/pipeline";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data: stages, error } = await supabase
    .from("pipeline_stages")
    .select("id, name, slug, colour, sort_order, is_default, is_win, is_loss, created_at")
    .eq("roaster_id", roaster.id)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Pipeline stages fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch pipeline stages" }, { status: 500 });
  }

  return NextResponse.json({ stages: stages || [] });
}

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
    const { name, colour, sort_order } = body as {
      name?: string;
      colour?: string;
      sort_order?: number;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (colour && !VALID_COLOURS.includes(colour)) {
      return NextResponse.json(
        { error: `Colour must be one of: ${VALID_COLOURS.join(", ")}` },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!slug) {
      return NextResponse.json({ error: "Name must contain at least one alphanumeric character" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: stage, error } = await supabase
      .from("pipeline_stages")
      .insert({
        roaster_id: roaster.id,
        name: name.trim(),
        slug,
        colour: colour || "blue",
        sort_order: sort_order ?? 0,
        is_default: false,
        is_win: false,
        is_loss: false,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "A stage with this name already exists" }, { status: 409 });
      }
      console.error("Pipeline stage creation error:", error);
      return NextResponse.json({ error: "Failed to create pipeline stage" }, { status: 500 });
    }

    return NextResponse.json({ stage }, { status: 201 });
  } catch (error) {
    console.error("Pipeline stage creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
