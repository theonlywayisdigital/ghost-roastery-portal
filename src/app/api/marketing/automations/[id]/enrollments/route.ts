import { NextRequest, NextResponse } from "next/server";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "all";
  const supabase = createServerClient();

  // Verify ownership
  const { data: automation } = await applyOwnerFilter(
    supabase.from("automations").select("id").eq("id", id),
    owner
  ).single();

  if (!automation) {
    return NextResponse.json({ error: "Automation not found" }, { status: 404 });
  }

  let query = supabase
    .from("automation_enrollments")
    .select("*, contacts(id, first_name, last_name, email)")
    .eq("automation_id", id)
    .order("enrolled_at", { ascending: false })
    .limit(100);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data: enrollments } = await query;

  return NextResponse.json({ enrollments: enrollments || [] });
}
