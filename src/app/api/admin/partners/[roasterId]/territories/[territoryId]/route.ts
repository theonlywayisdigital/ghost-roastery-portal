import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ roasterId: string; territoryId: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { roasterId, territoryId } = await params;
    const supabase = createServerClient();

    // Soft-deactivate (don't hard delete)
    const { error } = await supabase
      .from("partner_territories")
      .update({ is_active: false })
      .eq("id", territoryId)
      .eq("roaster_id", roasterId);

    if (error) {
      console.error("Territory remove error:", error);
      return NextResponse.json({ error: "Failed to remove territory" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Territory remove error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
