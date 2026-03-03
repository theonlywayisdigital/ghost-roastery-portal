import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createServerClient();

    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.slug !== undefined) updates.slug = body.slug;
    if (body.descriptor !== undefined) updates.descriptor = body.descriptor;
    if (body.tasting_notes !== undefined) updates.tasting_notes = body.tasting_notes;
    if (body.roast_level !== undefined) updates.roast_level = body.roast_level;
    if (body.is_decaf !== undefined) updates.is_decaf = body.is_decaf;
    if (body.badge !== undefined) updates.badge = body.badge;
    if (body.image_url !== undefined) updates.image_url = body.image_url;
    if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 });
    }

    updates.updated_by = user.id;

    const { data: roastProfile, error } = await supabase
      .from("roast_profiles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Roast profile update error:", error);
      return NextResponse.json({ error: "Failed to update roast profile" }, { status: 500 });
    }

    return NextResponse.json({ roastProfile });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { error } = await supabase
      .from("roast_profiles")
      .update({ is_active: false, updated_by: user.id })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Failed to deactivate roast profile" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
