import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roasterId = searchParams.get("roasterId");

  if (!roasterId) {
    return NextResponse.json(
      { error: "roasterId is required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const { data: methods, error } = await supabase
    .from("shipping_methods")
    .select("id, name, price, free_threshold, estimated_days, max_weight_kg")
    .eq("roaster_id", roasterId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Shipping methods fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipping methods" },
      { status: 500 }
    );
  }

  return NextResponse.json({ methods: methods || [] });
}
