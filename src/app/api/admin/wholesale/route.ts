import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { getGRRoasterId } from "@/lib/gr-roaster";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roasterId = await getGRRoasterId();
  const supabase = createServerClient();

  const { data: records, error } = await supabase
    .from("wholesale_access")
    .select(
      `id, user_id, status, business_name, business_type, business_address,
       business_website, vat_number, monthly_volume, notes, price_tier,
       payment_terms, credit_limit, rejected_reason, created_at, updated_at,
       approved_at, users!wholesale_access_user_id_fkey(full_name, email)`
    )
    .eq("roaster_id", roasterId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch wholesale accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch wholesale accounts." },
      { status: 500 }
    );
  }

  return NextResponse.json({ accounts: records || [] });
}
