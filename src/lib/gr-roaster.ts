import { createServerClient } from "@/lib/supabase";

/**
 * Resolve Ghost Roastery's own roaster ID.
 *
 * Prefers the GHOST_ROASTERY_ROASTER_ID env var for speed.
 * Falls back to querying partner_roasters where
 * business_name = 'Ghost Roastery' AND is_active = true.
 */
export async function getGRRoasterId(): Promise<string> {
  const envId = process.env.GHOST_ROASTERY_ROASTER_ID;
  if (envId) return envId;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("partner_roasters")
    .select("id")
    .eq("business_name", "Ghost Roastery")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(
      "Ghost Roastery roaster account not found. Set GHOST_ROASTERY_ROASTER_ID env var or ensure a partner_roasters row exists."
    );
  }

  return data.id as string;
}
