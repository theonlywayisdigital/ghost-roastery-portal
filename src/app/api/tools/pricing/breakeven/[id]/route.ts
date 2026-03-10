import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();
  const { error } = await supabase
    .from("breakeven_calculations")
    .delete()
    .eq("id", id)
    .eq("roaster_id", roaster.id);

  if (error) return NextResponse.json({ error: "Failed to delete calculation" }, { status: 500 });
  return NextResponse.json({ success: true });
}
