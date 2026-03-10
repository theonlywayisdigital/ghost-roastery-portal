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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sessionId } = await params;

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
    fragrance_aroma = 0,
    flavour = 0,
    aftertaste = 0,
    acidity = 0,
    body: bodyScore = 0,
    balance = 0,
    uniformity = 10,
    clean_cup = 10,
    sweetness = 10,
    overall = 0,
    defects_taint = 0,
    defects_fault = 0,
    flavour_tags = [],
    notes,
  } = body;

  const sampleData = {
    session_id: sessionId,
    sample_number: sample_number || 1,
    sample_label: sample_label || null,
    green_bean_id: green_bean_id || null,
    roast_log_id: roast_log_id || null,
    fragrance_aroma: Number(fragrance_aroma),
    flavour: Number(flavour),
    aftertaste: Number(aftertaste),
    acidity: Number(acidity),
    body: Number(bodyScore),
    balance: Number(balance),
    uniformity: Number(uniformity),
    clean_cup: Number(clean_cup),
    sweetness: Number(sweetness),
    overall: Number(overall),
    defects_taint: Number(defects_taint),
    defects_fault: Number(defects_fault),
    total_score: 0,
    flavour_tags: flavour_tags || [],
    notes: notes || null,
  };

  sampleData.total_score = computeTotalScore(sampleData as unknown as Record<string, unknown>);

  const { data, error } = await supabase
    .from("cupping_samples")
    .insert(sampleData)
    .select("*, green_beans(name)")
    .single();

  if (error) return NextResponse.json({ error: "Failed to create sample" }, { status: 500 });
  return NextResponse.json({ sample: data }, { status: 201 });
}
