import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("email_connections")
    .select(
      "id, provider, email_address, status, connected_at, last_used_at, scopes, metadata, token_expires_at"
    )
    .eq("roaster_id", roaster.id);

  if (error) {
    console.error("Email connections fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch connections" }, { status: 500 });
  }

  return NextResponse.json({ connections: data || [] });
}
