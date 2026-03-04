import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const orderType = req.nextUrl.searchParams.get("orderType") || "ghost_roastery";

  const supabase = createServerClient();

  const { data: refunds, error } = await supabase
    .from("refunds")
    .select("*")
    .eq("order_id", id)
    .eq("order_type", orderType)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch refunds error:", error);
    return NextResponse.json({ error: "Failed to fetch refunds" }, { status: 500 });
  }

  return NextResponse.json({ refunds: refunds || [] });
}
