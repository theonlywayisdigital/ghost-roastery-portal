import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: records, error } = await supabase
    .from("wholesale_access")
    .select(
      `id, user_id, status, business_name, business_type, business_address,
       business_website, vat_number, monthly_volume, notes, price_tier,
       payment_terms, credit_limit, rejected_reason, created_at, updated_at,
       approved_at, users!wholesale_access_user_id_fkey(full_name, email)`
    )
    .eq("roaster_id", user.roaster.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch wholesale buyers:", error);
    return NextResponse.json(
      { error: "Failed to fetch wholesale buyers." },
      { status: 500 }
    );
  }

  return NextResponse.json({ buyers: records || [] });
}
