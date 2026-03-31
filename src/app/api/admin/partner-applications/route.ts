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
    const status = searchParams.get("status");

    const supabase = createServerClient();

    let query = supabase
      .from("partner_applications")
      .select("*")
      .order("applied_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: applications, error } = await query;

    if (error) {
      console.error("Applications fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
    }

    // Enrich with roaster names
    const roasterIds = Array.from(new Set((applications || []).map((a: { roaster_id: string }) => a.roaster_id)));
    let roasterMap: Record<string, string> = {};

    if (roasterIds.length > 0) {
      const { data: roasters } = await supabase
        .from("roasters")
        .select("id, business_name")
        .in("id", roasterIds);

      roasterMap = Object.fromEntries((roasters || []).map((r) => [r.id, r.business_name]));
    }

    const enriched = (applications || []).map((a) => ({
      ...a,
      roaster_name: roasterMap[a.roaster_id] || "Unknown",
    }));

    return NextResponse.json({ applications: enriched });
  } catch (error) {
    console.error("Applications API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
