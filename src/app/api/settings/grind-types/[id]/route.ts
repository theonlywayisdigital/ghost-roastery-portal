import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, sort_order } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: grindType, error } = await supabase
      .from("roaster_grind_types")
      .update({ name: name.trim(), sort_order: sort_order ?? 0 })
      .eq("id", id)
      .eq("roaster_id", roaster.id)
      .select()
      .single();

    if (error || !grindType) {
      return NextResponse.json({ error: "Grind type not found or update failed" }, { status: 404 });
    }

    return NextResponse.json({ grindType });
  } catch (error) {
    console.error("Grind type update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from("roaster_grind_types")
    .delete()
    .eq("id", id)
    .eq("roaster_id", roaster.id);

  if (error) {
    console.error("Grind type deletion error:", error);
    return NextResponse.json({ error: "Failed to delete grind type" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
