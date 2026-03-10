import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { CuppingTable } from "./CuppingTable";

export default async function CuppingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const supabase = createServerClient();

  // Fetch sessions with sample counts
  const { data: sessions } = await supabase
    .from("cupping_sessions")
    .select("*, cupping_samples(count)")
    .eq("roaster_id", user.roaster.id)
    .order("session_date", { ascending: false });

  // Get average scores per session
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
    id: s.id as string,
    session_date: s.session_date as string,
    session_name: s.session_name as string,
    cupper_name: (s.cupper_name as string) || null,
    notes: (s.notes as string) || null,
    created_at: s.created_at as string,
    sample_count: Array.isArray(s.cupping_samples) && s.cupping_samples.length > 0
      ? (s.cupping_samples[0] as Record<string, number>).count
      : 0,
    avg_score: avgScores[s.id as string] ?? null,
  }));

  return <CuppingTable sessions={result} />;
}
