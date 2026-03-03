import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { bracket_id, bag_size, price_per_bag, shipping_cost } = body;

    if (!bracket_id || !bag_size || price_per_bag === undefined) {
      return NextResponse.json(
        { error: "bracket_id, bag_size, and price_per_bag are required" },
        { status: 400 }
      );
    }

    if (Number(price_per_bag) < 0) {
      return NextResponse.json(
        { error: "price_per_bag must be non-negative" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: price, error } = await supabase
      .from("pricing_tier_prices")
      .insert({
        bracket_id,
        bag_size,
        price_per_bag: Number(price_per_bag),
        shipping_cost: Number(shipping_cost || 0),
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A price for this bracket + bag size already exists" },
          { status: 409 }
        );
      }
      console.error("Price create error:", error);
      return NextResponse.json({ error: "Failed to create price" }, { status: 500 });
    }

    await supabase.from("pricing_change_history").insert({
      record_type: "price",
      record_id: price.id,
      field_changed: "created",
      old_value: null,
      new_value: String(price_per_bag),
      changed_by: user.id,
    });

    return NextResponse.json({ price });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const bagSize = searchParams.get("bag_size");

    if (!bagSize) {
      return NextResponse.json({ error: "bag_size query parameter is required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Find all active prices for this bag size
    const { data: pricesToDelete } = await supabase
      .from("pricing_tier_prices")
      .select("id, bracket_id, price_per_bag")
      .eq("bag_size", bagSize)
      .eq("is_active", true);

    if (!pricesToDelete || pricesToDelete.length === 0) {
      return NextResponse.json({ error: "No active prices found for this bag size" }, { status: 404 });
    }

    // Soft-delete all prices for this bag size
    const { error } = await supabase
      .from("pricing_tier_prices")
      .update({ is_active: false, updated_by: user.id })
      .eq("bag_size", bagSize)
      .eq("is_active", true);

    if (error) {
      return NextResponse.json({ error: "Failed to delete bag size prices" }, { status: 500 });
    }

    // Log deletion for each price
    await supabase.from("pricing_change_history").insert(
      pricesToDelete.map((p) => ({
        record_type: "price",
        record_id: p.id,
        field_changed: "deleted",
        old_value: `${bagSize} @ £${p.price_per_bag}`,
        new_value: null,
        changed_by: user.id,
      }))
    );

    return NextResponse.json({ success: true, deleted: pricesToDelete.length });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
