import { NextRequest, NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

const VALID_ACTIONS = ["delete"] as const;
type BulkAction = (typeof VALID_ACTIONS)[number];

export async function POST(request: NextRequest) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { ids, action } = body as { ids: string[]; action: BulkAction };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
  }

  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}` }, { status: 400 });
  }

  const supabase = createServerClient();

  const { count, error } = await supabase
    .from("roast_logs")
    .delete({ count: "exact" })
    .in("id", ids)
    .eq("roaster_id", roaster.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete roast logs" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, affected: count ?? 0 });
}
