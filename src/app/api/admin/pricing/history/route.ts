import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const recordType = searchParams.get("recordType");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);

    const supabase = createServerClient();

    let query = supabase
      .from("pricing_change_history")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(limit);

    if (recordType) {
      query = query.eq("record_type", recordType);
    }

    const { data: history, error } = await query;

    if (error) {
      console.error("Pricing history fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch pricing history" },
        { status: 500 }
      );
    }

    return NextResponse.json({ history: history || [] });
  } catch (error) {
    console.error("Pricing history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
