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
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const supabase = createServerClient();

  // Verify ownership of the discount code
  const { data: code } = await applyOwnerFilter(
    supabase.from("discount_codes").select("id").eq("id", id),
    owner
  ).single();

  if (!code) {
    return NextResponse.json({ error: "Discount code not found" }, { status: 404 });
  }

  const { data: redemptions, error, count } = await supabase
    .from("discount_redemptions")
    .select("*, contacts(id, email, first_name, last_name)", { count: "exact" })
    .eq("discount_code_id", id)
    .order("redeemed_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Redemptions fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch redemptions" }, { status: 500 });
  }

  return NextResponse.json({
    redemptions: redemptions || [],
    total: count || 0,
    page,
    limit,
  });
}
