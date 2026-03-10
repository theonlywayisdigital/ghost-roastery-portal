import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Types ───

export interface PipelineStage {
  id: string;
  name: string;
  slug: string;
  colour: string;
  sort_order: number;
  is_win: boolean;
  is_loss: boolean;
  is_default: boolean;
}

// ─── Stage Colours ───
// Maps colour name → Tailwind classes used across pipeline UI.
// Matches the palette from PipelineColumn and detail page lead status colours.

export const STAGE_COLOURS: Record<string, { bg: string; border: string; dot: string; badge: string }> = {
  blue:   { bg: "bg-blue-50",   border: "border-blue-200",   dot: "bg-blue-500",   badge: "bg-blue-50 text-blue-700" },
  yellow: { bg: "bg-yellow-50", border: "border-yellow-200", dot: "bg-yellow-500", badge: "bg-yellow-50 text-yellow-700" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", dot: "bg-purple-500", badge: "bg-purple-50 text-purple-700" },
  green:  { bg: "bg-green-50",  border: "border-green-200",  dot: "bg-green-500",  badge: "bg-green-50 text-green-700" },
  red:    { bg: "bg-red-50",    border: "border-red-200",    dot: "bg-red-500",    badge: "bg-red-50 text-red-600" },
  orange: { bg: "bg-orange-50", border: "border-orange-200", dot: "bg-orange-500", badge: "bg-orange-50 text-orange-700" },
  pink:   { bg: "bg-pink-50",   border: "border-pink-200",   dot: "bg-pink-500",   badge: "bg-pink-50 text-pink-700" },
  gray:   { bg: "bg-slate-50",  border: "border-slate-200",  dot: "bg-slate-500",  badge: "bg-slate-100 text-slate-600" },
};

export const VALID_COLOURS = Object.keys(STAGE_COLOURS);

// ─── Fetch stages ───

export async function fetchPipelineStages(
  supabase: SupabaseClient,
  roasterId: string
): Promise<PipelineStage[]> {
  const { data, error } = await supabase
    .from("pipeline_stages")
    .select("id, name, slug, colour, sort_order, is_win, is_loss, is_default")
    .eq("roaster_id", roasterId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch pipeline stages:", error);
    return [];
  }

  return (data || []) as PipelineStage[];
}
