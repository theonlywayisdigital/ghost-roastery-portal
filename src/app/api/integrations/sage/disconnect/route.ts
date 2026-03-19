import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST() {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { error } = await supabase
    .from("roaster_integrations")
    .delete()
    .eq("roaster_id", user.roaster.id)
    .eq("provider", "sage");

  if (error) {
    console.error("Failed to disconnect Sage:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
