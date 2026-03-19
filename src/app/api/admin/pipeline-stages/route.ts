import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

/**
 * GET /api/admin/pipeline-stages
 * Returns pipeline stages visible to admin.
 * Fetches ghost_roastery stages (roaster_id IS NULL) with fallback to first roaster's stages.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Try ghost_roastery-level stages first (roaster_id IS NULL)
  let { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name, slug, colour, sort_order, is_default, is_win, is_loss, created_at")
    .is("roaster_id", null)
    .order("sort_order", { ascending: true });

  // Fallback: if no ghost_roastery stages, use the first roaster's stages as a representative set
  if (!stages || stages.length === 0) {
    const { data: fallbackStages } = await supabase
      .from("pipeline_stages")
      .select("id, name, slug, colour, sort_order, is_default, is_win, is_loss, created_at")
      .order("sort_order", { ascending: true })
      .limit(20);
    // Deduplicate by slug (multiple roasters may have the same defaults)
    const seen = new Set<string>();
    stages = [];
    for (const s of fallbackStages || []) {
      if (!seen.has(s.slug)) {
        seen.add(s.slug);
        stages.push(s);
      }
    }
  }

  return NextResponse.json({ stages: stages || [] });
}
