import { NextRequest, NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // e.g. "2026-03"

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Invalid month format. Use YYYY-MM" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Get the date range for the month (include surrounding days for calendar display)
  const [year, monthNum] = month.split("-").map(Number);
  const firstDay = new Date(year, monthNum - 1, 1);
  const lastDay = new Date(year, monthNum, 0);

  // Extend range to include first/last week edges for calendar grid
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of week
  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // End of week

  const { data: posts, error } = await supabase
    .from("social_posts")
    .select("id, content, platforms, scheduled_for, published_at, status, tags")
    .eq("roaster_id", roaster.id)
    .or(
      `scheduled_for.gte.${startDate.toISOString()},published_at.gte.${startDate.toISOString()}`
    )
    .or(
      `scheduled_for.lte.${endDate.toISOString()},published_at.lte.${endDate.toISOString()}`
    )
    .order("scheduled_for", { ascending: true });

  if (error) {
    console.error("Calendar posts fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch calendar posts" }, { status: 500 });
  }

  return NextResponse.json({ posts: posts || [], month });
}
