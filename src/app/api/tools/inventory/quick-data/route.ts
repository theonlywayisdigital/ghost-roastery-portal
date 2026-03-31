import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const roasterId = user.roaster.id;

  const [greenRes, roastedRes] = await Promise.all([
    supabase
      .from("green_beans")
      .select("id, name, current_stock_kg")
      .eq("roaster_id", roasterId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("roasted_stock")
      .select("id, name, green_bean_id, current_stock_kg")
      .eq("roaster_id", roasterId)
      .eq("is_active", true)
      .order("name"),
  ]);

  return NextResponse.json({
    greenBeans: greenRes.data || [],
    roastedStocks: roastedRes.data || [],
  });
}
