import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: connections, error } = await supabase
    .from("social_connections")
    .select("id, platform, platform_page_id, page_name, status, connected_at, last_used_at, scopes, metadata, token_expires_at")
    .eq("roaster_id", roaster.id)
    .order("platform", { ascending: true });

  if (error) {
    console.error("Connections fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch connections" }, { status: 500 });
  }

  return NextResponse.json({ connections: connections || [] });
}
