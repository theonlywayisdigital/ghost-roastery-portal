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
    if (body.description !== undefined) updates.description = body.description;
    if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 });
    }

    updates.updated_by = user.id;

    const { data: bagSize, error } = await supabase
      .from("bag_sizes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Bag size update error:", error);
      return NextResponse.json({ error: "Failed to update bag size" }, { status: 500 });
    }

    return NextResponse.json({ bagSize });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Get the bag size name to check references
    const { data: bagSize, error: fetchError } = await supabase
      .from("bag_sizes")
      .select("name")
      .eq("id", id)
      .single();

    if (fetchError || !bagSize) {
      return NextResponse.json({ error: "Bag size not found" }, { status: 404 });
    }

    // Check if referenced by active pricing_tier_prices
    const { data: activePrices } = await supabase
      .from("pricing_tier_prices")
      .select("id")
      .eq("bag_size", bagSize.name)
      .eq("is_active", true);

    if (activePrices && activePrices.length > 0) {
      // Check for force flag
      let force = false;
      try {
        const body = await request.json();
        force = body?.force === true;
      } catch {
        // No body or invalid JSON — force remains false
      }

      if (!force) {
        return NextResponse.json(
          { error: "This bag size has active pricing tiers. Deactivate pricing first or pass force=true." },
          { status: 409 }
        );
      }
    }

    // Soft-delete
    const { error } = await supabase
      .from("bag_sizes")
      .update({ is_active: false, updated_by: user.id })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Failed to deactivate bag size" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
