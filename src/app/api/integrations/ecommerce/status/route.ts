import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: connections } = await supabase
    .from("ecommerce_connections")
    .select("id, provider")
    .eq("roaster_id", user.roaster.id)
    .eq("is_active", true);

  return NextResponse.json({
    hasActiveConnection: (connections?.length ?? 0) > 0,
  });
}
