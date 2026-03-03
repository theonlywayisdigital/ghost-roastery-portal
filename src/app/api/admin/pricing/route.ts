import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServerClient();

    const [bracketsRes, pricesRes] = await Promise.all([
      supabase
        .from("pricing_tier_brackets")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("pricing_tier_prices")
        .select("*")
        .order("bag_size", { ascending: true }),
    ]);

    if (bracketsRes.error || pricesRes.error) {
      console.error("Admin pricing fetch error:", bracketsRes.error || pricesRes.error);
      return NextResponse.json(
        { error: "Failed to fetch pricing data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      brackets: bracketsRes.data || [],
      prices: pricesRes.data || [],
    });
  } catch (error) {
    console.error("Admin pricing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
