import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

function computeTotalScore(sample: Record<string, unknown>): number {
  const attrs = [
    "fragrance_aroma", "flavour", "aftertaste", "acidity", "body",
    "balance", "uniformity", "clean_cup", "sweetness", "overall",
  ];
  const sum = attrs.reduce((acc, key) => acc + (Number(sample[key]) || 0), 0);
  const taint = Number(sample.defects_taint) || 0;
  const fault = Number(sample.defects_fault) || 0;
  return sum - (2 * taint) - (4 * fault);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; sampleId: string }> }
) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sessionId, sampleId } = await params;

  // Verify session belongs to roaster
  const supabase = createServerClient();
  const { data: session } = await supabase
    .from("cupping_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("roaster_id", roaster.id)
    .single();

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const body = await request.json();
  const {
    sample_number,
    sample_label,
    green_bean_id,
    roast_log_id,
    fragrance_aroma,
    flavour,
    aftertaste,
    acidity,
    body: bodyScore,
    balance,
    uniformity,
    clean_cup,
    sweetness,
    overall,
    defects_taint,
    defects_fault,
    flavour_tags,
    notes,
  } = body;

  const updateData: Record<string, unknown> = {};

  if (sample_number !== undefined) updateData.sample_number = sample_number;
  if (sample_label !== undefined) updateData.sample_label = sample_label || null;
  if (green_bean_id !== undefined) updateData.green_bean_id = green_bean_id || null;
  if (roast_log_id !== undefined) updateData.roast_log_id = roast_log_id || null;
  if (fragrance_aroma !== undefined) updateData.fragrance_aroma = Number(fragrance_aroma);
  if (flavour !== undefined) updateData.flavour = Number(flavour);
  if (aftertaste !== undefined) updateData.aftertaste = Number(aftertaste);
  if (acidity !== undefined) updateData.acidity = Number(acidity);
  if (bodyScore !== undefined) updateData.body = Number(bodyScore);
  if (balance !== undefined) updateData.balance = Number(balance);
  if (uniformity !== undefined) updateData.uniformity = Number(uniformity);
  if (clean_cup !== undefined) updateData.clean_cup = Number(clean_cup);
  if (sweetness !== undefined) updateData.sweetness = Number(sweetness);
  if (overall !== undefined) updateData.overall = Number(overall);
  if (defects_taint !== undefined) updateData.defects_taint = Number(defects_taint);
  if (defects_fault !== undefined) updateData.defects_fault = Number(defects_fault);
  if (flavour_tags !== undefined) updateData.flavour_tags = flavour_tags;
  if (notes !== undefined) updateData.notes = notes || null;

  // Recompute total_score if any score attributes changed
  const scoreKeys = [
    "fragrance_aroma", "flavour", "aftertaste", "acidity", "body",
    "balance", "uniformity", "clean_cup", "sweetness", "overall",
    "defects_taint", "defects_fault",
  ];
  const hasScoreChange = scoreKeys.some((k) => body[k] !== undefined);

  if (hasScoreChange) {
    // Fetch existing sample to merge with updates
    const { data: existing } = await supabase
      .from("cupping_samples")
      .select("*")
      .eq("id", sampleId)
      .eq("session_id", sessionId)
      .single();

    if (existing) {
      const merged = { ...existing, ...updateData } as unknown as Record<string, unknown>;
      updateData.total_score = computeTotalScore(merged);
    }
  }

  const { data, error } = await supabase
    .from("cupping_samples")
    .update(updateData)
    .eq("id", sampleId)
    .eq("session_id", sessionId)
    .select("*, green_beans(name)")
    .single();

  if (error) return NextResponse.json({ error: "Failed to update sample" }, { status: 500 });
  return NextResponse.json({ sample: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; sampleId: string }> }
) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sessionId, sampleId } = await params;

  // Verify session belongs to roaster
  const supabase = createServerClient();
  const { data: session } = await supabase
    .from("cupping_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("roaster_id", roaster.id)
    .single();

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const { error } = await supabase
    .from("cupping_samples")
    .delete()
    .eq("id", sampleId)
    .eq("session_id", sessionId);

  if (error) return NextResponse.json({ error: "Failed to delete sample" }, { status: 500 });
  return NextResponse.json({ success: true });
}
