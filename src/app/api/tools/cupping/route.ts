import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { checkLimit } from "@/lib/feature-gates";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();

  // Fetch sessions with sample count and average score
  const { data: sessions, error } = await supabase
    .from("cupping_sessions")
    .select("*, cupping_samples(count)")
    .eq("roaster_id", roaster.id)
    .order("session_date", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to fetch cupping sessions" }, { status: 500 });

  // Get average scores for each session
  const sessionIds = (sessions || []).map((s: Record<string, unknown>) => s.id as string);
  let avgScores: Record<string, number> = {};

  if (sessionIds.length > 0) {
    const { data: samples } = await supabase
      .from("cupping_samples")
      .select("session_id, total_score")
      .in("session_id", sessionIds);

    if (samples) {
      const grouped: Record<string, number[]> = {};
      for (const s of samples) {
        const sid = s.session_id as string;
        if (!grouped[sid]) grouped[sid] = [];
        if (s.total_score != null) grouped[sid].push(Number(s.total_score));
      }
      for (const [sid, scores] of Object.entries(grouped)) {
        if (scores.length > 0) {
          avgScores[sid] = scores.reduce((a, b) => a + b, 0) / scores.length;
        }
      }
    }
  }

  const result = (sessions || []).map((s: Record<string, unknown>) => ({
    ...s,
    sample_count: Array.isArray(s.cupping_samples) && s.cupping_samples.length > 0
      ? (s.cupping_samples[0] as Record<string, number>).count
      : 0,
    avg_score: avgScores[s.id as string] ?? null,
    cupping_samples: undefined,
  }));

  return NextResponse.json({ sessions: result });
}

export async function POST(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limitCheck = await checkLimit(roaster.id as string, "cuppingSessionsPerMonth", 1);
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: limitCheck.message, upgrade_required: true }, { status: 403 });
  }

  const body = await request.json();
  const { session_date, session_name, cupper_name, notes } = body;

  if (!session_name) return NextResponse.json({ error: "Session name is required" }, { status: 400 });
  if (!session_date) return NextResponse.json({ error: "Session date is required" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("cupping_sessions")
    .insert({
      roaster_id: roaster.id,
      session_date,
      session_name,
      cupper_name: cupper_name || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create cupping session" }, { status: 500 });
  return NextResponse.json({ session: data }, { status: 201 });
}
