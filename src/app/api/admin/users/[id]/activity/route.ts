import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: activity, error } = await supabase
    .from("user_activity_log")
    .select("*")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Admin user activity error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity log" },
      { status: 500 }
    );
  }

  return NextResponse.json({ activity: activity || [] });
}
